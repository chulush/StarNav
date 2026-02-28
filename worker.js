export default {
  async fetch(request, env, ctx) {
    const GIST_ID = env.GIST_ID;
    const GITHUB_TOKEN = env.GITHUB_TOKEN;

    if (!GIST_ID || !GITHUB_TOKEN) {
      return new Response("Configuration missing! Please set GIST_ID and GITHUB_TOKEN in Cloudflare Worker Variables.", { status: 500 });
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: {
          'User-Agent': 'Cloudflare-Worker-Nav',
          'Authorization': `Bearer ${GITHUB_TOKEN}`
        }
      });

      if (!response.ok) {
        return new Response(`Error fetching Gist: HTTP ${response.status}`, { status: 500 });
      }
      
      const gistData = await response.json();
      
      // Replace 'BookMark' with the actual filename of your exported bookmark JSON in the Gist
      const fileData = Object.values(gistData.files)[0]; // Fallback to the first file if names vary
      
      if (!fileData) {
        return new Response("No files found in the specified Gist.", { status: 404 });
      }

      const bookmarksObj = JSON.parse(fileData.content);
      // Compatible with native chrome export or plugin formats
      const rootBookmarks = bookmarksObj.bookmarks || bookmarksObj.roots?.bookmark_bar?.children || [];

      const bookmarksJsonStr = JSON.stringify(rootBookmarks);

      const html = `
<!DOCTYPE html>
<html lang="zh-CN" class="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title data-i18n="pageTitle">StarNav Bookmark</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0" />
  <script>
    tailwind.config = { darkMode: 'class', theme: { extend: {} } }
  </script>
  <style>
    html { scroll-behavior: smooth; }
    body { transition: background-color 0.3s ease, color 0.3s ease; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .dark ::-webkit-scrollbar-thumb { background: #475569; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    
    .glass-nav { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200 min-h-screen pt-20 pb-10">

  <nav class="fixed top-0 left-0 right-0 z-50 glass-nav bg-white/75 dark:bg-slate-900/75 border-b border-slate-200 dark:border-slate-800 shadow-sm">
    <div class="max-w-[90rem] mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
      <div class="flex items-center gap-2 font-bold text-xl tracking-tight cursor-pointer" onclick="window.scrollTo(0,0)">
        <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">travel_explore</span>
        <span data-i18n="navTitle">StarNav</span>
      </div>
      <div class="flex items-center gap-2 sm:gap-4">
        <button id="langToggle" class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center justify-center" title="Toggle Language">
          <span class="material-symbols-outlined text-xl">translate</span>
        </button>
        <button id="themeToggle" class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center justify-center" title="Toggle Theme">
          <span id="themeIcon" class="material-symbols-outlined text-xl">dark_mode</span>
        </button>
      </div>
    </div>
  </nav>

  <div class="max-w-[90rem] mx-auto mt-6 px-4 sm:px-6">
    <header class="mb-10 text-center">
      <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight" data-i18n="headerTitle">My Private Bookmarks</h1>
      <p class="mt-4 text-sm md:text-base font-medium text-slate-500 dark:text-slate-400" data-i18n="headerSubtitle">Securely synced from Private Gist &middot; Zero Server Cost</p>
    </header>

    <div class="max-w-3xl mx-auto mb-12">
      <form id="searchForm" class="flex items-center bg-white dark:bg-slate-800 rounded-full shadow-md p-1.5 pl-4 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
        <select id="searchEngine" class="bg-transparent border-none text-slate-600 dark:text-slate-300 py-2 outline-none font-bold cursor-pointer text-sm sm:text-base">
          <option value="google">Google</option>
          <option value="bing">Bing</option>
          <option value="github">GitHub</option>
        </select>
        <div class="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-3"></div>
        <input type="text" id="searchInput" class="flex-1 bg-transparent border-none text-slate-800 dark:text-slate-200 py-3 outline-none w-full text-sm sm:text-base" autocomplete="off" />
        <button type="submit" class="p-3 ml-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-md">
          <span class="material-symbols-outlined font-bold">search</span>
        </button>
      </form>
    </div>
    
    <div class="flex flex-col lg:flex-row gap-8 items-start">
      <aside class="hidden lg:block w-64 shrink-0 sticky top-24">
        <div class="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm" id="desktop-sidebar">
        </div>
      </aside>

      <div class="lg:hidden flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 no-scrollbar w-screen" id="mobile-sidebar">
      </div>

      <main id="bookmark-container" class="flex-1 w-full space-y-8">
      </main>
    </div>
    
    <footer class="mt-24 pt-8 pb-4 border-t border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center">
      <span class="text-sm font-medium text-slate-400 dark:text-slate-500 mb-1">⚡ Powered by Cloudflare Workers</span>
      <span class="text-xs text-slate-400 dark:text-slate-600">Generated dynamically from GitHub Gist</span>
    </footer>
  </div>

  <script>
    const bookmarksData = \${bookmarksJsonStr};

    const i18n = {
      zh: {
        pageTitle: "StarNav 星际导航",
        navTitle: "星际导航",
        headerTitle: "私藏导航站",
        headerSubtitle: "数据安全同步于 Private Gist · 零成本构建",
        searchPlaceholder: "输入过滤本地书签，回车进行全网搜索...",
        sidebarNav: "导航目录",
        folder_ToolbarFolder: "星标导航",
        folder_MenuFolder: "主菜单",
        folder_UnfiledFolder: "未分类收集",
        folder_MobileFolder: "移动端藏品",
        defaultFolder: "收藏夹"
      },
      en: {
        pageTitle: "StarNav Bookmarks",
        navTitle: "StarNav",
        headerTitle: "Private Bookmarks",
        headerSubtitle: "Securely synced from Private Gist · Zero Server Cost",
        searchPlaceholder: "Filter local bookmarks or press Enter to search web...",
        sidebarNav: "Directory",
        folder_ToolbarFolder: "Bookmarks Bar",
        folder_MenuFolder: "Bookmarks Menu",
        folder_UnfiledFolder: "Other Bookmarks",
        folder_MobileFolder: "Mobile Bookmarks",
        defaultFolder: "Folder"
      }
    };

    let currentLang = localStorage.getItem('lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en');
    
    function applyI18n() {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[currentLang][key]) el.innerText = i18n[currentLang][key];
      });
      document.getElementById('searchInput').placeholder = i18n[currentLang].searchPlaceholder;
      renderBookmarks();
    }

    document.getElementById('langToggle').addEventListener('click', () => {
      currentLang = currentLang === 'zh' ? 'en' : 'zh';
      localStorage.setItem('lang', currentLang);
      applyI18n();
    });

    const htmlElement = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    let currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    function applyTheme() {
      if (currentTheme === 'dark') {
        htmlElement.classList.add('dark');
        themeIcon.innerText = 'light_mode';
      } else {
        htmlElement.classList.remove('dark');
        themeIcon.innerText = 'dark_mode';
      }
    }
    
    applyTheme();
    document.getElementById('themeToggle').addEventListener('click', () => {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', currentTheme);
      applyTheme();
    });

    function escapeHtml(unsafe) {
      return (unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function renderNode(node) {
      const url = node.url || node.url_string;
      const title = node.title || node.name;
      const children = node.children || node.folder_children;
      
      if (url) {
        let hostname = 'unknown';
        try { hostname = new URL(url).hostname; } catch(e) {}
        const faviconUrl = "https://www.google.com/s2/favicons?domain=" + hostname + "&sz=32";
        const safeTitle = escapeHtml(title);
        const safeUrl = escapeHtml(url);
        
        const tooltip = safeTitle + "\\n" + safeUrl;
        
        return \\\`
          <a href="\\\${safeUrl}" target="_blank" title="\\\${tooltip}" data-title="\\\${safeTitle.toLowerCase()}" data-url="\\\${safeUrl.toLowerCase()}"
             class="bookmark-item flex items-center p-3 bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-blue-400 dark:hover:border-blue-500 transition-all border border-slate-100 dark:border-slate-700 no-underline text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 group">
            <img src="\\\${faviconUrl}" class="w-6 h-6 mr-3 rounded-md bg-white flex-shrink-0 object-contain shadow-sm" loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2JjYmNiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiPjwvY2lyY2xlPjxsGluZSB4MT0iMiIgeTE9IjEyIiB4Mj0iMjIiIHkyPSIxMiI+PC9saW5lPjxwYXRoIGQ9Ik0xMiAyYTE1LjMgMTUuMyAwIDAgMSA0IDEwIDE1LjMgMTUuMyAwIDAgMS00IDEwIDE1LjMgMTUuMyAwIDAgMS00LTEwIDE1LjMgMTUuMyAwIDAgMSA0LTEweiI+PC9wYXRoPjwvc3ZnPg=='" />
            <span class="truncate text-[15px] font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">\\\${safeTitle}</span>
          </a>
        \\\`;
      } 
      else if (children && children.length > 0) {
        return \\\`
          <div class="nested-folder col-span-full mt-2 mb-1">
            <h3 class="text-sm font-bold text-slate-400 dark:text-slate-500 mb-3 ml-1 uppercase tracking-wider">\\\${escapeHtml(title)}</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              \\\${children.map(renderNode).join('')}
            </div>
          </div>
        \\\`;
      }
      return '';
    }

    function renderBookmarks() {
      const container = document.getElementById('bookmark-container');
      const dSidebar = document.getElementById('desktop-sidebar');
      const mSidebar = document.getElementById('mobile-sidebar');
      
      let html = '';
      let sidebarHtml = '';
      let mobileSidebarHtml = '';

      bookmarksData.forEach((node, index) => {
        const title = node.title || node.name;
        const children = node.children || node.folder_children;
        if (children && children.length > 0) {
          let originalName = title;
          let folderName = i18n[currentLang]['folder_' + originalName] || originalName || i18n[currentLang].defaultFolder;
          
          let icon = 'folder';
          let iconColor = 'text-amber-500 dark:text-amber-400';
          let iconClass = 'material-symbols-outlined';
          
          if (originalName === 'ToolbarFolder') { icon = 'star'; iconColor = 'text-rose-500 dark:text-rose-400'; iconClass += ' filled'; }
          if (originalName === 'MenuFolder') { icon = 'menu_book'; iconColor = 'text-blue-500 dark:text-blue-400'; }
          if (originalName === 'UnfiledFolder') { icon = 'inbox'; iconColor = 'text-slate-500 dark:text-slate-400'; }
          if (originalName === 'MobileFolder') { icon = 'smartphone'; iconColor = 'text-emerald-500 dark:text-emerald-400'; }

          let folderId = 'folder-' + index;

          sidebarHtml += \\\`
            <a href="#\\\${folderId}" class="flex items-center gap-3 p-3 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm hover:text-blue-600 dark:hover:text-blue-400 transition-all mb-2 font-medium border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
              <span class="\\\${iconClass} \\\${iconColor} text-xl">\\\${icon}</span>
              <span class="truncate">\\\${escapeHtml(folderName)}</span>
            </a>
          \\\`;

          mobileSidebarHtml += \\\`
            <a href="#\\\${folderId}" class="flex-shrink-0 flex items-center gap-2 py-2.5 px-5 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm whitespace-nowrap active:scale-95 transition-transform">
              <span class="\\\${iconClass} \\\${iconColor} text-base">\\\${icon}</span>
              \\\${escapeHtml(folderName)}
            </a>
          \\\`;

          html += \\\`
            <div id="\\\${folderId}" class="folder-block bg-slate-100/50 dark:bg-slate-800/20 p-6 sm:p-8 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm scroll-mt-24">
              <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700 flex items-center">
                <span class="\\\${iconClass} mr-3 text-3xl \\\${iconColor}">\\\${icon}</span>
                \\\${escapeHtml(folderName)}
              </h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                \\\${children.map(renderNode).join('')}
              </div>
            </div>
          \\\`;
        }
      });

      container.innerHTML = html;
      dSidebar.innerHTML = \\\`<div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-5 ml-2" data-i18n="sidebarNav">\\\${i18n[currentLang].sidebarNav}</div>\\\` + sidebarHtml;
      mSidebar.innerHTML = mobileSidebarHtml;
    }

    applyI18n();

    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    const searchEngine = document.getElementById('searchEngine');

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      
      document.querySelectorAll('.bookmark-item').forEach(item => {
        const t = item.getAttribute('data-title');
        const u = item.getAttribute('data-url');
        if (t.includes(q) || u.includes(q)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });

      document.querySelectorAll('.nested-folder, .folder-block').forEach(folder => {
        const visibleItems = Array.from(folder.querySelectorAll('.bookmark-item')).filter(i => i.style.display !== 'none');
        if (visibleItems.length === 0 && q !== '') {
          folder.style.display = 'none';
        } else {
          folder.style.display = '';
        }
      });
    });

    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = searchInput.value.trim();
      if (!q) return;
      const engine = searchEngine.value;
      let url = '';
      if (engine === 'google') url = 'https://www.google.com/search?q=' + encodeURIComponent(q);
      if (engine === 'bing') url = 'https://www.bing.com/search?q=' + encodeURIComponent(q);
      if (engine === 'github') url = 'https://github.com/search?q=' + encodeURIComponent(q);
      
      window.open(url, '_blank');
    });

  </script>
</body>
</html>
      \`;

      return new Response(html, {
        headers: { 
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=600'
        }
      });
      
    } catch (error) {
      return new Response(\`System Error: \${error.message}\`, { status: 500 });
    }
  }
}

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
      const fileData = Object.values(gistData.files)[0];

      if (!fileData) {
        return new Response("No files found in the specified Gist.", { status: 404 });
      }

      const bookmarksObj = JSON.parse(fileData.content);
      const rootBookmarks = bookmarksObj.bookmarks || bookmarksObj.roots?.bookmark_bar?.children || [];
      const bookmarksJsonStr = JSON.stringify(rootBookmarks).replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/\//g, '\\/');

      const FALLBACK_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48bGluZSB4MT0iMiIgeTE9IjEyIiB4Mj0iMjIiIHkyPSIxMiIvPjxwYXRoIGQ9Ik0xMiAyYTE1LjMgMTUuMyAwIDAgMSA0IDEwIDE1LjMgMTUuMyAwIDAgMS00IDEwIDE1LjMgMTUuMyAwIDAgMS00LTEwIDE1LjMgMTUuMyAwIDAgMSA0LTEweiIvPjwvc3ZnPg==';

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

    /* Use specific transitions instead of transition-all for better performance */
    .bookmark-item {
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, color 0.2s ease;
      will-change: transform;
      contain: layout style paint;
    }
    .bookmark-item:hover { transform: translateY(-4px); }

    /* Fade-in animation via IntersectionObserver */
    .folder-block {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.4s ease, transform 0.4s ease;
    }
    .folder-block.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .favicon-img {
      background: #f1f5f9;
      transition: opacity 0.3s ease;
    }
    .dark .favicon-img { background: #334155; }
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
      <p id="currentDate" class="mt-4 text-base md:text-lg font-bold text-blue-600 dark:text-blue-400 tracking-wide"></p>
      <p class="mt-2 text-sm md:text-base font-medium text-slate-500 dark:text-slate-400" data-i18n="headerSubtitle">Securely synced from Private Gist &middot; Zero Server Cost</p>
    </header>

    <div class="max-w-3xl mx-auto mb-12">
      <form id="searchForm" class="flex items-center bg-white dark:bg-slate-800 rounded-full shadow-md p-1.5 pl-4 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow transition-colors">
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
      <aside class="hidden lg:block shrink-0 sticky top-24 z-40">
        <div class="group bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm w-16 hover:w-64 transition-[width] duration-300 overflow-hidden flex flex-col items-start" id="desktop-sidebar">
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

  <button id="backToTop" class="fixed bottom-8 right-8 z-50 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-[transform,opacity] duration-300 translate-y-20 opacity-0 flex flex-col items-center justify-center font-bold text-xs" onclick="window.scrollTo(0,0)">
    <span class="material-symbols-outlined text-xl leading-none -mb-1">arrow_upward</span>
    <span id="bttText" class="leading-none mt-1">TOP</span>
  </button>

  <script>
    const FALLBACK_ICON = '${FALLBACK_ICON}';
    const bookmarksData = ${bookmarksJsonStr};

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
        defaultFolder: "收藏夹",
        btt: "顶"
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
        defaultFolder: "Folder",
        btt: "TOP"
      }
    };

    let currentLang = localStorage.getItem('lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en');

    // --- Cached DOM references (avoid repeated querySelectorAll) ---
    const domCache = {};
    function getEl(id) {
      return domCache[id] || (domCache[id] = document.getElementById(id));
    }

    // Cache i18n elements once after first render
    let i18nEls = null;
    function applyI18n() {
      if (!i18nEls) i18nEls = document.querySelectorAll('[data-i18n]');
      const lang = i18n[currentLang];
      i18nEls.forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        if (lang[key]) el.textContent = lang[key];
      });
      getEl('searchInput').placeholder = lang.searchPlaceholder;
      getEl('bttText').textContent = lang.btt;
      updateDate();
    }

    function updateDate() {
      var d = new Date();
      getEl('currentDate').textContent = currentLang === 'zh'
        ? d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'
        : d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
    }

    document.getElementById('langToggle').addEventListener('click', function() {
      currentLang = currentLang === 'zh' ? 'en' : 'zh';
      localStorage.setItem('lang', currentLang);
      // Only update text labels, avoid full re-render of bookmarks
      applyI18n();
      updateFolderLabels();
    });

    var htmlEl = document.documentElement;
    var themeIcon = document.getElementById('themeIcon');
    var currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    function applyTheme() {
      if (currentTheme === 'dark') {
        htmlEl.classList.add('dark');
        themeIcon.textContent = 'light_mode';
      } else {
        htmlEl.classList.remove('dark');
        themeIcon.textContent = 'dark_mode';
      }
    }

    applyTheme();
    document.getElementById('themeToggle').addEventListener('click', function() {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', currentTheme);
      applyTheme();
    });

    // Throttled scroll handler via requestAnimationFrame
    var scrollTicking = false;
    window.addEventListener('scroll', function() {
      if (!scrollTicking) {
        requestAnimationFrame(function() {
          var btt = getEl('backToTop');
          if (window.scrollY > 300) {
            btt.classList.remove('translate-y-20', 'opacity-0');
          } else {
            btt.classList.add('translate-y-20', 'opacity-0');
          }
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    }, { passive: true });

    function escapeHtml(s) {
      return (s || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function handleFaviconError(img) {
      img.onerror = null;
      img.src = FALLBACK_ICON;
    }

    // Build HTML for a single bookmark link node using array-join (faster than string concat)
    function renderNode(node) {
      var url = node.url || node.url_string;
      var title = node.title || node.name;
      var children = node.children || node.folder_children;

      if (url) {
        var hostname = 'unknown';
        try { hostname = new URL(url).hostname; } catch(e) {}
        var faviconUrl = "https://www.google.com/s2/favicons?domain=" + hostname + "&sz=32";
        var safeTitle = escapeHtml(title);
        var safeUrl = escapeHtml(url);
        var parts = [
          '<a href="', safeUrl,
          '" target="_blank" title="', safeTitle, '\\n', safeUrl,
          '" data-title="', safeTitle.toLowerCase(),
          '" data-url="', safeUrl.toLowerCase(),
          '" class="bookmark-item flex items-center p-3 bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 border border-slate-100 dark:border-slate-700 no-underline text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 relative">',
          '<img src="', faviconUrl, '" class="favicon-img w-6 h-6 mr-3 rounded-md flex-shrink-0 object-contain shadow-sm" loading="lazy" onerror="handleFaviconError(this)" />',
          '<span class="truncate text-[15px] font-medium">', safeTitle, '</span>',
          '</a>'
        ];
        return parts.join('');
      }

      if (children && children.length > 0) {
        var inner = [];
        for (var i = 0; i < children.length; i++) inner.push(renderNode(children[i]));
        return '<div class="nested-folder col-span-full mt-2 mb-1">'
          + '<h3 class="text-sm font-bold text-slate-400 dark:text-slate-500 mb-3 ml-1 uppercase tracking-wider">' + escapeHtml(title) + '</h3>'
          + '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">'
          + inner.join('')
          + '</div></div>';
      }
      return '';
    }

    // Metadata for each top-level folder (used by renderBookmarks and updateFolderLabels)
    var folderMeta = [];

    // Cached search references — populated once after first render
    var cachedItems = null;        // flat array of {el, title, url}
    var cachedFolders = null;      // array of {el, itemEls[]}

    function getFolderIcon(name) {
      switch (name) {
        case 'ToolbarFolder': return { icon: 'star',       color: 'text-rose-500 dark:text-rose-400',    cls: 'material-symbols-outlined filled' };
        case 'MenuFolder':    return { icon: 'menu_book',  color: 'text-blue-500 dark:text-blue-400',    cls: 'material-symbols-outlined' };
        case 'UnfiledFolder': return { icon: 'inbox',      color: 'text-slate-500 dark:text-slate-400',  cls: 'material-symbols-outlined' };
        case 'MobileFolder':  return { icon: 'smartphone', color: 'text-emerald-500 dark:text-emerald-400', cls: 'material-symbols-outlined' };
        default:              return { icon: 'folder',     color: 'text-amber-500 dark:text-amber-400',  cls: 'material-symbols-outlined' };
      }
    }

    function renderBookmarks() {
      var container = getEl('bookmark-container');
      var dSidebar = getEl('desktop-sidebar');
      var mSidebar = getEl('mobile-sidebar');

      var htmlParts = [];
      var sParts = [];   // desktop sidebar
      var mParts = [];   // mobile sidebar
      folderMeta = [];

      var lang = i18n[currentLang];

      bookmarksData.forEach(function(node, index) {
        var title = node.title || node.name;
        var children = node.children || node.folder_children;
        if (!children || children.length === 0) return;

        var originalName = title;
        var folderName = lang['folder_' + originalName] || originalName || lang.defaultFolder;
        var fi = getFolderIcon(originalName);
        var folderId = 'folder-' + index;

        folderMeta.push({ id: folderId, originalName: originalName });

        sParts.push(
          '<a href="#', folderId, '" data-folder-label="', originalName,
          '" title="', escapeHtml(folderName),
          '" class="flex items-center w-full gap-3 p-2 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-2 font-medium border border-transparent hover:border-slate-100 dark:hover:border-slate-600">',
          '<span class="', fi.cls, ' ', fi.color, ' text-2xl flex-shrink-0 flex items-center justify-center w-6 h-6">', fi.icon, '</span>',
          '<span class="truncate opacity-0 group-hover:opacity-100 transition-opacity duration-300" data-folder-text="', originalName, '">', escapeHtml(folderName), '</span>',
          '</a>'
        );

        mParts.push(
          '<a href="#', folderId,
          '" class="flex-shrink-0 flex items-center gap-2 py-2.5 px-5 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm whitespace-nowrap active:scale-95 transition-transform">',
          '<span class="', fi.cls, ' ', fi.color, ' text-base">', fi.icon, '</span>',
          '<span data-folder-text="', originalName, '">', escapeHtml(folderName), '</span>',
          '</a>'
        );

        var childrenHtml = [];
        for (var i = 0; i < children.length; i++) childrenHtml.push(renderNode(children[i]));

        htmlParts.push(
          '<div id="', folderId, '" class="folder-block bg-slate-100/50 dark:bg-slate-800/20 p-6 sm:p-8 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm scroll-mt-24">',
          '<h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700 flex items-center">',
          '<span class="', fi.cls, ' mr-3 text-3xl ', fi.color, '">', fi.icon, '</span>',
          '<span data-folder-text="', originalName, '">', escapeHtml(folderName), '</span>',
          '</h2>',
          '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">',
          childrenHtml.join(''),
          '</div></div>'
        );
      });

      container.innerHTML = htmlParts.join('');
      dSidebar.innerHTML =
        '<div class="flex items-center w-full mb-6 ml-2 overflow-hidden mt-2" title="' + lang.sidebarNav + '">'
        + '<span class="material-symbols-outlined text-slate-400 dark:text-slate-500 text-xl flex-shrink-0">format_list_bulleted</span>'
        + '<span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">' + lang.sidebarNav + '</span>'
        + '</div>'
        + sParts.join('');
      mSidebar.innerHTML = mParts.join('');

      // Reset search caches after re-render
      cachedItems = null;
      cachedFolders = null;

      // IntersectionObserver for fade-in (created once per render)
      var folderBlocks = container.querySelectorAll('.folder-block');
      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer.unobserve(entry.target);
            }
          });
        }, { rootMargin: '100px 0px', threshold: 0.01 });
        folderBlocks.forEach(function(block) { observer.observe(block); });
      } else {
        folderBlocks.forEach(function(block) { block.classList.add('visible'); });
      }
    }

    // Update only folder name labels after a language switch (no DOM rebuild)
    function updateFolderLabels() {
      var lang = i18n[currentLang];
      document.querySelectorAll('[data-folder-text]').forEach(function(el) {
        var name = el.getAttribute('data-folder-text');
        el.textContent = lang['folder_' + name] || name || lang.defaultFolder;
      });
      // Update sidebar link titles
      document.querySelectorAll('[data-folder-label]').forEach(function(el) {
        var name = el.getAttribute('data-folder-label');
        var label = lang['folder_' + name] || name || lang.defaultFolder;
        el.title = label;
      });
    }

    // Build search cache lazily on first search use
    function buildSearchCache() {
      var allItemEls = document.querySelectorAll('.bookmark-item');
      cachedItems = [];
      for (var i = 0; i < allItemEls.length; i++) {
        cachedItems.push({
          el: allItemEls[i],
          title: allItemEls[i].getAttribute('data-title'),
          url: allItemEls[i].getAttribute('data-url')
        });
      }

      // Map each folder/nested-folder to its contained bookmark elements
      var allFolderEls = document.querySelectorAll('.nested-folder, .folder-block');
      cachedFolders = [];
      for (var j = 0; j < allFolderEls.length; j++) {
        var folderEl = allFolderEls[j];
        var items = folderEl.querySelectorAll('.bookmark-item');
        cachedFolders.push({ el: folderEl, items: items });
      }
    }

    // Initial render
    renderBookmarks();
    applyI18n();

    // Search
    var searchInput = getEl('searchInput');
    var searchForm = getEl('searchForm');
    var searchEngine = getEl('searchEngine');

    var searchTimer = null;
    searchInput.addEventListener('input', function(e) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function() {
        var q = e.target.value.toLowerCase();

        // Build cache on first search interaction
        if (!cachedItems) buildSearchCache();

        // Show/hide bookmark items
        for (var i = 0; i < cachedItems.length; i++) {
          var item = cachedItems[i];
          item.el.style.display = (!q || item.title.indexOf(q) !== -1 || item.url.indexOf(q) !== -1) ? '' : 'none';
        }

        // Show/hide folders based on whether they still have visible children
        for (var j = 0; j < cachedFolders.length; j++) {
          var folder = cachedFolders[j];
          if (!q) {
            folder.el.style.display = '';
            continue;
          }
          var hasVisible = false;
          for (var k = 0; k < folder.items.length; k++) {
            if (folder.items[k].style.display !== 'none') { hasVisible = true; break; }
          }
          folder.el.style.display = hasVisible ? '' : 'none';
        }
      }, 150);
    });

    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var q = searchInput.value.trim();
      if (!q) return;
      var engine = searchEngine.value;
      var urls = {
        google: 'https://www.google.com/search?q=',
        bing:   'https://www.bing.com/search?q=',
        github: 'https://github.com/search?q='
      };
      window.open((urls[engine] || urls.google) + encodeURIComponent(q), '_blank');
    });

  </script>
</body>
</html>
      `;

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=86400'
        }
      });

    } catch (error) {
      return new Response("System Error: " + error.message, { status: 500 });
    }
  }
}

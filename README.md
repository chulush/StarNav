# StarNav

A beautiful, zero-cost, serverless personal bookmark navigation site powered by Cloudflare Workers and GitHub Gist.

## Features

- **Zero Hosting Cost**: Runs entirely on Cloudflare Workers free tier.
- **Secure Backup**: Data is fetched securely from your Private GitHub Gist. No database to maintain.
- **Auto Sync**: Simply export your browser bookmarks to your Gist, and the site updates automatically.
- **Super Fast Filtering**: Local search implementation allows instant filtering of hundreds of bookmarks.
- **Multi-Engine Search**: Integrated search bar for Google, Bing, and GitHub.
- **Responsive Design**: Beautiful grid layouts for desktop, and fully responsive for mobile devices.
- **Native Dark Mode**: Auto-detects system theme and allows manual toggling (with local storage memory).
- **i18n Support**: Automatically detects browser language (supports English and Simplified Chinese) with manual toggle.
- **Smart Icons & Tooltips**: Uses Google Favicon service to render site icons automatically. Displays full URLs on hover.

## Setup Instructions

### 1. Prepare your Bookmarks Data
1. Export your bookmarks from your browser (e.g., Chrome, Edge) into JSON format (or use a plugin to sync the raw JSON tree).
2. Go to [GitHub Gists](https://gist.github.com/).
3. Create a **Secret Gist**.
4. Name the file `BookMark` (case-sensitive) and paste your JSON content.
5. Save the Gist and copy the **Gist ID** from the URL (the long alphanumeric string).

### 2. Get a GitHub Token
1. Go to your GitHub [Developer Settings -> Personal Access Tokens (Classic)](https://github.com/settings/tokens).
2. Click **Generate new token (classic)**.
3. Give it a name (e.g., "StarNav Worker").
4. Under scopes, check **`gist`** (Create gists).
5. Generate the token and copy it immediately (it starts with `ghp_`).

### 3. Deploy to Cloudflare Workers
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages**.
2. Click **Create Application** -> **Create Worker**.
3. Name your worker (e.g., `starnav`) and click **Deploy**.
4. Click **Edit code**.
5. Copy the contents of `worker.js` from this repository and replace the default code in the editor.
6. Click **Deploy**.

### 4. Configure Environment Variables
1. Go back to the Worker's overview page.
2. Navigate to **Settings** -> **Variables and Secrets**.
3. Click **Add variable** and add the following two variables:
   - Variable Name: `GIST_ID`
   - Value: `<Your Gist ID>`
   - Variable Name: `GITHUB_TOKEN`
   - Value: `<Your GitHub PAT>` (Make sure to click **Encrypt** for security!)
4. Click **Deploy** to save changes.

### 5. Enjoy!
Visit your `*.workers.dev` domain. Your beautiful, private bookmark navigation site is now live!

## License

MIT License

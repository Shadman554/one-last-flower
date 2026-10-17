# 🌸 One Last Flower — Deployment & Database Guide

This guide explains how to deploy **One Last Flower** to the cloud so players can play on their phones or computers, and how player answers and confirmed dates are saved in the persistent SQLite database.

---

## 📋 Quick Overview

- **Runtime**: Node.js 24+ (uses native `node:sqlite`)
- **Database**: SQLite (`data/meeting-dates.sqlite` or path set by `GAME_DB_PATH`)
- **Web App**: `http://your-domain/`
- **Admin Dashboard**: `http://your-domain/admin` (unlocks with your secret `ADMIN_KEY`)
- **Healthcheck**: `http://your-domain/api/health`

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4173` | The HTTP port the server listens on |
| `HOST` | `0.0.0.0` | Host interface to bind to |
| `GAME_DB_PATH` | `./data/meeting-dates.sqlite` | Absolute or relative path to SQLite database |
| `ADMIN_KEY` | `love` | Secret passcode to unlock the `/admin` dashboard |
| `NODE_ENV` | `production` | Set to `production` in live environments |

---

## 🚀 Option 1: Deploy to Render (Recommended for Simplicity)

Render provides an easy hosting platform. Because SQLite requires persistent disk storage to preserve data across restarts, Render's Starter plan with a Disk mount is ideal.

### Steps:
1. Push your repository to GitHub or GitLab.
2. Log in to [Render.com](https://render.com) and click **New +** → **Blueprint**.
3. Select your repository. Render will automatically detect `render.yaml`!
4. Render will configure:
   - Node runtime with start command `node server.mjs`
   - Persistent Disk mounted to `/var/data`
   - `GAME_DB_PATH=/var/data/meeting-dates.sqlite`
   - An auto-generated `ADMIN_KEY` (or set your own in Environment settings).
5. Click **Apply**. Within 2 minutes, your game is live at `https://<your-app>.onrender.com`!

---

## 🚂 Option 2: Deploy to Railway

Railway automatically builds and deploys using the bundled `Procfile` and `railway.json`.

1. Go to [Railway.app](https://railway.app) and create a **New Project**.
2. Choose **Deploy from GitHub repo** and select this repository.
3. In your service settings:
   - Click **Add Volume** and mount it to `/app/data`.
   - Under **Variables**, add:
     - `GAME_DB_PATH = /app/data/meeting-dates.sqlite`
     - `ADMIN_KEY = your_secret_password`
4. Under **Settings**, click **Generate Domain**.
5. Your game is live!

---

## 🪰 Option 3: Deploy to Fly.io

Fly.io runs the app inside a lightweight micro-VM with persistent volume support.

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh` (or `winget install flyctl` on Windows).
2. Run in the project folder:
   ```bash
   fly launch
   ```
3. Create the persistent volume for SQLite:
   ```bash
   fly volumes create flower_data --size 1
   ```
4. Set your admin secret key:
   ```bash
   fly secrets set ADMIN_KEY="your_secret_password"
   ```
5. Deploy:
   ```bash
   fly deploy
   ```

---

## 🐳 Option 4: Deploy with Docker & Docker Compose (Any VPS / Server)

If you have a Linux server (Ubuntu/Debian, DigitalOcean Droplet, Linode, AWS EC2, Hetzner, etc.):

1. Clone or copy your project files to the server.
2. Run Docker Compose:
   ```bash
   docker compose up -d --build
   ```
3. To view logs:
   ```bash
   docker compose logs -f
   ```
4. Your database is automatically persisted in the `one_last_flower_data` Docker volume.

To set a custom admin key or port, create a `.env` file:
```env
PORT=4173
ADMIN_KEY=my_special_key
```

---

## 🐧 Option 5: Standard Ubuntu VPS (systemd + PM2 or Node)

If running directly on a Linux VPS without Docker:

1. Install Node.js 24:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
2. In your game directory, install dependencies:
   ```bash
   npm install --omit=dev
   ```
3. Run with PM2 for automatic restart on crash or reboot:
   ```bash
   sudo npm install -g pm2
   ADMIN_KEY="your_secret_key" PORT=4173 pm2 start server.mjs --name "one-last-flower"
   pm2 startup
   pm2 save
   ```
4. Configure Nginx with SSL (Let's Encrypt Certbot) as a reverse proxy:
   ```nginx
   server {
       server_name yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:4173;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-Host $host;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 🌸 Player Data & Admin Dashboard

### What Data is Saved in the Database?
Whenever anyone plays:
1. **Player Name**: Optional name entered on the title screen (defaults to "Cute Little Mouse").
2. **Love Rating**: What rating they selected (10/10, 20/10, 50/10, 100/10, 1000/10, or ∞).
3. **Secret Question**: Whether they clicked "Yes ❤️" or "No 😢".
4. **Meeting Choice**: Whether they clicked "Choose a day ❤️" or "Not yet 🌸".
5. **Meeting Date**: The specific calendar date they confirmed (e.g. `2026-10-25`).
6. **Gameplay Stats**: Flowers collected, jump attempts, total play time, completion status.
7. **Timestamps**: Exactly when the session started and last updated.

### Viewing the Data:
1. Open `https://your-domain/admin` in your browser.
2. Enter your secret `ADMIN_KEY` (default is `love` if not set).
3. The dashboard displays:
   - **Summary KPI cards**
   - **Confirmed meeting dates banner**
   - **Live player interaction log table**
   - **Export as CSV** (open directly in Excel or Google Sheets)
   - **Export as JSON**
   - **Session deletion** (to clear test runs)

---

## 💾 Backing Up the Database

The SQLite database is stored in a single file: `data/meeting-dates.sqlite`.
To create a backup:
```bash
# Copy the database file
cp data/meeting-dates.sqlite data/meeting-dates.sqlite.bak
```
Or download the CSV/JSON directly from the `/admin` dashboard anytime!

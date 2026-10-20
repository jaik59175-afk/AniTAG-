# AniTAG — One tag · Every world (Frontend + Backend + Installable PWA)

Complete full-stack ad-free anime streaming application ready for **Vercel** and **Render**.

## Project Structure
- `public/index.html` — Complete AniTAG Frontend UI, custom media player, left-side thumb volume gesture, Dark/Light & Soft Pastel Mood themes, and PWA installer.
- `public/manifest.json` & `public/sw.js` — Native Progressive Web App (PWA) manifest and Service Worker so users can install AniTAG as a standalone app on Android, iOS, and PC.
- `server.js` — Node.js + Express backend with AniList GraphQL catalog sync (`/api/trending`), multi-provider episode stream resolver (`/api/stream`), and built-in HLS `.m3u8` CORS proxy (`/api/proxy`).
- `vercel.json` & `render.yaml` — Zero-config deployment files for Vercel and Render.

## How to Deploy on Render (Recommended for Full Backend + Proxy)
1. Upload this folder to a GitHub repository.
2. Go to [Render](https://render.com/) -> **New +** -> **Web Service** and connect your repository.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Click **Deploy Web Service**.

## How to Deploy on Vercel
1. Upload this folder to GitHub or import directly in [Vercel](https://vercel.com/new).
2. Vercel automatically detects `vercel.json` and deploys both the `/api/*` backend and `public/` frontend.

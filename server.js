/**
 * AniTAG — Full-Stack Anime Streaming Server (Node.js + Express)
 * Ready for 1-click deployment on Render.com or Vercel.com
 */
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// Files are in repo root (no /public folder), so serve only these safe files
const PUBLIC_FILES = ['index.html', 'manifest.json', 'sw.js', 'icon.svg'];
PUBLIC_FILES.forEach((f) => {
  app.get('/' + f, (req, res) => res.sendFile(path.join(__dirname, f)));
});

// Public Consumet / Anime Provider API mirrors for resolving real HLS (.m3u8) streams
const ANIME_PROVIDERS = [
  process.env.ANIME_API_URL,
  'https://consumet-api-clone.vercel.app',
  'https://api-consumet-org-six.vercel.app'
].filter(Boolean);

// Curated reliable HD fallback streams so playback never fails
const FALLBACK_STREAMS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
];

// 1. Live Anime Catalog & Search via Official AniList GraphQL API
app.get('/api/trending', async (req, res) => {
  try {
    const query = `
      query {
        Page(page: 1, perPage: 12) {
          media(type: ANIME, sort: TRENDING_DESC) {
            id

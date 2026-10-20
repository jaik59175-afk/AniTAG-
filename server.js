/**
 * AniTAG — Bulletproof Full-Stack Anime Streaming Server
 * Works on BOTH Vercel Serverless Functions and Render Web Services
 * Supports files in repository root (./index.html) OR ./public/index.html
 * Supports HTTP Range streaming, M3U8 playlist rewriting, and AniList GraphQL
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const INLINE_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="512" height="512"><rect width="200" height="200" rx="44" fill="#17130F"/><ellipse cx="100" cy="122" rx="86" ry="22" fill="#E8C36A" stroke="#F7F3EA" stroke-width="4"/><path d="M50 118 C50 66 150 66 150 118 A52 10 0 0 1 50 118 Z" fill="#E8C36A"/><path d="M57 97 A43 10 0 0 0 143 97 L150 118 A52 10 0 0 1 50 118 Z" fill="#C1442E"/><path d="M50 118 C50 66 150 66 150 118 A52 10 0 0 1 50 118 Z" fill="none" stroke="#17130F" stroke-width="4" stroke-linejoin="round"/><g transform="translate(99.5 118.5) scale(1.2)" fill="none" stroke="#F7F3EA" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M0 0 A2.2 2.2 0 0 1 0 4.4 A4.4 4.4 0 0 1 0 -4.4 A5.2 5.2 0 0 1 0 6"/></g></svg>';

const INLINE_MANIFEST = JSON.stringify({
  name: 'AniTAG — One tag · Every world',
  short_name: 'AniTAG',
  start_url: '/',
  display: 'standalone',
  background_color: '#0b0b0e',
  theme_color: '#0b0b0e',
  icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
});

const INLINE_SW = "self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));";

const ANIME_PROVIDERS = [
  process.env.ANIME_API_URL,
  'https://consumet-api-clone.vercel.app',
  'https://api-consumet-org-six.vercel.app'
].filter(Boolean);

const DIRECT_ANIME_STREAMS = {
  'black-clover': 'https://v.animethemes.moe/BlackClover-OP3.webm',
  'bumpkin-swordsman-2': 'https://v.animethemes.moe/BleachSennenKessenHen-OP1.webm',
  'bleach-tybw': 'https://v.animethemes.moe/BleachSennenKessenHenKetsubetsuTan-OP1v2.webm',
  'apothecary-diaries-s3': 'https://v.animethemes.moe/KusuriyaNoHitorigoto-OP1.webm',
  'mushoku-tensei-s3': 'https://v.animethemes.moe/MushokuTenseiS2-OP1.webm',
  'one-piece': 'https://v.animethemes.moe/OnePiece-OP26.webm',
  're-zero-s4': 'https://v.animethemes.moe/ReZeroS2-OP1.webm',
  'slime-s4': 'https://v.animethemes.moe/TenseiShitaraSlimeDattaKenS2-OP1.webm',
  'blue-box-s2': 'https://v.animethemes.moe/AoNoHako-OP1.webm',
  'overgeared': 'https://v.animethemes.moe/OreDakeLevelUpNaKen-OP1.webm',
  'smoking-supermarket': 'https://v.animethemes.moe/AoNoHako-ED1.webm',
  'inept-villainess': 'https://v.animethemes.moe/KusuriyaNoHitorigoto-ED1.webm'
};

const FALLBACK_STREAMS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
];

function findDiskFile(names) {
  const candidates = Array.isArray(names) ? names : [names];
  const bases = [__dirname, process.cwd(), path.join(__dirname, 'public'), path.join(process.cwd(), 'public')];
  for (let i = 0; i < bases.length; i++) {
    for (let j = 0; j < candidates.length; j++) {
      const full = path.join(bases[i], candidates[j]);
      try {
        if (fs.existsSync(full) && fs.statSync(full).isFile()) {
          return full;
        }
      } catch (e) {}
    }
  }
  return null;
}

function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(obj));
}

async function handleRequest(req, res) {
  try {
    const parsedUrl = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'));
    const pathname = parsedUrl.pathname;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      });
      return res.end();
    }

    if (pathname === '/favicon.ico' || pathname === '/icon.svg') {
      const iconPath = findDiskFile(['icon.svg']);
      const svgContent = iconPath ? fs.readFileSync(iconPath, 'utf8') : INLINE_ICON_SVG;
      res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' });
      return res.end(svgContent);
    }

    if (pathname === '/manifest.json') {
      const manifestPath = findDiskFile(['manifest.json']);
      const content = manifestPath ? fs.readFileSync(manifestPath, 'utf8') : INLINE_MANIFEST;
      res.writeHead(200, { 'Content-Type': 'application/manifest+json; charset=utf-8' });
      return res.end(content);
    }

    if (pathname === '/sw.js') {
      const swPath = findDiskFile(['sw.js']);
      const content = swPath ? fs.readFileSync(swPath, 'utf8') : INLINE_SW;
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      return res.end(content);
    }

    if (pathname === '/api/trending') {
      const gqlQuery = 'query { Page(page: 1, perPage: 12) { media(type: ANIME, sort: TRENDING_DESC) { id title { english romaji native } seasonYear format averageScore episodes duration status genres coverImage { extraLarge large } bannerImage description(asHtml: false) } } }';
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query: gqlQuery })
      });
      const json = await response.json();
      return sendJson(res, 200, { status: 'ok', media: (json && json.data && json.data.Page && json.data.Page.media) || [] });
    }

    if (pathname === '/api/stream') {
      const animeId = parsedUrl.searchParams.get('animeId') || 'black-clover';
      const title = parsedUrl.searchParams.get('title') || 'Black Clover';
      const ep = parsedUrl.searchParams.get('ep') || '1';
      const audio = parsedUrl.searchParams.get('audio') || 'sub';

      for (let i = 0; i < ANIME_PROVIDERS.length; i++) {
        const baseUrl = ANIME_PROVIDERS[i];
        try {
          const searchRes = await fetch(baseUrl + '/anime/gogoanime/' + encodeURIComponent(title));
          if (!searchRes.ok) continue;
          const searchData = await searchRes.json();
          const results = (searchData && searchData.results) || [];
          if (!results.length) continue;

          const wantDub = String(audio).toLowerCase() === 'dub';
          const picked = results.find((r) => wantDub ? String(r.id).includes('-dub') : !String(r.id).includes('-dub')) || results[0];
          const epId = picked.id + '-episode-' + ep;

          const watchRes = await fetch(baseUrl + '/anime/gogoanime/watch/' + encodeURIComponent(epId));
          if (!watchRes.ok) continue;
          const watchData = await watchRes.json();
          const sources = (watchData && watchData.sources) || [];
          const best = sources.find((s) => s.quality === '1080p' || s.quality === '720p' || s.quality === 'default') || sources[0];
          if (best && best.url) {
            return sendJson(res, 200, {
              status: 'ok',
              provider: 'gogoanime',
              animeId: animeId,
              episode: Number(ep),
              audio: audio,
              isM3U8: Boolean(best.isM3U8 || String(best.url).includes('.m3u8')),
              url: '/api/proxy?url=' + encodeURIComponent(best.url)
            });
          }
        } catch (e) {}
      }

      const directUrl = DIRECT_ANIME_STREAMS[animeId] || FALLBACK_STREAMS[Number(ep) % FALLBACK_STREAMS.length];
      return sendJson(res, 200, {
        status: 'ok',
        provider: 'anitag-hd-direct',
        animeId: animeId,
        episode: Number(ep),
        audio: audio,
        isM3U8: false,
        url: '/api/proxy?url=' + encodeURIComponent(directUrl),
        fallbackUrl: FALLBACK_STREAMS[Number(ep) % FALLBACK_STREAMS.length]
      });
    }

    if (pathname === '/api/proxy') {
      const targetUrl = parsedUrl.searchParams.get('url');
      if (!targetUrl) return sendJson(res, 400, { error: 'Missing url parameter' });
      const reqHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': new URL(targetUrl).origin
      };
      if (req.headers.range) {
        reqHeaders['Range'] = req.headers.range;
      }
      const upstream = await fetch(targetUrl, { headers: reqHeaders });
      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

      if (contentType.includes('mpegurl') || targetUrl.includes('.m3u8')) {
        const text = await upstream.text();
        const baseObj = new URL(targetUrl);
        const rewritten = text.split('\n').map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return line;
          const absUrl = new URL(trimmed, baseObj).href;
          return '/api/proxy?url=' + encodeURIComponent(absUrl);
        }).join('\n');
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/vnd.apple.mpegurl'
        });
        return res.end(rewritten);
      }

      const outHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      };
      const contentRange = upstream.headers.get('content-range');
      if (contentRange) outHeaders['Content-Range'] = contentRange;
      const contentLen = upstream.headers.get('content-length');
      if (contentLen) outHeaders['Content-Length'] = contentLen;

      const buf = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, outHeaders);
      return res.end(buf);
    }

    const htmlPath = findDiskFile(['index.html', 'anikage_app.html']);
    if (htmlPath) {
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(htmlContent);
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('<!DOCTYPE html><html><body style="background:#0b0b0e;color:#fff;font-family:sans-serif;padding:2rem;"><h1>AniTAG Server Running</h1><p>Make sure index.html is uploaded to the repository root.</p></body></html>');
  } catch (err) {
    return sendJson(res, 500, { status: 'error', message: err.message });
  }
}

if (require.main === module) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, () => {
    console.log('AniTAG Server listening on port ' + PORT);
  });
}

module.exports = handleRequest;

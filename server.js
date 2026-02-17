const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const APP_LIST_URL = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/';
const APP_DETAILS_URL = 'https://store.steampowered.com/api/appdetails?l=korean&appids=';

const STEAM_ERROR_GUIDE =
  '서버에서 Steam API에 연결할 수 없습니다. 네트워크에서 api.steampowered.com / store.steampowered.com:443 접근을 허용하세요.';

let appListCache = null;
let appListFetchedAt = 0;
const APP_LIST_TTL_MS = 1000 * 60 * 60 * 6;

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': MIME['.json'] });
  res.end(JSON.stringify(payload));
}

function normalize(str) {
  return (str || '').toLowerCase().trim();
}

async function steamFetch(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Steam API HTTP ${response.status}`);
    }

    return response;
  } catch (error) {
    const code = error?.cause?.code || error?.code || 'UNKNOWN';
    const networkCodes = ['ENETUNREACH', 'ECONNREFUSED', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT'];

    if (networkCodes.includes(code)) {
      const wrapped = new Error(`${STEAM_ERROR_GUIDE} (원인 코드: ${code})`);
      wrapped.isNetworkError = true;
      throw wrapped;
    }

    throw error;
  }
}

async function getAppList() {
  const isCacheValid = appListCache && Date.now() - appListFetchedAt < APP_LIST_TTL_MS;
  if (isCacheValid) return appListCache;

  const response = await steamFetch(APP_LIST_URL);
  const data = await response.json();
  const apps = data?.applist?.apps || [];
  appListCache = apps;
  appListFetchedAt = Date.now();
  return apps;
}

async function handleApi(req, res, parsedUrl) {
  if (req.method === 'GET' && parsedUrl.pathname === '/api/search') {
    try {
      const q = normalize(parsedUrl.searchParams.get('q'));
      if (!q || q.length < 2) {
        return json(res, 400, { message: '검색어는 2글자 이상 입력해주세요.' });
      }

      const appList = await getAppList();
      const results = appList
        .filter((app) => normalize(app.name).includes(q))
        .slice(0, 20)
        .map((app) => ({ appid: app.appid, name: app.name }));

      return json(res, 200, { results });
    } catch (error) {
      console.error(error);
      const message = error?.isNetworkError ? error.message : '검색 중 오류가 발생했습니다.';
      return json(res, 500, { message });
    }
  }

  if (req.method === 'GET' && parsedUrl.pathname.startsWith('/api/specs/')) {
    try {
      const appid = parsedUrl.pathname.split('/').pop();
      if (!/^\d+$/.test(appid)) {
        return json(res, 400, { message: '잘못된 앱 ID입니다.' });
      }

      const response = await steamFetch(`${APP_DETAILS_URL}${appid}`);
      const data = await response.json();
      const details = data?.[appid];
      if (!details?.success || !details?.data) {
        return json(res, 404, { message: '게임 정보를 찾을 수 없습니다.' });
      }

      const game = details.data;
      const requirements = game.pc_requirements || {};

      return json(res, 200, {
        appid,
        name: game.name,
        header_image: game.header_image,
        steam_url: `https://store.steampowered.com/app/${appid}`,
        minimum: requirements.minimum || '최소 사양 정보가 없습니다.',
        recommended: requirements.recommended || '권장 사양 정보가 없습니다.'
      });
    } catch (error) {
      console.error(error);
      const message = error?.isNetworkError ? error.message : '사양 조회 중 오류가 발생했습니다.';
      return json(res, 500, { message });
    }
  }

  return false;
}

function serveStatic(res, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (parsedUrl.pathname.startsWith('/api/')) {
    const handled = await handleApi(req, res, parsedUrl);
    if (handled !== false) return;
    return json(res, 404, { message: 'API 경로를 찾지 못했습니다.' });
  }

  serveStatic(res, parsedUrl.pathname);
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

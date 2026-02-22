import Router from 'koa-router';

const router = new Router();

/**
 * Прокси для Yandex Static API: запрашивает картинку карты на сервере и отдаёт клиенту.
 * Ключ API берётся из process.env.API_YANDEX_MAPS_KEY (не передаётся в браузер).
 * Параметры: lat, lon (обязательные), w, h, z (опционально).
 */
router.get('/api/static-map', async (ctx) => {
  const apiKey = process.env.API_YANDEX_MAPS_KEY;
  if (!apiKey) {
    ctx.status = 503;
    ctx.body = { error: 'Static map API key not configured' };
    return;
  }

  const lat = parseFloat(ctx.query.lat);
  const lon = parseFloat(ctx.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    ctx.status = 400;
    ctx.body = { error: 'Invalid lat or lon' };
    return;
  }

  const w = Math.min(650, parseInt(ctx.query.w, 10) || 640);
  const h = Math.min(450, parseInt(ctx.query.h, 10) || 400);
  const z = Math.min(21, Math.max(0, parseInt(ctx.query.z, 10) || 16));

  const ll = `${lon},${lat}`;
  const pt = `${lon},${lat},pm2rdm`;
  const params = new URLSearchParams({
    apikey: apiKey,
    ll,
    size: `${w},${h}`,
    z: String(z),
    pt,
  });
  const yandexUrl = `https://static-maps.yandex.ru/v1?${params.toString()}`;

  try {
    // Yandex проверяет Referer; при запросе с сервера передаём разрешённый домен (localhost или из env).
    const referer = process.env.YANDEX_MAPS_REFERER || 'https://localhost/';
    const response = await fetch(yandexUrl, {
      headers: {
        Accept: 'image/*',
        Referer: referer,
      },
    });
    if (!response.ok) {
      ctx.status = 502;
      ctx.body = { error: 'Yandex Static API error', status: response.status };
      return;
    }
    const contentType = response.headers.get('content-type') || 'image/png';
    ctx.set('Content-Type', contentType);
    ctx.set('Cache-Control', 'public, max-age=3600');
    const buffer = await response.arrayBuffer();
    ctx.body = Buffer.from(buffer);
  } catch (err) {
    console.error('Static map proxy error:', err);
    ctx.status = 502;
    ctx.body = { error: 'Failed to fetch map image' };
  }
});

export default router;

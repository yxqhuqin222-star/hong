const siteOrigin = 'https://yxqhuqin222-star.github.io';

function unauthorized() {
  return new Response('需要输入统计页密码。', {
    status: 401,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'WWW-Authenticate': 'Basic realm="Hong visit stats", charset="UTF-8"'
    }
  });
}

function validPassword(request, password) {
  if (!password) return false;
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Basic ')) return false;
  try {
    const bytes = Uint8Array.from(atob(authorization.slice(6)), (character) => character.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const separator = decoded.indexOf(':');
    return separator !== -1 && decoded.slice(separator + 1) === password;
  } catch {
    return false;
  }
}

function beijingTime(isoTime) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).format(new Date(isoTime)).replaceAll('/', '-');
}

function statsPage(total, rows, page, pageCount) {
  const items = rows.length
    ? rows.map((row, index) => `<li><span>第 ${total - (page - 1) * 100 - index} 次</span><time datetime="${row.opened_at}">${beijingTime(row.opened_at)}</time></li>`).join('')
    : '<li>还没有打开记录。</li>';
  const previous = page > 1 ? `<a href="/stats?page=${page - 1}">上一页</a>` : '';
  const next = page < pageCount ? `<a href="/stats?page=${page + 1}">下一页</a>` : '';
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>聊天页打开记录</title>
  <style>
    * { box-sizing: border-box; }
    body { width: min(100% - 32px, 520px); margin: 48px auto; background: #ededed; color: #191919; font: 16px/1.5 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { margin: 0; color: #555; }
    strong { color: #07a850; font-size: 32px; font-variant-numeric: tabular-nums; }
    ol { margin: 24px 0 0; padding: 0; border-radius: 10px; background: #fff; list-style: none; overflow: hidden; }
    li { display: flex; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #eee; }
    li:last-child { border-bottom: 0; }
    li span { color: #666; }
    time { font-variant-numeric: tabular-nums; }
    nav { display: flex; justify-content: space-between; gap: 16px; margin-top: 16px; }
    a { color: #067d3f; }
  </style>
</head>
<body>
  <h1>聊天页打开记录</h1>
  <p>累计打开 <strong>${total}</strong> 次</p>
  <ol>${items}</ol>
  <nav aria-label="记录翻页">${previous}<span>第 ${page} / ${pageCount} 页</span>${next}</nav>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/visit' && request.method === 'POST') {
      if (request.headers.get('Origin') !== siteOrigin) return new Response('Forbidden', { status: 403 });
      try {
        await env.DB.prepare('INSERT INTO page_opens (opened_at) VALUES (?)').bind(new Date().toISOString()).run();
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': siteOrigin,
            'Cache-Control': 'no-store',
            Vary: 'Origin'
          }
        });
      } catch (error) {
        console.error('Failed to record page open', error);
        return new Response('统计服务暂时不可用', { status: 503 });
      }
    }

    if (path === '/stats' && request.method === 'GET') {
      if (!validPassword(request, env.STATS_PASSWORD)) return unauthorized();
      try {
        const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM page_opens').first();
        const total = Number(count.total);
        const pageCount = Math.max(1, Math.ceil(total / 100));
        const rawPage = url.searchParams.get('page') || '1';
        if (!/^[1-9]\d*$/.test(rawPage) || Number(rawPage) > pageCount) {
          return new Response('页码无效', { status: 400, headers: { 'Cache-Control': 'no-store' } });
        }
        const page = Number(rawPage);
        const visits = await env.DB.prepare('SELECT opened_at FROM page_opens ORDER BY id DESC LIMIT 100 OFFSET ?')
          .bind((page - 1) * 100).all();
        return new Response(statsPage(total, visits.results, page, pageCount), {
          headers: {
            'Cache-Control': 'no-store',
            'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
            'Content-Type': 'text/html; charset=utf-8',
            'Referrer-Policy': 'no-referrer',
            'X-Content-Type-Options': 'nosniff'
          }
        });
      } catch (error) {
        console.error('Failed to read page opens', error);
        return new Response('统计服务暂时不可用', { status: 503 });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};

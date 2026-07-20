// EdgeOne Pages Edge Function —— 路由: /api/docs
// 自包含的交互式 API 文档页（Swagger UI），读取 /api/openapi.json。
// 从 CDN 加载 swagger-ui 资源，并注入品牌绿主题定制。

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>知微 ZhiWei · API 文档</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css"/>
<style>
  :root { --brand: #1D9E75; }
  body { margin: 0; background: #fff; }
  .topbar { display: none; }
  .swagger-ui .info .title { font-weight: 600; }
  .swagger-ui .opblock.opblock-get .opblock-summary-method { background: var(--brand); }
  .swagger-ui .opblock.opblock-get { border-color: var(--brand); background: rgba(29,158,117,.04); }
  .swagger-ui .opblock.opblock-get .opblock-summary { border-color: var(--brand); }
  .swagger-ui .btn.execute { background: var(--brand); border-color: var(--brand); }
  .swagger-ui .btn.authorize { color: var(--brand); border-color: var(--brand); }
  .swagger-ui .btn.authorize svg { fill: var(--brand); }
  .brand-bar { padding: 14px 20px; border-bottom: 1px solid #ececec; display: flex; align-items: center; gap: 10px; font-family: -apple-system, system-ui, sans-serif; }
  .brand-bar .dot { width: 18px; height: 18px; border-radius: 4px; background: var(--brand); }
  .brand-bar .name { font-size: 15px; font-weight: 600; color: #1a1a1a; }
  .brand-bar .tag { font-size: 12px; color: #888; margin-left: auto; }
</style>
</head>
<body>
<div class="brand-bar">
  <span class="dot"></span>
  <span class="name">知微 ZhiWei · 选题罗盘 API</span>
  <span class="tag">OpenAPI 3.0.3 · single source of truth</span>
</div>
<div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
<script>
  window.ui = SwaggerUIBundle({
    url: '/api/openapi.json',
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis],
    layout: 'BaseLayout',
    tryItOutEnabled: true,
    defaultModelsExpandDepth: 0,
  });
</script>
</body>
</html>`;

export function onRequest() {
  return new Response(HTML, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  });
}

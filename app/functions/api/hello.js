// EdgeOne Pages Function —— 路由: /api/hello
// 选题罗盘 TopicCompass · D1 骨架的"可运行"证据
// 导出 onRequest 处理所有 HTTP 方法，返回 JSON。

export function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const name = url.searchParams.get('name') || 'Hacker';

  const body = {
    ok: true,
    service: 'TopicCompass 选题罗盘',
    message: `Hello, ${name}! EdgeOne Makers Functions is running.`,
    hint: '这是数据回流 API 的骨架端点，后续在此写入选题/发布/互动数据到 Edge KV。',
    method: request.method,
    time: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  });
}

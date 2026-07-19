// 选题罗盘 · Functions 公共响应工具
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

export function ok(data) { return json({ ok: true, ...data }); }
export function fail(message, status = 400) { return json({ ok: false, error: message }, status); }

/** 预检请求 */
export function preflight() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function readBody(request) {
  try { return await request.json(); } catch { return null; }
}

import { validateData } from './engine.js';

const projectUrl = Deno.env.get('SUPABASE_URL');
const keyBag = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
const serverKey = keyBag.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const databaseHeaders = { apikey: serverKey, 'Content-Type': 'application/json' };
if (serverKey?.startsWith('eyJ')) databaseHeaders.Authorization = `Bearer ${serverKey}`;
const actions = new Set(['get','save_draft','publish','versions','restore','inquiries','update_inquiry','password','logout']);

function allowedOrigin(origin) {
  if (!origin || origin === 'https://lostnumbers-lab.github.io') return true;
  try { const url = new URL(origin); return url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname); } catch { return false; }
}
async function database(path, body) {
  const response = await fetch(`${projectUrl}/rest/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers: databaseHeaders,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000)
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.code === '28000' ? '관리자 로그인이 필요합니다.' : data.code === '40001' ? '다른 화면에서 초안이 변경되었습니다. 최신 초안을 다시 불러와 주세요.' : data.code === 'P0001' ? data.message : '서버 작업을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    error.status = data.code === '28000' ? 401 : data.code === '40001' ? 409 : 400;
    throw error;
  }
  return data;
}
const rpc = (name, args) => database(`rpc/${name}`, args);
async function getPublished() {
  const states = await database('chatbot_console_state?select=published_version_id&id=eq.true');
  const id = states[0]?.published_version_id;
  if (!id) throw new Error('게시된 대화 데이터가 없습니다.');
  const versions = await database(`chatbot_published_versions?select=id,version_number,title,config,created_at&id=eq.${id}`);
  const item = versions[0];
  return { config: item.config, version: { id: item.id, number: item.version_number, title: item.title, createdAt: item.created_at } };
}

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  const cors = { 'Access-Control-Allow-Origin': origin || 'https://lostnumbers-lab.github.io', 'Access-Control-Allow-Headers': 'apikey, content-type, x-admin-session', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', Vary: 'Origin', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const respond = (body, status = 200) => Response.json(body, { status, headers: cors });
  if (!allowedOrigin(origin)) return Response.json({ error: '허용되지 않은 출처입니다.' }, { status: 403 });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  try {
    if (request.method === 'GET' && new URL(request.url).pathname.endsWith('/public')) return respond(await getPublished());
    if (request.method !== 'POST') return respond({ error: '지원하지 않는 요청입니다.' }, 405);
    const text = await request.text();
    if (text.length > 1000000) return respond({ error: '요청 데이터는 1MB 이내로 입력해 주세요.' }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return respond({ error: 'JSON 형식을 확인해 주세요.' }, 400); }
    if (!body || typeof body !== 'object') return respond({ error: '요청 형식을 확인해 주세요.' }, 400);
    if (body.action === 'login') {
      if (typeof body.username !== 'string' || body.username.length > 100 || typeof body.password !== 'string' || new TextEncoder().encode(body.password).length > 72) return respond({ error: '로그인 정보를 확인해 주세요.' }, 400);
      const result = await rpc('chatbot_console_login', { p_username: body.username, p_password: body.password });
      return result.ok ? respond(result) : respond({ error: result.error }, result.locked ? 429 : 401);
    }
    const token = request.headers.get('x-admin-session') || '';
    if (!/^[a-f0-9]{64}$/.test(token)) return respond({ error: '관리자 로그인이 필요합니다.' }, 401);
    if (!actions.has(body.action)) return respond({ error: '지원하지 않는 관리 작업입니다.' }, 400);
    const payload = body.payload || {};
    // Authenticate before processing draft data. A privileged database key never
    // reaches the browser; each admin operation also rechecks the session in SQL.
    const state = await rpc('chatbot_console_action', { p_token: token, p_action: 'get', p_payload: {} });
    if (body.action === 'get') return respond(state);
    if (body.action === 'save_draft') validateData(payload.config);
    if (body.action === 'publish') validateData(state.draft);
    return respond(await rpc('chatbot_console_action', { p_token: token, p_action: body.action, p_payload: payload }));
  } catch (error) {
    return respond({ error: error.message || '요청을 완료하지 못했습니다.' }, error.status || 400);
  }
});

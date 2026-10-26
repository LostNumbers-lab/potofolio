let settings;
export async function getConsoleConfig() {
  if (!settings) {
    const response = await fetch(new URL('../data/console-config.json', import.meta.url), { cache: 'no-store' });
    if (!response.ok) throw new Error('서버 연결 설정을 읽지 못했습니다.');
    settings = await response.json();
  }
  return settings;
}
async function request(path, body, token) {
  const config = await getConsoleConfig();
  let response;
  try {
    response = await fetch(config.apiUrl + path, {
      method: body ? 'POST' : 'GET', cache: 'no-store',
      headers: { apikey: config.publicKey, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { 'x-admin-session': token } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000)
    });
  } catch { throw new Error('서버 응답을 확인하지 못했습니다. 저장 작업이었다면 최신 상태를 다시 불러와 결과를 확인해 주세요.'); }
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || '요청을 완료하지 못했습니다.'); error.status = response.status; throw error; }
  return data;
}
export const getPublished = () => request('/public');
export const consoleLogin = (username, password) => request('', { action: 'login', username, password });
export const consoleRequest = (action, payload, token) => request('', { action, payload }, token);

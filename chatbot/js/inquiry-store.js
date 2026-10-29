const logicalFields = ['name', 'email', 'subject', 'message'];
const identifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
export function validateConfig(config) {
  if (!config?.enabled) throw new Error(config?.disabledReason || '기존 문의 페이지의 Supabase 설정이 아직 연결되지 않아 전송할 수 없습니다.');
  let url;
  try { url = new URL(config.supabaseUrl); } catch { throw new Error('Supabase 프로젝트 URL을 확인해 주세요.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Supabase URL은 HTTPS 프로젝트 기본 주소여야 합니다.');
  if (!config.publicKey || config.publicKey.startsWith('sb_secret_')) throw new Error('공개 publishable 또는 anon 키만 사용할 수 있습니다.');
  if (!config.publicKey.startsWith('sb_publishable_')) {
    try {
      const middle = config.publicKey.split('.')[1];
      const payload = JSON.parse(atob(middle.replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role !== 'anon') throw new Error();
    } catch { throw new Error('유효한 공개 publishable 또는 anon 키가 필요합니다. 비밀 키를 넣지 마세요.'); }
  }
  if (!identifier.test(config.schema) || !identifier.test(config.table)) throw new Error('기존 문의 테이블명과 스키마를 설정해 주세요.');
  const fields = logicalFields.map(k => config.fields?.[k]);
  if (fields.some(k => typeof k !== 'string' || !identifier.test(k)) || new Set(fields).size !== fields.length) throw new Error('이름·이메일·제목·내용의 실제 컬럼명을 서로 다르게 연결해 주세요.');
  if (!config.fixedValues || Array.isArray(config.fixedValues) || typeof config.fixedValues !== 'object') throw new Error('고정 필드 형식을 확인해 주세요.');
  for (const key of Object.keys(config.fixedValues)) {
    if (!identifier.test(key) || fields.includes(key)) throw new Error('고정 필드가 문의 입력 필드와 충돌합니다.');
  }
  if (!config.privacy?.confirmed || !config.privacy.notice?.trim() || !config.privacy.consentLabel?.trim()) throw new Error('개인정보 처리 주체·보유 기간을 포함한 안내와 동의 문구를 확정해 주세요.');
  return config;
}
export function buildPayload(config, values) {
  validateConfig(config);
  const limits = { name: [1, 60], email: [3, 254], subject: [1, 150], message: [10, 5000] };
  const payload = { ...config.fixedValues };
  for (const key of logicalFields) {
    const value = typeof values[key] === 'string' ? values[key].trim() : '';
    if (value.length < limits[key][0] || value.length > limits[key][1]) throw new Error('필수 항목과 입력 길이를 확인해 주세요. 문의 내용은 10~5,000자입니다.');
    if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('이메일 주소를 확인해 주세요.');
    payload[config.fields[key]] = value;
  }
  return payload;
}
export async function saveInquiry(config, values, request = fetch) {
  const payload = buildPayload(config, values);
  const headers = { 'Content-Type': 'application/json', apikey: config.publicKey, 'Content-Profile': config.schema, Prefer: 'return=minimal' };
  if (!config.publicKey.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${config.publicKey}`;
  try {
    const response = await request(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(config.table)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload), signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      const error = new Error(response.status === 401 || response.status === 403 ? '저장 권한이 없습니다. 공개 키와 기존 테이블의 INSERT 정책을 확인해 주세요.' : response.status === 400 || response.status === 404 ? '저장 설정을 확인해야 합니다. 테이블명·컬럼명·필수 필드가 기존 문의 페이지와 일치하는지 확인해 주세요.' : '저장 결과를 확인하지 못했습니다. 운영자에게 접수 여부를 확인한 후 다시 시도해 주세요.');
      error.confirmedFailure = [400, 401, 403, 404, 409, 422, 429].includes(response.status);
      throw error;
    }
    return true;
  } catch (error) {
    if (error.confirmedFailure) throw error;
    throw new Error('저장 완료 여부를 확인할 수 없습니다. 중복 접수를 피하려면 운영자에게 접수 여부를 먼저 확인해 주세요. 입력 내용은 유지됩니다.');
  }
}

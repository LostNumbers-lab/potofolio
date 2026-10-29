const endpoint = 'https://apis.data.go.kr/6260000/InfoOfficeService/getInfoOfficeKr';

export async function handleOffices(req, res, env = process.env) {
  const send = (status, data) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(data));
  };
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(405, { error: 'GET 요청만 지원합니다.' }); }
  const key = env.BUSAN_TOURISM_SERVICE_KEY?.trim();
  if (!key) return send(503, { error: '관리자가 관광안내소 API 인증키를 등록한 후 이용할 수 있습니다.' });
  const page = new URL(req.url, 'http://localhost').searchParams.get('pageNo') || '1';
  if (!/^\d{1,4}$/.test(page) || Number(page) < 1) return send(400, { error: '페이지 번호가 올바르지 않습니다.' });
  try {
    let decodedKey = key;
    try { decodedKey = decodeURIComponent(key); } catch { /* 원문 키 사용 */ }
    const url = new URL(endpoint);
    url.search = new URLSearchParams({ ServiceKey: decodedKey, pageNo: page, numOfRows: '10', resultType: 'json' }).toString();
    const upstream = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!upstream.ok) return send(502, { error: '공공데이터 서버 요청이 실패했습니다. 활용승인 및 인증키를 확인하세요.' });
    let data;
    try { data = await upstream.json(); } catch { return send(502, { error: '공공데이터 인증 또는 응답 형식을 확인하세요. 해당 서비스 활용승인이 필요합니다.' }); }
    const body = data.getInfoOfficeKr;
    if (!body || String(body.header?.code ?? body.header?.resultCode ?? '00') !== '00') {
      return send(502, { error: '공공데이터 조회가 거부되었습니다. 인증키·활용승인·호출 한도를 확인하세요.' });
    }
    const raw = body.item ?? body.items?.item ?? [];
    const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw] : [];
    const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const items = list.map(item => ({ name: text(item.NM), address: text(item.ADDR1), phone: text(item.INQRY_TEL), hours: text(item.OP_TIME), languages: text(item.FGGG), description: text(item.INFOFC_INTRCN) }));
    return send(200, { items, total: Number(body.totalCount) || 0, page: Number(page) });
  } catch {
    // 네트워크 예외에는 인증키가 포함된 요청 URL이 있을 수 있으므로 그대로 출력하지 않습니다.
    return send(502, { error: '공공데이터 서버에 연결할 수 없습니다. 잠시 후 다시 조회하세요.' });
  }
}

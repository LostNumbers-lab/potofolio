import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Conversation, findNodes, validateData, isSafeUrl } from '../chatbot/js/engine.js';
import { buildPayload, saveInquiry, validateConfig } from '../chatbot/js/inquiry-store.js';

const data = JSON.parse(await readFile(new URL('../chatbot/data/chatbot.json', import.meta.url), 'utf8'));
const config = { enabled: true, supabaseUrl: 'https://example.supabase.co', publicKey: 'sb_publishable_TEST_ONLY', schema: 'public', table: 'existing_requests', fields: { name: 'client_name', email: 'reply_email', subject: 'title', message: 'body' }, fixedValues: { source: 'portfolio' }, privacy: { confirmed: true, notice: '테스트 안내', consentLabel: '동의' } };
const values = { name: '홍길동', email: 'test@example.com', subject: '콘텐츠 제작', message: '부산 관광 콘텐츠 제작을 문의드립니다.' };

test('실제 문의 설정이 기존 테이블과 비공개 문의 상태를 사용한다', async () => {
  const actual = JSON.parse(await readFile(new URL('../chatbot/data/inquiry-config.json', import.meta.url), 'utf8'));
  validateConfig(actual);
  assert.equal(actual.table, 'consultations');
  const payload = buildPayload(actual, values);
  assert.equal(payload.author_name, values.name);
  assert.equal(payload.contact, values.email);
  assert.equal(payload.title, values.subject);
  assert.equal(payload.content, values.message);
  assert.equal(payload.category, '제작 문의');
  assert.equal(payload.status, 'pending');
  assert.equal(payload.is_private, true);
});

test('모든 JSON 분기 참조와 공통 버튼이 유효하다', () => assert.equal(validateData(data), data));
test('시작 노드에서 모든 FAQ와 문의 안내로 접근할 수 있다', () => {
  const visited = new Set();
  function visit(id) { if (visited.has(id)) return; visited.add(id); for (const b of data.nodes.find(n => n.id === id).buttons) if (b.next) visit(b.next); }
  visit(data.startNode);
  // 문의 안내는 키워드로도 검색되는 독립 진입점이다.
  assert.deepEqual(data.nodes.filter(n => !visited.has(n.id)).map(n => n.id).sort(), ['fallback', 'inquiry-info']);
});
test('다단계 이동, 이전 이동, 초기화가 일관되다', () => {
  const c = new Conversation(data); c.go('report'); c.go('museum'); assert.equal(c.back().id, 'report'); assert.equal(c.back().id, 'home'); assert.equal(c.back().id, 'home'); c.go('sns'); assert.equal(c.reset().id, 'home');
});
test('키워드는 등록 데이터에서 결정적으로 검색하며 미등록 항목은 생성하지 않는다', () => {
  assert.equal(findNodes(data, '흰 여울')[0].id, 'village');
  assert.equal(findNodes(data, '카드뉴스')[0].id, 'cards');
  assert.equal(findNodes(data, '제작 문의')[0].id, 'inquiry-info');
  assert.deepEqual(findNodes(data, '등록되지않은질문1234'), []);
  assert.deepEqual(findNodes(data, '  '), []);
});
test('잘못된 분기와 실행형 링크를 차단한다', () => {
  const broken = structuredClone(data); broken.nodes[0].buttons[0].next = 'missing'; assert.throws(() => validateData(broken));
  assert.equal(isSafeUrl('javascript:alert(1)'), false); assert.equal(isSafeUrl('//example.com'), false); assert.equal(isSafeUrl('./contact.html'), true);
});
test('Supabase 필드 매핑과 고정 필드는 동일한 페이로드를 만든다', () => {
  assert.deepEqual(buildPayload(config, values), { source: 'portfolio', client_name: values.name, reply_email: values.email, title: values.subject, body: values.message });
});
test('미설정·비밀 키·필드 충돌·미확정 개인정보 안내는 전송 전에 차단한다', () => {
  assert.throws(() => validateConfig({ ...config, enabled: false }));
  assert.throws(() => validateConfig({ ...config, publicKey: 'sb_secret_TEST' }));
  const secretJWT = 'e30.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.test';
  assert.throws(() => validateConfig({ ...config, publicKey: secretJWT }));
  assert.throws(() => validateConfig({ ...config, fixedValues: { title: 'override' } }));
  assert.throws(() => validateConfig({ ...config, privacy: { confirmed: false } }));
  assert.throws(() => buildPayload(config, { ...values, email: 'invalid' }));
  assert.throws(() => buildPayload(config, { ...values, message: '짧음' }));
});
test('저장 요청은 지정된 기존 테이블에 INSERT하며 조회하지 않는다', async () => {
  let calls = 0;
  await saveInquiry(config, values, async (url, options) => {
    calls++; assert.equal(url, 'https://example.supabase.co/rest/v1/existing_requests'); assert.equal(options.method, 'POST'); assert.equal(options.headers.Prefer, 'return=minimal'); assert.equal(options.headers['Content-Profile'], 'public'); assert.equal(options.headers.Authorization, undefined); assert.deepEqual(JSON.parse(options.body), buildPayload(config, values));
    return { ok: true, status: 201 };
  }); assert.equal(calls, 1);
});
test('legacy anon 키만 Bearer 헤더에 사용한다', async () => {
  const publicJWT = 'e30.' + Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url') + '.test';
  await saveInquiry({ ...config, publicKey: publicJWT }, values, async (url, options) => { assert.equal(options.headers.Authorization, 'Bearer ' + publicJWT); return { ok: true, status: 201 }; });
});
test('권한 오류와 연결 단절은 성공으로 처리하지 않으며 자동 재전송하지 않는다', async () => {
  await assert.rejects(saveInquiry(config, values, async () => ({ ok: false, status: 403 })), /저장 권한/);
  let calls = 0; await assert.rejects(saveInquiry(config, values, async () => { calls++; throw new TypeError('network'); }), /저장 완료 여부/); assert.equal(calls, 1);
});

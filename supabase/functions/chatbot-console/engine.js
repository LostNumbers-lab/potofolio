const actions = new Set(['back', 'home', 'inquiry']);
export function isSafeUrl(value) {
  if (typeof value !== 'string') return false;
  if (value === './contact.html') return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
export function validateData(data) {
  if (!Array.isArray(data?.nodes) || !data.nodes.length || data.nodes.length > 300) throw new Error('대화 단계는 1~300개로 구성해 주세요.');
  const ids = new Set();
  for (const node of data.nodes) {
    if (typeof node.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(node.id) || ids.has(node.id)) throw new Error('단계 ID는 고유한 영문·숫자·밑줄·하이픈(80자 이내)이어야 합니다.');
    ids.add(node.id);
    if (typeof node.question !== 'string' || typeof node.answer !== 'string' || !Array.isArray(node.keywords) || !node.keywords.every(k => typeof k === 'string') || !Array.isArray(node.buttons)) throw new Error('노드 형식이 올바르지 않습니다: ' + node.id);
    if (!node.question.trim() || node.question.length > 300 || !node.answer.trim() || node.answer.length > 8000 || node.keywords.length > 50 || node.keywords.some(k => k.length > 100) || node.buttons.length > 30) throw new Error('질문·답변·키워드·버튼의 길이 또는 개수를 확인해 주세요: ' + node.id);
  }
  if (!ids.has(data.startNode) || !ids.has(data.fallbackNode)) throw new Error('시작 또는 기본 노드가 없습니다.');
  for (const node of data.nodes) for (const b of node.buttons) {
    if (typeof b.label !== 'string' || !b.label.trim() || b.label.length > 100 || ['next', 'url', 'action'].filter(k => b[k] !== undefined).length !== 1) throw new Error('버튼 형식 오류: ' + node.id);
    if (b.next !== undefined && !ids.has(b.next)) throw new Error('연결되지 않은 단계: ' + b.next);
    if (b.url !== undefined && !isSafeUrl(b.url)) throw new Error('허용되지 않은 링크');
    if (b.action !== undefined && !actions.has(b.action)) throw new Error('허용되지 않은 동작');
  }
  if (!Array.isArray(data.globalButtons) || data.globalButtons.length !== 3 || !data.globalButtons.every(b => typeof b.label === 'string' && actions.has(b.action)) || new Set(data.globalButtons.map(b => b.action)).size !== 3) throw new Error('공통 버튼 설정 오류');
  return data;
}
const normalize = text => text.toLocaleLowerCase('ko').replace(/\s+/g, '').trim();
export function findNodes(data, query) {
  const q = normalize(query);
  if (!q) return [];
  return data.nodes.filter(n => n.id !== data.fallbackNode).map((node, index) => {
    const words = [node.question, ...node.keywords].map(normalize);
    const score = words.some(w => w === q) ? 3 : words.some(w => w.includes(q)) ? 2 : words.some(w => w.length >= 2 && q.includes(w)) ? 1 : 0;
    return { node, score, index };
  }).filter(r => r.score).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 6).map(r => r.node);
}
export class Conversation {
  constructor(data) { this.data = validateData(data); this.nodes = new Map(data.nodes.map(n => [n.id, n])); this.reset(); }
  reset() { this.history = [this.data.startNode]; return this.current; }
  get current() { return this.nodes.get(this.history.at(-1)); }
  go(id) { if (!this.nodes.has(id)) throw new Error('알 수 없는 단계'); this.history.push(id); return this.current; }
  back() { if (this.history.length > 1) this.history.pop(); return this.current; }
}

import { Conversation, findNodes, isSafeUrl } from './engine.js';
import { mountInquiry } from './inquiry-form.js';

const embedded = new URLSearchParams(location.search).get('embed') === '1';
if (embedded) document.documentElement.classList.add('embedded');
document.addEventListener('keydown', event => {
  if (embedded && event.key === 'Escape' && !document.querySelector('#inquiry-dialog').open) {
    window.parent.postMessage({ type: 'travel-chatbot-close' }, location.origin);
  }
});

const messages = document.querySelector('#messages');
const choices = document.querySelector('#choices');
const scroll = document.querySelector('#chat-scroll');
const dialog = document.querySelector('#inquiry-dialog');
let chat;
const addMessage = (text, user = false) => {
  const wrap = document.createElement('div'); wrap.className = 'message' + (user ? ' user' : '');
  if (!user) { const label = document.createElement('p'); label.className = 'message-label'; label.textContent = '아카이브 가이드'; wrap.append(label); }
  const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = text; wrap.append(bubble); messages.append(wrap);
};
function render() {
  addMessage(chat.current.answer);
  choices.replaceChildren();
  for (const option of chat.current.buttons) {
    const el = document.createElement(option.url ? 'a' : 'button');
    el.className = 'choice'; el.textContent = option.label;
    const arrow = document.createElement('span'); arrow.textContent = option.url ? '↗' : '→'; el.append(arrow);
    if (option.url && isSafeUrl(option.url)) { el.href = option.url; el.target = '_blank'; el.rel = 'noopener noreferrer'; el.setAttribute('aria-label', option.label + ' (새 탭)'); }
    else { el.type = 'button'; el.addEventListener('click', () => choose(option)); }
    choices.append(el);
  }
  document.querySelector('#back').disabled = chat.history.length < 2;
  requestAnimationFrame(() => { scroll.scrollTop = scroll.scrollHeight; });
}
function reset() { if (!chat) return; chat.reset(); messages.replaceChildren(); document.querySelector('#search-results').replaceChildren(); document.querySelector('#keyword').value = ''; render(); }
function choose(option) {
  if (option.action === 'inquiry') { dialog.showModal(); return; }
  if (!chat) return;
  if (option.action === 'home') { chat.go(chat.data.startNode); addMessage(option.label, true); render(); return; }
  if (option.action === 'back') { if (chat.history.length > 1) { addMessage(option.label, true); chat.back(); render(); } return; }
  if (option.next) { addMessage(option.label, true); chat.go(option.next); render(); }
}
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#restart').addEventListener('click', reset);
for (const [id, action] of [['back', 'back'], ['home', 'home'], ['inquiry', 'inquiry']]) {
  document.querySelector('#' + id).addEventListener('click', () => choose({ action, label: document.querySelector('#' + id).textContent }));
}
document.querySelector('#search-form').addEventListener('submit', event => {
  event.preventDefault(); if (!chat) return;
  const query = document.querySelector('#keyword').value.trim();
  const results = document.querySelector('#search-results'); results.replaceChildren();
  if (!query) { results.textContent = '검색할 키워드를 입력해 주세요.'; return; }
  const nodes = findNodes(chat.data, query);
  if (!nodes.length) { addMessage(query, true); chat.go(chat.data.fallbackNode); render(); results.textContent = '일치하는 등록 질문이 없습니다.'; return; }
  for (const node of nodes) { const button = document.createElement('button'); button.type = 'button'; button.textContent = node.question; button.addEventListener('click', () => { choose({ label: node.question, next: node.id }); results.replaceChildren(); }); results.append(button); }
});
try {
  const response = await fetch('./data/chatbot.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('질문 데이터를 읽지 못했습니다.');
  chat = new Conversation(await response.json());
  for (const global of chat.data.globalButtons) { const id = { back: 'back', home: 'home', inquiry: 'inquiry' }[global.action]; document.querySelector('#' + id).textContent = global.label; }
  render();
} catch (error) {
  addMessage(location.protocol === 'file:' ? 'JSON 데이터를 읽으려면 start.bat를 실행한 뒤 http://127.0.0.1:4173에서 열어 주세요.' : '대화 데이터를 불러오지 못했습니다. JSON 파일을 확인하고 새로고침해 주세요.');
  console.error(error);
}
mountInquiry(document.querySelector('#inquiry-mount'));

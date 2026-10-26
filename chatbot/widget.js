// Shared launcher for the portfolio pages. No external chatbot or AI service.
const root = new URL('./', import.meta.url);
if (!document.querySelector('#travel-chatbot-widget')) {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('widget.css', root).href;
  document.head.append(stylesheet);

  const host = document.createElement('aside');
  host.id = 'travel-chatbot-widget';
  host.setAttribute('aria-label', '포트폴리오 챗봇');
  host.innerHTML = `<button class="ta-chat-launcher" type="button" aria-expanded="false" aria-controls="ta-chat-window"><span aria-hidden="true">✳</span> 아카이브 가이드</button>
    <section id="ta-chat-window" class="ta-chat-window" aria-label="아카이브 안내 대화" hidden>
      <div class="ta-chat-topbar"><a target="_blank" rel="noopener noreferrer">새 창으로 열기 ↗</a><button type="button" aria-label="챗봇 닫기">×</button></div>
    </section>`;
  document.body.append(host);
  const launcher = host.querySelector('.ta-chat-launcher');
  const panel = host.querySelector('.ta-chat-window');
  const close = host.querySelector('.ta-chat-topbar button');
  host.querySelector('a').href = new URL('index.html', root).href;
  let frame;
  function setOpen(open) {
    if (open && !frame) {
      frame = document.createElement('iframe');
      frame.title = 'TRAVEL ARCHIVE 선택형 챗봇';
      frame.src = new URL('index.html?embed=1', root).href;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      panel.append(frame);
    }
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    (open ? close : launcher).focus();
  }
  launcher.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => setOpen(false));
  host.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) setOpen(false); });
  window.addEventListener('message', event => {
    if (frame && event.source === frame.contentWindow && event.origin === location.origin && event.data?.type === 'travel-chatbot-close') setOpen(false);
  });
}

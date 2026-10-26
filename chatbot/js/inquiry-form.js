import { saveInquiry, validateConfig } from './inquiry-store.js';

export async function mountInquiry(mount, { preview = false } = {}) {
  mount.innerHTML = `<form class="inquiry-form">
    <p class="config-note" role="status">문의 저장 설정을 확인하고 있습니다.</p>
    <label>이름 <input name="name" autocomplete="name" maxlength="60" required placeholder="성함 또는 담당자명"></label>
    <label>이메일 <input name="email" type="email" autocomplete="email" maxlength="254" required placeholder="답변받을 이메일"></label>
    <label>문의 제목 <input name="subject" maxlength="150" required placeholder="어떤 제작이 필요하신가요?"></label>
    <label>문의 내용 <textarea name="message" minlength="10" maxlength="5000" required placeholder="제작 목적, 필요한 결과물, 희망 일정 등을 10자 이상 적어주세요."></textarea></label>
    <label class="honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
    <p class="privacy-note"></p>
    <label class="consent"><input name="consent" type="checkbox" required><span>개인정보 수집·이용 안내를 확인하고 동의합니다.</span></label>
    <button type="submit" class="primary" disabled>문의 남기기</button>
    <p class="form-status" role="status" aria-live="polite"></p>
  </form>`;
  const form = mount.querySelector('form');
  const submit = form.querySelector('[type="submit"]');
  const note = form.querySelector('.config-note');
  const status = form.querySelector('.form-status');
  if (preview) {
    note.textContent = '게시 전 미리보기입니다. 문의 내용은 실제로 전송되지 않습니다.';
    form.querySelector('.privacy-note').textContent = '미리보기에서는 폼의 표시와 입력 동작만 확인할 수 있습니다.';
    form.addEventListener('submit', event => event.preventDefault());
    return;
  }
  let config, busy = false, ready = false;
  try {
    const response = await fetch('./data/inquiry-config.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('문의 설정 파일을 읽지 못했습니다.');
    config = await response.json();
    form.querySelector('.privacy-note').textContent = config.privacy?.notice || '';
    form.querySelector('.consent span').textContent = config.privacy?.consentLabel || '개인정보 수집·이용에 동의합니다.';
    validateConfig(config); ready = true; submit.disabled = false; note.hidden = true;
  } catch (error) {
    note.textContent = error.message + '\n문의 내용을 입력해 볼 수 있지만 실제 저장은 비활성화되어 있습니다.';
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !ready || !form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    if (values.website || values.consent !== 'on') return;
    busy = true; submit.disabled = true; submit.textContent = '저장 중…'; status.className = 'form-status'; status.textContent = '문의 내용을 저장하고 있습니다.';
    try {
      await saveInquiry(config, values);
      form.reset(); status.className = 'form-status success'; status.textContent = '문의가 정상적으로 저장되었습니다. 남겨주신 이메일로 답변드릴게요.';
    } catch (error) { status.className = 'form-status error'; status.textContent = error.message; }
    finally { busy = false; submit.disabled = false; submit.textContent = '문의 남기기'; }
  });
}

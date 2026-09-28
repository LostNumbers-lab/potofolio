const contentTabs = document.querySelectorAll('[data-filter]');
const contentCards = document.querySelectorAll('.content-card');
const contentDialog = document.querySelector('#content-dialog');
const dialogType = contentDialog?.querySelector('[data-dialog-type]');
const dialogTitle = contentDialog?.querySelector('[data-dialog-title]');
const dialogDescription = contentDialog?.querySelector('[data-dialog-description]');
const dialogPlaceholder = contentDialog?.querySelector('[data-dialog-placeholder]');
const dialogImage = contentDialog?.querySelector('[data-dialog-image]');

contentTabs.forEach((tab) => tab.addEventListener('click', () => {
  contentTabs.forEach((item) => item.classList.remove('active'));
  tab.classList.add('active');
  const filter = tab.dataset.filter;
  contentCards.forEach((card) => { card.hidden = filter !== 'all' && card.dataset.category !== filter; });
}));

document.querySelectorAll('.content-open').forEach((button) => button.addEventListener('click', () => {
  const imagePath = button.dataset.contentImage;
  const title = button.dataset.contentTitle;

  dialogType.textContent = button.dataset.contentType || 'CONTENT PREVIEW';
  dialogTitle.textContent = title || '콘텐츠 상세 영역';
  dialogDescription.textContent = button.dataset.contentDescription || '추후 실제 제작물의 이미지, 영상, 제작 의도와 담당 역할을 이 영역에 추가할 수 있습니다.';

  if (imagePath) {
    dialogImage.src = imagePath;
    dialogImage.alt = `${title} 전체 이미지`;
    dialogImage.hidden = false;
    dialogPlaceholder.hidden = true;
  } else {
    dialogImage.hidden = true;
    dialogImage.removeAttribute('src');
    dialogPlaceholder.hidden = false;
  }

  contentDialog.showModal();
}));
document.querySelector('.dialog-close')?.addEventListener('click', () => contentDialog.close());
contentDialog?.addEventListener('click', (event) => { if (event.target === contentDialog) contentDialog.close(); });

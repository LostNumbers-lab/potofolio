const resourceSearch = document.querySelector('#resource-search');
const typeFilter = document.querySelector('#type-filter');
const resourceCards = [...document.querySelectorAll('#resource-list .resource-card')];
const reportEmpty = document.querySelector('#report-empty');

function filterResources() {
  const keyword = resourceSearch.value.trim().toLowerCase();
  let visibleCount = 0;
  resourceCards.forEach((card) => {
    const matchesKeyword = card.textContent.toLowerCase().includes(keyword);
    const matchesType = typeFilter.value === 'all' || card.dataset.type === typeFilter.value;
    card.hidden = !(matchesKeyword && matchesType);
    if (!card.hidden) visibleCount += 1;
  });
  reportEmpty.style.display = visibleCount ? 'none' : 'block';
}
[resourceSearch, typeFilter].forEach((control) => control.addEventListener('input', filterResources));

document.querySelectorAll('[data-open-resource]').forEach((card) => {
  const dialogId = card.getAttribute('aria-controls');
  const dialog = document.getElementById(dialogId);
  const closeDialogButton = dialog?.querySelector('[data-close-dialog]');

  if (!dialog) return;

  function openDialog() {
    if (!dialog.open) {
      dialog.showModal();
      document.body.classList.add('menu-open');
    }
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
  }

  card.addEventListener('click', openDialog);
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDialog();
    }
  });
  closeDialogButton?.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('menu-open');
    card.focus();
  });
});

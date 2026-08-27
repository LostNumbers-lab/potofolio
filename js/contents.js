const contentTabs = document.querySelectorAll('[data-filter]');
const contentCards = document.querySelectorAll('.content-card');
const contentDialog = document.querySelector('#content-dialog');

contentTabs.forEach((tab) => tab.addEventListener('click', () => {
  contentTabs.forEach((item) => item.classList.remove('active'));
  tab.classList.add('active');
  const filter = tab.dataset.filter;
  contentCards.forEach((card) => { card.hidden = filter !== 'all' && card.dataset.category !== filter; });
}));

document.querySelectorAll('.content-open').forEach((button) => button.addEventListener('click', () => contentDialog.showModal()));
document.querySelector('.dialog-close')?.addEventListener('click', () => contentDialog.close());
contentDialog?.addEventListener('click', (event) => { if (event.target === contentDialog) contentDialog.close(); });

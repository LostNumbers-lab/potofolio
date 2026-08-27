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

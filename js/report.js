const resourceSearch = document.querySelector('#resource-search');
const regionFilter = document.querySelector('#region-filter');
const typeFilter = document.querySelector('#type-filter');
const resourceRows = [...document.querySelectorAll('#resource-list tr')];
const reportEmpty = document.querySelector('#report-empty');

function filterResources() {
  const keyword = resourceSearch.value.trim().toLowerCase();
  let visibleCount = 0;
  resourceRows.forEach((row) => {
    const matchesKeyword = row.textContent.toLowerCase().includes(keyword);
    const matchesRegion = regionFilter.value === 'all' || row.dataset.region === regionFilter.value;
    const matchesType = typeFilter.value === 'all' || row.dataset.type === typeFilter.value;
    row.hidden = !(matchesKeyword && matchesRegion && matchesType);
    if (!row.hidden) visibleCount += 1;
  });
  reportEmpty.style.display = visibleCount ? 'none' : 'block';
}
[resourceSearch, regionFilter, typeFilter].forEach((control) => control.addEventListener('input', filterResources));

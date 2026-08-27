const periodSelect = document.querySelector('#period-select');
const metricSets = { all: ['24','128.4K','8,742','6.8%'], 30: ['12','72.1K','4,810','6.7%'], 7: ['4','19.8K','1,382','7.0%'] };
periodSelect?.addEventListener('change', () => {
  document.querySelectorAll('[data-metric]').forEach((metric, index) => { metric.textContent = metricSets[periodSelect.value][index]; });
});

const officeList = document.querySelector('#office-list');
const officeStatus = document.querySelector('#office-status');
const officeLoad = document.querySelector('#office-load');
const officeSearch = document.querySelector('#office-search');
const officePrev = document.querySelector('#office-prev');
const officeNext = document.querySelector('#office-next');
let officeItems = [];
let officePage = 1;
let officeTotal = 0;
let officeBusy = false;

function renderOffices() {
  const keyword = officeSearch.value.trim().toLowerCase();
  const visible = officeItems.filter(item => `${item.name} ${item.address}`.toLowerCase().includes(keyword));
  officeList.replaceChildren();
  visible.forEach(item => {
    const card = document.createElement('article');
    card.className = 'office-card';
    const title = document.createElement('h3');
    title.textContent = item.name || '관광안내소';
    card.append(title);
    const details = document.createElement('dl');
    [['주소', item.address], ['전화번호', item.phone], ['운영시간', item.hours], ['외국어 안내', item.languages]].forEach(([label, value]) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value || '제공 정보 없음';
      row.append(dt, dd);
      details.append(row);
    });
    card.append(details);
    if (item.description) {
      const description = document.createElement('p');
      description.textContent = item.description;
      card.append(description);
    }
    officeList.append(card);
  });
  officeStatus.textContent = `전체 ${officeTotal}개 안내소 · 현재 페이지 ${visible.length}개 표시${keyword ? ' (현재 페이지 검색)' : ''}${visible.length ? '' : ' · 조회 결과가 없습니다.'}`;
}

async function loadOffices(page = 1) {
  if (officeBusy) return;
  if (location.protocol === 'file:') {
    officeStatus.textContent = '실시간 조회는 로컬 서버에서 지원됩니다. 터미널에서 npm run dev를 실행하고 표시된 주소의 report.html을 열어 주세요.';
    return;
  }
  officeBusy = true;
  officeLoad.disabled = officePrev.disabled = officeNext.disabled = true;
  officeList.setAttribute('aria-busy', 'true');
  officeStatus.textContent = '부산 관광안내소 정보를 불러오고 있습니다…';
  try {
    const response = await fetch(`/api/busan-offices?pageNo=${page}`);
    let data;
    try { data = await response.json(); } catch { throw new Error('조회 서버가 준비되지 않았습니다. 로컬 개발 서버 또는 API가 지원되는 서버에서 실행해 주세요.'); }
    if (!response.ok) throw new Error(data.error || '정보를 불러오지 못했습니다.');
    officeItems = data.items;
    officeTotal = data.total;
    officePage = data.page;
    officeSearch.value = '';
    renderOffices();
    document.querySelector('#office-page').textContent = `${officePage} / ${Math.max(1, Math.ceil(officeTotal / 10))} 페이지`;
  } catch (error) {
    officeStatus.textContent = `${error.message} 기존 조회 결과는 유지됩니다.`;
  } finally {
    officeBusy = false;
    officeLoad.disabled = false;
    officePrev.disabled = officePage <= 1;
    officeNext.disabled = officePage * 10 >= officeTotal;
    officeList.setAttribute('aria-busy', 'false');
  }
}
officeLoad.addEventListener('click', () => loadOffices(1));
officePrev.addEventListener('click', () => loadOffices(officePage - 1));
officeNext.addEventListener('click', () => loadOffices(officePage + 1));
officeSearch.addEventListener('input', () => { if (!officeBusy && officeItems.length) renderOffices(); });

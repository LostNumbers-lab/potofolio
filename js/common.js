const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.global-nav');

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    navigation.classList.toggle('open', !isOpen);
    document.body.classList.toggle('menu-open', !isOpen);
  });

  navigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuButton.setAttribute('aria-expanded', 'false');
      navigation.classList.remove('open');
      document.body.classList.remove('menu-open');
    });
  });
}

const currentPage = document.body.dataset.page;
const currentLink = document.querySelector(`[data-nav="${currentPage}"]`);
if (currentLink) {
  currentLink.classList.add('active');
  currentLink.setAttribute('aria-current', 'page');
}

document.querySelectorAll('[data-current-year]').forEach((element) => {
  element.textContent = new Date().getFullYear();
});

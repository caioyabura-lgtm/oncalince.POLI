const territorySections = [...document.querySelectorAll('[data-territory]')];
const territoryNavList = document.querySelector('.territory-nav-inner > div');
let territoryLinks = [...document.querySelectorAll('[data-territory-link]')];
let highlightTimer = 0;

function registerTerritoryData() {
  window.TERRITORIES.forEach((territory) => {
    const section = territorySections.find((item) => item.id === territory.id);
    const stamp = document.querySelector(`[data-stamp-for="${territory.id}"]`);
    let link = territoryLinks.find((item) => item.dataset.territoryLink === territory.id);

    if (!link && territoryNavList && section) {
      link = document.createElement('a');
      link.href = territory.href;
      link.dataset.territoryLink = territory.id;
      link.innerHTML = `<b>${territory.code.slice(-2)}</b> ${territory.short}`;
      territoryNavList.append(link);
    }

    [section, stamp].forEach((element) => {
      if (!element) return;
      element.style.setProperty('--accent', territory.accent);
      element.dataset.territoryCode = territory.code;
      element.dataset.territoryCity = territory.city;
    });
  });

  territoryLinks = [...document.querySelectorAll('[data-territory-link]')];
}

function setActiveTerritory(id) {
  territoryLinks.forEach((link) => {
    const active = link.dataset.territoryLink === id;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

function highlightHashTarget({ ensurePosition = false } = {}) {
  const hashId = decodeURIComponent(window.location.hash.slice(1));
  const id = hashId === 'sao-miguel' ? 'acores' : hashId;
  const target = territorySections.find((section) => section.id === id);
  const stamp = document.querySelector(`[data-stamp-for="${id}"]`);
  if (!target) return;

  window.clearTimeout(highlightTimer);
  document.querySelectorAll('.anchor-highlight').forEach((element) => element.classList.remove('anchor-highlight'));
  setActiveTerritory(id);

  window.requestAnimationFrame(() => {
    if (ensurePosition) {
      const root = document.documentElement;
      const previousBehavior = root.style.scrollBehavior;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - 124;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, Math.max(0, targetTop));
      window.requestAnimationFrame(() => { root.style.scrollBehavior = previousBehavior; });
    }

    target.classList.add('anchor-highlight');
    if (stamp) stamp.classList.add('anchor-highlight');
    highlightTimer = window.setTimeout(() => {
      target.classList.remove('anchor-highlight');
      if (stamp) stamp.classList.remove('anchor-highlight');
    }, 2000);
  });
}

registerTerritoryData();

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setActiveTerritory(visible.target.id);
  }, {
    rootMargin: '-27% 0px -58% 0px',
    threshold: [0.01, 0.12, 0.3]
  });

  territorySections.forEach((section) => observer.observe(section));
} else if (territorySections[0]) {
  setActiveTerritory(territorySections[0].id);
}

window.addEventListener('hashchange', () => highlightHashTarget({ ensurePosition: true }));
window.addEventListener('pageshow', () => {
  window.setTimeout(() => highlightHashTarget({ ensurePosition: true }), 0);
}, { once: true });


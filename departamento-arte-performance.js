'use strict';
(async () => {
  const $ = selector => document.querySelector(selector);
  const session = window.productionAuth?.current();
  if (!session) { location.replace('index.html#login'); return; }

  $('#session-user').textContent = $('#profile-name').textContent = session.name;
  $('#profile-button').addEventListener('click', () => $('#profile-dialog').showModal());
  $('#profile-close').addEventListener('click', () => $('#profile-dialog').close());
  $('#logout-button').addEventListener('click', async () => {
    await productionAuth.signOut(); location.assign('index.html');
  });
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === productionAuth.key) location.reload();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });

  try { await window.poliService.getBootstrap(); }
  catch (error) {
    if (error.code === 'POLI_USER_INACTIVE') {
      await productionAuth.signOut({ audit: false }); location.replace('index.html#login');
    } else location.replace('producao.html#overview');
    return;
  }
  if (productionAuth.current()?.access !== session.access) { location.replace('index.html#login'); return; }
  if (!window.poliService.canReadArea('ART')) {
    const message = document.createElement('p');
    message.textContent = 'Sua credencial não tem acesso a esta área.';
    $('#workspace').replaceChildren(message);
    return;
  }
  const views = [...document.querySelectorAll('[data-art-view]')];
  const links = [...document.querySelectorAll('.category-tabs a')];
  function navigate() {
    const selected = views.find(view => '#' + view.dataset.artView === location.hash) || views[0];
    views.forEach(view => { view.hidden = view !== selected; });
    links.forEach(link => {
      if (link.hash === '#' + selected.dataset.artView) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    $('#art-content').scrollTo(0, 0);
    if (location.hash !== '#art-content') selected.querySelector('h2').focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', navigate);
  window.addEventListener('poli-access-change', () => {
    if (!window.poliService.canReadArea('ART')) location.reload();
  });
  navigate();
  window.auditService?.transition('ART');
})();

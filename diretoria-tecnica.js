'use strict';
(async () => {
  const $ = selector => document.querySelector(selector);
  const language = new URL(location.href).searchParams.get('lang');
  const lang = ['en', 'de'].includes(language) ? language : 'pt';
  const translations = {
    pt: { title: 'DIRETORIA TÉCNICA', application: 'Candidatura International Coproduction Fund (IKF) · 2026', areas: 'Áreas técnicas', lynx: 'Lince geométrico', profile: 'Perfil', logout: 'Sair', close: 'Fechar', demo: 'Equipe do laboratório · sessão demonstrativa', checking: 'Verificando acesso…', denied: 'Sua credencial não tem acesso a esta área.', published: 'Documentos publicados', empty: 'Nenhum documento publicado.', prepare: 'Pasta em preparação', open: 'Abrir pasta', consult: 'Consultar', newTab: 'abre em nova aba', skip: 'Ir para o conteúdo', partners: 'Parceiros', language: 'Idioma', categories: ['SOM E ESPACIALIZAÇÃO', 'VÍDEO E PROJEÇÃO', 'ILUMINAÇÃO', 'PALCO E INFRAESTRUTURA', 'FABRICAÇÃO E ELETRÔNICA', 'LOGÍSTICA TÉCNICA'], metadata: ['Versão', 'Data', 'Responsável técnico', 'Território', 'Status', 'Referência'] },
    en: { title: 'TECHNICAL DIRECTION', application: 'International Coproduction Fund (IKF) Application · 2026', areas: 'Technical areas', lynx: 'Geometric lynx', profile: 'Profile', logout: 'Sign out', close: 'Close', demo: 'Laboratory team · demo session', checking: 'Checking access…', denied: 'Your credentials do not grant access to this area.', published: 'Published documents', empty: 'No published documents.', prepare: 'Folder in preparation', open: 'Open folder', consult: 'View', newTab: 'opens in a new tab', skip: 'Skip to content', partners: 'Partners', language: 'Language', categories: ['SOUND AND SPATIALIZATION', 'VIDEO AND PROJECTION', 'LIGHTING', 'STAGE AND INFRASTRUCTURE', 'FABRICATION AND ELECTRONICS', 'TECHNICAL LOGISTICS'], metadata: ['Version', 'Date', 'Technical lead', 'Territory', 'Status', 'Reference'] },
    de: { title: 'TECHNISCHE LEITUNG', application: 'Bewerbung International Coproduction Fund (IKF) · 2026', areas: 'Technische Bereiche', lynx: 'Geometrischer Luchs', profile: 'Profil', logout: 'Abmelden', close: 'Schließen', demo: 'Laborteam · Demo-Sitzung', checking: 'Zugriff wird geprüft…', denied: 'Ihre Zugangsdaten erlauben keinen Zugriff auf diesen Bereich.', published: 'Veröffentlichte Dokumente', empty: 'Keine veröffentlichten Dokumente.', prepare: 'Ordner in Vorbereitung', open: 'Ordner öffnen', consult: 'Ansehen', newTab: 'öffnet in einem neuen Tab', skip: 'Zum Inhalt', partners: 'Partner', language: 'Sprache', categories: ['KLANG UND RÄUMLICHE VERTEILUNG', 'VIDEO UND PROJEKTION', 'BELEUCHTUNG', 'BÜHNE UND INFRASTRUKTUR', 'FERTIGUNG UND ELEKTRONIK', 'TECHNISCHE LOGISTIK'], metadata: ['Version', 'Datum', 'Technische Leitung', 'Gebiet', 'Status', 'Referenz'] }
  };
  const copy = translations[lang];
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
  document.title = copy.title + ' · POLI';
  document.querySelectorAll('[data-copy]').forEach(el => { el.textContent = copy[el.dataset.copy]; });
  document.querySelectorAll('[data-label]').forEach(el => el.setAttribute('aria-label', copy[el.dataset.label]));
  document.querySelectorAll('[data-alt]').forEach(el => { el.alt = copy[el.dataset.alt]; });
  $('.skip-link').textContent = copy.skip;
  $('.institutional-signature').setAttribute('aria-label', copy.partners);
  $('.technical-languages').setAttribute('aria-label', copy.language);
  $('.technical-languages a[href="?lang=' + lang + '"]').setAttribute('aria-current', 'true');
  $('.technical-team').querySelectorAll('a').forEach(el => el.setAttribute('aria-label', el.textContent + ', ' + copy.newTab));
  $('#access-status').textContent = copy.checking;
  const content = $('#technical-content');
  const session = window.productionAuth?.current();
  if (!session) { location.replace('index.html#login'); return; }
  function clearContent() {
    content.hidden = true;
    $('#technical-categories').replaceChildren();
    $('#profile-dialog').close();
    $('#technical-session').hidden = true;
  }
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === productionAuth.key) {
      clearContent(); location.reload();
    }
  });
  window.addEventListener('pageshow', event => { if (event.persisted) { clearContent(); location.reload(); } });
  window.addEventListener('poli-access-change', () => {
    if (!window.poliService.canReadArea('TECH')) {
      clearContent();
      $('#access-status').hidden = false;
      $('#access-status').textContent = copy.denied;
    }
  });
  try { await window.poliService.getBootstrap(); }
  catch (error) {
    if (error.code === 'POLI_USER_INACTIVE') {
      await productionAuth.signOut({ audit: false }); location.replace('index.html#login');
    } else location.replace('producao.html#overview');
    return;
  }
  if (productionAuth.current()?.access !== session.access || productionAuth.current()?.sessionId !== session.sessionId) {
    location.replace('index.html#login'); return;
  }
  if (!window.poliService.canReadArea('TECH')) {
    $('#access-status').textContent = copy.denied; return;
  }
  const node = (tag, text = '', className = '') => {
    const element = document.createElement(tag);
    element.textContent = text; element.className = className; return element;
  };
  function driveUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && ['drive.google.com', 'docs.google.com'].includes(url.hostname)
        && !url.username && !url.password && !url.port ? url.href : null;
    } catch { return null; }
  }
  function externalLink(url, label) {
    const link = node('a');
    link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', label); return link;
  }
  const categories = ['audio', 'video', 'lighting', 'stage', 'fabrication', 'logistics'].map((id, index) => [id, copy.categories[index]]);
  const config = window.technicalConfig || {};
  const documents = Array.isArray(config.documents) ? config.documents : [];
  categories.forEach(([id, title, description], index) => {
    const section = node('section', '', 'technical-category');
    section.dataset.category = id;
    section.setAttribute('aria-labelledby', 'technical-' + id);
    const folderUrl = driveUrl(config.folders?.[id]);
    const heading = folderUrl ? externalLink(folderUrl, copy.open + ' ' + title + ', ' + copy.newTab) : node('div');
    heading.className = 'technical-folder';
    const number = node('span', String(index + 1).padStart(2, '0'), 'technical-number');
    const text = node('div', '', 'technical-folder-text');
    const h3 = node('h3', title); h3.id = 'technical-' + id;
    text.append(h3);
    heading.append(number, text, node('span', folderUrl ? copy.open : copy.prepare, 'technical-folder-state'));
    const published = node('details', '', 'technical-published');
    published.append(node('summary', copy.published));
    const selected = documents.filter(doc => doc && doc.category === id && typeof doc.title === 'string' && doc.title.trim());
    if (!selected.length) published.append(node('p', copy.empty, 'technical-empty'));
    for (const doc of selected) {
      const article = node('article', '', 'technical-document');
      if (doc.technical_id) article.append(node('p', String(doc.technical_id), 'entry-meta'));
      article.append(node('h5', doc.title));
      const metadata = node('dl');
      for (const [key, label] of Object.entries(Object.fromEntries(['version', 'date', 'responsible', 'territory', 'status', 'reference'].map((key, index) => [key, copy.metadata[index]])))) {
        if (!doc[key]) continue;
        const value = node('dd', String(doc[key]));
        if (key === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(doc.date)) {
          const time = node('time', doc.date.split('-').reverse().join('/')); time.dateTime = doc.date;
          value.replaceChildren(time);
        }
        metadata.append(node('dt', label), value);
      }
      article.append(metadata);
      const url = driveUrl(doc.url);
      if (url) {
        const link = externalLink(url, copy.consult + ' ' + doc.title + ', ' + copy.newTab);
        link.textContent = copy.consult + ' ↗'; article.append(link);
      }
      published.append(article);
    }
    section.append(heading); if (selected.length || !folderUrl) section.append(published); $('#technical-categories').append(section);
  });
  $('#session-user').textContent = $('#profile-name').textContent = session.name;
  $('#profile-button').addEventListener('click', () => $('#profile-dialog').showModal());
  $('#profile-close').addEventListener('click', () => $('#profile-dialog').close());
  $('#logout-button').addEventListener('click', async () => {
    clearContent(); await productionAuth.signOut(); location.assign('index.html');
  });
  $('#access-status').hidden = true;
  $('#technical-session').hidden = false; content.hidden = false;
  window.auditService?.transition('TECH');
})();

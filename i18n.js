/* Public pages only. The URL selects the language; Portuguese is the default. */
(() => {
  'use strict';
  const pages = new Set(['index.html', 'quem-somos.html', 'territorios.html', 'nucleos.html',
    'producao.html', 'contato.html', 'gabinete_internacional.html', 'lab-home-prototipo.html', 'proposta-arquitetonica.html']);
  const requested = new URL(location.href).searchParams.get('lang');
  const language = ['en', 'de'].includes(requested) ? requested : 'pt';
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const root = document.documentElement;
  const source = document.currentScript?.src || new URL('i18n.js', location.href).href;
  const ui = {
    pt: { label: 'Idioma', required: 'Preencha este campo.', email: 'Informe um endereço de e-mail válido.' },
    en: { label: 'Language', required: 'Please fill in this field.', email: 'Enter a valid email address.' },
    de: { label: 'Sprache', required: 'Bitte füllen Sie dieses Feld aus.', email: 'Geben Sie eine gültige E-Mail-Adresse ein.' }
  }[language];

  window.publicLanguageUrl = (href) => {
    const url = new URL(href, location.href);
    const filename = url.pathname.split('/').pop() || 'index.html';
    if (url.origin !== location.origin || !pages.has(filename)) return href;
    if (language === 'pt') url.searchParams.delete('lang');
    else url.searchParams.set('lang', language);
    return url.href;
  };

  const selector = document.createElement('nav');
  selector.className = 'language-selector';
  selector.setAttribute('aria-label', ui.label);
  selector.dataset.i18nIgnore = '';
  for (const [code, name] of [['pt', 'Português'], ['en', 'English'], ['de', 'Deutsch']]) {
    const link = document.createElement('a');
    const url = new URL(location.href);
    if (code === 'pt') url.searchParams.delete('lang'); else url.searchParams.set('lang', code);
    link.href = url.href;
    link.hreflang = code === 'pt' ? 'pt-BR' : code;
    link.lang = link.hreflang;
    link.textContent = code.toUpperCase();
    link.setAttribute('aria-label', name);
    if (code === language) link.setAttribute('aria-current', 'true');
    selector.append(link);
  }
  const header = document.querySelector('.portal-header') || document.querySelector('.header-inner, .contact-header, .identity-block, body > .site-header');
  header?.append(selector);
  window.addEventListener('hashchange', () => {
    selector.querySelectorAll('a').forEach(link => {
      const url = new URL(link.href);
      url.hash = location.hash;
      link.href = url.href;
    });
  });

  let dictionary = {};
  const ignored = 'script, style, code, .language-selector, [data-i18n-ignore]';
  function translateNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.parentElement || node.parentElement.closest(ignored)) return;
      const value = node.nodeValue;
      const key = normalize(value);
      const translation = dictionary[key];
      if (translation !== undefined && translation !== key) {
        node.nodeValue = value.match(/^\s*/)[0] + translation + value.match(/\s*$/)[0];
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.matches(ignored)) return;
    for (const attribute of ['aria-label', 'alt', 'placeholder', 'title']) {
      const value = node.getAttribute(attribute);
      if (value && dictionary[normalize(value)] !== undefined && dictionary[normalize(value)] !== value) {
        node.setAttribute(attribute, dictionary[normalize(value)]);
      }
    }
    if (node.matches('meta[name="description"]')) {
      const value = node.content;
      if (dictionary[normalize(value)]) node.content = dictionary[normalize(value)];
    }
    if (node.matches('a[href]') && !node.getAttribute('href').startsWith('#')) {
      const url = window.publicLanguageUrl(node.getAttribute('href'));
      if (url !== node.getAttribute('href')) node.setAttribute('href', url);
    }
    [...node.childNodes].forEach(translateNode);
  }

  function translateSplitIdentity() {
    if (language === 'pt') return;
    // Keep the existing three lines, elements and font sizes, but use natural word order.
    const lines = language === 'en'
      ? ['Audiovisual', 'Co-production', 'Laboratory']
      : ['Labor für', 'audiovisuelle', 'Koproduktion'];
    for (const group of document.querySelectorAll('.portal-identity h1, .portal-wordmark-text, .preloader-title')) {
      const spans = [...group.children];
      if (spans.length === 3) {
        group.dataset.i18nIgnore = '';
        spans.forEach((span, index) => { span.textContent = lines[index]; });
      }
    }
    const prototype = document.querySelector('.identity-block h1');
    if (prototype) {
      prototype.dataset.i18nIgnore = '';
      const texts = [...prototype.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && normalize(node.nodeValue));
      if (texts.length === 2) {
        texts[0].nodeValue = lines[0];
        texts[1].nodeValue = lines[1];
        prototype.querySelector('em').textContent = lines[2];
      }
    }
  }

  function apply() {
    root.lang = language === 'pt' ? 'pt-BR' : language;
    root.dataset.publicLanguage = language;
    translateSplitIdentity();
    translateNode(document.documentElement);
    const observer = new MutationObserver(records => {
      observer.disconnect();
      for (const record of records) {
        if (record.type === 'childList') record.addedNodes.forEach(translateNode);
        else translateNode(record.target);
      }
      observe();
    });
    const observe = () => observer.observe(document.documentElement, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['aria-label', 'alt', 'placeholder', 'title', 'href', 'content']
    });
    observe();
    window.publicI18nReady = true;
  }

  document.addEventListener('invalid', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
    if (input.validity.valueMissing) input.setCustomValidity(ui.required);
    else if (input.validity.typeMismatch) input.setCustomValidity(ui.email);
  }, true);
  document.addEventListener('input', event => {
    if ('setCustomValidity' in event.target) event.target.setCustomValidity('');
  });

  if (language === 'pt') apply();
  else {
    const script = document.createElement('script');
    script.src = new URL(`locales/${language}.js`, source).href;
    script.onload = () => { dictionary = window.PUBLIC_TRANSLATIONS || {}; apply(); };
    script.onerror = () => {
      // Never label Portuguese content as a successfully loaded translation.
      root.lang = 'pt-BR';
      selector.querySelector('[aria-current]')?.removeAttribute('aria-current');
      selector.querySelector('[hreflang="pt-BR"]').setAttribute('aria-current', 'true');
      console.error('Public translation could not be loaded:', language);
    };
    document.head.append(script);
  }
})();

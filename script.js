function initInstitutionalNavigation() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');

  toggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open') ?? false;
    toggle.setAttribute('aria-expanded', String(open));
  });

  document.querySelectorAll('.site-nav a').forEach((link) => {
    link.addEventListener('click', () => {
      nav?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
    });
  });

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });
}

function initPortalPreloader() {
  const preloader = document.querySelector('#preloader');
  const percentNode = document.querySelector('#loading-percent');
  const progressBar = document.querySelector('#loading-bar');
  const fallback = document.querySelector('#earth-fallback');

  if (!preloader || !percentNode || !progressBar) return;

  const startedAt = performance.now();
  const minimumDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 1400;
  const maximumWait = 8000;
  let displayedProgress = 0;
  let sceneReady = false;
  let completionStartedAt = 0;
  let completionScheduled = false;
  let finished = false;

  const setProgress = (value) => {
    const rounded = Math.round(Math.min(100, Math.max(0, value)));
    percentNode.textContent = `${String(rounded).padStart(2, '0')}%`;
    progressBar.style.width = `${value}%`;
  };

  const revealPortal = () => {
    if (finished) return;
    finished = true;
    setProgress(100);
    document.body.classList.add('earth-ready');

    window.setTimeout(() => {
      preloader.classList.add('is-leaving');
      window.setTimeout(() => {
        preloader.hidden = true;
      }, 780);
    }, 280);
  };

  const markSceneReady = () => {
    if (sceneReady) return;
    sceneReady = true;
    if (!completionScheduled) {
      completionScheduled = true;
      const remainingMinimum = Math.max(0, minimumDuration - (performance.now() - startedAt));
      window.setTimeout(() => {
        setProgress(100);
        revealPortal();
      }, remainingMinimum);
    }
  };

  const markSceneUnavailable = (reason) => {
    console.error('A visualização 3D não pôde ser inicializada.', reason);
    fallback?.removeAttribute('hidden');
    markSceneReady();
  };

  window.addEventListener('lab-earth-ready', markSceneReady, { once: true });
  window.addEventListener('lab-earth-error', (event) => markSceneUnavailable(event.detail), { once: true });

  const safetyTimer = window.setTimeout(() => {
    if (!sceneReady) {
      markSceneUnavailable(new Error('Tempo limite excedido ao carregar o módulo Three.js.'));
    }
  }, maximumWait);

  const update = (now) => {
    if (finished) {
      window.clearTimeout(safetyTimer);
      return;
    }

    const elapsed = now - startedAt;
    if (!sceneReady || elapsed < minimumDuration) {
      const timeRatio = Math.min(1, elapsed / minimumDuration);
      const waitingTarget = Math.min(92, 8 + (timeRatio * 76) + (elapsed / maximumWait) * 8);
      displayedProgress += (waitingTarget - displayedProgress) * .08;
    } else {
      if (!completionStartedAt) completionStartedAt = now;
      const completionRatio = Math.min(1, (now - completionStartedAt) / 360);
      displayedProgress += (100 - displayedProgress) * Math.max(.12, completionRatio);
      if (completionRatio === 1 || displayedProgress > 99.6) {
        revealPortal();
        return;
      }
    }

    setProgress(displayedProgress);
    window.requestAnimationFrame(update);
  };

  window.requestAnimationFrame(update);
}

function initPortalNavigation() {
  const toggle = document.querySelector('.portal-menu-toggle');
  const nav = document.querySelector('.portal-navigation');

  if (!toggle || !nav) return;

  const closeMenu = () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      closeMenu();
      toggle.focus();
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });
}

function initLoginModal() {
  const modal = document.querySelector('#login-modal');
  const panel = modal?.querySelector('.login-panel');
  const openButton = document.querySelector('#login-open');
  const form = document.querySelector('#login-form');
  const emailInput = document.querySelector('#login-email');
  let previouslyFocused = null;
  let closeTimer = 0;

  if (!modal || !panel || !openButton || !form) return;

  emailInput.type = 'text';
  emailInput.inputMode = 'text';
  emailInput.autocapitalize = 'none';
  const accessLabel = form.querySelector('label[for="login-email"]');
  if (accessLabel) accessLabel.textContent = 'Acesso';

  const getFocusableElements = () => Array.from(
    panel.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
  );

  const openModal = () => {
    window.clearTimeout(closeTimer);
    const menuToggle = document.querySelector('.portal-menu-toggle');
    previouslyFocused = menuToggle && getComputedStyle(menuToggle).display !== 'none'
      ? menuToggle
      : document.activeElement;
    document.querySelector('.portal-navigation')?.classList.remove('open');
    document.querySelector('.portal-menu-toggle')?.setAttribute('aria-expanded', 'false');
    modal.hidden = false;
    document.body.classList.add('modal-open');
    openButton.setAttribute('aria-expanded', 'true');
    window.dispatchEvent(new CustomEvent('lab-earth-pause'));

    window.requestAnimationFrame(() => {
      modal.classList.add('is-open');
      emailInput?.focus();
    });
  };

  const closeModal = () => {
    if (modal.hidden) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    openButton.setAttribute('aria-expanded', 'false');
    window.dispatchEvent(new CustomEvent('lab-earth-resume'));
    closeTimer = window.setTimeout(() => {
      modal.hidden = true;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    }, 260);
  };

  openButton.addEventListener('click', openModal);
  if (window.location.hash === '#login') openModal();
  modal.querySelectorAll('[data-login-close]').forEach((element) => {
    element.addEventListener('click', closeModal);
  });
  form.addEventListener('submit', handleLogin);

  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements();
    if (!focusable.length) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

function initInteractionHint() {
  const canvas = document.querySelector('#lab-earth');
  const hint = document.querySelector('#interaction-hint');
  if (!canvas || !hint) return;

  canvas.addEventListener('pointerdown', () => hint.classList.add('is-hidden'), { once: true });
}

// LOGIN PROVISÓRIO APENAS PARA PROTOTIPAÇÃO DA INTERFACE.
// NÃO É AUTENTICAÇÃO SEGURA.
// SUBSTITUIR FUTURAMENTE POR SUPABASE AUTH OU OUTRO BACKEND.
async function handleLogin(event) {
  event.preventDefault();

  const emailInput = document.querySelector('#login-email');
  const passwordInput = document.querySelector('#login-password');
  const errorNode = document.querySelector('#login-error');
  const email = emailInput?.value.trim() ?? '';
  const password = passwordInput?.value ?? '';

  if (!email || !password) {
    if (errorNode) errorNode.textContent = 'Preencha acesso e senha para continuar.';
    (!email ? emailInput : passwordInput)?.focus();
    return;
  }

  const submit = event.currentTarget.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    await loadProductionAuth();
    await window.productionAuth.signIn(email, password);
    passwordInput.value = '';
    if (errorNode) errorNode.textContent = '';
    window.location.assign('producao.html');
  } catch (error) {
    if (errorNode) errorNode.textContent = error.message;
  } finally { submit.disabled = false; }
}

let productionAuthLoading;
function loadProductionAuth() {
  if (window.productionAuth) return Promise.resolve();
  if (!productionAuthLoading) productionAuthLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'auth.js';
    script.onload = resolve;
    script.onerror = () => {
      productionAuthLoading = null;
      script.remove();
      reject(new Error('Não foi possível carregar o acesso. Tente novamente.'));
    };
    document.head.append(script);
  });
  return productionAuthLoading;
}

function initPortalHome() {
  if (!document.body.classList.contains('home-portal')) return;
  initPortalPreloader();
  initInteractionHint();
}

// O script da Home é carregado logo antes do módulo Three.js; iniciar agora
// garante que o listener de lab-earth-ready exista antes da cena ser montada.
initPortalNavigation();
initLoginModal();
initPortalHome();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initInstitutionalNavigation, { once: true });
} else {
  initInstitutionalNavigation();
}

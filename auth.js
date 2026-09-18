'use strict';

// Acesso compartilhado do protótipo. Não é uma barreira de segurança:
// código e sessão no navegador podem ser alterados pelo visitante.
// Apps Script deverá validar credenciais, sessão e permissões no servidor.
// Os verificadores PBKDF2 evitam guardar as senhas em texto simples.
window.productionAuth = (() => {
  const key = 'onca-lince.producao.v01.session';
  const executiveKey = 'onca-lince.producao.v01.executive-access-key';
  function clearExecutiveKey() {
    sessionStorage.removeItem(executiveKey);
    window.dispatchEvent(new Event('executive-key-cleared'));
  }
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { clearExecutiveKey(); clearIntlKey(); }
  });
  function clearIntlKey() { sessionStorage.removeItem('onca-lince.gabinete.v01.intl-access-key'); }
  const scriptBase = new URL('.', document.currentScript.src);
  let auditLoading, signingOut, signingIn;
  async function audit(type) {
    const subject = current();
    try {
      // Login público continua intacto: carregar somente após autenticação/saída.
      if (!auditLoading) auditLoading = (async () => {
        for (const [global, file] of [['poliConfig', 'poli-config.js'], ['auditService', 'audit-service.js']]) {
          if (window[global]) continue;
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            const timer = setTimeout(() => { script.remove(); reject(new Error()); }, 1000);
            script.src = new URL(file, scriptBase).href;
            script.onload = () => { clearTimeout(timer); resolve(); };
            script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error()); };
            document.head.append(script);
          });
        }
      })();
      await auditLoading;
      const session = current();
      if (!subject || session?.access !== subject.access || session?.sessionId !== subject.sessionId) return;
      await window.auditService.log({ type });
    } catch { console.warn('[AUDIT] Serviço indisponível; autenticação preservada.'); }
  }
  const accounts = {
    mariana: { name: 'Mariana Tiago', hash: '90e54a4764ab5838f3f3ff8b0ef9ea5e04b8351bdfd549777271fcc5c65588a1' },
    ricarda: { name: 'Ricarda Kruitz', hash: 'a8a569e17a905fa67b450922d2eecb26927923f77248064562ab5362a01cb924' },
    rafael: { name: 'Rafael Figueiredo', hash: 'cb7be3e6575a5caf66c5b656089cd06b99fcab15ceee48cba50325ed24252e67' },
    caio: { name: 'Caio Rodrigues', hash: '16fd03a64a1683fbc4cb22ea887898c11be082873ca7abfc5af43183acba9e86' },
    marta: { name: 'Marta Domingues', hash: 'efd72915a0ba8367e83869ae565f7c2ab228e0322f251b3c0beb3e4292aadf14' },
    zoe: { name: 'Zoe Melo', hash: 'b19059281510fefd2cdae862d53290308e9913d93fcab2efc14b15dab9884c08' },
    lucimar: { name: 'Lucimar Maria', hash: '05d3ea54f67aa5052c073cf23ef16c9abe416e5a5c053ab1a8b7f5060a77997b' },
    rogerio: { name: 'Rogério', hash: 'edf8d786d3a6f51a647db991bcf5b339b5b66459990dbc99e0e2c015d16b70a8' }
  };
  function current() {
    try {
      const session = JSON.parse(localStorage.getItem(key));
      if (!session || !Object.hasOwn(accounts, session.access)) return null;
      return { access: session.access, name: accounts[session.access].name, profile: 'Equipe do laboratório', mode: 'demo', sessionId: session.sessionId || null };
    } catch { return null; }
  }
  if (!current()) { clearExecutiveKey(); clearIntlKey(); }
  return {
    key,
    executiveKey, clearExecutiveKey,
    current,
    signIn(access, password) {
      if (signingIn) return signingIn;
      signingIn = (async () => {
        access = access.trim().toLowerCase();
        if (!Object.hasOwn(accounts, access)) throw new Error('Acesso ou senha incorretos.');
        if (!window.crypto?.subtle) throw new Error('Abra o site por HTTPS ou em localhost para entrar.');
        const encoder = new TextEncoder();
        const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
        const bits = await crypto.subtle.deriveBits({
          name: 'PBKDF2', hash: 'SHA-256', iterations: 100000,
          salt: encoder.encode('onca-lince.v01.' + access)
        }, material, 256);
        const hash = Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
        if (hash !== accounts[access].hash) throw new Error('Acesso ou senha incorretos.');
        clearExecutiveKey();
        clearIntlKey();
        window.poliService?.reset();
        try { localStorage.setItem(key, JSON.stringify({ access, sessionId: 'SES-' + crypto.randomUUID() })); }
        catch { throw new Error('Permita o armazenamento neste navegador para manter a sessão.'); }
        await audit('LOGIN_SUCCESS');
        return current();
      })().finally(() => { signingIn = null; });
      return signingIn;
    },
    signOut({ audit: record = true } = {}) {
      clearIntlKey();
      clearExecutiveKey();
      if (signingOut) return signingOut;
      const session = current();
      signingOut = (async () => {
        if (session && record) await audit('LOGOUT');
        const now = current();
        if (now?.access === session?.access && now?.sessionId === session?.sessionId) {
          window.poliService?.reset(); localStorage.removeItem(key);
          window.auditService?.transition(null);
        }
      })().finally(() => { signingOut = null; });
      return signingOut;
    }
  };
})();

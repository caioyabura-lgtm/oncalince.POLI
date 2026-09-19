'use strict';

// Interface authorization is not data authorization.
// Backend must revalidate access. Somente bootstrap: nenhum Diário/INPUT/Memória aqui.
window.poliService = (() => {
  let bootstrap = null, subject = null, pending = null, controller = null, generation = 0;
  const levels = { READ: 1, WRITE: 2, ADMIN: 3 };
  const token = value => typeof value === 'string' ? value.trim().toUpperCase() : '';
  const text = (value, max = 200) => typeof value === 'string' && value.trim().length <= max ? value.trim() : '';
  const affirmative = value => value === true || token(value) === 'SIM';
  const error = (message, code) => Object.assign(new Error(message), { code });
  function reset() {
    generation += 1; controller?.abort(); controller = null;
    bootstrap = null; subject = null; pending = null;
    window.dispatchEvent(new Event('poli-access-change'));
  }
  function current() {
    const session = window.productionAuth?.current();
    if (!session || subject !== session.access) { if (bootstrap || pending) reset(); return null; }
    return bootstrap;
  }
  function normalize(data) {
    if (!data?.user || token(data.user.status) !== 'ATIVO') throw error('Usuário POLI inexistente ou inativo.', 'POLI_USER_INACTIVE');
    const user = { id: text(data.user.id), name: text(data.user.name), email: text(data.user.email, 320), status: 'ATIVO' };
    if (!user.id || !user.name || !Array.isArray(data.areas) || !Array.isArray(data.permissions)) throw error('Bootstrap POLI inválido.', 'POLI_INVALID');
    const ids = new Set();
    const areas = data.areas.map(item => {
      const id = text(item?.id, 64), name = text(item?.name);
      if (!id || !/^[A-Z][A-Z0-9_]*$/.test(id) || !name || ids.has(id)) throw error('Áreas POLI inválidas.', 'POLI_INVALID');
      ids.add(id);
      return Object.freeze({ id, name, status: token(item.status), dashboardActive: affirmative(item.dashboardActive) });
    });
    const permissions = [];
    for (const item of data.permissions) {
      if (!item || !ids.has(item.areaId) || !Object.hasOwn(levels, item.level)) continue;
      // O contrato admite omitir active somente quando o servidor já filtrou ativo=SIM.
      if (Object.hasOwn(item, 'active') && !affirmative(item.active)) continue;
      if (Object.hasOwn(item, 'userId') && item.userId !== user.id) continue;
      permissions.push(Object.freeze({ areaId: item.areaId, level: item.level }));
    }
    return Object.freeze({ user: Object.freeze(user), areas: Object.freeze(areas), permissions: Object.freeze(permissions) });
  }
  function permitted(areaId, required) {
    const data = current();
    const area = data?.areas.find(item => item.id === areaId);
    return Boolean(area && area.status === 'ATIVO' && area.dashboardActive
      && data.permissions.some(item => item.areaId === areaId && levels[item.level] >= required));
  }
  async function remote(config, signal) {
    if (!config.apiUrl) throw error('Endpoint POLI não configurado.', 'POLI_UNCONFIGURED');
    const url = new URL(config.apiUrl, location.origin);
    if (url.origin !== location.origin || url.username || url.password || url.hash) throw error('O endpoint POLI deve usar a mesma origem e autenticação do servidor.', 'POLI_CONFIG');
    // Não enviar access, nome ou e-mail da sessão demonstrativa como credencial.
    // O endpoint resolve o user_id a partir da sessão autenticada no servidor.
    const response = await fetch(url.href, { method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error', headers: { Accept: 'application/json' }, signal });
    if (response.status === 401 || response.status === 403) throw error('Sessão POLI não autorizada.', 'POLI_USER_INACTIVE');
    if (!response.ok) throw error('Não foi possível carregar as permissões.', 'POLI_NETWORK');
    return response.json();
  }
  function getBootstrap({ refresh = false } = {}) {
    const session = window.productionAuth?.current();
    if (!session) { reset(); return Promise.reject(error('Sessão encerrada.', 'POLI_SESSION')); }
    if (refresh || (subject && subject !== session.access)) reset();
    if (bootstrap && subject === session.access) return Promise.resolve(bootstrap);
    if (pending && subject === session.access) return pending;
    subject = session.access;
    const version = generation;
    const config = window.poliConfig;
    const abort = new AbortController(); controller = abort;
    const timeout = setTimeout(() => abort.abort(), config?.timeoutMs || 10000);
    pending = Promise.resolve().then(async () => {
      try {
        let data;
        if (config?.mode === 'local') {
          if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname)) throw error('Modo local POLI disponível apenas em loopback.', 'POLI_CONFIG');
          data = window.poliLocalBootstrap(session, config.localScenario);
          // Esta conta demonstrativa permanece restrita a INTL também em loopback.
          if (['sergio.inocencio', 'jose.akashi', 'augusto.almeida'].includes(session.access)) data.permissions = [{ areaId: 'INTL', level: 'WRITE', active: true }];
          if (['pedro.sebastiao', 'alexandre.furtado'].includes(session.access)) data.permissions = [{ areaId: 'TECH', level: 'WRITE', active: true }];
        } else if (config?.mode === 'hosted-demo') {
          if (location.hostname !== 'caioyabura-lgtm.github.io'
            || !location.pathname.startsWith('/oncalince.POLI/')) {
            throw error('Demonstração hospedada indisponível neste endereço.', 'POLI_CONFIG');
          }
          // DEMONSTRAÇÃO · UI AUTHORIZATION ONLY · NOT DATA AUTHORIZATION
          // Hosted demo grants UI access only.
          // Real executive data requires backend authorization.
          // Reutiliza apenas o catálogo; cenários locais não concedem acesso hospedado.
          data = window.poliLocalBootstrap(session, 'NONE');
          data.permissions = session.access === 'caio'
            ? ['EXEC', 'ART', 'TECH', 'INTL'].map(areaId => ({ areaId, level: 'ADMIN', active: true }))
            : ['sergio.inocencio', 'jose.akashi', 'augusto.almeida'].includes(session.access)
              ? [{ areaId: 'INTL', level: 'WRITE', active: true }]
              : ['pedro.sebastiao', 'alexandre.furtado'].includes(session.access)
                ? [{ areaId: 'TECH', level: 'WRITE', active: true }]
                : []; // Nenhuma política hospedada definida para as demais contas.
        } else if (config?.mode === 'remote') data = await remote(config, abort.signal);
        else throw error('Modo POLI não configurado.', 'POLI_CONFIG');
        const normalized = normalize(data);
        if (version !== generation || window.productionAuth.current()?.access !== session.access) throw error('A sessão mudou durante a consulta.', 'POLI_SESSION');
        bootstrap = normalized;
        window.dispatchEvent(new Event('poli-access-change'));
        return bootstrap;
      } catch (failure) {
        if (version === generation) { bootstrap = null; window.dispatchEvent(new Event('poli-access-change')); }
        throw failure;
      } finally {
        clearTimeout(timeout);
        if (version === generation) { pending = null; controller = null; }
      }
    });
    return pending;
  }
  window.addEventListener('storage', event => { if (event.key === null || event.key === window.productionAuth?.key) reset(); });
  // A chave digitada é validada pelo Web App, nunca pelos grants de interface.
  async function requestExecutiveDiary(operation, data, id, accessKey) {
    const config = window.poliConfig;
    if (!config?.realExecutiveDiaryEnabled || !config.executiveDiary?.apiUrl) throw error('Diário Executivo real não configurado.', 'EXEC_UNCONFIGURED');
    const url = new URL(config.executiveDiary.apiUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'script.google.com'
      || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)
      || url.port || url.username || url.password || url.search || url.hash) throw error('Endpoint executivo inválido.', 'EXEC_CONFIG');
    if (!['list', 'create', 'update'].includes(operation)) throw error('Operação executiva inválida.', 'EXEC_CONFIG');
    if (!accessKey || !window.productionAuth.current()) throw error('Informe a chave de acesso executivo.', 'EXEC_KEY_REQUIRED');
    const session = window.productionAuth.current();
    const stillCurrent = () => window.productionAuth.current()?.access === session.access
      && window.productionAuth.current()?.sessionId === session.sessionId
      && sessionStorage.getItem(window.productionAuth.executiveKey) === accessKey;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), config.timeoutMs || 10000);
    const cancel = () => abort.abort();
    window.addEventListener('executive-key-cleared', cancel);
    try {
      const response = await fetch(url.href, {
        method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'follow', signal: abort.signal,
        // POST simples: JSON como texto evita preflight não suportado pelo Web App.
        // ContentService redireciona a resposta para script.googleusercontent.com.
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ operation, accessKey, data: { ...(data || {}), ...(id ? { diary_id: id } : {}) } })
      });
      if (abort.signal.aborted || !stillCurrent()) throw error('Sessão encerrada.', 'EXEC_SESSION');
      if (response.status === 401 || response.status === 403) {
        window.productionAuth.clearExecutiveKey();
        throw error('Acesso executivo não autorizado ou indisponível.', 'EXEC_UNAVAILABLE');
      }
      if (!response.ok) throw error('Não foi possível confirmar a operação. Consulte o diário antes de tentar novamente.', 'EXEC_REQUEST');
      const result = await response.json();
      if (abort.signal.aborted || !stillCurrent()) throw error('Sessão encerrada.', 'EXEC_SESSION');
      if (result?.error === 'EXEC_UNAVAILABLE' || result?.code === 'EXEC_UNAVAILABLE' || result?.error?.code === 'EXEC_UNAVAILABLE') {
        window.productionAuth.clearExecutiveKey();
        throw error('Acesso executivo não autorizado ou indisponível.', 'EXEC_UNAVAILABLE');
      }
      if (result?.ok !== true) throw error('O servidor não confirmou a operação executiva.', 'EXEC_REQUEST');
      return result.data;
    } catch (failure) {
      if (failure.code) throw failure;
      throw error('Não foi possível confirmar a operação. Consulte o diário antes de tentar novamente.', 'EXEC_NETWORK');
    } finally { clearTimeout(timer); window.removeEventListener('executive-key-cleared', cancel); }
  }
  return Object.freeze({ getBootstrap, current, reset, requestExecutiveDiary,
    canReadArea: areaId => permitted(areaId, 1),
    canWriteArea: areaId => permitted(areaId, 2),
    isAreaAdmin: areaId => permitted(areaId, 3)
  });
})();

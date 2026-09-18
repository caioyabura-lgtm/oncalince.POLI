'use strict';

// Somente metadados de acesso. Nenhuma escrita direta em planilhas.
window.auditService = (() => {
  const types = new Set(['LOGIN_SUCCESS', 'AREA_OPEN', 'LOGOUT']);
  const areas = new Set(['EXEC', 'ART', 'TECH', 'INTL']);
  const once = new Set();
  let activeArea = null;
  const failure = () => console.warn('[AUDIT] Evento não confirmado; configuração, rede ou contrato indisponível.');
  async function log(event) {
    let timer;
    try {
      const session = window.productionAuth?.current();
      if (!session) return false;
      const allowed = ['type', 'areaId', 'entityType', 'entityId', 'details'];
      if (!event || Object.keys(event).some(key => !allowed.includes(key)) || !types.has(event.type)) throw new Error();
      // Esta versão não aceita conteúdo livre, entidades ou campos operacionais.
      if (['entityType', 'entityId', 'details'].some(key => event[key] !== undefined && event[key] !== '')) throw new Error();
      const payload = { type: event.type, areaId: event.areaId || '', entityType: '', entityId: '', details: '' };
      if (payload.type === 'AREA_OPEN') {
        if (!areas.has(payload.areaId) || !window.poliService?.canReadArea(payload.areaId)) return false;
      } else if (payload.areaId) throw new Error();
      const config = window.poliConfig?.audit;
      if (!config || !['local', 'remote'].includes(config.mode)) throw new Error();
      const identity = session.sessionId || session.access;
      if (payload.type !== 'AREA_OPEN') {
        const key = identity + ':' + payload.type;
        if (once.has(key)) return false;
        once.add(key);
      }
      if (config.mode === 'local') {
        if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname)) throw new Error();
        const userId = window.poliService?.current()?.user.id || (session.mode === 'demo' ? 'DEMO-' + session.access : null);
        console.info('[AUDIT LOCAL] ' + JSON.stringify({ ...payload, userId, sessionId: session.sessionId || null }));
        // Sem timestamp de servidor, event_id ou alegação de gravação remota.
        return true;
      }
      if (!config.apiUrl) throw new Error();
      const url = new URL(config.apiUrl, location.origin);
      if (url.origin !== location.origin || url.username || url.password || url.hash) throw new Error();
      const controller = new AbortController();
      const timeoutMs = Math.min(3000, Math.max(100, Number(config.timeoutMs) || 1500));
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error()); }, timeoutMs);
      });
      // Identidade, sessão, event_id e timestamp são resolvidos pelo servidor.
      // O identificador local SES não é uma credencial e não é enviado como tal.
      const send = async () => {
        const response = await fetch(url.href, { method: 'POST', credentials: 'same-origin',
          cache: 'no-store', redirect: 'error', keepalive: true, signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok || (await response.json())?.ok !== true) throw new Error();
        return true;
      };
      return await Promise.race([send(), timeout]);
    } catch { failure(); return false; }
    finally { clearTimeout(timer); }
  }
  function transition(areaId = null) {
    const session = window.productionAuth?.current();
    if (areaId && (!session || !areas.has(areaId) || !window.poliService?.canReadArea(areaId))) return;
    const next = areaId ? (session.sessionId || session.access) + ':' + areaId : null;
    if (next === activeArea) return;
    activeArea = next;
    if (areaId) void log({ type: 'AREA_OPEN', areaId });
  }
  window.addEventListener('pagehide', () => { activeArea = null; });
  return Object.freeze({ log, transition });
})();

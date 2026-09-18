'use strict';

window.ProductionDiary = function ProductionDiary(area) {
  const areas = window.productionAreas;
  if (!areas.definitions[area] || area === 'producao_executiva') throw new Error('Área de diário inválida.');
  const key = 'onca-lince.producao.v01.diary.' + area;
  const apiBase = area === 'gabinete_internacional' ? window.gabineteConfig.apiBase : window.gabineteConfig.areas?.[area]?.apiBase;
  const types = ['acompanhamento', 'decisão', 'reunião', 'contato', 'ideia', 'pendência', 'observação'];
  const authorize = () => areas.require(area);
  // Reutiliza os estados simples já usados pelo Diário da produção.
  const statuses = ['aberto', 'acompanhamento', 'concluído', 'arquivado'];
  const limits = { responsible: 200, subject: 200, contact: 200, territory: 120, description: 1000, decision: 600, nextStep: 600, reference: 2000 };
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T12:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function normalize(input) {
    const data = {};
    for (const [key, max] of Object.entries(limits)) {
      data[key] = String(input[key] || '').trim();
      if (data[key].length > max) throw new Error('Um dos campos excede o limite de caracteres.');
    }
    if (!data.responsible || !data.subject || !data.description) throw new Error('Preencha responsável, assunto e andamento.');
    data.date = String(input.date || ''); data.deadline = String(input.deadline || '');
    if (!validDate(data.date) || (data.deadline && !validDate(data.deadline))) throw new Error('Informe uma data válida.');
    if (!statuses.includes(input.status)) throw new Error('Selecione um status válido.');
    data.status = input.status;
    data.area = area;
    data.time = String(input.time || '');
    data.type = input.type || 'acompanhamento';
    data.tags = [...new Set((Array.isArray(input.tags) ? input.tags : String(input.tags || '').split(',')).map(value => String(value).trim().replace(/^#+/, '')).filter(Boolean))];
    if (data.tags.length > 40 || data.tags.some(tag => tag.length > 80)) throw new Error('Use até 40 tags com até 80 caracteres.');
    if ((data.time || area !== 'gabinete_internacional') && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)) throw new Error('Informe uma hora válida.');
    if (!types.includes(data.type)) throw new Error('Selecione um tipo válido.');
    if (/^(javascript|data|vbscript):/i.test(data.reference)) throw new Error('Use um link http/https ou uma referência textual.');
    return data;
  }
  function record(value) {
    if (!value || typeof value.id !== 'string' || !value.id || !Number.isInteger(value.version) || value.version < 1) throw new Error('Resposta inválida do serviço de registros.');
    // Respostas antigas do Gabinete sem area permanecem compatíveis somente nele.
    if ((value.area || 'gabinete_internacional') !== area) throw new Error('O serviço retornou um registro de outra área.');
    return { ...value, ...normalize(value), id: value.id, version: value.version };
  }
  function endpoint(path) {
    const base = apiBase;
    if (!base) throw new Error('Integração com Google Sheets não configurada. Nenhum registro foi enviado.');
    const url = new URL(base, location.origin);
    if (url.origin !== location.origin || url.search || url.hash || url.username || url.password) throw new Error('Configure uma rota de API na mesma origem do site.');
    return url.href.replace(/\/$/, '') + path;
  }
  async function request(path, method = 'GET', body) {
    authorize();
    const session = window.productionAuth.current();
    if (!session) throw new Error('Sessão encerrada. Entre novamente.');
    const url = endpoint(path);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      // A sessão local nunca é enviada como prova de autenticação.
      // O servidor deve validar sua própria sessão HttpOnly e autorização.
      const response = await fetch(url, {
        method, credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal,
        headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      authorize();
      if (window.productionAuth.current()?.access !== session.access) throw new Error('A sessão mudou. Entre novamente.');
      if (response.status === 401 || response.status === 403) throw new Error('O servidor não autorizou o acesso ao Gabinete. Entre pela autenticação do serviço.');
      if (response.status === 409) throw new Error('Este registro foi alterado por outra pessoa. Consulte a versão atual antes de editar novamente.');
      if (!response.ok) throw new Error('O serviço não confirmou a operação. Verifique os registros antes de tentar novamente.');
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError || error instanceof SyntaxError) throw new Error('Não foi possível confirmar a operação. Consulte o diário antes de tentar novamente; seu preenchimento foi mantido.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  const chronological = rows => rows.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
  function readLocal() {
    authorize();
    try {
      const rows = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(rows)) throw new Error();
      return rows.map(record);
    } catch { throw new Error('Não foi possível ler o diário local. Os dados existentes foram preservados.'); }
  }
  async function saveLocal(input, requestId, id = null, version = null) {
    authorize();
    const access = productionAuth.current().access;
    const data = normalize(input);
    const write = () => {
      authorize();
      if (productionAuth.current().access !== access) throw new Error('A sessão mudou.');
      const rows = readLocal();
      const duplicate = rows.find(row => row.requestId === requestId);
      if (duplicate) {
        if (duplicate.requestPayload !== JSON.stringify(data) || (id && duplicate.id !== id)) throw new Error('Operação repetida com dados diferentes.');
        return duplicate;
      }
      const index = id ? rows.findIndex(row => row.id === id) : -1;
      if (id && (index < 0 || rows[index].version !== version)) throw new Error('Este registro foi alterado por outra pessoa. Atualize o diário antes de editar.');
      const now = new Date().toISOString();
      const saved = { ...(id ? rows[index] : {}), ...data,
        id: id || crypto.randomUUID(), version: id ? version + 1 : 1,
        createdAt: id ? rows[index].createdAt : now, updatedAt: now,
        createdBy: id ? rows[index].createdBy : access, updatedBy: access,
        requestId, requestPayload: JSON.stringify(data) };
      if (id) rows[index] = saved; else rows.push(saved);
      try { localStorage.setItem(key, JSON.stringify(rows)); }
      catch { throw new Error('Não foi possível salvar neste navegador. Seu preenchimento foi mantido.'); }
      return saved;
    };
    return navigator.locks ? navigator.locks.request(key, write) : write();
  }
  return {
    area, key, statuses, types, normalize,
    get configured() { return true; },
    get mode() { return apiBase ? 'remote' : 'local'; },
    async list() {
      authorize();
      if (!apiBase) return chronological(readLocal());
      const result = await request('/records');
      if (!Array.isArray(result.records)) throw new Error('Resposta inválida do serviço de registros.');
      const records = result.records.map(record);
      if (new Set(records.map(item => item.id)).size !== records.length) throw new Error('O serviço retornou registros duplicados.');
      return chronological(records);
    },
    async create(input, requestId) {
      authorize();
      if (!requestId) throw new Error('Identificador da operação ausente.');
      if (!apiBase) return saveLocal(input, requestId);
      return record((await request('/records', 'POST', { area, record: normalize(input), requestId })).record);
    },
    async update(id, version, input, requestId) {
      authorize();
      if (!id || !Number.isInteger(version) || !requestId) throw new Error('Identificador ou versão do registro ausente.');
      if (!apiBase) return saveLocal(input, requestId, id, version);
      return record((await request('/records/' + encodeURIComponent(id), 'PATCH', { area, record: normalize(input), version, requestId })).record);
    }
  };
};
// Compatibilidade com integrações e testes anteriores do Gabinete.
window.gabineteService = window.ProductionDiary('gabinete_internacional');

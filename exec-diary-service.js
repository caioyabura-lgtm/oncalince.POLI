'use strict';

// Contrato exclusivo POLI_EXECUTIVO / DIARIO_EXECUTIVO. Nunca POLI / 20_DIARIO.
// Não lê localStorage, não migra registros e não usa grants demonstrativos.
window.execDiaryService = (() => {
  let keyPrompt = null;
  function accessKey() {
    if (!window.productionAuth.current()) return Promise.reject(new Error('Sessão encerrada.'));
    const stored = sessionStorage.getItem(window.productionAuth.executiveKey);
    if (stored) return Promise.resolve(stored);
    if (keyPrompt) return keyPrompt;
    const dialog = document.querySelector('#executive-key-dialog');
    if (!dialog) return Promise.reject(new Error('Abra o Diário Executivo real para informar a chave.'));
    keyPrompt = new Promise((resolve, reject) => {
      const form = dialog.querySelector('form');
      const field = dialog.querySelector('input');
      let accepted = false;
      const submit = event => {
        event.preventDefault();
        const value = field.value.trim();
        if (!value || !window.productionAuth.current()) return;
        try { sessionStorage.setItem(window.productionAuth.executiveKey, value); }
        catch { field.value = ''; reject(new Error('Permita o armazenamento da sessão para acessar o Diário real.')); dialog.close(); return; }
        accepted = true; field.value = ''; resolve(value); dialog.close();
      };
      const cancel = () => dialog.close();
      const close = () => {
        field.value = '';
        form.removeEventListener('submit', submit);
        window.removeEventListener('executive-key-cleared', cancel);
        if (!accepted) reject(new Error('Acesso ao Diário Executivo real cancelado.'));
      };
      form.addEventListener('submit', submit);
      dialog.addEventListener('close', close, { once: true });
      window.addEventListener('executive-key-cleared', cancel);
      field.value = ''; dialog.showModal(); field.focus();
    }).finally(() => { keyPrompt = null; });
    return keyPrompt;
  }
  function editorial(data) {
    const result = {};
    for (const field of ['titulo', 'registro', 'tipo', 'status']) {
      if (typeof data?.[field] !== 'string' || !data[field].trim()) throw new Error('Conteúdo editorial inválido.');
      result[field] = data[field].trim();
    }
    if (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string')) throw new Error('Tags inválidas.');
    result.tags = data.tags.map(tag => tag.trim()).filter(Boolean);
    return result; // diary_id, user_id e criado_em são descartados.
  }
  const request = async (operation, data, id) => {
    if (!window.poliConfig?.realExecutiveDiaryEnabled || !window.poliConfig?.executiveDiary?.apiUrl) {
      throw new Error('Diário Executivo real não configurado.');
    }
    return window.poliService.requestExecutiveDiary(operation, data, id, await accessKey());
  };
  function records(value) {
    if (!Array.isArray(value)) throw new Error('Resposta inválida do Diário Executivo.');
    return value.map(item => {
      if (!item || ['diary_id', 'criado_em', 'titulo', 'registro', 'tipo', 'status'].some(field => typeof item[field] !== 'string')
        || !item.diary_id || !Number.isFinite(Date.parse(item.criado_em))) throw new Error('Resposta inválida do Diário Executivo.');
      let tags = item.tags;
      if (typeof tags === 'string') {
        try { tags = JSON.parse(tags); } catch { tags = tags.split(',').map(tag => tag.trim()).filter(Boolean); }
      }
      if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string')) throw new Error('Resposta inválida do Diário Executivo.');
      return { diary_id: item.diary_id, criado_em: new Date(item.criado_em).toISOString(),
        titulo: item.titulo, registro: item.registro, tipo: item.tipo, status: item.status, tags };
    });
  }
  return Object.freeze({
    list: async () => records(await request('list')),
    create: data => request('create', editorial(data)),
    update(id, data) {
      if (typeof id !== 'string' || !id.trim()) return Promise.reject(new Error('Identificador inválido.'));
      return request('update', editorial(data), id);
    }
  });
})();

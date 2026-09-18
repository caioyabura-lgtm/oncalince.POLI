'use strict';

// Contrato exclusivo POLI_EXECUTIVO / DIARIO_EXECUTIVO. Nunca POLI / 20_DIARIO.
// Não lê localStorage, não migra registros e não usa grants demonstrativos.
window.execDiaryService = (() => {
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
  const request = (operation, data, id) => window.poliService.requestExecutiveDiary(operation, data, id);
  return Object.freeze({
    list: () => request('list'),
    create: data => request('create', editorial(data)),
    update(id, data) {
      if (typeof id !== 'string' || !id.trim()) return Promise.reject(new Error('Identificador inválido.'));
      return request('update', editorial(data), id);
    }
  });
})();

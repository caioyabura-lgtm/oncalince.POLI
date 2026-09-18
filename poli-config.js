'use strict';

// Configuração central de acesso e auditoria, com modos independentes. Nenhum segredo.
window.poliConfig = Object.freeze({
  mode: 'local', // 'local' (somente loopback) ou 'remote'.
  apiUrl: null, // Endpoint autenticado de bootstrap na mesma origem; ainda não fornecido.
  localScenario: 'A', // NONE (sem concessões), A, B ou C. Somente usuários sintéticos.
  timeoutMs: 10000,
  audit: Object.freeze({ mode: 'local', apiUrl: null, timeoutMs: 1500 })
});

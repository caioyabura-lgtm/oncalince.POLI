'use strict';
// Somente rota pública de configuração. Nunca colocar ID de planilha, chave ou token aqui.
// Preencher após implantar o servidor autenticado descrito em GABINETE_INTEGRACAO.md.
// Sem API, cada área usa seu diário local explicitamente identificado na interface.
// Uma API configurada que falhe NÃO provoca fallback para armazenamento local.
window.gabineteConfig = Object.freeze({ apiBase: null, areas: Object.freeze({
  diretoria_tecnica: Object.freeze({ apiBase: null }),
  arte_performance: Object.freeze({ apiBase: null })
}) });

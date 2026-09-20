'use strict';
// Somente rota pública de configuração. Nunca colocar ID de planilha, chave ou token aqui.
// Preencher após implantar o servidor autenticado descrito em GABINETE_INTEGRACAO.md.
// Sem API, cada área usa seu diário local explicitamente identificado na interface.
// Uma API configurada que falhe NÃO provoca fallback para armazenamento local.
window.gabineteConfig = Object.freeze({ apiBase: null,
  intlDiary: Object.freeze({
    apiUrl: 'https://script.google.com/macros/s/AKfycbyNxGJv2TUDPMBnIpz1WC2gQPP-qoTZSIUYgUPuxd5os4ERbbtua0BSPSH7ojQDVA9J/exec'
  }), // Exclusivo INTL; não reutiliza endpoint nem chave EXEC.
  areas: Object.freeze({
  diretoria_tecnica: Object.freeze({ apiBase: null }),
  arte_performance: Object.freeze({ apiBase: null })
}) });

'use strict';

// Configuração central de acesso e auditoria, com modos independentes. Nenhum segredo.
window.poliConfig = Object.freeze({
  // DEMONSTRAÇÃO · UI AUTHORIZATION ONLY · NOT DATA AUTHORIZATION
  // A publicação seleciona hosted-demo somente dentro deste projeto.
  mode: location.hostname === 'caioyabura-lgtm.github.io'
    && location.pathname.startsWith('/oncalince.POLI/') ? 'hosted-demo' : 'local',
  // Modos: local (loopback), hosted-demo (projeto permitido) ou remote.
  apiUrl: null, // Endpoint autenticado de bootstrap na mesma origem; ainda não fornecido.
  localScenario: 'A', // NONE (sem concessões), A, B ou C. Somente usuários sintéticos.
  timeoutMs: 10000,
  realExecutiveDiaryEnabled: true, // Disponibilidade do adapter; backend valida accessKey em cada operação.
  executiveDiary: Object.freeze({
    mode: 'local', // Padrão demonstrativo; o usuário abre o real explicitamente.
    apiUrl: 'https://script.google.com/macros/s/AKfycbyOaYWE-gQpwIDAxgNAJxHzLwE8bUt_2tdoyp2QMTCssWIc7dGz0f1S5YaFCSVMLJO6AA/exec'
  }),
  audit: Object.freeze({ mode: 'local', apiUrl: null, timeoutMs: 1500 })
});

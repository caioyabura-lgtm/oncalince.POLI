'use strict';

// Mock explícito do contrato POLI. Não cadastra nem concede permissões a usuários reais.
// Cenários somente em loopback; hosted-demo reutiliza o catálogo com NONE.
window.poliLocalBootstrap = (session, scenario) => {
  const scenarios = {
    NONE: [],
    A: [['EXEC', 'ADMIN'], ['TECH', 'READ'], ['INTL', 'WRITE']],
    B: [['ART', 'WRITE']],
    C: [['PROD', 'ADMIN'], ['MKT', 'WRITE'], ['ADMIN', 'READ']]
  };
  if (!Object.hasOwn(scenarios, scenario)) throw new Error('Cenário local POLI inválido.');
  return {
    user: { id: 'DEMO-' + session.access, name: session.name, email: '', status: 'ATIVO' },
    areas: [
      { id: 'EXEC', name: 'Produção Executiva', status: 'ATIVO', dashboardActive: true },
      { id: 'ART', name: 'Departamento de Arte e Performance', status: 'ATIVO', dashboardActive: true },
      { id: 'PROD', name: 'Direção de Produção', status: 'ATIVO', dashboardActive: true },
      { id: 'TECH', name: 'Diretoria Técnica', status: 'ATIVO', dashboardActive: true },
      { id: 'MKT', name: 'Direção de Marketing', status: 'ATIVO', dashboardActive: false },
      { id: 'ADMIN', name: 'Diretoria Administrativa', status: 'ATIVO', dashboardActive: true },
      { id: 'INTL', name: 'Gabinete Internacional', status: 'ATIVO', dashboardActive: true }
    ],
    // Caio has the same ART access in the default local and hosted demos.
    permissions: [...scenarios[scenario], ...(scenario === 'A' && session.access === 'caio' ? [['ART', 'ADMIN']] : [])].map(([areaId, level]) => ({ areaId, level, active: true }))
  };
};

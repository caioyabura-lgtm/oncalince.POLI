'use strict';

// Compatibilidade de rotas e PATCH. A autorização de abertura vem do POLI.
window.productionAreas = (() => {
  const definitions = Object.freeze({
    producao_executiva: Object.freeze({ label: 'Produção Executiva', patch: 'producao-executiva', href: 'producao.html#executivo' }),
    gabinete_internacional: Object.freeze({ label: 'Gabinete Internacional', patch: 'administracao-internacional', href: 'gabinete-interno.html' }),
    diretoria_tecnica: Object.freeze({ label: 'Diretoria Técnica', patch: 'direcao-tecnica', href: 'diretoria_tecnica.html' }),
    arte_performance: Object.freeze({ label: 'Departamento de Arte e Performance', patch: 'arte-performance', href: 'departamento_arte_performance.html' })
  });
  const ids = Object.freeze({ producao_executiva: 'EXEC', arte_performance: 'ART', diretoria_tecnica: 'TECH', gabinete_internacional: 'INTL' });
  // Política legada de DADOS mantida porque Diário/INPUT não integram o POLI nesta etapa.
  // Estas listas NÃO ativam botões nem autorizam a abertura de workspaces.
  const legacyDataGrants = Object.freeze({
    producao_executiva: Object.freeze(['caio']),
    gabinete_internacional: Object.freeze(['mariana', 'ricarda', 'rafael', 'caio', 'marta', 'zoe', 'lucimar', 'rogerio']),
    diretoria_tecnica: Object.freeze([]),
    arte_performance: Object.freeze(['caio'])
  });
  function canUseLegacyData(area) {
    const session = window.productionAuth?.current();
    return Boolean(session && legacyDataGrants[area]?.includes(session.access));
  }
  const can = area => Boolean(ids[area] && window.poliService?.canReadArea(ids[area]));
  return Object.freeze({
    definitions, ids, can,
    require(area) { if (!canUseLegacyData(area)) throw new Error('Os dados desta área ainda dependem da política anterior de acesso.'); },
    fromPatch(patch) {
      const value = typeof patch === 'string' ? patch : patch?.primary;
      return Object.keys(definitions).find(area => area === value || definitions[area].patch === value) || null;
    }
  });
})();

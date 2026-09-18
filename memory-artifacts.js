'use strict';

// Contrato de dados para a futura curadoria; não cadastra nem publica materiais.
// A coleção do mural permanece vazia nesta versão. Não importar registros legados.
// candidacyId identifica a candidatura/contexto de financiamento dentro do projeto.
// null significa contexto ainda não associado; nunca equivale a todas as candidaturas.
// A apresentação desses identificadores não pertence à interface do mural.
/**
 * @typedef {Object} ProductionArtifact
 * @property {string} id
 * @property {string} projectId
 * @property {string|null} candidacyId
 * @property {string} title
 * @property {'memory'|'artifact'} category
 * @property {string|null} reference
 * @property {Object|null} editorial Definição futura da curadoria: posição, destaque e grupo.
 */
window.productionArtifactModel = Object.freeze({
  normalize(record) {
    const identifier = value => typeof value === 'string' && value.trim() ? value.trim() : null;
    const id = identifier(record.id);
    const projectId = identifier(record.projectId);
    if (!id || !projectId) throw new Error('Artefato sem identificador de registro ou projeto.');
    if (!['memory', 'artifact'].includes(record.category)) throw new Error('Categoria de artefato inválida.');
    if (record.candidacyId != null && !identifier(record.candidacyId)) throw new Error('Identificador de candidatura inválido.');
    return { ...record, id, projectId, candidacyId: identifier(record.candidacyId), editorial: record.editorial ?? null };
  },
  forContext(records, { projectId, candidacyId = null }) {
    // Filtra contexto sem ordenar, ranquear ou preencher decisões editoriais.
    return records.filter(record => record.projectId === projectId && (record.candidacyId ?? null) === candidacyId);
  }
});

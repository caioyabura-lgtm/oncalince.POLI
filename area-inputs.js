'use strict';
// Uma consulta e um renderizador para todos os workspaces, inclusive o executivo.
window.areaInputs = {
  async render(area, target) {
    const records = await window.inputService.listForArea(area);
    window.productionAreas.require(area);
    target.replaceChildren();
    const node = (tag, text, className = '') => { const el = document.createElement(tag); el.textContent = text; el.className = className; return el; };
    for (const record of records) {
      const article = node('article', '', 'entry');
      article.append(node('p', record.protocol || record.id, 'entry-meta'), node('h3', record.title),
        node('p', record.synopsis || record.description || ''),
        node('p', (record.userName || record.author || '') + ' · ' + (record.status || '') + ' · ' + new Date(record.createdAt).toLocaleString('pt-BR'), 'entry-meta'));
      const category = inputService.licenseOptions.find(option => option.id === record.licenseCategory);
      if (category) article.append(node('p', category.label + ' · condições provisórias ' + record.licenseTermsVersion));
      if (record.link) {
        try { const url = new URL(record.link); if (['http:', 'https:'].includes(url.protocol)) { const link = node('a', 'Abrir referência ↗'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; article.append(link); } } catch { /* Não navegar em referências inválidas. */ }
      }
      for (const file of record.files || []) article.append(node('p', file.name + ' · ' + (file.mimeType || file.extension) + ' · ' + file.size + ' B', 'entry-meta'));
      article.append(node('p', 'Registro local original. Arquivos: somente metadados; sem upload.', 'development-note'));
      target.append(article);
    }
    if (!records.length) target.append(node('p', '0 INPUTS recebidos.', 'empty'));
    return records.length;
  }
};

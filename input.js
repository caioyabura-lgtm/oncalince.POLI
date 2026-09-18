'use strict';
(() => {
  if (!window.productionAuth?.current()) { location.replace('index.html#login'); return; }
  const service = window.inputService;
  const $ = selector => document.querySelector(selector);
  const form = $('#input-form');
  let dirty = false;
  let selectedFiles = [];
  const notify = (message = '', error = false) => { $('#input-feedback').textContent = message; $('#input-feedback').classList.toggle('error', error); };
  const node = (tag, text = '', className = '') => {
    const element = document.createElement(tag); element.textContent = text; element.className = className; return element;
  };
  const categoryLabel = id => service.licenseOptions.find(option => option.id === id)?.label || id;
  const patchLabel = patch => service.patchOptions.find(option => option.id === patch?.primary)?.label || '';
  const dateLabel = date => new Date(date).toLocaleString('pt-BR');
  function reference(parent, value) {
    if (!value) return;
    let url;
    try { url = new URL(value); } catch { /* Referências antigas podem ser caminhos. */ }
    if (url && ['http:', 'https:'].includes(url.protocol)) {
      const link = node('a', 'Abrir referência ↗'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; parent.append(link);
    } else parent.append(node('p', value));
  }
  function recordSummary(record) {
    const fragment = document.createDocumentFragment();
    fragment.append(node('p', record.protocol, 'input-protocol'), node('h3', record.title),
      node('p', categoryLabel(record.licenseCategory) + ' → ' + (record.initialAreaId === 'EXEC' ? 'PRODUÇÃO EXECUTIVA' : patchLabel(record.patch))),
      node('p', record.files.length + ' arquivo(s) · ' + dateLabel(record.createdAt)),
      node('p', record.status + ' · registro local neste navegador', 'entry-meta'));
    if (record.files.length) fragment.append(node('p', 'Somente metadados registrados. Arquivos não armazenados nem enviados.', 'development-note'));
    return fragment;
  }
  async function render() {
    const records = await service.list();
    $('#input-list-title').textContent = await window.authorizationService.can('input.readAll') ? 'Inputs recebidos' : 'Meus inputs';
    const list = $('#input-list'); list.replaceChildren();
    records.forEach(record => {
      const article = node('article', '', 'entry input-entry'); article.id = record.id;
      const details = node('details'); details.append(node('summary', 'Abrir conteúdo'));
      if (record.schemaVersion === 2 || record.schemaVersion === 3) {
        article.append(recordSummary(record));
        details.append(node('p', record.synopsis), node('p', 'Entrada realizada como ' + record.userName, 'entry-meta'));
        reference(details, record.link);
        record.files.forEach(file => details.append(node('p', file.name + ' · ' + (file.mimeType || file.extension) + ' · ' + formatSize(file.size))));
        details.append(node('p', 'Condições provisórias · ' + record.licenseTermsVersion, 'entry-meta'));
      } else {
        // Leitura legada sem migrar, apagar ou reclassificar o conteúdo original.
        article.append(node('p', record.date + ' · ' + (record.type || '') + ' · registro anterior', 'entry-meta'), node('h3', record.title),
          node('p', 'Origem · ' + record.author + ' · ' + (record.relatedArea || 'Área não informada'), 'entry-meta'));
        details.append(node('p', record.description || ''));
        reference(details, record.reference);
        if (record.tags?.length) details.append(node('p', record.tags.map(tag => '#' + tag).join(' ')));
        if (record.notes) details.append(node('p', 'Observações · ' + record.notes));
        const legacy = { pending: 'Licença a definir / aguardando orientação', specific: 'Autorização específica / consultar produção' };
        details.append(node('p', 'Licenciamento · ' + (legacy[record.licensing?.option] || 'A definir')),
          node('p', 'Condições · ' + (record.licensing?.conditions || 'Não informadas')),
          node('p', 'Autorização / declaração · ' + (record.licensing?.declaration || 'Não informada')),
          node('p', 'Aguardando avaliação · cadastro local', 'entry-meta'));
      }
      if (location.hash.slice(1) === record.id) details.open = true;
      article.append(details); list.append(article);
    });
    if (!records.length) list.append(node('p', 'Nenhum input registrado.', 'empty'));
  }
  function choices(target, name, options) {
    options.forEach(option => {
      const row = node('div', '', 'input-choice');
      const label = node('label');
      const radio = document.createElement('input'); radio.type = 'radio'; radio.name = name; radio.value = option.id; radio.required = true;
      label.append(radio, node('span', option.label)); row.append(label);
      if (option.conditions) {
        const details = node('details');
        details.append(node('summary', 'ver condições'), node('p', 'Provisório · ' + option.conditions));
        row.append(details);
      }
      $(target).append(row);
    });
  }
  const formatSize = size => size < 1024 ? size + ' B' : size < 1024 * 1024 ? (size / 1024).toFixed(1) + ' KB' : (size / 1024 / 1024).toFixed(1) + ' MB';
  function renderFiles() {
    $('#selected-files').replaceChildren();
    selectedFiles.forEach((file, index) => {
      const metadata = service.fileMetadata(file);
      const row = node('li');
      const remove = node('button', 'remover'); remove.type = 'button'; remove.setAttribute('aria-label', 'Remover ' + file.name);
      remove.addEventListener('click', () => { selectedFiles.splice(index, 1); dirty = true; renderFiles(); $('#add-files').focus(); });
      row.append(node('span', file.name), node('span', (metadata.mimeType || metadata.extension.toUpperCase()) + ' · ' + formatSize(file.size), 'entry-meta'), remove);
      $('#selected-files').append(row);
    });
  }
  choices('#license-options', 'licenseCategory', service.licenseOptions);
  $('#file-picker').accept = service.fileAccept;
  $('#add-files').addEventListener('click', () => $('#file-picker').click());
  $('#file-picker').addEventListener('change', event => {
    const errors = [];
    for (const file of event.target.files) {
      try { service.fileMetadata(file); selectedFiles.push(file); dirty = true; } catch (error) { errors.push(error.message); }
    }
    event.target.value = ''; renderFiles(); notify(errors.join(' '), errors.length > 0);
  });
  form.elements.synopsis.addEventListener('keydown', event => { if (event.key === 'Enter') event.preventDefault(); });
  form.elements.synopsis.addEventListener('input', event => {
    const field = event.target;
    if (/[\r\n\u2028\u2029]/.test(field.value)) field.value = field.value.replace(/[\r\n\u2028\u2029]+/g, ' ');
  });
  form.addEventListener('input', () => {
    dirty = true;
    const category = form.elements.licenseCategory.value;
    $('#input-selection').textContent = category ? categoryLabel(category) + ' → PRODUÇÃO EXECUTIVA' : '';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]'); button.disabled = true; notify();
    try {
      const record = await service.create({ ...Object.fromEntries(new FormData(form)), files: selectedFiles });
      dirty = false; selectedFiles = []; $('#file-picker').value = '';
      form.hidden = true;
      $('#confirmation-content').replaceChildren(recordSummary(record));
      $('#input-confirmation').hidden = false; $('#confirmation-title').focus();
      try { await render(); } catch (error) { notify('Entrada registrada. Não foi possível atualizar a lista: ' + error.message, true); }
    } catch (error) { notify(error.message, true); }
    finally { button.disabled = false; }
  });
  $('#new-input').addEventListener('click', () => {
    form.reset(); selectedFiles = []; renderFiles(); dirty = false; notify();
    $('#input-selection').textContent = ''; $('#input-confirmation').hidden = true; form.hidden = false; form.elements.title.focus();
  });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === window.productionAuth.key) {
      dirty = false; form.reset(); form.hidden = true; selectedFiles = [];
      $('#input-list').replaceChildren(); $('#input-confirmation').hidden = true; location.reload();
    } else if (event.key === service.key) render().catch(error => notify(error.message, true));
  });
  (async () => {
    try {
      await window.authorizationService.require('input.create');
      $('#input-user').textContent = window.productionAuth.current().name;
      $('.input-identity').hidden = false; form.hidden = false; await render();
    } catch (error) { notify(error.message, true); }
  })();
})();

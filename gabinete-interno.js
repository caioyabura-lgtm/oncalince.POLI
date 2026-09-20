'use strict';
(async () => {
  const area = new URLSearchParams(location.search).get('area') || 'gabinete_internacional';
  if (area === 'diretoria_tecnica') document.querySelector('#workspace').replaceChildren();
  if (!window.productionAuth?.current()) { location.replace('index.html#login'); return; }
  // Somente controle de abertura. Os serviços de Diário e INPUT permanecem legados.
  try { await window.poliService.getBootstrap(); }
  catch (error) {
    if (error.code === 'POLI_USER_INACTIVE') { await productionAuth.signOut({ audit: false }); location.replace('index.html#login'); return; }
    location.replace('producao.html#overview'); return;
  }
  const $ = selector => document.querySelector(selector);
  const definition = window.productionAreas.definitions[area];
  if (!definition || area === 'producao_executiva' || !window.productionAreas.can(area)) {
    $('#workspace').replaceChildren();
    const message = document.createElement('p'); message.textContent = 'Sua credencial não tem acesso a esta área.';
    const back = document.createElement('a'); back.href = 'producao.html#overview'; back.textContent = 'Voltar ao Dashboard Geral';
    $('#workspace').append(message, back); return;
  }
  document.title = definition.label + ' · Área interna';
  if (area === 'diretoria_tecnica') {
    $('#workspace').append($('#technical-workspace-template').content.cloneNode(true));
    $('#session-user').textContent = $('#profile-name').textContent = productionAuth.current().name;
    $('#profile-button').addEventListener('click', () => $('#profile-dialog').showModal());
    $('#logout-button').addEventListener('click', async () => {
      await productionAuth.signOut(); location.assign('index.html');
    });
    window.addEventListener('storage', event => {
      if (event.key === null || event.key === productionAuth.key) {
        $('#workspace').replaceChildren(); location.reload();
      }
    });
    window.auditService?.transition(productionAreas.ids[area]);
    window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
    return;
  }
  $('#workspace h1').textContent = definition.label;
  $('#dashboard-title').textContent = 'Dashboard';
  const service = window.ProductionDiary(area);
  const form = $('#gabinete-form');
  let records = [], editing = null, dirty = false, busy = false, connected = false;
  let requestId = null, lastPayload = null;
  const node = (tag, text = '', className = '') => {
    const element = document.createElement(tag); element.textContent = text; element.className = className; return element;
  };
  const notify = (text = '', error = false) => { $('#feedback').textContent = text; $('#feedback').classList.toggle('error', error); $('#feedback').setAttribute('role', error ? 'alert' : 'status'); };
  const today = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };
  const dateLabel = value => value ? value.split('-').reverse().join('/') : '';
  const isOpen = record => ['aberto', 'acompanhamento'].includes(record.status);
  const searchText = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  function closeForm() { form.hidden = true; form.reset(); editing = null; dirty = false; requestId = null; lastPayload = null; }
  function openForm(record = null) {
    window.productionAreas.require(area);
    if (busy || (dirty && !confirm('Descartar o preenchimento atual?'))) return;
    closeForm(); editing = record;
    form.elements.date.value = today(); form.elements.responsible.value = productionAuth.current().name;
    form.elements.status.value = 'aberto';
    form.elements.time.value = new Date().toTimeString().slice(0, 5);
    if (record) for (const [key, value] of Object.entries(record)) { const field = form.elements.namedItem(key); if (field) field.value = Array.isArray(value) ? value.join(', ') : value; }
    $('#form-title').textContent = record ? 'Editar registro' : 'Novo registro';
    $('#save-note').textContent = service.mode === 'local' ? 'Diário local desta área, neste navegador. Não enviado ao Google Sheets.' : 'O registro será salvo somente após confirmação do serviço.';
    $('#save-record').disabled = !service.configured;
    form.hidden = false; form.elements.subject.focus();
  }
  function renderList() {
    const list = $('#records'); list.replaceChildren();
    if (!connected) { $('#record-count').textContent = ''; return; }
    const from = $('#date-from').value, to = $('#date-to').value;
    if (from && to && from > to) { $('#record-count').textContent = 'O início do período deve ser anterior ao fim.'; return; }
    const query = searchText($('#search').value.trim());
    const selected = records.filter(record => (!$('#filter-status').value || record.status === $('#filter-status').value)
      && (!$('#filter-type').value || record.type === $('#filter-type').value)
      && (!$('#filter-territory').value || record.territory === $('#filter-territory').value)
      && (!from || record.date >= from) && (!to || record.date <= to)
      && searchText([record.subject, record.responsible, record.contact, record.territory, record.description, record.decision, record.nextStep, ...(record.tags || [])].join(' ')).includes(query));
    $('#record-count').textContent = 'Mais recentes primeiro · ' + selected.length + ' registro(s)';
    for (const record of selected) {
      const article = node('article', '', 'entry');
      article.append(node('p', dateLabel(record.date) + ' ' + (record.time || '') + ' · ' + record.responsible + ' · ' + record.status, 'entry-meta'), node('h3', record.subject), node('p', record.description, 'entry-body'));
      const details = node('details'); details.append(node('summary', 'Consultar registro'));
      const fields = node('dl');
      fields.append(node('dt', 'Tipo'), node('dd', record.type || 'acompanhamento'), node('dt', 'Tags'), node('dd', (record.tags || []).join(', ')));
      for (const [key, label] of Object.entries({ contact: 'Contato / instituição', territory: 'Território / país', decision: 'Decisão / encaminhamento', nextStep: 'Próximo passo', deadline: 'Prazo', reference: 'Referência' })) {
        if (!record[key]) continue;
        const value = node('dd', key === 'deadline' ? dateLabel(record[key]) : record[key]);
        if (key === 'reference') {
          try { const url = new URL(record.reference); if (['http:', 'https:'].includes(url.protocol)) { const link = node('a', 'Abrir referência ↗'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; value.replaceChildren(link); } } catch { /* Referência textual. */ }
        }
        fields.append(node('dt', label), value);
      }
      const edit = node('button', 'Editar'); edit.type = 'button'; edit.disabled = busy; edit.addEventListener('click', () => openForm(record));
      details.append(fields, edit); article.append(details); list.append(article);
    }
    if (!selected.length) list.append(node('p', records.length ? 'Nenhum registro corresponde aos filtros.' : 'Nenhum registro na base conectada.', 'empty'));
  }
  function renderDashboard() {
    $('#dashboard-data').hidden = !connected;
    $('#dashboard-empty').hidden = connected && records.length > 0;
    $('#dashboard-empty').textContent = connected ? 'Nenhum registro na base conectada.' : 'Os acompanhamentos serão apresentados quando a base estiver conectada e houver registros.';
    const open = records.filter(isOpen);
    const overdue = open.filter(record => record.deadline && record.deadline < today());
    $('#indicators').replaceChildren();
    for (const [label, value] of [['Registros', records.length], ['Em aberto', open.length], ['Prazos vencidos', overdue.length]]) {
      const group = node('div'); group.append(node('dt', label), node('dd', String(value))); $('#indicators').append(group);
    }
    const fill = (selector, items, label, empty) => { $(selector).replaceChildren(...items.map(item => node('li', label(item)))); if (!items.length) $(selector).append(node('li', empty)); };
    fill('#recent', records.slice(0, 5), r => dateLabel(r.date) + ' · ' + r.subject, 'Sem registros.');
    fill('#open', open.slice(0, 5), r => r.subject + ' · ' + r.responsible, 'Nenhuma atividade em aberto.');
    fill('#deadlines', open.filter(r => r.deadline && r.deadline >= today()).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 5), r => dateLabel(r.deadline) + ' · ' + r.subject, 'Nenhum próximo prazo informado.');
    for (const [field, selector] of [['status', '#by-status'], ['territory', '#by-territory']]) {
      const counts = new Map(); for (const record of records) { const key = record[field] || 'Não informado'; counts.set(key, (counts.get(key) || 0) + 1); }
      fill(selector, [...counts], ([key, count]) => key + ' · ' + count, 'Sem registros.');
    }
  }
  function updateViews() {
    const previous = $('#filter-territory').value;
    $('#filter-territory').replaceChildren(new Option('Todos', ''));
    [...new Set(records.map(r => r.territory).filter(Boolean))].sort().forEach(value => $('#filter-territory').add(new Option(value, value)));
    $('#filter-territory').value = previous;
    renderList(); renderDashboard();
  }
  async function refresh() {
    if (busy) return;
    busy = true; $('#refresh').disabled = true;
    $('#connection-status').textContent = 'Consultando registros…';
    try {
      records = await service.list(); connected = true;
      $('#connection-status').textContent = service.mode === 'local' ? 'Diário local desta área, neste navegador. Integração com o banco ainda pendente.' : 'Base da área · leitura confirmada pelo serviço.';
      notify();
    } catch (error) {
      records = []; connected = false;
      $('#connection-status').textContent = 'Não foi possível consultar a base.'; notify(error.message, true);
    } finally { busy = false; $('#refresh').disabled = false; updateViews(); }
  }
  function navigate() {
    const view = ['#diario', '#inputs'].includes(location.hash) ? location.hash.slice(1) : 'dashboard';
    document.querySelectorAll('[data-gabinete-view]').forEach(section => { section.hidden = section.dataset.gabineteView !== view; });
    document.querySelectorAll('.category-tabs a').forEach(link => { if (link.hash === '#' + view) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    $('[data-gabinete-view="' + view + '"] h2').focus({ preventScroll: true });
  }
  service.types.forEach(type => { form.elements.type.add(new Option(type, type)); $('#filter-type').add(new Option(type, type)); });
  service.statuses.forEach(status => { form.elements.status.add(new Option(status, status)); $('#filter-status').add(new Option(status, status)); });
  $('#session-user').textContent = $('#profile-name').textContent = productionAuth.current().name;
  $('#profile-button').addEventListener('click', () => $('#profile-dialog').showModal());
  $('#logout-button').addEventListener('click', async () => { if (busy || (dirty && !confirm('Sair sem salvar o preenchimento?'))) return; await productionAuth.signOut(); dirty = false; location.assign('index.html'); });
  $('#new-record').addEventListener('click', () => openForm());
  $('#cancel-record').addEventListener('click', () => { if (!busy && (!dirty || confirm('Descartar o preenchimento?'))) { closeForm(); $('#new-record').focus(); } });
  form.addEventListener('input', () => { dirty = true; });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    busy = true; $('#save-record').disabled = true; notify();
    try {
      const input = service.normalize(Object.fromEntries(new FormData(form)));
      for (const field of form.elements) field.disabled = true;
      const payload = JSON.stringify(input);
      if (payload !== lastPayload) { requestId = crypto.randomUUID(); lastPayload = payload; }
      const saved = editing ? await service.update(editing.id, editing.version, input, requestId) : await service.create(input, requestId);
      records = [...records.filter(r => r.id !== saved.id), saved].sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
      closeForm(); notify(service.mode === 'local' ? 'Registro salvo neste navegador.' : 'Registro salvo.'); $('#new-record').focus();
      // Sem leitura completa, não apresentar indicadores parciais como totais.
      if (!connected) { busy = false; await refresh(); }
    } catch (error) { notify(error.message, true); }
    finally {
      busy = false;
      for (const field of form.elements) field.disabled = false;
      $('#save-record').disabled = !service.configured; updateViews();
    }
  });
  for (const selector of ['#search', '#filter-type', '#filter-status', '#filter-territory', '#date-from', '#date-to']) $(selector).addEventListener('input', renderList);
  $('#refresh').hidden = !service.configured; $('#refresh').addEventListener('click', () => { refresh(); refreshInputs(); });
  window.addEventListener('hashchange', navigate);
  window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('storage', event => { if (event.key === null || event.key === productionAuth.key) { dirty = false; busy = false; records = []; form.reset(); $('#records').replaceChildren(); $('#dashboard-data').hidden = true; location.reload(); } });
  async function refreshInputs() {
    try { const count = await areaInputs.render(area, $('#area-input-list')); $('#input-count').textContent = count + ' INPUTS recebidos'; }
    catch (error) { $('#area-input-list').replaceChildren(); $('#input-count').textContent = 'Consulta de INPUTS indisponível.'; notify(error.message, true); }
  }
  window.addEventListener('storage', event => {
    if (event.key === inputService.key) refreshInputs();
    if (event.key === service.key && !busy) refresh();
  });
  if (area !== 'gabinete_internacional') {
    // Mesma estrutura e motor, com vocabulário de registro para as áreas técnicas.
    form.elements.subject.previousSibling.textContent = 'Título';
    form.elements.description.previousSibling.textContent = 'Registro';
  }
  refreshInputs();
  navigate();
  window.auditService?.transition(productionAreas.ids[area]);
  window.addEventListener('pageshow', event => {
    if (event.persisted) window.auditService?.transition(productionAreas.ids[area]);
  });
  if (service.configured) refresh();
  else $('#connection-status').textContent = 'Integração com Google Sheets não configurada. Leitura e gravação ainda indisponíveis.';
})();

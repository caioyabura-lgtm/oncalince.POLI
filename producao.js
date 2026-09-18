'use strict';

(() => {
  if (!window.productionAuth?.current()) {
    location.replace('index.html#login');
    return;
  }
  const KEYS = {
    diary: 'onca-lince.producao.v01.diary'
  };
  const TYPES = ['acompanhamento', 'decisão', 'reunião', 'contato', 'ideia', 'pendência', 'observação'];
  const STATUSES = ['aberto', 'acompanhamento', 'concluído', 'arquivado'];

  // ARMAZENAMENTO TEMPORÁRIO DA VERSÃO 0.1.
  // SERÁ SUBSTITUÍDO PELO BACKEND GOOGLE APPS SCRIPT.
  // A sessão local e a indicação "Área privada" NÃO oferecem segurança real.
  // O backend deverá autenticar a sessão e validar executivo.diario.read e
  // executivo.diario.write em cada operação, inclusive nos resumos da home.
  // Contratos assíncronos permitem substituir este adaptador por fetch/Apps Script.
  const localRepository = {
    read(key) {
      try {
        const raw = localStorage.getItem(key);
        const records = raw === null ? [] : JSON.parse(raw);
        if (!Array.isArray(records) || records.some(item =>
          !item || typeof item.id !== 'string' || typeof item.title !== 'string' ||
          typeof item.date !== 'string' || !Array.isArray(item.tags) ||
          item.tags.some(tag => typeof tag !== 'string'))) throw new Error();
        return records;
      } catch {
        throw new Error('Não foi possível ler os registros deste navegador. Os dados existentes foram preservados.');
      }
    },
    write(key, records) {
      try { localStorage.setItem(key, JSON.stringify(records)); }
      catch { throw new Error('Não foi possível salvar neste navegador. Verifique o espaço e a permissão de armazenamento; mantenha o formulário aberto para tentar novamente.'); }
    }
  };
  const chronological = records => records.sort((a, b) =>
    (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')) ||
    (b.createdAt || '').localeCompare(a.createdAt || ''));
  const tags = value => [...new Set(String(value || '').split(',').map(tag => tag.trim().replace(/^#+/, '')).filter(Boolean))];
  const requiredText = (value, name) => {
    const result = String(value || '').trim();
    if (!result) throw new Error('Preencha ' + name + '.');
    return result;
  };
  function validateDate(value) {
    const date = requiredText(value, 'a data');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + 'T12:00:00'))) throw new Error('Informe uma data válida.');
    return date;
  }
  function diaryRecord(input) {
    if (!TYPES.includes(input.type) || !STATUSES.includes(input.status)) throw new Error('Selecione um tipo e um status válidos.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('Informe uma hora válida.');
    return {
      date: validateDate(input.date), time: input.time,
      title: requiredText(input.title, 'o título'), body: requiredText(input.body, 'o registro'),
      type: input.type, status: input.status, tags: tags(input.tags)
    };
  }
  function collectionService(key, normalize, defaults, permissions) {
    return {
      async list() {
        await window.authorizationService.require(permissions.read);
        return chronological(localRepository.read(key));
      },
      async create(input) {
        await window.authorizationService.require(permissions.write);
        const data = normalize(input);
        const records = localRepository.read(key);
        const now = new Date().toISOString();
        const record = { ...defaults, ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
        localRepository.write(key, [...records, record]);
        return record;
      },
      async update(id, input) {
        await window.authorizationService.require(permissions.write);
        const data = normalize(input);
        const records = localRepository.read(key);
        const index = records.findIndex(record => record.id === id);
        if (index < 0) throw new Error('O registro não está mais disponível. Atualize a lista.');
        records[index] = { ...records[index], ...data, updatedAt: new Date().toISOString() };
        localRepository.write(key, records);
        return records[index];
      },
      async remove(id) {
        await window.authorizationService.require(permissions.write);
        const records = localRepository.read(key);
        localRepository.write(key, records.filter(record => record.id !== id));
      }
    };
  }
  const sessionService = {
    async current() { return window.productionAuth.current(); },
    async signOut(options) { await window.productionAuth.signOut(options); }
  };
  const localDiaryService = collectionService(KEYS.diary, diaryRecord, {
    area: 'producao_executiva', sourceDepartment: null, relatedDocument: null, visibility: 'executive-private'
  }, { read: 'executivo.diario.read', write: 'executivo.diario.write' });
  const realDiary = new URLSearchParams(location.search).get('diary') === 'real';
  const fromReal = record => ({
    id: record.diary_id, createdAt: record.criado_em, date: record.criado_em.slice(0, 10),
    time: record.criado_em.slice(11, 16), title: record.titulo, body: record.registro,
    type: record.tipo, status: record.status, tags: record.tags
  });
  const toReal = input => ({ titulo: input.title, registro: input.body, tipo: input.type,
    status: input.status, tags: tags(input.tags) });
  const diaryService = realDiary ? {
    async list() { return (await execDiaryService.list()).map(fromReal); },
    async create(data) { return execDiaryService.create(toReal(data)); },
    async update(id, data) { return execDiaryService.update(id, toReal(data)); }
  } : localDiaryService;
  function canClearDemo() {
    return !realDiary && window.poliConfig?.mode === 'hosted-demo'
      && location.hostname === 'caioyabura-lgtm.github.io'
      && location.pathname.startsWith('/oncalince.POLI/')
      && window.poliService.isAreaAdmin('EXEC');
  }
  // Registros legados de memória permanecem no armazenamento, sem publicação automática.

  const $ = selector => document.querySelector(selector);
  const diaryForm = $('#diary-form');
  // Data/hora de criação do diário real pertencem exclusivamente ao backend.
  if (realDiary) for (const name of ['date', 'time']) {
    diaryForm.elements[name].disabled = true;
    diaryForm.elements[name].closest('label').hidden = true;
  }
  function connectionLabel(connected = false) {
    const label = realDiary ? (connected ? 'Conectado ao POLI_EXECUTIVO' : 'Diário Executivo real')
      : window.poliConfig?.mode === 'hosted-demo' ? 'Demonstração hospedada' : 'Diário Executivo local';
    $('#executive-diary-mode').textContent = label;
    document.querySelectorAll('[data-executive-connection]').forEach(node => { node.textContent = label; });
  }
  connectionLabel();
  window.addEventListener('executive-key-cleared', () => {
    if (!realDiary) return;
    connectionLabel();
    $('#diary-list').replaceChildren(); $('#executive-recent').replaceChildren();
    $('#executive-count').textContent = ''; $('#diary-count').textContent = '';
    closeEditor();
  });

  let editingDiary = null;

  let route = 'overview';
  let permissionFeedback = '';
  const sectorRoutes = Object.fromEntries(Object.entries(productionAreas.ids).map(([area, id]) => [id, productionAreas.definitions[area].href]));
  const sectorLabels = new Map([...document.querySelectorAll('[data-area-id]')].map(button => [button.dataset.areaId, button.textContent]));
  function updateSectors() {
    $('#clear-demo-diary').hidden = !canClearDemo();
    const data = window.poliService.current();
    const nav = $('.production-sectors');
    nav.querySelectorAll('[data-poli-generated]').forEach(button => button.remove());
    // Posições conhecidas permanecem estáveis. Áreas novas não ganham rotas inventadas.
    for (const area of data?.areas || []) {
      if (!sectorLabels.has(area.id)) {
        const button = document.createElement('button'); button.type = 'button';
        button.dataset.areaId = area.id; button.dataset.poliGenerated = 'true';
        button.textContent = area.name; nav.append(button);
      }
    }
    nav.querySelectorAll('[data-area-id]').forEach(button => {
      const id = button.dataset.areaId;
      const area = data?.areas.find(item => item.id === id);
      // Divergência editorial pendente: manter Comunicação no shell e chave MKT.
      button.textContent = id === 'MKT' ? sectorLabels.get(id) : (area?.name || sectorLabels.get(id) || id);
      const allowed = Boolean(sectorRoutes[id] && window.poliService.canReadArea(id));
      button.disabled = !allowed;
      button.setAttribute('aria-disabled', String(!allowed));
    });
  }
  async function loadAccess() {
    const access = window.productionAuth.current()?.access;
    updateSectors();
    try {
      const bootstrap = await window.poliService.getBootstrap();
      $('#session-user').textContent = bootstrap.user.name;
      $('#profile-name').textContent = bootstrap.user.name;
      $('#poli-mode-note').textContent = poliConfig.mode === 'local'
        ? 'POLI local · cenário ' + poliConfig.localScenario + ' · usuário sintético; sem conexão remota'
        : poliConfig.mode === 'hosted-demo'
          ? 'Modo de acesso: Demonstração hospedada · UI AUTHORIZATION ONLY · NOT DATA AUTHORIZATION'
          : 'Permissões consultadas no POLI';
      permissionFeedback = '';
    } catch (error) {
      if (window.productionAuth.current()?.access !== access) return false;
      if (error.code === 'POLI_SESSION') return false;
      if (error.code === 'POLI_USER_INACTIVE') {
        closeEditor('diary'); await sessionService.signOut({ audit: false }); location.replace('index.html#login'); return false;
      }
      permissionFeedback = 'Não foi possível carregar as permissões.';
      $('#poli-mode-note').textContent = 'Permissões indisponíveis';
    }
    updateSectors(); return true;
  }
  function notify(message = '', error = false) {
    $('#feedback').textContent = message;
    $('#feedback').classList.toggle('error', error);
    $('#feedback').setAttribute('role', error ? 'alert' : 'status');
  }
  async function safely(action) {
    try { await action(); } catch (error) { notify(error.message || 'Não foi possível concluir a operação.', true); }
  }
  function options(select, values, clear = false) {
    if (clear) select.replaceChildren();
    values.forEach(value => select.add(new Option(value, value)));
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function dateLabel(record) {
    const date = new Date(record.date + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() +
      (record.time ? ' · ' + record.time : '');
  }
  function entry(record, kind) {
    const article = element('article', 'entry');
    article.append(element('p', 'entry-meta', dateLabel(record) + ' · ' + record.type),
      element('h2', '', record.title), element('p', 'entry-body', record.body));
    if (record.tags.length) article.append(element('p', 'entry-tags', record.tags.map(tag => '#' + tag).join(' ')));
    article.append(element('p', 'entry-status', record.status));
    const actions = element('div', 'actions');
    const edit = element('button', '', 'Editar');
    edit.type = 'button';
    edit.addEventListener('click', () => safely(() => openEditor(kind, record)));
    const remove = element('button', '', 'Excluir');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Excluir ' + record.title);
    remove.addEventListener('click', () => safely(async () => {
      if (!window.confirm('Excluir “' + record.title + '”? Esta ação não pode ser desfeita.')) return;
      await diaryService.remove(record.id);
      if (kind === 'diary' && editingDiary === record.id) closeEditor('diary');

      await render();
      notify('Registro excluído.');
    }));
    actions.append(edit);
    if (!realDiary) actions.append(remove);
    article.append(actions);
    return article;
  }
  function list(target, records, kind) {
    target.replaceChildren(...records.map(record => entry(record, kind)));
    if (!records.length) target.append(element('p', 'empty', 'Nenhum registro encontrado.'));
  }
  const searchText = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  async function render() {
    // A home é somente navegação: não consulta nem renderiza dados dos módulos.
    if (route === 'overview') return;
    if (realDiary) connectionLabel();
    if (route === 'executivo' || route === 'executive-inputs') {
      await window.authorizationService.require('executivo.access');
      if (route === 'executivo') {
        const records = await diaryService.list();
        connectionLabel(true);
        $('#executive-count').textContent = records.length + ' REGISTROS DO DIÁRIO';
        const inputs = await inputService.listForArea('producao_executiva');
        $('#executive-input-count').textContent = inputs.length + ' INPUTS RECEBIDOS';
        $('#executive-recent').replaceChildren(element('h2', '', 'Atividade recente'), ...records.slice(0, 5).map(record => element('p', '', dateLabel(record) + ' · ' + record.title)));
      } else await areaInputs.render('producao_executiva', $('#executive-input-list'));
      return;
    }
    if (route === 'diary') {
      const query = searchText($('#diary-search').value.trim());
      const records = (await diaryService.list()).filter(record =>
        (!$('#filter-type').value || record.type === $('#filter-type').value) &&
        (!$('#filter-status').value || record.status === $('#filter-status').value) &&
        searchText([record.title, record.body, ...record.tags].join(' ')).includes(query));
      list($('#diary-list'), records, 'diary');
      connectionLabel(true);
      $('#diary-count').textContent = records.length + ' registros';
    } else {
      await window.authorizationService.require('memory.read');
      // Mural reservado à curadoria. Não importar INPUT, Diário ou memória legada.
      $('#memory-list').replaceChildren();
    }
  }
  async function openEditor(kind, record = null) {
    await window.authorizationService.require('executivo.diario.write');
    const form = diaryForm;
    if (!form.hidden && !window.confirm('Descartar o formulário aberto e iniciar esta edição?')) return;
    form.reset();
    const now = new Date();
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    form.elements.date.value = date;
    if (kind === 'diary') {
      editingDiary = record?.id || null;
      form.elements.time.value = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      $('#diary-form-title').textContent = record ? 'Editar registro' : 'Novo registro';
    }
    if (record) Object.entries(record).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field) field.value = key === 'tags' ? value.join(', ') : value;
    });
    form.hidden = false;
    form.elements.title.focus();
  }
  function closeEditor() {
    const form = diaryForm;
    form.hidden = true;
    form.reset();
    editingDiary = null;
  }
  function submit(form, kind, service) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      safely(async () => {
        const button = form.querySelector('[type="submit"]');
        button.disabled = true;
        try {
          const data = Object.fromEntries(new FormData(form));
          const id = editingDiary;
          if (id) await service.update(id, data); else await service.create(data);
          closeEditor(kind);
          await render();
          notify('Registro salvo.');
          $('#new-' + kind).focus();
        } finally { button.disabled = false; }
      });
    });
  }
  async function navigate() {
    const requested = location.hash.slice(1);
    route = ['overview', 'diary', 'executivo', 'executive-inputs', 'memory', 'memories', 'artifacts'].includes(requested) ? requested : 'overview';
    const executive = window.poliService.canReadArea('EXEC');
    updateSectors();
    if (!executive) {
      closeEditor('diary');
      $('#diary-list').replaceChildren();
      $('#executive-count').textContent = ''; $('#executive-input-count').textContent = '';
      $('#executive-recent').replaceChildren(); $('#executive-input-list').replaceChildren();
      if (['diary', 'executivo', 'executive-inputs'].includes(route)) { route = 'overview'; history.replaceState(null, '', '#overview'); }
    }
    const view = ['memories', 'artifacts'].includes(route) ? 'memory' : route;
    document.querySelectorAll('[data-view]').forEach(section => { section.hidden = section.dataset.view !== view; });
    document.querySelectorAll('.category-tabs a').forEach(link => {
      if (link.hash === '#' + route) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.body.classList.toggle('is-overview', view === 'overview');
    // Workspace já autorizado e visível; abas internas não são novas aberturas.
    window.auditService?.transition(executive && ['executivo', 'diary', 'executive-inputs'].includes(view) ? 'EXEC' : null);
    notify(permissionFeedback);
    await render();
    $('[data-view="' + view + '"] h1').focus({ preventScroll: true });
  }
  $('.production-sectors').addEventListener('click', event => {
    const button = event.target.closest('[data-area-id]');
    if (!button || button.disabled) return;
    const id = button.dataset.areaId;
    if (!window.poliService.canReadArea(id) || !sectorRoutes[id]) { updateSectors(); return; }
    if (id === 'EXEC') location.hash = 'executivo';
    else location.assign(sectorRoutes[id]);
  });
  window.addEventListener('poli-access-change', updateSectors);
  options($('#diary-type'), TYPES);
  options($('#diary-status'), STATUSES);
  options($('#filter-type'), TYPES);
  options($('#filter-status'), STATUSES);

  $('#new-diary').addEventListener('click', () => safely(() => openEditor('diary')));
  $('#clear-demo-diary').addEventListener('click', () => safely(async () => {
    if (!canClearDemo()) throw new Error('Limpeza disponível somente na demonstração hospedada.');
    await window.authorizationService.require('executivo.diario.write');
    if (!window.confirm('Remover os registros demonstrativos armazenados neste navegador?')) return;
    if (!canClearDemo()) return;
    localStorage.removeItem(KEYS.diary);
    closeEditor();
    $('#executive-count').textContent = '0 REGISTROS DO DIÁRIO';
    $('#executive-recent').replaceChildren(element('h2', '', 'Atividade recente'));
    await render();
    notify('Dados demonstrativos removidos.');
  }));

  ['diary'].forEach(kind => $('#cancel-' + kind).addEventListener('click', () => {
    if (window.confirm('Descartar as alterações deste formulário?')) { closeEditor(kind); $('#new-' + kind).focus(); }
  }));
  submit(diaryForm, 'diary', diaryService);

  $('#diary-search').addEventListener('input', () => safely(render));
  ['#filter-type', '#filter-status'].forEach(selector => $(selector).addEventListener('change', () => safely(render)));
  $('#profile-button').addEventListener('click', () => $('#profile-dialog').showModal());
  $('#logout-button').addEventListener('click', () => safely(async () => {
    if ((!diaryForm.hidden) && !window.confirm('Sair sem salvar o formulário aberto?')) return;
    await sessionService.signOut();
    closeEditor('diary');

    location.assign('index.html');
  }));
  window.addEventListener('hashchange', () => safely(navigate));
  window.addEventListener('pageshow', event => { if (event.persisted) safely(navigate); });
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === window.productionAuth.key) {
      window.poliService.reset();
      updateSectors();
      closeEditor('diary');
      $('#diary-list').replaceChildren(); $('#executive-recent').replaceChildren(); $('#executive-input-list').replaceChildren();
      $('#executive-count').textContent = ''; $('#executive-input-count').textContent = '';
      if (!window.productionAuth.current()) {
        closeEditor('diary');

        location.replace('index.html#login');
        return;
      }
      $('#session-user').textContent = window.productionAuth.current().name;
      $('#profile-name').textContent = window.productionAuth.current().name;
      safely(async () => { if (await loadAccess()) await navigate(); });
      return;
    }
    if (event.key === null || event.key === inputService.key || Object.values(KEYS).includes(event.key)) safely(render);
  });
  window.addEventListener('beforeunload', event => {
    if (!diaryForm.hidden) { event.preventDefault(); event.returnValue = ''; }
  });
  safely(async () => {
    const session = await sessionService.current();
    $('#session-user').textContent = session.name;
    $('#profile-name').textContent = session.name;
    if (await loadAccess()) await navigate();
  });
})();

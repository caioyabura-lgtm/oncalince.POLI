'use strict';

// Compartilhado exclusivamente por producao.html e input.html.
// ADAPTADOR TEMPORÁRIO: a autenticação atual é demonstrativa.
// Nenhuma checagem no navegador protege dados contra inspeção/manipulação.
// O backend deverá obter a identidade da sessão autenticada e validar cada
// permissão em cada operação, sem aceitar papéis enviados pelo cliente.
// Substituir permissions() pelo endpoint de sessão/autorização do Apps Script.
window.authorizationService = {
  async permissions() {
    const session = window.productionAuth.current();
    if (!session) return [];
    const permissions = ['input.create', 'input.readOwn', 'memory.read', 'memory.write'];
    // Política legada DOS DADOS, preservada nesta etapa: não é o acesso ao setor.
    // Interface authorization is not data authorization. Backend must revalidate access.
    if (session.access === 'caio') permissions.push(
      'executivo.diario.read', 'executivo.diario.write', 'input.readAll'
    );
    if (window.poliService?.canReadArea('EXEC')) permissions.push('executivo.access');
    return permissions;
  },
  async can(permission) { return (await this.permissions()).includes(permission); },
  async require(permission) {
    if (!await this.can(permission)) throw new Error('Área restrita.');
  }
};

// Adaptador local de INPUT. Identidade e permissões devem ser validadas no servidor na integração.
window.inputService = (() => {
  const key = 'onca-lince.producao.v01.inputs';
  const licenseTermsVersion = 'draft-0.1';
  const licenseOptions = [
    { id: 'referencia', label: 'REFERÊNCIA', conditions: 'Material recebido para consulta e fundamentação das atividades, sem pressupor autorização de publicação ou exploração.' },
    { id: 'acervo', label: 'ACERVO', conditions: 'Material recebido com finalidade de preservação e catalogação, sujeito às condições específicas de utilização posteriormente estabelecidas.' },
    { id: 'registro', label: 'REGISTRO', conditions: 'Material recebido como documentação de atividade, processo, decisão, gasto, reunião ou acontecimento relacionado à produção.' },
    { id: 'proposta', label: 'PROPOSTA', conditions: 'Material submetido para conhecimento, análise, parecer ou decisão, sem implicar automaticamente aprovação, contratação ou incorporação.' }
  ];
  // Somente rótulos de registros históricos; não são opções de cadastro.
  const patchOptions = [
    { id: 'producao-executiva', label: 'PRODUÇÃO EXECUTIVA' },
    { id: 'direcao-producao', label: 'DIREÇÃO DE PRODUÇÃO' },
    { id: 'direcao-tecnica', label: 'DIREÇÃO TÉCNICA' },
    { id: 'arte-performance', label: 'DEPARTAMENTO DE ARTE E PERFORMANCE' },
    { id: 'marketing', label: 'DIREÇÃO DE MARKETING' },
    { id: 'administracao-internacional', label: 'ADMINISTRAÇÃO / GABINETE INTERNACIONAL' }
  ];
  const extensions = 'pdf txt md csv rtf doc docx odt mp3 wav ogg flac aac m4a aiff opus mp4 mov webm mkv avi m4v mpeg mpg jpg jpeg png gif webp tif tiff heic heif avif bmp svg'.split(' ');
  const documentMimes = ['application/pdf', 'application/rtf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.oasis.opendocument.text'];
  const fileAccept = ['audio/*', 'video/*', 'image/*', 'text/*', ...documentMimes, ...extensions.map(ext => '.' + ext)].join(',');
  const normalizeSynopsis = value => String(value || '').replace(/\s+/g, ' ').trim();
  function fileMetadata(file) {
    const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
    const mimeType = file.type || '';
    if (!/^(audio|video|image|text)\//.test(mimeType) && !documentMimes.includes(mimeType) && !extensions.includes(extension)) {
      throw new Error('Tipo de arquivo não aceito: ' + file.name + '. Use PDF, texto, áudio, vídeo ou foto.');
    }
    return { name: file.name, mimeType, extension, size: file.size, storageReference: null };
  }
  const repository = {
    read() {
      try {
        const records = JSON.parse(localStorage.getItem(key) || '[]');
        if (!Array.isArray(records) || records.some(item => !item || typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.submittedBy !== 'string' || typeof item.date !== 'string')) throw new Error();
        return records;
      } catch { throw new Error('Não foi possível ler os inputs. Os dados existentes foram preservados.'); }
    },
    append(record) {
      const records = this.read();
      try { localStorage.setItem(key, JSON.stringify([...records, record])); }
      catch { throw new Error('Não foi possível salvar. Mantenha o formulário aberto e verifique o armazenamento do navegador.'); }
      return record;
    }
  };
  // Não faz upload: somente metadados, sem base64 ou URL pública fictícia.
  const filesAdapter = { async prepare(files) { return Array.from(files || [], fileMetadata); } };
  const receiptAdapter = { initialStatus: 'pending' }; // Nenhuma mensagem enviada.
  function readForArea(area) {
    // PATCH legado não comprova encaminhamento pela Executiva. Encaminhamento futuro
    // será uma operação interna própria, ainda não implementada.
    if (area !== 'producao_executiva') return [];
    return repository.read()
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }
  function validate(input) {
    const title = String(input.title || '').trim();
    const synopsis = normalizeSynopsis(input.synopsis);
    const link = String(input.link || '').trim();
    if (!title || title.length > 200) throw new Error('Preencha o título com até 200 caracteres.');
    if (!synopsis || synopsis.length > 600) throw new Error('Preencha a Sinopse do INPUT com até 600 caracteres.');
    if (link) {
      let url;
      try { url = new URL(link); } catch { throw new Error('Informe um link válido, começando com http:// ou https://.'); }
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use um link http:// ou https://.');
    }
    if (!link && !input.files?.length) throw new Error('Informe um link ou adicione pelo menos um arquivo.');
    if (!licenseOptions.some(option => option.id === input.licenseCategory)) throw new Error('Selecione uma categoria de licenciamento.');
    // Destino imposto pelo serviço, independentemente de campos enviados pelo cliente.
    return { title, synopsis, link, licenseCategory: input.licenseCategory, initialAreaId: 'EXEC' };
  }
  return {
    key, licenseOptions, patchOptions, licenseTermsVersion, fileAccept, fileMetadata, normalizeSynopsis,
    async listForArea(area) {
      window.productionAreas.require(area);
      // Consulta o registro original; não altera autor, status, PATCH ou persistência.
      return readForArea(area);
    },
    async list() {
      await window.authorizationService.require('input.readOwn');
      const all = await window.authorizationService.can('input.readAll');
      const session = window.productionAuth.current();
      if (!session) throw new Error('Sessão encerrada. Entre novamente.');
      return repository.read().filter(item => all || item.submittedBy === session.access)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },
    async create(input) {
      await window.authorizationService.require('input.create');
      const session = window.productionAuth.current();
      if (!session) throw new Error('Sessão encerrada. Entre novamente.');
      const data = validate(input);
      const files = await filesAdapter.prepare(input.files);
      const persist = async () => {
        await window.authorizationService.require('input.create');
        if (window.productionAuth.current()?.access !== session.access) throw new Error('A sessão mudou. Atualize a página antes de dar entrada.');
        const now = new Date().toISOString();
        const id = crypto.randomUUID();
        return repository.append({
          schemaVersion: 3, id,
          // Protocolo demonstrativo com UUID; a autoridade final será do backend.
          protocol: 'IN-' + now.slice(0, 4) + '-LOCAL-' + id.toUpperCase(),
          createdAt: now, updatedAt: now, date: now.slice(0, 10),
          submittedBy: session.access, userId: session.userId || session.access,
          userName: session.name, userEmail: session.email || null,
          ...data, files, licenseTermsVersion, licenseAcceptedAt: null,
          status: 'RECEBIDO', receiptStatus: receiptAdapter.initialStatus,
          persistenceMode: 'local', filesPersistence: 'metadata-only'
        });
      };
      if (navigator.locks) return navigator.locks.request(key, persist);
      return persist();
    }
  };
})();

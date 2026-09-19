'use strict';
// ÚNICO LOCAL para cadastrar as URLs reais das seis pastas do Google Drive.
// Vazio = Pasta em preparação. Não alterar as permissões dos arquivos no Drive.
// Arquivo estático: não cadastrar segredos ou metadados confidenciais aqui.
// A sessão POLI controla a interface; o acesso aos arquivos depende do Drive.
window.technicalConfig = {
  folders: {
    audio: 'https://drive.google.com/drive/folders/1Txeh77zl_1uUkjpz3dTLrb_RMgJuCOFG?usp=drive_link',
    video: 'https://drive.google.com/drive/folders/1Jsm55PvQOppa1Bckwi6EkwyN3pHd2ewa?usp=drive_link',
    lighting: 'https://drive.google.com/drive/folders/1pgkfTdNGmAVcbSWzSl4V83rlUlp06IAU?usp=drive_link',
    stage: 'https://drive.google.com/drive/folders/1oDw3cdJPmsyl7WB3Ly4x46R803cSOyAr?usp=drive_link',
    fabrication: 'https://drive.google.com/drive/folders/1F4LJD1RTE4PpNyapzNm1HtmKX-HRMIZC?usp=drive_link',
    logistics: 'https://drive.google.com/drive/folders/1Mi4pDXxxfX1GU0iX9CCxt0iuUMjhy2Lq?usp=drive_link'
  },
  // Índice curado. Inserir somente documentos reais selecionados para consulta.
  // Campos: technical_id, title, category, version, date, responsible,
  // territory, status, reference, url.
  // category: audio | video | lighting | stage | fabrication | logistics.
  // date: YYYY-MM-DD. url: URL HTTPS real do Google Drive/Docs ou vazio.
  documents: []
};

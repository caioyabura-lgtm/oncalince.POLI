# POLI_PUBLICACAO — PRONTA PARA REVISÃO

## Diário Executivo: demonstração e preparação real

O Hosted Demo continua sendo autorização de interface, sem autoridade sobre dados reais.
O Diário Executivo Local usa exclusivamente `localStorage['onca-lince.producao.v01.diary']`.
Em Produção Executiva → Diário de Produção, a ação discreta **LIMPAR DADOS DEMONSTRATIVOS**
aparece somente no hosted-demo permitido, com acesso ADMIN à interface EXEC e diário local.
Ela pede “Remover os registros demonstrativos armazenados neste navegador?”, remove essa
única chave inteira, fecha o editor e atualiza lista, atividade recente e contador para zero.
Depois informa “Dados demonstrativos removidos.” Cancelar preserva os registros.
Não remove nenhuma chave de sessionStorage, sessão, configuração, INPUT, memória ou diário
de outro departamento. Não acessa backend nem Sheets. A ação afeta só o navegador atual;
os registros existentes não foram apagados automaticamente por esta alteração.

O Diário Executivo Real está preparado em `exec-diary-service.js`, com `list()`,
`create(data)` e `update(id, data)`, usando o transporte separado de `poli-service.js`.
Create/update enviam somente `titulo`, `registro`, `tipo`, `status`, `tags`; o alvo de update
é enviado separadamente como `id` e precisa ser autorizado pelo backend. Campos de identidade
e criação enviados no conteúdo são descartados. O backend define UUID, user_id e criado_em
no create, preserva esses campos no update e filtra list pelo proprietário autorizado.
O adapter real não lê armazenamento local e não migra registros demonstrativos.

Em `poli-config.js`, `realExecutiveDiaryEnabled = false`, `executiveDiary.mode = 'local'`
e `executiveDiary.apiUrl = null`. O modo de dados futuro é `real-executive`, separado do
modo de autorização `remote`. Hosted-demo/local nunca habilitam transporte real, mesmo
forçando a flag. Sem habilitação segura, a resposta é:
“Diário Executivo real aguardando autenticação segura.” Não há fallback real→local.
O dashboard identifica “Demonstração hospedada” para dados locais hospedados; a indicação
“Diário Executivo conectado” depende de uma consulta real bem-sucedida.

POLI_EXECUTIVO é privado e separado: usa somente DIARIO_EXECUTIVO, nunca POLI / 20_DIARIO.
O esqueleto Apps Script e sua documentação ficam **fora desta pasta pública**, em
`../POLI_EXECUTIVO_BACKEND_PREPARACAO/Code.gs` e `../POLI_EXECUTIVO_BACKEND_PREPARACAO/README.md`.
**Não enviar esses dois arquivos ao GitHub Pages.** Nenhuma planilha ou implantação foi
modificada. O backend tem flag false e verificador de identidade que sempre recusa.

Ainda não existe autenticação server-side no projeto. A arquitetura futura exige login
Google/OIDC validado no servidor, sessão HttpOnly, mapeamento privado de identidade para
user_id, permissões executivas por operação, proteção CSRF e gateway autenticado para
Apps Script. O transporte preparado requer API na mesma origem; GitHub Pages não oferece
essa API, portanto não basta informar uma URL /exec ou mudar a flag. A implantação e a
ponte autenticada permanecem pendentes. Não confiar em Session.getEffectiveUser como
visitante nem presumir que Session.getActiveUser funciona em qualquer implantação:
[documentação oficial](https://developers.google.com/apps-script/reference/base/session).

Testes desta etapa: `python tests/test_exec_diary.py`, `python tests/test_hosted_demo.py`,
`python tests/test_poli_access.py` e `python tests/test_area_workspaces.py`.
Os testes backend usam Sheets em memória; não validam uma implantação Google real.

Publicação manual cumulativa (inclui a correção hosted-demo anterior): reenviar exatamente
`producao.html`, `producao.js`, `poli-config.js`, `poli-local.js`, `poli-service.js` e o novo
`exec-diary-service.js`. Para manter a documentação do repositório atualizada, reenviar também
este `README_PUBLICACAO.md`. Testes não são dependências do site: manter no repositório
`tests/test_hosted_demo.py` e `tests/test_exec_diary.py`; este último requer a preparação
backend irmã para executar sua parte de contrato. Nenhum git push foi executado nesta etapa.

Data: 17/09/2026. POLI v0.1. Cópia estática autônoma em relação ao projeto original, com dependências externas declaradas. Nenhum comando Git ou publicação executado.

## Preservação e seleção

ORIGINAIS ALTERADOS: 0. SHA-256 comparado antes/depois de todos os arquivos originais fora da pasta pública e dos metadados Git. auth.js e todos os demais arquivos copiados preservados byte a byte, salvo as três sanitizações abaixo.

Foram copiados 50 arquivos selecionados pelas oito páginas ativas, suas dependências locais transitivas, carregamento dinâmico de auth/auditoria e locales EN/DE, além de seis testes e duas documentações técnicas. README_PUBLICACAO.md e MANIFESTO_ARQUIVOS.txt completam 52 arquivos.

Não foram incluídos protótipos abandonados, orçamentos, documentos pessoais, contratos, comprovantes, exports, planilhas, CSV reais, dados de INPUT/Diários, cookies, tokens ou .env. Google Sheets e Drive não são versionados. POLI, POLI_EXECUTIVO e POLI_AUDITORIA reais ficam fora da cópia e do futuro Git.

README.md não existe na raiz. POLI_AUDITORIA.md histórico não foi copiado: contém detalhes de implantação remota desnecessários ao pacote. INPUT_IMPLEMENTACAO.md e tests/RECONCILIACAO_POLI.md foram mantidos; a regra inicial do documento INPUT prevalece sobre seu histórico.

## Sanitizações exclusivas da cópia

- locales/en.js e locales/de.js: removido somente o par chave/valor residual de referência orçamentária inicial. Estrutura e todas as outras traduções comparadas e preservadas. Português usa o texto HTML; não existe locale PT correspondente.
- territorios.html: removida somente a tag link para territories.css. Nenhum CSS novo criado.
- Nenhuma correção de case foi necessária.

## Estado e limitações

Autenticação demonstrativa: os oito verificadores PBKDF2 foram mantidos conforme classificação validada. A sessão no navegador não oferece autenticação real nem proteção de dados; não usar o protótipo com dados reais. Segredos operacionais identificados na seleção: 0; isso não significa ausência de nomes pessoais nas contas demonstrativas.

O bootstrap usa local, cenário A, em loopback e hosted-demo exclusivamente em caioyabura-lgtm.github.io/oncalince.POLI/, com apiUrl null. A integração de auditoria é experimental e permanece local; nenhum evento remoto real foi enviado. Testes de API utilizam interceptações. APIs de Gabinete continuam não configuradas.

INPUT é destinado inicialmente e exclusivamente a EXEC. Não existe escolha de TECH/ART/INTL/PROD/MKT/ADMIN pelo colaborador; campos forjados não alteram o destino. Não há encaminhamento automático ou operação implementada de distribuição pela EXEC.

DEMONSTRAÇÃO — UI AUTHORIZATION ONLY — NOT DATA AUTHORIZATION. Em hosted-demo, somente `session.access === 'caio'` recebe ADMIN sintético em EXEC/ART/TECH/INTL; demais contas não recebem grants. PROD/MKT/ADMIN continuam inativos. O perfil identifica Demonstração hospedada. A configuração está em poli-config.js e a validação de endereço e grants em poli-service.js. Nenhum grant autoriza dados reais: o backend deverá revalidar leitura/escrita, arquivos privados, documentos e dados financeiros. Diários e INPUT usam armazenamento local demonstrativo, sem sincronização real. Teste específico: `python tests/test_hosted_demo.py` (origens interceptadas, sem backend).

Memórias: promoção DIARIO, promoção INPUT e contrato completo 30_MEMORIA permanecem pendentes (3 SKIP justificados). Não são funcionalidades aprovadas.

Territórios mantém dossiês/estatísticas em templates inertes e cards sem href. Âncoras da Home abrem a página, mas os dossiês não são ativados. Comportamento preexistente preservado. Fontes Pixolde/Enter Command dependem dos fallbacks existentes.

A Home ativa gera o globo por código Three.js: nenhum GLB, SVG externo ou arquivo de fonte local é carregado pela seleção. Não copiar modelos de produção não utilizados. Assets locais: três PNGs.

## Verificação isolada

PASS: servidor limitado exclusivamente a esta pasta, montada em /review/, sem fallback à raiz original e com validação exata de maiúsculas/minúsculas em cada segmento. As oito páginas carregaram com HTTP 200; HTML/CSS/JS/imagens locais e módulos externos carregaram; globo chegou a earth-ready. Zero 404, falhas de rede, imagens quebradas ou erros JavaScript. Links locais verificados; workspaces exercitados pelas suítes. Locales EN/DE carregados e chave residual ausente. Nenhum caminho absoluto local ativo identificado.

Suítes executadas sequencialmente a partir desta pasta, com Chromium/Playwright e perfis temporários:

- POLI Access: PASS.
- POLI Auditoria local: PASS; 9 casos solicitados aprovados; remoto somente interceptado.
- INPUT: PASS; entrada exclusiva EXEC confirmada.
- Gabinete: PASS; API somente interceptada.
- Multiárea: PASS conforme arquitetura reconciliada.
- Memórias: PASS conforme arquitetura reconciliada, com 3 SKIP justificados.

Executar: python tests/test_poli_access.py, python tests/test_poli_audit.py, python tests/test_input.py, python tests/test_gabinete.py, python tests/test_area_workspaces.py e python tests/test_memory_mural.py. Requer Python, pacote playwright e Chromium instalado. Não alterar configurações para remoto.

## Dependências externas

- https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js
- https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js
- Instagram do Fablab Acousmonium: link de navegação, não recurso necessário à renderização.
- mailto:projeto@cooperativa.art: abertura do cliente de e-mail, sem envio automático.

A cópia não depende da pasta original; a experiência 3D ainda depende do CDN. Nenhuma biblioteca externa foi incorporada.

# POLI_PUBLICACAO — PRONTA PARA REVISÃO

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

POLI permanece local, cenário A, com apiUrl null. A integração de auditoria é experimental e permanece local; nenhum evento remoto real foi enviado. Testes de API utilizam interceptações. APIs de Gabinete continuam não configuradas.

INPUT é destinado inicialmente e exclusivamente a EXEC. Não existe escolha de TECH/ART/INTL/PROD/MKT/ADMIN pelo colaborador; campos forjados não alteram o destino. Não há encaminhamento automático ou operação implementada de distribuição pela EXEC.

GitHub Pages não habilitará o modo POLI local, restrito a loopback. As áreas não terão a mesma abertura observada em localhost. Essa limitação foi preservada. Diários e INPUT usam armazenamento local demonstrativo, sem sincronização real.

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

# POLI_PUBLICACAO — PRONTA PARA REVISÃO

## Diário demonstrativo e Diário Executivo real

Produção Executiva → Diário de Produção oferece dois links explícitos:
**Diário demonstrativo** (`?diary=local#diary`) e **Diário Executivo real**
(`?diary=real#diary`). O padrão continua local; o parâmetro escolhe a interface,
nunca autoriza dados. Recarregar mantém a escolha. Os registros não são misturados,
copiados ou migrados. O dashboard e o diário identificam a origem; após leitura real
bem-sucedida, mostram “Conectado ao POLI_EXECUTIVO”. No hosted-demo local,
mostram “Demonstração hospedada”.

O backend Web App informado pelo responsável está configurado em `poli-config.js`;
nenhuma chave privada está configurada ali. `realExecutiveDiaryEnabled = true` habilita
o adapter, sem conceder autorização: cada POST exige a chave executiva validada pelo
backend. Os grants hosted-demo continuam restritos à navegação de interface.

Ao solicitar o real, `exec-diary-service.js` consulta somente a chave de sessionStorage
`onca-lince.producao.v01.executive-access-key`. Se ausente, abre “Chave de acesso executivo”,
com campo password vazio. Depois de enviar ou cancelar, o campo é apagado; a chave nunca
é reexibida. Nenhum segredo é escrito em HTML, código, URL, query string ou localStorage.
Logout, novo login, mudança de sessão em outra aba e EXEC_UNAVAILABLE removem a chave.
Ela sobrevive ao reload na mesma sessão da aba; segue o ciclo de vida de sessionStorage.
Restauração de sessões pelo navegador pode restaurar sessionStorage: para encerrar
explicitamente o acesso, usar Sair. Não há autenticação individual nova nem login Google:
a credencial real desta integração é a chave executiva validada pelo backend.

O transporte em `poli-service.js` envia POST `{ operation, accessKey, data }`, sem cookies,
com JSON como `text/plain;charset=UTF-8` para evitar preflight. Segue o redirecionamento
do ContentService descrito na [documentação Google](https://developers.google.com/apps-script/guides/content#redirects).
Não utiliza no-cors, JSONP ou GET como alternativa. Falhas não disparam repetição automática
de gravação. EXEC_UNAVAILABLE mostra somente “Acesso executivo não autorizado ou indisponível.”
e remove a chave; erros internos do backend não são exibidos.

Contrato adotado: list envia data vazio e recebe `{ok:true,data:[registros]}`;
create envia apenas titulo, registro, tipo, status, tags; update acrescenta `data.diary_id`
como alvo de edição. Nenhuma operação envia user_id ou criado_em, nem diary_id no create.
Create/update exigem `{ok:true,...}` e a interface relê list após salvar. Os registros de list
contêm diary_id, criado_em, titulo, registro, tipo, status, tags (array ou texto de tags).
Backend define identidade, IDs e datas e deve validar o alvo do update. Não há DELETE real
na interface. Formatos de sucesso e suporte a update precisam ser confirmados no teste
com a chave válida; nenhum teste autenticado real foi executado por este agente.

O diário demonstrativo permanece em `localStorage['onca-lince.producao.v01.diary']`.
“LIMPAR DADOS DEMONSTRATIVOS” aparece somente no hosted-demo permitido com diário local
e acesso ADMIN à interface EXEC. Pede confirmação e remove exclusivamente essa chave,
atualizando lista, atividade e contador; não remove INPUTs, outras áreas, sessão ou qualquer
chave de sessionStorage e não consulta o backend. Registros locais não são migrados.

A pasta irmã `../POLI_EXECUTIVO_BACKEND_PREPARACAO/` é apenas a preparação histórica da
etapa anterior, desabilitada, e não representa o Web App publicado informado pelo usuário.
Não reenviar seu Code.gs ou README.md ao GitHub Pages nem substituir o backend funcional.
Nenhum backend, Google Sheets ou credencial Google foi alterado nesta etapa.

## Teste manual com a chave executiva

1. Publicar os arquivos abaixo e abrir Produção Executiva → Diário de Produção.
2. Escolher **Diário Executivo real**; informar a chave no modal e clicar Conectar.
3. Confirmar a listagem e “Conectado ao POLI_EXECUTIVO”.
4. Criar um registro de teste identificável; confirmar que aparece na listagem real.
5. Atualizar a página; confirmar que a chave não é pedida novamente e o registro continua.
6. Editar o registro e confirmar a atualização; conferir o contrato de update no Web App
   caso a operação seja recusada. Nenhuma tentativa alternativa automática é feita.
7. Voltar ao demonstrativo e confirmar que o registro real não aparece ali.
8. Clicar Sair e confirmar a ausência de `onca-lince.producao.v01.executive-access-key`
   em sessionStorage (sem copiar ou capturar o valor). Entrar novamente deve pedir a chave.
9. Opcional: informar uma chave inválida e confirmar mensagem genérica e remoção da chave.

Testes automatizados: `tests/test_exec_webapp.py` (Web App interceptado, chave fictícia),
`tests/test_exec_diary.py`, `tests/test_hosted_demo.py`, `tests/test_poli_access.py` e
`tests/test_area_workspaces.py`. Não criam registros reais. Uma requisição de list sem chave
ao Web App publicado retornou HTTP 200, CORS `*` e `{ok:false,error:"EXEC_UNAVAILABLE"}`.
O mesmo POST sem chave também foi verificado no Chromium com origem GitHub Pages simulada,
seguindo os redirecionamentos reais e lendo a resposta CORS. Esse resultado comprova a recusa
sem credencial, não valida operações autenticadas.

Reenvio público cumulativo: **auth.js, poli-config.js, poli-local.js, poli-service.js,
exec-diary-service.js, producao.html, producao.js e README_PUBLICACAO.md**. O poli-local.js
inclui a alteração hosted-demo anterior; reenviá-lo evita depender da versão já publicada.
Testes são opcionais no repositório e não são dependências do site. Não executar git push.

## Histórico da preparação inicial

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

# Regra vigente: entrada exclusiva pela EXEC

Todo novo INPUT tem initialAreaId = EXEC, definido pelo serviço, sem escolha de departamento no formulário. O esquema passa a versão 3; identidade, título, Sinopse do INPUT, link, arquivos, licenciamento e protocolo permanecem.

PATCH / ENCAMINHAMENTO é responsabilidade exclusiva da Produção Executiva, após análise. Essa operação interna, potencialmente para múltiplas áreas, ainda não foi implementada. Campos patch ou initialAreaId fornecidos pelo colaborador não mudam o destino imposto pelo serviço. O backend futuro deve aplicar a mesma regra.

A consulta de INPUTS por área retorna a caixa de entrada apenas para a Executiva, respeitando as permissões existentes. PATCH de registros antigos não constitui encaminhamento autorizado. Os registros originais não foram migrados, apagados ou regravados; seus rótulos históricos continuam legíveis.

As referências a PATCH como escolha do colaborador no relatório histórico abaixo estão superadas por esta regra. Sem encaminhamento implementado, sem alteração de Diários ou conexões remotas.

---

# INPUT — implementação local

## Auditoria e preservação

Foram auditados input.html, input.css, input.js, auth.js, internal-services.js, producao.html e producao.js. A autenticação existente é demonstrativa: productionAuth.current() lê o identificador access no localStorage e resolve o nome no cadastro interno. Não fornece e-mail nem autenticação de servidor. Nenhuma senha ou credencial foi adicionada ao registro de INPUT.

authorizationService mantém input.create, input.readOwn e input.readAll (este último para caio), além das permissões existentes dos outros módulos. A listagem continua filtrada pelo usuário; o executivo continua vendo todos. Essa restrição no navegador não substitui autorização de backend.

Já existiam persistência local, crypto.randomUUID(), listagem, links seguros http/https, referências textuais antigas, aviso de alterações não salvas e atualização entre abas. Foram preservados. Os registros anteriores permanecem intactos, com leitura compatível, detalhes de licenciamento, tags, observações e links por ID. Não havia upload, backend ou serviço de e-mail. auth.js, producao.html e producao.js não foram modificados.

## Interface e comportamento

Fundo amarelo, grafite, título INPUT, linhas e espaço negativo, sem cards ou sombras. Identidade discreta e não editável. Somente título (200 caracteres), Sinopse do INPUT (600 caracteres, quatro linhas), link, arquivos, categoria de licenciamento e PATCH são editáveis.

Enter é bloqueado na sinopse; quebras inseridas por colagem são substituídas por espaços. A camada de validação normaliza todos os espaços antes da gravação. A entrada exige título, sinopse, categoria, PATCH e pelo menos link http/https ou arquivo.

REFERÊNCIA, ACERVO, REGISTRO e PROPOSTA são radios de seleção única, com condições operacionais provisórias em elementos details/summary. licenseTermsVersion está definida em internal-services.js como draft-0.1. licenseAcceptedAt permanece null: escolher categoria não é tratado como aceite jurídico. PATCH é um grupo separado de seleção única, com os seis destinos pedidos; patch.primary permite evolução do modelo.

Arquivos são selecionados em múltiplos lotes, listados por nome/tipo/tamanho e removíveis antes da entrada. MIME e extensão orientam a validação, incluindo tipos genéricos ou ausentes com extensão reconhecida. Isso não é inspeção de segurança dos bytes: o futuro servidor deverá validar os arquivos. Os objetos File ficam apenas em memória até a submissão; somente metadados são gravados, sem base64, upload, download fictício ou exposição pública.

Após salvar, a confirmação mantém protocolo, título, categoria, destino, quantidade de arquivos, data/hora e status visíveis. NOVO INPUT inicia outro formulário. Erros preservam o preenchimento.

## Registro e integrações futuras

Modelo de novos registros:

```js
{
  schemaVersion: 2,
  id, protocol, createdAt, updatedAt, date,
  submittedBy, userId, userName, userEmail,
  title, synopsis, link,
  files: [{ name, mimeType, extension, size, storageReference: null }],
  licenseCategory, licenseTermsVersion: 'draft-0.1', licenseAcceptedAt: null,
  patch: { primary }, status: 'RECEBIDO', receiptStatus: 'pending',
  persistenceMode: 'local', filesPersistence: 'metadata-only'
}
```

Identidade vem exclusivamente de productionAuth.current(), nunca do formulário. userId utiliza o identificador da sessão, com fallback para access. userEmail utiliza session.email quando disponível; hoje é null. O e-mail não é exibido.

O protocolo demonstrativo usa IN-ANO-LOCAL-UUID, com UUID completo, sem contador local. O backend deverá atribuir o protocolo definitivo de forma atômica; a sequência curta IN-2026-0001 não é simulada. Web Locks serializa gravações entre abas quando disponível; o fallback local não oferece a mesma proteção concorrente.

Registros ficam em localStorage, chave onca-lince.producao.v01.inputs, neste navegador e origem. Não são sincronizados nem enviados à produção. Conteúdo ilegível não é sobrescrito. O adaptador repository concentra leitura e gravação; filesAdapter prepara metadados e poderá receber upload real; receiptAdapter define pending, sem simular envio. list/create são assíncronos. A interface continua consumindo esses contratos quando houver backend.

Os campos necessários ao futuro comprovante estão no registro: protocolo, data/hora, usuário, título, arquivos, categoria, PATCH, status e destinatário da sessão. O servidor deverá fornecer o e-mail autenticado e confirmar sent ou failed após a integração. Nenhum mailto ou mensagem de envio concluído foi implementado.

## Verificação

Executar `python tests/test_input.py` com Playwright e Chromium instalados. A suíte usa servidor temporário e navegador isolado, sem alterar dados reais do usuário. Verifica redirecionamento sem sessão, identidade não editável, sinopse, campos obrigatórios, link ou arquivo, múltiplos arquivos e remoção, radios únicos, metadados, protocolo, data/hora, versão dos termos, comprovante pendente, confirmação e novo INPUT, leitura de legados, permissões, armazenamento corrompido, largura móvel e acesso ao shell/diário existente. Também captura erros JavaScript de página. A suíte passou, assim como git diff --check.

Arquivos alterados: input.html, input.css, input.js e internal-services.js. Adicionados: tests/test_input.py e este relatório.

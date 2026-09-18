# Reconciliação das suítes com o POLI

## Classificação anterior à alteração

**Multiárea: TESTE OBSOLETO.** A suíte procurava `[data-executive-link]` e `[data-area-link=...]`, além de inferir abertura pelas antigas listas de pessoas. O shell atual mantém botões em `.production-sectors`, identificados por `data-area-id`, e consulta o bootstrap POLI. A falha não era ausência de um card que precisasse ser restaurado. A suíte também criava INPUTS por PATCH e esperava um em cada departamento, contrariando a decisão de entrada exclusiva em EXEC.

**Memórias: TESTE OBSOLETO na expectativa de acesso.** A falha ocorria após trocar a sessão e esperar retorno a overview, sem retirar a concessão POLI. No cenário A, ambas as sessões demonstrativas recebem abertura de EXEC. A política de dados do Diário permanece separada. Os testes de mural vazio, candidaturas e curadoria não precisavam ser removidos.

## O que os testes passam a verificar

- Multiárea: sete IDs na ordem vigente; estados por POLI; recusa de rota sem permissão; botões reais abrindo INTL/TECH/ART; nenhuma restauração dos atributos antigos; dashboard EXEC recebendo os seis INPUTS.
- INPUT: tentativas de enviar PATCH departamental são ignoradas pelo serviço. Todos os novos registros têm initialAreaId EXEC, sem PATCH gravado. Outras áreas recebem zero INPUTS, independentemente de seu direito de abertura; não há encaminhamento implementado. A coleção original permanece byte a byte intacta durante as operações dos Diários.
- As concessões de abertura são interceptadas no bootstrap exclusivamente no teste. As concessões legadas de dados, necessárias para exercitar CRUD em TECH/ART, são uma fixture independente e explícita. Não representam permissões reais nem implementam autorização de escrita pelo POLI.
- Memórias: cenário A mantém abertura após troca de pessoa; cenário B retira EXEC e provoca retorno a overview. O acesso ao mural, ausência de formulários, armazenamento legado, isolamento de candidaturas, ausência de ordenação editorial e CRUD já existente do Diário continuam verificados.

## Proveniência: preparação não equivale a promoção

O repositório contém `productionArtifactModel.normalize`, que valida id/projectId/category e preserva campos adicionais. Não há adaptador da tabela `30_MEMORIA` nem operação de promoção.

O teste conceitual passa referências mínimas ao normalizador e verifica que source_type/source_id são preservados: DIARIO usa o id original; INPUT usa o protocolo original, distinto do id interno do INPUT. Não fornece cópia integral do conteúdo. Os objetos de origem, objetos de entrada e armazenamento do mural permanecem inalterados. Isso verifica somente a preparação atual, não valida automaticamente os valores possíveis de source_type nem prova promoção ou persistência.

Três testes unittest são explicitamente skipped, com justificativa:

1. Execução de promoção DIARIO → MEMÓRIA.
2. Execução de promoção INPUT → ARTEFATO/MEMÓRIA.
3. Contrato completo de `30_MEMORIA`: record_id, categoria, criado_em, titulo, sinopse, source_type, source_id, area_id, status.

Essas ausências são **PENDENTES JUSTIFICADOS**, não regressões. Nenhuma promoção, migração ou integração de planilha foi implementada para satisfazer a suíte.

## Execução

Executar separadamente, para evitar disputa de recursos entre navegadores:

```text
python tests/test_poli_access.py
python tests/test_poli_audit.py
python tests/test_input.py
python tests/test_gabinete.py
python tests/test_area_workspaces.py
python tests/test_memory_mural.py
```

Os testes usam servidores locais, perfis descartáveis e bloqueio/interceptação de rede externa. Não enviam eventos reais. Somente os dois arquivos de teste foram atualizados, além desta documentação; arquivos funcionais não foram modificados.

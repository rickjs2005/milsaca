---
description: Revisão pré-piloto do Milsaca. Dispara os 3 auditores (admin, corretora, produtor) em paralelo, depois cruza os relatórios para achar fios soltos entre as camadas e dá um veredito go/no-go.
---

Você é o orquestrador de uma revisão geral do Milsaca antes do deploy e do lançamento piloto. O objetivo do dono: descobrir o que ainda falta, onde estão as falhas, e principalmente se as três camadas (admin, corretora, produtor) estão AMARRADAS entre si — sem fios soltos. O bug-tipo que ele já identificou: corretora fecha entrega de 100 sacas mas comprou 120, sobram 20 sacas, e o sistema não mostra esse saldo em lugar nenhum.

Execute em três fases. Não pule a fase 3 — é a que ele mais quer.

## Fase 1 — Auditoria paralela
Você é o ÚNICO que escreve arquivos nesta revisão. Os subagentes NÃO gravam nada em disco — eles retornam o relatório como texto na mensagem final, e VOCÊ grava. Isso mantém os auditores read-only e garante UTF-8 correto (evita acento corrompido no Windows).

1. Crie a pasta `.milsaca-review/` se não existir.
2. Dispare os três subagentes em paralelo — uma única mensagem com as três invocações do Task, para que rodem concorrentes:
   - `milsaca-admin-auditor`
   - `milsaca-corretora-auditor`
   - `milsaca-produtor-auditor`
3. Aguarde os três terminarem. Cada um retorna o relatório como texto.
4. Grave o texto retornado por cada um usando a ferramenta **Write** (UTF-8; NUNCA via echo/heredoc no PowerShell — corrompe acento):
   - admin → `.milsaca-review/admin.md`
   - corretora → `.milsaca-review/corretora.md`
   - produtor → `.milsaca-review/produtor.md`

## Fase 2 — Leitura
Leia os três relatórios na íntegra (os arquivos que você acabou de gravar). Não confie só nos resumos retornados pelos subagentes; releia os arquivos completos.

## Fase 3 — Síntese cruzada (o núcleo)
Aqui você procura os FIOS SOLTOS: contradições e lacunas que só aparecem quando se cruza as três camadas. Para cada um dos eixos abaixo, confronte o que cada camada ASSUME, ENVIA e ESPERA (campo "Contrato com outras camadas" dos relatórios):

1. **Conservação de sacas ponta a ponta.** Siga uma operação com saldo residual (o caso das 20 sacas) pelas três camadas: a corretora cria/registra → o admin enxerga/reconcilia → o produtor é notificado/vê o pendente. Em qual ponto a saca some? Aponte o elo exato. Se nenhuma camada materializa o saldo residual, isso é BLOQUEADOR.

2. **Contrato de dados.** O shape que o produtor (mobile) espera bate com o que a corretora/admin produzem? Enum, campo opcional, renomeação, valor novo de estado não tratado em algum lado. Liste cada divergência como um fio solto concreto.

3. **Máquina de estados unificada.** Junte os estados de operação que cada camada relatou. Eles formam UMA máquina coerente? Há estado que a corretora gera mas o admin/produtor não trata? Transição que só existe num lado?

4. **Anomalia → alerta → ação.** Quando algo foge do esperado (entrega > contratado, romaneio vencido, saldo pendente), existe um caminho completo: detecta (banco) → alerta (admin/corretora) → o produtor fica sabendo → alguém consegue resolver? Marque onde a cadeia quebra.

5. **Isolamento e atomicidade.** Some os achados de RLS/tenant e de transação não-atômica das três camadas. Há risco de uma corretora ver dados de outra, ou de estado inconsistente após falha parcial?

## Saída
Escreva o veredito em `.milsaca-review/SINTESE.md` (com a ferramenta Write) e também resuma no chat:

```
# Síntese da revisão pré-piloto — Milsaca

## Veredito: GO / GO-COM-RESSALVAS / NO-GO
(uma frase justificando)

## Bloqueadores para o piloto (lista numerada)
Cada um: o quê, qual(is) camada(s), qual fio solto entre elas, e a correção mínima.

## Fios soltos entre camadas (a parte central)
Tabela ou lista: Eixo → o que admin assume → o que corretora envia → o que produtor espera → onde quebra.

## Mapa do caso das 20 sacas
A jornada da saca residual pelas 3 camadas, marcando o ponto exato onde ela some.

## Riscos de média/baixa severidade (resumido)

## Fila de correção sugerida (ordem)
Ordenada por: bloqueia o piloto > risco com cliente real > robustez. Cada item acionável.
```

Regras: cite arquivo:linha sempre que possível. Não invente — se faltou evidência, diga "não verificado" e por quê. Não comece a corrigir código nesta revisão; o objetivo é o diagnóstico amarrado. Responda em português, técnico e direto, sem filler.

-- =================================================================
-- Milsaca — cria os notification_templates que faltavam no banco
-- Data: 2026-06-14 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Estes templates eram referenciados por funções de cron mas NÃO existiam no
-- banco (seed incompleto) → as funções pulavam com 'template_not_found',
-- deixando os nudges/alertas DORMENTES. Criados aqui com os textos que casam
-- com as variáveis que cada função envia no payload. Idempotente.
--
-- Nota: em alvo_preco_atingido_*, {{alvo}} e {{preco_atual}} vêm como numéricos
-- crus do payload de check_price_targets (sem formatação BR). Refinar depois se
-- quiser (exigiria ajustar o payload da função).
-- =================================================================

insert into public.notification_templates (channel, kind, name, body, subject, variables) values
  ('whatsapp', 'lead_parado_3d', 'Lead parado — corretora',
   'Oi {{corretora_nome}}, você tem {{qtd}} lead(s) parado(s) há mais de 3 dias ({{resumo_produtores}}). Vale dar um toque ou marcar como perdido.',
   null, '["corretora_nome","qtd","resumo_produtores"]'::jsonb),

  ('whatsapp', 'entrega_atrasada', 'Entrega atrasada — corretora',
   'Oi {{corretora_nome}}, você tem {{qtd}} entrega(s) atrasada(s) ({{resumo_produtores}}). Vale conferir o status no Milsaca.',
   null, '["corretora_nome","qtd","resumo_produtores"]'::jsonb),

  ('email', 'trial_expira_3d', 'Trial acabando — corretora',
   'Olá {{nome}}, seu período de teste do Milsaca termina em {{dias}} dia(s). Assine para não perder o acesso aos painéis, cotações e contratos.',
   'Seu teste do Milsaca está acabando', '["nome","dias"]'::jsonb),

  ('whatsapp', 'alvo_preco_atingido_whatsapp', 'Alvo de preço atingido — produtor (WhatsApp)',
   'Oi {{nome}}! O {{produto}} atingiu seu alvo ({{condicao}} R$ {{alvo}}/saca) — agora está R$ {{preco_atual}}/saca em {{praca}}. Veja no Milsaca.',
   null, '["nome","produto","condicao","alvo","preco_atual","praca","corretora"]'::jsonb),

  ('email', 'alvo_preco_atingido_email', 'Alvo de preço atingido — produtor (e-mail)',
   'Olá {{nome}}, o {{produto}} atingiu seu alvo de preço ({{condicao}} R$ {{alvo}}/saca). Agora está R$ {{preco_atual}}/saca em {{praca}}. Acesse o Milsaca para negociar.',
   'Alvo de preço atingido no Milsaca', '["nome","produto","condicao","alvo","preco_atual","praca","corretora"]'::jsonb)
on conflict (channel, kind) do nothing;

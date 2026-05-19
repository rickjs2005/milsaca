# Checklist de Smoke em Produção — Milsaca

> Rotina manual de validação após cada deploy. Roda em ~10 min num
> browser limpo (anônimo). Marque cada item conforme passa.

## 0. Pré-requisitos

- [ ] Domínio respondendo HTTPS sem warning de certificado
- [ ] Console DevTools sem erros vermelhos no carregamento
- [ ] `view-source:/` mostra HTML server-side rendered (não só shell)

## 1. Site público abre

- [ ] `/` carrega
- [ ] CTAs principais visíveis
- [ ] Sem 500 em `/laudos` (página existe)
- [ ] Console sem erro de hidration

## 2. Cadastro

- [ ] `/cadastrar` abre
- [ ] Toggle Produtor/Corretora alterna campos
- [ ] Email inválido → erro amigável (não Postgres cru)
- [ ] Senha curta → erro amigável
- [ ] Submeter como **produtor** com email novo:
  - [ ] Recebe email de confirmação (se confirmação ativada)
  - [ ] Após confirmar, login funciona
- [ ] Submeter como **corretora** com email novo:
  - [ ] Cai em `/entrar?ok=Cadastro recebido…`
  - [ ] Aparece em `/admin/aprovacoes` como pendente

## 3. Login

- [ ] `/entrar` abre
- [ ] Email inválido → "Invalid login credentials" (genérico)
- [ ] Login admin → redirect `/admin`
- [ ] Login corretora pendente → redirect `/aguardando-aprovacao`
- [ ] Login corretora ativa → redirect `/painel/corretora`
- [ ] Login produtor → redirect `/painel/produtor`
- [ ] Botão "Esqueci senha" leva pra `/esqueci-senha`

## 4. Recuperação de senha

- [ ] `/esqueci-senha` abre
- [ ] Submeter qualquer email → mensagem genérica (anti-enumeration)
- [ ] Email com link de reset chega (verificar inbox)
- [ ] Link abre `/redefinir-senha` autenticado
- [ ] Nova senha aceita e funciona em `/entrar`

## 5. Logout

- [ ] Botão "Sair" funciona em sidebar admin e corretora
- [ ] Após logout, tentar acessar painel → redirect `/entrar`

## 6. Proteção de rotas (RBAC)

- [ ] `/admin` sem auth → `/entrar?redirectTo=/admin`
- [ ] Produtor tentando `/admin` → redirect (não vê conteúdo)
- [ ] Produtor tentando `/painel/corretora` → bloqueado
- [ ] Corretora tentando `/painel/produtor` → bloqueado
- [ ] Curl direto POST em server action sem cookie → bloqueado/redirect

## 7. Admin

- [ ] Sidebar com 9 itens (Dashboard, Aprovações, Corretoras,
  Produtores, Leads WhatsApp, Planos, Assinaturas, Métricas,
  Auditoria) + Sair
- [ ] Dashboard mostra KPIs (MRR, ativas, trial, vencidas, volume)
- [ ] Aprovar corretora pendente funciona → cria trial automático
- [ ] Confirm dialog dispara em "Rejeitar" e "Desativar"
- [ ] `/admin/leads` mostra 4 KPIs de funil
- [ ] `/admin/metricas` carrega 5 gráficos sem erro
- [ ] `/admin/auditoria` lista eventos paginados
- [ ] Toast aparece após criar plano

## 8. Painel corretora

- [ ] Onboarding aparece se perfil incompleto
- [ ] Banner de subscription aparece pra trial ≤7d
- [ ] Banner vermelho aparece pra expired/canceled/past_due
- [ ] Bloqueio em `/painel/corretora/contratos/novo` quando sub vencida
- [ ] `/painel/corretora/leads-whatsapp` mostra cliques recebidos
- [ ] Banner de funil "N de M produtores viraram contrato"
- [ ] Cancelar contrato dispara confirm
- [ ] Cancelar entrega dispara confirm
- [ ] Convidar produtor via WhatsApp gera URL `wa.me/...`

## 9. Painel produtor

- [ ] Onboarding em 3 blocos numerados
- [ ] Autocomplete IBGE: digite "Man" em UF=MG → lista Manhuaçu etc
- [ ] Home: saudação personalizada "Oi, {primeiroNome}"
- [ ] Home: CTA WhatsApp verde aparece e clica
- [ ] Catálogo `/painel/produtor/corretoras` carrega
- [ ] Mapa Leaflet aparece quando há corretoras com lat/lng
- [ ] Filtros (Favoritas / Verificadas / Região) combinam
- [ ] Click WhatsApp:
  - [ ] Janela `wa.me/...` abre síncrono
  - [ ] Mensagem inclui nome, fazenda, cidade, café (se logado)
  - [ ] Registro aparece em `/admin/leads` admin

## 10. WhatsApp / Leads

- [ ] Phone normalizado: 11 dígitos vira `55XXXXXXXXXXX`
- [ ] Mensagem encoded (sem quebrar com `&` ou `?`)
- [ ] Telefone inválido → mensagem amigável (não 500)

## 11. Localização

- [ ] UF + autocomplete IBGE em onboarding produtor
- [ ] Filtro por região no catálogo produtor funciona
- [ ] Mapa Leaflet tiles do OpenStreetMap carregam (sem CORS)
- [ ] Ícone dourado pra corretora verificada vs padrão pra demais

## 12. Build e deploy

- [ ] Build local passou (`pnpm -w build` na máquina antes de subir)
- [ ] Deploy Vercel verde (sem erros no log)
- [ ] CI no GitHub Actions verde no commit deployado
- [ ] Sourcemaps disponíveis em DevTools (ou ocultos, conforme preferência)

## 13. Observabilidade básica

- [ ] Console do browser sem erro Sentry-relevante
- [ ] DevTools Network: nenhuma requisição 500
- [ ] Resposta de `/api/leads/whatsapp` em <2s

## 14. Negativo (deve falhar como esperado)

- [ ] `anon` SDK não lê `corretoras.cnpj` (`permission denied`)
- [ ] Produtor não consegue insert em `plans`
- [ ] Corretora não consegue update em outra corretora
- [ ] RPC `list_pending_corretora_signups` rejeita não-admin

---

## Histórico

- **2026-05-19** — versão inicial (Etapa 8.1)

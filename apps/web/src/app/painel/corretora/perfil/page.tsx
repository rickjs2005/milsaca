import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  Info,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { getProfile, getUser } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaskedInput } from "@/components/forms/masked-input";
import { SubmitButton } from "@/components/submit-button";
import { updatePerfilCorretora } from "./_actions";
import { CopyLinkButton } from "./_components/copy-link-button";
import {
  getCorretoraSubscriptionInfo,
  isCorretoraDono,
} from "../_lib/corretora";

export const metadata = { title: "Perfil — Painel da corretora" };

type SearchParams = Promise<{ error?: string; saved?: string }>;

type CorretoraFull = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  verified: boolean;
  cnpj: string | null;
  descricao: string | null;
  logo_url: string | null;
  site_url: string | null;
  telefone_fixo: string | null;
};

async function loadCorretora(
  corretoraId: string | null,
): Promise<CorretoraFull | null> {
  if (!corretoraId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select(
      "id, name, slug, city, state, phone, email, verified, cnpj, descricao, logo_url, site_url, telefone_fixo",
    )
    .eq("id", corretoraId)
    .maybeSingle<CorretoraFull>();
  return data ?? null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const PLAN_STATUS_LABEL: Record<string, string> = {
  trial: "Trial",
  active: "Ativo",
  past_due: "Pagamento em atraso",
  canceled: "Cancelado",
  expired: "Expirado",
  none: "Sem plano",
};

export default async function PerfilCorretoraPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  if (!user || !profile) redirect("/entrar");
  const sp = await searchParams;
  const corretora = await loadCorretora(profile.corretora_id);
  const subscription = profile.corretora_id
    ? await getCorretoraSubscriptionInfo(profile.corretora_id)
    : null;
  const isDono = isCorretoraDono(profile);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  const publicProfileUrl = corretora ? `${siteUrl}/c/${corretora.slug}` : null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
          Perfil
        </h1>
        <p className="mt-1 text-sm text-milsaca-verde-claro">
          Seus dados de operador, da corretora, segurança da conta, perfil
          público e plano.
        </p>
      </header>

      {sp.saved && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Perfil atualizado.
        </div>
      )}
      {sp.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {sp.error}
        </div>
      )}

      {/* ============================================================ */}
      {/* Bloco 1 — Dados do operador (editável)                       */}
      {/* ============================================================ */}
      <form action={updatePerfilCorretora}>
        <Card className="border-milsaca-cream-escuro shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle className="h-4 w-4 text-milsaca-cafezal" />
              Dados do operador
            </CardTitle>
            <CardDescription>
              Quem está logado nesta sessão. Editável.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input
                id="full_name"
                name="full_name"
                required
                defaultValue={profile.full_name ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label>E-mail (somente leitura)</Label>
              <Input
                value={user.email ?? ""}
                readOnly
                disabled
                className="bg-milsaca-cream/60 text-milsaca-verde-claro"
              />
              <p className="text-[11px] text-milsaca-verde-claro/70">
                Trocar e-mail? Fale com o suporte.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <MaskedInput
                id="phone"
                type="phone"
                name="phone"
                defaultValue={profile.phone ?? ""}
                validateOnBlur
              />
            </div>

            <div className="flex justify-end sm:col-span-2">
              <SubmitButton
                pendingLabel="Salvando..."
                className="bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
              >
                Salvar dados pessoais
              </SubmitButton>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* ============================================================ */}
      {/* Bloco 2 — Dados da corretora (somente leitura)               */}
      {/* ============================================================ */}
      <Card className="border-milsaca-cream-escuro shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="h-4 w-4 text-milsaca-cafezal" />
            Dados da corretora
            {corretora?.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-milsaca-dourado/15 px-2 py-0.5 text-[10px] font-medium text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40">
                <BadgeCheck className="h-2.5 w-2.5" />
                Verificada
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>
            Dados cadastrais da empresa. Somente leitura.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {corretora ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome fantasia" value={corretora.name} />
                <Field
                  label="CNPJ"
                  value={corretora.cnpj ?? "—"}
                  mono={Boolean(corretora.cnpj)}
                />
                <Field
                  label="Cidade / UF"
                  value={
                    corretora.city
                      ? `${corretora.city} / ${corretora.state ?? "—"}`
                      : "—"
                  }
                />
                <Field
                  label="WhatsApp comercial"
                  value={corretora.phone ?? "—"}
                />
                <Field
                  label="Telefone fixo"
                  value={corretora.telefone_fixo ?? "—"}
                />
                <Field label="E-mail comercial" value={corretora.email ?? "—"} />
                <Field
                  label="Site institucional"
                  value={corretora.site_url ?? "—"}
                  className="sm:col-span-2"
                />
                {corretora.descricao ? (
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase tracking-wider text-milsaca-verde-claro/70">
                      Descrição curta
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-milsaca-verde">
                      {corretora.descricao}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex items-start gap-2 rounded-md border border-milsaca-dourado/30 bg-milsaca-dourado/5 p-3 text-xs text-milsaca-verde">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-milsaca-dourado" />
                <p>
                  Pra atualizar dados da corretora (nome, CNPJ, descrição, site
                  ou logo), fale com o suporte da Milsaca.
                </p>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              Você ainda não está vinculado a uma corretora. Fale com o suporte
              pra concluir o cadastro.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* Bloco 3 — Perfil público                                      */}
      {/* ============================================================ */}
      {corretora && publicProfileUrl ? (
        <Card className="border-milsaca-cream-escuro shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-milsaca-cafezal" />
              Perfil público
            </CardTitle>
            <CardDescription>
              Use este link pra mandar pra produtores e compradores.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview do card que aparece pra quem visita o link */}
            <PublicPreview corretora={corretora} />

            <div className="space-y-2 rounded-lg border border-milsaca-cream-escuro bg-milsaca-cream/40 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-milsaca-verde-claro/70">
                Link da página pública
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-milsaca-cream-escuro bg-white px-3 py-2 font-mono text-xs text-milsaca-verde">
                  {publicProfileUrl}
                </code>
                <CopyLinkButton url={publicProfileUrl} />
                <Link
                  href={publicProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-milsaca-cafezal px-3 text-xs font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver página pública
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <p className="pt-1 text-[11px] text-milsaca-verde-claro/80">
                Mande este link no WhatsApp, em e-mails, no bio do Instagram —
                onde fizer sentido. Atualizações no perfil refletem na hora.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ============================================================ */}
      {/* Bloco 4 — Segurança da conta                                  */}
      {/* ============================================================ */}
      <Card className="border-milsaca-cream-escuro shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-milsaca-cafezal" />
            Segurança da conta
          </CardTitle>
          <CardDescription>
            Senha e proteção do login do operador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SecurityAction
            icon={KeyRound}
            title="Trocar senha"
            description="Pede um link de redefinição pro seu e-mail."
            actionLabel="Pedir link"
            href="/esqueci-senha"
          />
          <SecurityAction
            icon={Lock}
            title="Verificação em 2 etapas (MFA)"
            description="Em breve — vai proteger o login com app autenticador."
            actionLabel="Indisponível"
            disabled
          />
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* Bloco 5 — Plano (RESUMO; o detalhe e as ações vivem na          */}
      {/* tela de Assinatura — fonte única, sem duplicar o bloco)         */}
      {/* ============================================================ */}
      <Card className="border-milsaca-cream-escuro shadow-card">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-card text-sm">
          {subscription ? (
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-milsaca-verde">
                    Plano {subscription.planName ?? "Sem plano"}
                    <span className="ml-2 text-xs font-normal text-milsaca-verde-claro">
                      {PLAN_STATUS_LABEL[subscription.effectiveStatus] ??
                        subscription.effectiveStatus}
                    </span>
                  </p>
                  <p className="text-xs text-milsaca-verde-claro">
                    {subscription.currentPeriodEnd ?? subscription.trialEndsAt
                      ? `Vence em ${formatDate(subscription.currentPeriodEnd ?? subscription.trialEndsAt)}`
                      : "Gestão do plano na Assinatura"}
                  </p>
                </div>
              </div>
              {isDono ? (
                <Link
                  href="/painel/corretora/assinatura"
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-milsaca-cafezal px-3 text-xs font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-cafezal hover:text-milsaca-cream"
                >
                  Ver assinatura
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">
              Sem assinatura vinculada. Fale com o suporte.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* Bloco 6 — Privacidade (LGPD)                                  */}
      {/* ============================================================ */}
      <Card className="border-milsaca-cream-escuro shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-milsaca-cafezal" />
            Privacidade (LGPD)
          </CardTitle>
          <CardDescription>
            Baixe uma cópia dos dados que guardamos sobre você e a corretora em
            formato JSON.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/api/lgpd/exportar"
            download
            className="inline-flex h-10 items-center gap-2 rounded-md border border-milsaca-cafezal px-4 text-sm font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-cafezal hover:text-milsaca-cream"
          >
            <Download className="h-4 w-4" />
            Exportar meus dados
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

/* ====================================================================== */
/* Pieces                                                                  */
/* ====================================================================== */

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wider text-milsaca-verde-claro/70">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-medium text-milsaca-verde ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function SecurityAction({
  icon: Icon,
  title,
  description,
  actionLabel,
  href,
  disabled,
}: {
  icon: typeof KeyRound;
  title: string;
  description: string;
  actionLabel: string;
  href?: string;
  disabled?: boolean;
}) {
  const ButtonInner = (
    <span
      className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
        disabled
          ? "cursor-not-allowed bg-milsaca-cream-escuro text-milsaca-verde-claro/60"
          : "border border-milsaca-cafezal text-milsaca-cafezal hover:bg-milsaca-cafezal hover:text-milsaca-cream"
      }`}
    >
      {actionLabel}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-milsaca-cream-escuro bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-milsaca-cafezal/10 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-cafezal/20">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-milsaca-verde">{title}</p>
          <p className="text-xs text-milsaca-verde-claro">{description}</p>
        </div>
      </div>
      {disabled || !href ? ButtonInner : <Link href={href}>{ButtonInner}</Link>}
    </div>
  );
}

function PublicPreview({ corretora }: { corretora: CorretoraFull }) {
  const local = [corretora.city, corretora.state].filter(Boolean).join("/");
  return (
    <div className="overflow-hidden rounded-lg border border-milsaca-cafezal/20">
      <div className="flex items-start gap-4 bg-milsaca-cafezal p-5 text-milsaca-cream">
        {corretora.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={corretora.logo_url}
            alt={`Logo ${corretora.name}`}
            className="h-14 w-14 shrink-0 rounded-lg border border-milsaca-dourado/40 bg-white object-contain p-1"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-milsaca-dourado/20 text-2xl font-bold text-milsaca-dourado">
            {corretora.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold">{corretora.name}</p>
            {corretora.verified ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-milsaca-dourado/15 px-2 py-0.5 text-[10px] font-medium text-milsaca-dourado">
                <BadgeCheck className="h-2.5 w-2.5" />
                Verificada
              </span>
            ) : null}
          </div>
          {local ? (
            <p className="mt-0.5 text-xs text-milsaca-cream/70">{local}</p>
          ) : null}
          {corretora.descricao ? (
            <p className="mt-2 line-clamp-2 text-xs text-milsaca-cream/80">
              {corretora.descricao}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 bg-milsaca-cream/40 px-5 py-3 text-xs text-milsaca-verde-claro">
        {corretora.phone ? (
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {corretora.phone}
          </span>
        ) : null}
        {corretora.email ? (
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {corretora.email}
          </span>
        ) : null}
      </div>
    </div>
  );
}

import { AlertCircle, Coffee, ShieldCheck } from "lucide-react";
import { signInAdmin } from "./_actions";
import { GoldenSubmitButton } from "./_components/golden-submit-button";
import { Label } from "@/components/ui/label";

export const metadata = { title: "Admin · Entrar — Milsaca" };

type SearchParams = Promise<{
  email?: string;
  error?: string;
}>;

function translateAuthError(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials")
  ) {
    return "E-mail ou senha inválidos. Verifique os dados e tente novamente.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de acessar o painel.";
  }
  if (/[áéíóúâêôãõç]/i.test(raw) || lower.startsWith("muitas")) {
    return raw;
  }
  return "Não foi possível concluir o acesso. Tente novamente em alguns instantes.";
}

// Cores fixas via style inline — evita depender do JIT em arbitrary values
// complexos (radial-gradient com vírgulas/parênteses) e garante contraste.
const COLORS = {
  preto: "#0a0a0a",
  pretoCafe: "#1A1A1A",
  cafezal: "#0F3D2E",
  folha: "#1B5E3F",
  ouro: "#C9A961",
  ouroClaro: "#E0C68A",
  cream: "#FAF7F0",
} as const;

const asideBg = `
  radial-gradient(circle at 20% 15%, rgba(201,169,97,0.12) 0%, transparent 45%),
  radial-gradient(circle at 85% 85%, rgba(27,94,63,0.35) 0%, transparent 50%),
  linear-gradient(135deg, ${COLORS.cafezal} 0%, ${COLORS.pretoCafe} 70%, ${COLORS.preto} 100%)
`;

const sectionBg = `
  radial-gradient(ellipse at top, rgba(15,61,46,0.18) 0%, transparent 55%),
  linear-gradient(180deg, ${COLORS.preto} 0%, ${COLORS.pretoCafe} 100%)
`;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const errorMessage = sp.error ? translateAuthError(sp.error) : null;

  const inputClass =
    "block h-12 w-full rounded-lg border bg-[#0a0a0a] px-4 text-[15px] text-[#FAF7F0] " +
    "placeholder:text-[#FAF7F0]/30 outline-none transition-all duration-150 " +
    "border-[#C9A961]/20 hover:border-[#C9A961]/40 " +
    "focus:border-[#C9A961] focus:ring-4 focus:ring-[#C9A961]/15 " +
    "aria-[invalid=true]:border-red-500/70 aria-[invalid=true]:focus:ring-red-500/20";

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#FAF7F0]">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        {/* ============================================================ */}
        {/* ASIDE — branding (desktop only)                              */}
        {/* ============================================================ */}
        <aside
          className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16"
          style={{ background: asideBg }}
        >
          {/* Pattern decorativo bem sutil */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #C9A961 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* Linha decorativa fina */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(201,169,97,0.18) 50%, transparent 100%)",
            }}
          />

          <div className="relative flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl shadow-[0_8px_30px_-6px_rgba(201,169,97,0.45)]"
              style={{
                background: `linear-gradient(135deg, ${COLORS.ouro} 0%, #8a6d34 100%)`,
              }}
            >
              <Coffee className="h-5 w-5 text-[#1A1A1A]" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#C9A961]">
                Milsaca
              </p>
              <p className="text-[11px] text-[#FAF7F0]/45">
                Corretagem de café · Brasil
              </p>
            </div>
          </div>

          <div className="relative max-w-md space-y-6">
            <div className="flex items-center gap-2 rounded-full border border-[#C9A961]/25 bg-[#C9A961]/[0.06] px-3 py-1 w-fit">
              <ShieldCheck className="h-3.5 w-3.5 text-[#C9A961]" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#C9A961]">
                Acesso administrativo
              </span>
            </div>
            <h2 className="text-3xl font-semibold leading-[1.15] tracking-tight text-[#FAF7F0] xl:text-4xl">
              O sistema operacional da nova geração de corretoras de café.
            </h2>
            <p className="text-[15px] leading-relaxed text-[#FAF7F0]/65">
              Gerencie corretoras, assinaturas e operações da plataforma com
              segurança e controle total.
            </p>
          </div>

          <div className="relative flex items-center justify-between text-xs text-[#FAF7F0]/35">
            <span>© {new Date().getFullYear()} Milsaca</span>
            <span className="font-medium tracking-wider">v1 · BETA</span>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* SECTION — form                                                */}
        {/* ============================================================ */}
        <section
          className="relative flex items-center justify-center px-5 py-12 sm:px-8"
          style={{ background: sectionBg }}
        >
          <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Brand visível só no mobile (no desktop fica no aside) */}
            <div className="mb-10 flex items-center justify-center gap-2.5 lg:hidden">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg shadow-[0_4px_20px_-4px_rgba(201,169,97,0.4)]"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.ouro} 0%, #8a6d34 100%)`,
                }}
              >
                <Coffee className="h-5 w-5 text-[#1A1A1A]" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-semibold tracking-tight">
                Milsaca
              </span>
            </div>

            {/* CARD */}
            <div
              className="rounded-2xl border border-[#C9A961]/15 p-7 sm:p-9"
              style={{
                background: "#141414",
                boxShadow:
                  "0 1px 0 0 rgba(201,169,97,0.08) inset, 0 30px 80px -20px rgba(0,0,0,0.8), 0 10px 30px -10px rgba(0,0,0,0.6)",
              }}
            >
              <div className="mb-8">
                <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[#FAF7F0]">
                  Milsaca Admin
                </h1>
                <p className="mt-1.5 text-sm font-medium text-[#C9A961]">
                  Painel administrativo
                </p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-[#FAF7F0]/55">
                  Acesso restrito para gestão da plataforma.
                </p>
              </div>

              <form action={signInAdmin} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-[11px] font-medium uppercase tracking-wider text-[#FAF7F0]/70"
                  >
                    E-mail administrativo
                  </Label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    defaultValue={sp.email ?? ""}
                    aria-invalid={errorMessage ? true : undefined}
                    aria-describedby={errorMessage ? "auth-error" : undefined}
                    placeholder="admin@milsaca.com.br"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-[11px] font-medium uppercase tracking-wider text-[#FAF7F0]/70"
                  >
                    Senha
                  </Label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    aria-invalid={errorMessage ? true : undefined}
                    aria-describedby={errorMessage ? "auth-error" : undefined}
                    placeholder="••••••••••"
                    className={inputClass}
                  />
                </div>

                {errorMessage ? (
                  <div
                    id="auth-error"
                    role="alert"
                    className="flex items-start gap-2.5 rounded-lg border border-red-900/80 bg-red-950/50 px-4 py-3 text-[13.5px] leading-snug text-red-100"
                  >
                    <AlertCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
                      aria-hidden
                    />
                    <span className="font-medium">{errorMessage}</span>
                  </div>
                ) : null}

                <GoldenSubmitButton pendingLabel="Entrando...">
                  Entrar no admin
                </GoldenSubmitButton>
              </form>

              <div className="mt-7 flex items-center justify-center gap-2 border-t border-[#C9A961]/[0.08] pt-5 text-xs text-[#FAF7F0]/40">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                <span>Acesso exclusivo para administradores autorizados.</span>
              </div>
            </div>

            <p className="mt-6 text-center text-[11px] text-[#FAF7F0]/30 lg:hidden">
              © {new Date().getFullYear()} Milsaca
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

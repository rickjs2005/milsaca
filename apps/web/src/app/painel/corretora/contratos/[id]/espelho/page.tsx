import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { getContrato, CONTRATO_STATUS_LABEL } from "../../_lib/queries";
import { PrintButton } from "./_print-button";

export const metadata = { title: "Espelho de contrato — Milsaca" };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Params = Promise<{ id: string }>;

/**
 * Espelho de contrato no padrão visual do DANFE (NF-e) usado pelas
 * cafeeiras da Zona da Mata / Manhuaçu. Não é nota fiscal — é uma
 * representação espelhada da operação que a corretora intermediou,
 * pra ficar familiar pro produtor e pro comprador acostumados com
 * o layout do DANFE.
 *
 * Campos fiscais (CFOP/NCM/CST/isenção) são fixos pro café arábica
 * cru comercializado dentro de MG — Art. 459 Decreto 43180/02 isenta
 * ICMS na primeira saída. Quando a corretora operar interestadual
 * ou outras especies, esses valores vão precisar virar configuráveis.
 */

const BRL2 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUM3 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function brl(v: number | null): string {
  if (v == null) return "0,00";
  return BRL2.format(v);
}

function num(v: number | null): string {
  if (v == null) return "—";
  return NUM3.format(v);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatCnpj(raw: string | null): string {
  if (!raw) return "—";
  const d = raw.replace(/\D/g, "");
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  return raw;
}

export default async function EspelhoContratoPage({
  params,
}: {
  params: Params;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const { id } = await params;
  const contrato = await getContrato(profile.corretora_id, id);
  if (!contrato) notFound();

  const supabase = await createClient();
  const { data: corretora } = await supabase
    .from("corretoras")
    .select(
      "name, slug, city, state, phone, telefone_fixo, cnpj, inscricao_est, endereco, bairro, cep",
    )
    .eq("id", profile.corretora_id)
    .maybeSingle<{
      name: string | null;
      slug: string | null;
      city: string | null;
      state: string | null;
      phone: string | null;
      telefone_fixo: string | null;
      cnpj: string | null;
      inscricao_est: string | null;
      endereco: string | null;
      bairro: string | null;
      cep: string | null;
    }>();

  // content_hash não faz parte de ContratoDetail (queries compartilhada),
  // então buscamos só essa coluna aqui. Já filtrado por corretora_id na RLS.
  const { data: hashRow } = await supabase
    .from("contratos")
    .select("content_hash")
    .eq("id", contrato.id)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle<{ content_hash: string | null }>();
  const contentHash = hashRow?.content_hash ?? null;

  // QR e link reais de verificação pública (substituem a falsa "chave de
  // acesso"/"protocolo" que sugeriam validação inexistente — achado 3.1).
  const verifyUrl = `${SITE_URL}/contratos/${contrato.id}/verificar`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
    color: { dark: "#2D3A2E", light: "#FAF7F0" },
  });

  const valorPorSaca =
    contrato.total_value != null && contrato.bag_count
      ? contrato.total_value / contrato.bag_count
      : null;
  const pesoLiquido =
    contrato.bag_count != null ? contrato.bag_count * 60 : null;
  const dataEmissao = contrato.signed_at ?? contrato.created_at;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .danfe-cell { border: 1px solid #475569; padding: 4px 6px; font-size: 9px; line-height: 1.25; }
        .danfe-label { font-size: 7px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; font-weight: 600; }
        .danfe-value { font-size: 10px; color: #0f172a; font-weight: 500; }
        .danfe-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      `}</style>

      <div className="mx-auto max-w-[210mm] px-4 py-6">
        {/* Toolbar */}
        <div className="no-print mb-6 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm shadow-card">
          <a
            href={`/painel/corretora/contratos/${contrato.id}`}
            className="text-milsaca-cafezal hover:underline"
          >
            ← Voltar pro contrato
          </a>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Espelho · padrão DANFE
            </span>
            <PrintButton />
          </div>
        </div>

        {/* DANFE */}
        <div className="bg-white p-3 shadow-card print:shadow-none">
          {/* ============================================================ */}
          {/* HEADER — recebimento + identificação                          */}
          {/* ============================================================ */}
          <div className="grid grid-cols-[1fr_140px] gap-0">
            <div className="danfe-cell">
              <span className="danfe-label">
                Recebemos de {corretora?.name ?? "Corretora"} os produtos /
                serviços constantes do espelho indicado ao lado
              </span>
              <div className="mt-1 grid grid-cols-2 gap-1">
                <div>
                  <p className="danfe-label">Data de recebimento</p>
                  <p className="danfe-value">—</p>
                </div>
                <div>
                  <p className="danfe-label">
                    Identificação e assinatura do recebedor
                  </p>
                  <p className="danfe-value">&nbsp;</p>
                </div>
              </div>
            </div>
            <div className="danfe-cell flex flex-col items-center justify-center">
              <p className="danfe-label">Espelho</p>
              <p className="danfe-mono text-xs font-bold">
                Nº {contrato.code}
              </p>
              <p className="danfe-label mt-1">Série</p>
              <p className="danfe-mono text-xs font-bold">001</p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* IDENTIFICAÇÃO DO EMITENTE (corretora) + DANFE info            */}
          {/* ============================================================ */}
          <div className="mt-1 grid grid-cols-[1.4fr_0.6fr_1fr] gap-0">
            <div className="danfe-cell">
              <p className="danfe-label">Identificação do emitente</p>
              <p className="mt-1 text-xs font-bold text-slate-900">
                {corretora?.name ?? "Corretora"}
              </p>
              <p className="danfe-value">
                {corretora?.endereco ?? "—"}
                {corretora?.bairro ? ` · ${corretora.bairro}` : ""}
              </p>
              <p className="danfe-value">
                {corretora?.cep ? `CEP: ${corretora.cep} · ` : ""}
                {corretora?.city ?? "—"}
                {corretora?.state ? ` - ${corretora.state}` : ""}
              </p>
              <p className="danfe-value">
                {corretora?.telefone_fixo
                  ? `Tel: ${corretora.telefone_fixo}`
                  : corretora?.phone
                    ? `WhatsApp: ${corretora.phone}`
                    : ""}
              </p>
            </div>

            <div className="danfe-cell flex flex-col items-center justify-center text-center">
              <p className="text-sm font-bold tracking-wider text-slate-900">
                ESPELHO
              </p>
              <p className="danfe-label">
                Documento Auxiliar de
                <br />
                Operação Comercial
              </p>
              <div className="mt-2 grid w-full grid-cols-2 gap-1 text-center">
                <div className="border border-slate-600 p-1">
                  <p className="danfe-label">0-Entrada</p>
                </div>
                <div className="border border-slate-600 bg-slate-900 p-1 text-white">
                  <p className="danfe-label text-white">1-Saída</p>
                </div>
              </div>
              <p className="danfe-mono mt-1 text-xs font-bold">
                Nº {contrato.code}
              </p>
              <p className="danfe-label">Folha 1/1 · Série 001</p>
            </div>

            <div className="danfe-cell flex flex-col">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="danfe-label">Hash SHA-256 do documento</p>
                  {contentHash ? (
                    <p className="danfe-mono mt-1 break-all text-[7px] leading-tight">
                      {contentHash}
                    </p>
                  ) : (
                    <p className="danfe-mono mt-1 text-[8px]">
                      — gerado na assinatura —
                    </p>
                  )}
                  <p className="danfe-label mt-2">Verificação</p>
                  <p className="danfe-mono break-all text-[7px] leading-tight">
                    {verifyUrl}
                  </p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL, sem ganho com next/image */}
                <img
                  src={qrDataUrl}
                  alt="QR de verificação"
                  className="h-12 w-12 shrink-0"
                />
              </div>
              <p className="danfe-label mt-2">Status</p>
              <p className="danfe-value">
                {CONTRATO_STATUS_LABEL[contrato.status]}
              </p>
            </div>
          </div>

          {/* Natureza da operação + Inscrição estadual */}
          <div className="mt-1 grid grid-cols-[1.4fr_0.6fr_1fr] gap-0">
            <div className="danfe-cell">
              <p className="danfe-label">Natureza da operação</p>
              <p className="danfe-value">COMPRA PARA COMERCIALIZAÇÃO</p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Inscrição estadual</p>
              <p className="danfe-mono danfe-value">
                {corretora?.inscricao_est ?? "—"}
              </p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">CNPJ / CPF</p>
              <p className="danfe-mono danfe-value">
                {formatCnpj(corretora?.cnpj ?? null)}
              </p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* DESTINATÁRIO / REMETENTE (produtor)                            */}
          {/* ============================================================ */}
          <SectionTitle>Destinatário / Remetente (produtor)</SectionTitle>
          <div className="grid grid-cols-[2fr_1fr_0.8fr] gap-0">
            <div className="danfe-cell">
              <p className="danfe-label">Nome / Razão social</p>
              <p className="danfe-value font-semibold">
                {contrato.produtor_nome}
              </p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">CNPJ / CPF</p>
              <p className="danfe-mono danfe-value">
                {formatCnpj(contrato.produtor_cpf_cnpj)}
              </p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Data emissão</p>
              <p className="danfe-value">{formatDate(dataEmissao)}</p>
            </div>
          </div>

          <div className="grid grid-cols-[2fr_1fr_0.8fr] gap-0">
            <div className="danfe-cell">
              <p className="danfe-label">Endereço</p>
              <p className="danfe-value">
                {contrato.produtor_fazenda ?? "—"}
              </p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Bairro / Distrito</p>
              <p className="danfe-value">Zona Rural</p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Município</p>
              <p className="danfe-value">
                {contrato.produtor_city ?? "—"}
                {contrato.produtor_state
                  ? ` / ${contrato.produtor_state}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[2fr_1fr_0.8fr] gap-0">
            <div className="danfe-cell">
              <p className="danfe-label">Fone / WhatsApp</p>
              <p className="danfe-mono danfe-value">
                {contrato.produtor_phone ?? "—"}
              </p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Inscrição estadual (rural)</p>
              <p className="danfe-value">—</p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Hora saída</p>
              <p className="danfe-value">—</p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* DESTINATÁRIO (comprador) — quando definido                    */}
          {/* ============================================================ */}
          <SectionTitle>Destinatário (comprador / cafeeira)</SectionTitle>
          <div className="grid grid-cols-[2fr_1fr_0.8fr] gap-0">
            <div className="danfe-cell">
              <p className="danfe-label">Nome / Razão social</p>
              <p className="danfe-value font-semibold">
                {contrato.comprador_nome ?? "— a definir —"}
              </p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">CNPJ</p>
              <p className="danfe-mono danfe-value">
                {formatCnpj(contrato.comprador_cnpj)}
              </p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Inscrição estadual</p>
              <p className="danfe-mono danfe-value">
                {contrato.comprador_ie ?? "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[2fr_1fr_0.8fr] gap-0">
            <div className="danfe-cell">
              <p className="danfe-label">Endereço</p>
              <p className="danfe-value">—</p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Município</p>
              <p className="danfe-value">
                {contrato.comprador_city ?? "—"}
                {contrato.comprador_state
                  ? ` / ${contrato.comprador_state}`
                  : ""}
              </p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">CEP</p>
              <p className="danfe-value">—</p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CÁLCULO DO IMPOSTO (isenção Art.459 Decreto 43180/02)         */}
          {/* ============================================================ */}
          <SectionTitle>Cálculo do imposto</SectionTitle>
          <div className="grid grid-cols-5 gap-0">
            <FiscalCell label="Base cálc. ICMS">0,00</FiscalCell>
            <FiscalCell label="Valor do ICMS">0,00</FiscalCell>
            <FiscalCell label="Base cálc. ICMS subst.">0,00</FiscalCell>
            <FiscalCell label="Valor ICMS subst.">0,00</FiscalCell>
            <FiscalCell label="Valor total produtos" highlight>
              {brl(contrato.total_value)}
            </FiscalCell>
          </div>
          <div className="grid grid-cols-5 gap-0">
            <FiscalCell label="Valor do frete">0,00</FiscalCell>
            <FiscalCell label="Valor do seguro">0,00</FiscalCell>
            <FiscalCell label="Desconto">0,00</FiscalCell>
            <FiscalCell label="Outras desp. acessórias">0,00</FiscalCell>
            <FiscalCell label="Valor total da nota" highlight>
              {brl(contrato.total_value)}
            </FiscalCell>
          </div>

          {/* ============================================================ */}
          {/* TRANSPORTADOR / VOLUMES                                       */}
          {/* ============================================================ */}
          <SectionTitle>Transportador / Volumes transportados</SectionTitle>
          <div className="grid grid-cols-[2fr_1fr_0.8fr] gap-0">
            <div className="danfe-cell">
              <p className="danfe-label">Razão social</p>
              <p className="danfe-value">
                {corretora?.name ?? "—"}
                <span className="text-[8px] text-slate-500">
                  {" "}
                  (corretora intermediária)
                </span>
              </p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Frete por conta</p>
              <p className="danfe-value">0-Emitente</p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Código ANTT</p>
              <p className="danfe-value">—</p>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-0">
            <div className="danfe-cell">
              <p className="danfe-label">Quantidade</p>
              <p className="danfe-value">
                {contrato.bag_count?.toLocaleString("pt-BR") ?? "—"}
              </p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Espécie</p>
              <p className="danfe-value">SACAS</p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Marca</p>
              <p className="danfe-value">CAFÉ</p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Peso bruto</p>
              <p className="danfe-value">{num(pesoLiquido)} kg</p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Peso líquido</p>
              <p className="danfe-value">{num(pesoLiquido)} kg</p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* DADOS DO PRODUTO / SERVIÇO                                    */}
          {/* ============================================================ */}
          <SectionTitle>Dados do produto / serviço</SectionTitle>
          <div className="grid grid-cols-[60px_3fr_60px_50px_50px_50px_70px_80px_60px_80px] gap-0 text-center">
            <ProductHeader>Cód.</ProductHeader>
            <ProductHeader>Descrição do produto / serviço</ProductHeader>
            <ProductHeader>NCM</ProductHeader>
            <ProductHeader>CST</ProductHeader>
            <ProductHeader>CFOP</ProductHeader>
            <ProductHeader>Und.</ProductHeader>
            <ProductHeader>Quant.</ProductHeader>
            <ProductHeader>Vl. unit.</ProductHeader>
            <ProductHeader>Desconto</ProductHeader>
            <ProductHeader>Vl. total</ProductHeader>
          </div>
          <div className="grid grid-cols-[60px_3fr_60px_50px_50px_50px_70px_80px_60px_80px] gap-0">
            <div className="danfe-cell text-center">1</div>
            <div className="danfe-cell">
              <p className="danfe-value">
                CAFÉ EM GRÃO CRU{" "}
                {contrato.coffee_type
                  ? contrato.coffee_type.toUpperCase()
                  : "ARÁBICA"}
              </p>
              {contrato.notes_lead ? (
                <p className="danfe-label mt-0.5 italic">
                  {contrato.notes_lead}
                </p>
              ) : null}
            </div>
            <div className="danfe-cell danfe-mono text-center">09011110</div>
            <div className="danfe-cell danfe-mono text-center">040</div>
            <div className="danfe-cell danfe-mono text-center">1102</div>
            <div className="danfe-cell text-center">SC</div>
            <div className="danfe-cell text-right">
              {num(contrato.bag_count)}
            </div>
            <div className="danfe-cell text-right">{brl(valorPorSaca)}</div>
            <div className="danfe-cell text-right">0,00</div>
            <div className="danfe-cell text-right font-semibold">
              {brl(contrato.total_value)}
            </div>
          </div>

          {/* ============================================================ */}
          {/* CORRETAGEM (bloco específico Milsaca, fora do DANFE original) */}
          {/* ============================================================ */}
          {contrato.comissao_pct != null ? (
            <>
              <SectionTitle>Corretagem (intermediação)</SectionTitle>
              <div className="grid grid-cols-3 gap-0">
                <div className="danfe-cell">
                  <p className="danfe-label">Alíquota da corretagem</p>
                  <p className="danfe-value">
                    {contrato.comissao_pct.toLocaleString("pt-BR", {
                      maximumFractionDigits: 2,
                    })}
                    %
                  </p>
                </div>
                <div className="danfe-cell">
                  <p className="danfe-label">Base de cálculo</p>
                  <p className="danfe-value">{brl(contrato.total_value)}</p>
                </div>
                <div className="danfe-cell">
                  <p className="danfe-label">Comissão devida à corretora</p>
                  <p className="danfe-value font-semibold">
                    {brl(contrato.comissao_total)}
                  </p>
                </div>
              </div>
            </>
          ) : null}

          {/* ============================================================ */}
          {/* DADOS ADICIONAIS                                              */}
          {/* ============================================================ */}
          <SectionTitle>Dados adicionais</SectionTitle>
          <div className="grid grid-cols-[2fr_1fr] gap-0">
            <div className="danfe-cell">
              <p className="danfe-label">Informações complementares</p>
              <p className="mt-1 text-[8px] leading-snug text-slate-700">
                Operação ISENTA de ICMS conforme Art. 459, Anexo V do
                RICMS/MG, com nova redação dada pelo Decreto 45.030 do
                RICMS/MG/09, sob redação dada pelo Art. 459, Decreto 7654
                LXT 0913 MG. Espelho gerado pelo sistema Milsaca como
                documento auxiliar de operação comercial — não substitui
                nota fiscal eletrônica. Quando a operação for emitida
                em NF-e, citar este espelho como referência.
              </p>
            </div>
            <div className="danfe-cell">
              <p className="danfe-label">Reservado ao fisco</p>
              <p className="danfe-value">&nbsp;</p>
            </div>
          </div>

          {/* Assinaturas */}
          <div className="mt-4 grid grid-cols-3 gap-4 px-4 pt-8">
            <SignatureLine
              name={contrato.produtor_nome}
              role="Vendedor (produtor)"
            />
            <SignatureLine
              name={corretora?.name ?? "Corretora"}
              role="Corretora intermediária"
            />
            <SignatureLine
              name={contrato.comprador_nome ?? "Comprador"}
              role="Comprador / cafeeira"
            />
          </div>

          <footer className="mt-6 border-t border-slate-300 pt-2 text-center text-[8px] uppercase tracking-widest text-slate-500">
            Espelho gerado pelo Milsaca · {formatDate(new Date().toISOString())}{" "}
            · {contrato.code} · não substitui NF-e
          </footer>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1 border border-slate-600 bg-slate-100 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-slate-700">
      {children}
    </div>
  );
}

function FiscalCell({
  label,
  children,
  highlight,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`danfe-cell ${highlight ? "bg-slate-50" : ""}`}>
      <p className="danfe-label">{label}</p>
      <p
        className={`danfe-mono text-right ${highlight ? "danfe-value font-bold" : "danfe-value"}`}
      >
        {children}
      </p>
    </div>
  );
}

function ProductHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="danfe-cell bg-slate-100 text-center text-[8px] font-semibold uppercase tracking-wider text-slate-700">
      {children}
    </div>
  );
}

function SignatureLine({ name, role }: { name: string; role: string }) {
  return (
    <div className="text-center">
      <div className="border-t border-slate-700" />
      <p className="mt-1 text-[10px] font-medium text-slate-800">{name}</p>
      <p className="text-[8px] uppercase tracking-wider text-slate-500">
        {role}
      </p>
    </div>
  );
}

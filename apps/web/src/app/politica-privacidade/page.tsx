import Link from "next/link";
import { POLITICA_VERSAO } from "@/lib/legal";

export const metadata = {
  title: "Política de Privacidade — Milsaca",
  description:
    "Como o Milsaca trata seus dados pessoais, conforme LGPD (Lei 13.709/2018).",
};

export default function PoliticaPrivacidadePage() {
  return (
    <main className="min-h-screen bg-milsaca-cream px-6 py-10">
      <article className="mx-auto max-w-3xl space-y-6">
        <header>
          <Link
            href="/"
            className="text-xs text-milsaca-dourado hover:underline"
          >
            ← Voltar
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-milsaca-verde">
            Política de Privacidade
          </h1>
          <p className="mt-1 text-xs text-milsaca-verde-claro">
            Versão {POLITICA_VERSAO}
          </p>
        </header>

        <section className="space-y-3 text-sm leading-relaxed text-milsaca-verde-claro">
          <p>
            O <strong>Milsaca</strong> é uma plataforma que conecta produtores
            de café e corretoras na Zona da Mata mineira e regiões cafeeiras
            do Brasil. Esta política descreve como tratamos seus dados
            pessoais, em conformidade com a Lei Geral de Proteção de Dados
            (LGPD — Lei 13.709/2018).
          </p>
        </section>

        <Section title="1. Quais dados coletamos">
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Cadastro:</strong> nome, email, telefone/WhatsApp,
              CPF/CNPJ (quando produtor ou corretora)
            </li>
            <li>
              <strong>Produção (produtor):</strong> nome da fazenda,
              cidade/estado, tipo de café, área aproximada
            </li>
            <li>
              <strong>Negócio (corretora):</strong> CNPJ, endereço, área de
              atendimento, dados de contato
            </li>
            <li>
              <strong>Uso da plataforma:</strong> registros de cliques no
              WhatsApp, propostas, contratos e classificações (com IP
              armazenado como hash, sem o valor original)
            </li>
          </ul>
        </Section>

        <Section title="2. Pra que usamos">
          <ul className="list-inside list-disc space-y-1">
            <li>Permitir a comunicação entre produtor e corretora</li>
            <li>Gerenciar contratos e entregas de café</li>
            <li>Registrar laudos de classificação COB (IN 8/2003 do MAPA)</li>
            <li>Operação interna e suporte</li>
            <li>
              Métricas agregadas (sem identificação individual) pra melhorar a
              plataforma
            </li>
          </ul>
        </Section>

        <Section title="3. Quem vê o quê">
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Corretoras</strong> vêem dados de produtores com quem
              têm relação direta (lead, contrato, ou favoritação iniciada
              pelo produtor)
            </li>
            <li>
              <strong>Produtores</strong> vêem dados públicos da corretora
              (nome, cidade, telefone, regiões de atendimento). CNPJ,
              endereço completo e dados internos da corretora NÃO são
              expostos.
            </li>
            <li>
              <strong>Operadores Milsaca</strong> (suporte) acessam dados pra
              resolver problemas reportados e prevenir fraude. Todo acesso
              fica auditado.
            </li>
          </ul>
        </Section>

        <Section title="4. Compartilhamento com terceiros">
          <p>
            Não vendemos dados. Compartilhamos apenas com prestadores
            necessários pra operação:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Supabase</strong> (infraestrutura de banco e auth)
            </li>
            <li>
              <strong>Vercel</strong> (hospedagem da aplicação)
            </li>
            <li>
              <strong>WhatsApp/Meta</strong> (links de redirect; conversas
              acontecem fora da nossa plataforma)
            </li>
          </ul>
        </Section>

        <Section title="5. Seus direitos">
          <p>Como titular de dados pessoais, você pode:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Acessar todos os dados que temos sobre você</li>
            <li>Corrigir dados desatualizados (direto no Perfil)</li>
            <li>
              Solicitar exclusão (envia um pedido em{" "}
              <a
                href="mailto:contato@milsaca.app"
                className="font-medium text-milsaca-verde underline-offset-2 hover:underline"
              >
                contato@milsaca.app
              </a>
              ). Marcamos sua conta como excluída em até 7 dias; seus
              dados pessoais são removidos do acesso e retidos apenas no
              mínimo exigido por obrigação legal (notas fiscais, contratos
              firmados).
            </li>
            <li>Retirar consentimento de marketing (futuro)</li>
            <li>Saber pra quem seus dados foram compartilhados</li>
          </ul>
        </Section>

        <Section title="6. Segurança">
          <ul className="list-inside list-disc space-y-1">
            <li>HTTPS em toda comunicação</li>
            <li>
              Banco com Row-Level Security (cada um vê só os próprios dados)
            </li>
            <li>Senhas com hash bcrypt (Supabase Auth)</li>
            <li>Audit log de todas as ações administrativas</li>
            <li>
              IPs nunca armazenados em cru — só hash com salt fixo do
              ambiente
            </li>
          </ul>
        </Section>

        <Section title="7. Retenção">
          <p>
            Mantemos dados enquanto sua conta estiver ativa. Após exclusão:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              Dados pessoais: removidos do acesso em até 30 dias e retidos
              apenas no mínimo exigido por obrigação legal
            </li>
            <li>
              Histórico comercial (contratos, laudos COB): preservado por 5
              anos para fins fiscais e regulatórios
            </li>
            <li>Logs operacionais: 90 dias</li>
          </ul>
        </Section>

        <Section title="8. Cookies e tracking">
          <p>
            Usamos apenas cookies essenciais pra sessão (autenticação). Sem
            tracking de terceiros nesta versão. Quando integrarmos analytics
            de produto (PostHog ou similar), você terá opção de optar por
            não participar.
          </p>
        </Section>

        <Section title="9. Contato do Encarregado (DPO)">
          <p>
            Dúvidas, solicitações ou denúncias relacionadas a dados pessoais:
            <br />
            <a
              href="mailto:contato@milsaca.app"
              className="font-medium text-milsaca-verde underline-offset-2 hover:underline"
            >
              contato@milsaca.app
            </a>
          </p>
        </Section>

        <Section title="10. Mudanças nesta política">
          <p>
            Atualizações relevantes são notificadas no painel e por email
            quando aplicável. A versão atual é{" "}
            <strong>{POLITICA_VERSAO}</strong>; histórico fica preservado
            em <code>lgpd_consents.version</code>.
          </p>
        </Section>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-milsaca-verde">{title}</h2>
      <div className="text-sm leading-relaxed text-milsaca-verde-claro">
        {children}
      </div>
    </section>
  );
}

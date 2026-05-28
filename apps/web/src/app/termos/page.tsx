import Link from "next/link";

export const metadata = {
  title: "Termos de Uso — Milsaca",
  description:
    "Condições de uso da plataforma Milsaca de corretagem de café: papéis, responsabilidades, cotações, planos e limites.",
};

export const TERMOS_VERSAO = "2026-05-28";

export default function TermosPage() {
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
            Termos de Uso
          </h1>
          <p className="mt-1 text-xs text-milsaca-verde-claro">
            Versão {TERMOS_VERSAO}
          </p>
        </header>

        <section className="space-y-3 text-sm leading-relaxed text-milsaca-verde-claro">
          <p>
            Estes Termos de Uso regem o acesso e a utilização da plataforma{" "}
            <strong>Milsaca</strong>, que conecta produtores de café,
            corretoras e o mercado na Zona da Mata mineira e demais regiões
            cafeeiras do Brasil. Ao criar uma conta ou usar a plataforma, você
            concorda com estas condições. Se não concordar, não utilize o
            serviço.
          </p>
        </section>

        <Section title="1. O que é o Milsaca">
          <p>
            O Milsaca é uma ferramenta de gestão e intermediação que organiza a
            relação comercial entre produtor e corretora: cadastro de lotes,
            registro de laudos de classificação, propostas, contratos,
            entregas, comissões e acompanhamento de cotações.
          </p>
          <p className="mt-2">
            O Milsaca <strong>não é parte</strong> das compras e vendas de café
            realizadas entre os usuários. Não compramos, não vendemos e não
            armazenamos café. As negociações, preços, pagamentos e a entrega
            física são de responsabilidade exclusiva das partes envolvidas.
          </p>
        </Section>

        <Section title="2. Cadastro e conta">
          <ul className="list-inside list-disc space-y-1">
            <li>
              Você deve ter capacidade civil e fornecer informações
              verdadeiras, completas e atualizadas.
            </li>
            <li>
              Você é responsável por manter a confidencialidade da sua senha e
              por toda atividade realizada na sua conta.
            </li>
            <li>
              Cadastros de corretora passam por aprovação de um administrador
              Milsaca antes de operar.
            </li>
            <li>
              Comunique imediatamente qualquer uso não autorizado da conta pelo
              email de contato abaixo.
            </li>
          </ul>
        </Section>

        <Section title="3. Papéis e permissões">
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Produtor:</strong> cadastra sua produção, recebe e
              responde propostas, acompanha contratos, entregas e cotações.
            </li>
            <li>
              <strong>Corretora:</strong> cadastra produtores e compradores,
              registra lotes e laudos, cria propostas, contratos e entregas, e
              acompanha sua operação. Acessa apenas dados de produtores com quem
              tem relação direta.
            </li>
            <li>
              <strong>Administrador Milsaca:</strong> aprova corretoras, modera
              conteúdo, gerencia planos e dá suporte. Todo acesso é auditado.
            </li>
          </ul>
        </Section>

        <Section title="4. Classificação e laudos (COB)">
          <p>
            Os laudos de classificação registrados na plataforma seguem como
            referência a IN 8/2003 do MAPA (COB). O laudo no Milsaca é um
            registro de apoio à negociação, preenchido sob responsabilidade da
            corretora, e <strong>não substitui</strong> classificação oficial,
            perícia ou laudo de terceiro independente exigido em alguma
            operação. O Milsaca não se responsabiliza pela exatidão das
            informações inseridas pelos usuários.
          </p>
        </Section>

        <Section title="5. Cotações e indicadores">
          <p>
            As cotações exibidas (CEPEA/ESALQ, ICE Futures e PTAX do Banco
            Central, entre outras) vêm de fontes públicas de terceiros, podem
            ter atraso e servem apenas como informação de mercado. Não
            constituem recomendação, oferta ou garantia de preço. Decisões de
            compra e venda são de exclusiva responsabilidade do usuário.
          </p>
        </Section>

        <Section title="6. Documentos fiscais e contratos">
          <p>
            O espelho de contrato gerado pela plataforma é um documento de
            apoio comercial, no formato familiar à região,{" "}
            <strong>sem valor fiscal</strong>. O Milsaca não emite nota fiscal:
            a NF-e (DANFE) é emitida pela empresa que recebe o café, conforme a
            legislação aplicável. A validade jurídica e fiscal das operações
            depende dos documentos oficiais firmados entre as partes.
          </p>
        </Section>

        <Section title="7. Planos e pagamento">
          <ul className="list-inside list-disc space-y-1">
            <li>
              O acesso de produtor é gratuito. Recursos da corretora podem
              depender de um plano contratado.
            </li>
            <li>
              Valores, ciclo de cobrança e condições do plano são apresentados
              no momento da contratação.
            </li>
            <li>
              O cancelamento interrompe renovações futuras; o acesso permanece
              até o fim do período já pago. Não há reembolso de período em
              curso, salvo determinação legal.
            </li>
            <li>
              A falta de pagamento pode suspender recursos da corretora até a
              regularização.
            </li>
          </ul>
        </Section>

        <Section title="8. Conduta do usuário">
          <p>Ao usar o Milsaca, você concorda em não:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Fornecer dados falsos ou se passar por outra pessoa/empresa;</li>
            <li>
              Usar a plataforma para fins ilícitos, fraude ou para prejudicar
              terceiros;
            </li>
            <li>
              Tentar burlar controles de acesso, fazer scraping em massa ou
              sobrecarregar o serviço;
            </li>
            <li>
              Coletar dados de outros usuários sem autorização ou usá-los fora
              da finalidade da negociação;
            </li>
            <li>
              Enviar spam, conteúdo ofensivo, difamatório ou que viole direitos
              de terceiros.
            </li>
          </ul>
        </Section>

        <Section title="9. Propriedade intelectual">
          <p>
            A marca, o software, o layout e os conteúdos do Milsaca são
            protegidos e pertencem ao Milsaca ou a seus licenciadores. O uso da
            plataforma não transfere nenhum desses direitos. Os dados que você
            cadastra continuam seus; você concede ao Milsaca licença para
            tratá-los na medida necessária para operar o serviço, conforme a{" "}
            <Link
              href="/politica-privacidade"
              className="font-medium text-milsaca-verde underline-offset-2 hover:underline"
            >
              Política de Privacidade
            </Link>
            .
          </p>
        </Section>

        <Section title="10. Limitação de responsabilidade">
          <ul className="list-inside list-disc space-y-1">
            <li>
              A plataforma é oferecida &quot;como está&quot;. Buscamos
              disponibilidade contínua, mas não garantimos operação livre de
              falhas ou interrupções.
            </li>
            <li>
              O Milsaca não responde por prejuízos decorrentes de negociações
              entre usuários, qualidade do café, inadimplência, atraso de
              entrega ou divergência sobre preço.
            </li>
            <li>
              O Milsaca não responde por decisões tomadas com base em cotações,
              laudos ou estimativas exibidos na plataforma.
            </li>
          </ul>
        </Section>

        <Section title="11. Suspensão e encerramento">
          <p>
            Podemos suspender ou encerrar contas que violem estes Termos,
            apresentem risco de fraude ou prejudiquem a plataforma e outros
            usuários. Você pode encerrar sua conta a qualquer momento; o
            tratamento dos seus dados após o encerramento segue a{" "}
            <Link
              href="/politica-privacidade"
              className="font-medium text-milsaca-verde underline-offset-2 hover:underline"
            >
              Política de Privacidade
            </Link>
            .
          </p>
        </Section>

        <Section title="12. Privacidade">
          <p>
            O tratamento de dados pessoais é descrito na nossa{" "}
            <Link
              href="/politica-privacidade"
              className="font-medium text-milsaca-verde underline-offset-2 hover:underline"
            >
              Política de Privacidade
            </Link>
            , parte integrante destes Termos e em conformidade com a LGPD (Lei
            13.709/2018).
          </p>
        </Section>

        <Section title="13. Alterações nos termos">
          <p>
            Podemos atualizar estes Termos. Mudanças relevantes são comunicadas
            no painel e, quando aplicável, por email. O uso continuado após a
            atualização significa concordância com a nova versão. A versão atual
            é <strong>{TERMOS_VERSAO}</strong>.
          </p>
        </Section>

        <Section title="14. Lei aplicável e foro">
          <p>
            Estes Termos são regidos pelas leis do Brasil. Fica eleito o foro da
            comarca de Manhuaçu/MG para dirimir questões decorrentes destes
            Termos, salvo competência legal diversa do consumidor.
          </p>
        </Section>

        <Section title="15. Contato">
          <p>
            Dúvidas sobre estes Termos:
            <br />
            <a
              href="mailto:contato@milsaca.app"
              className="font-medium text-milsaca-verde underline-offset-2 hover:underline"
            >
              contato@milsaca.app
            </a>
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

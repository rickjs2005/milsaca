"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { marcarPago } from "../_actions";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

/**
 * "Marcar pago" é uma ação crítica e irreversível na prática (o produtor
 * passa a ver "pago" no Financeiro dele). Por isso exige:
 *  1. comprovante anexado (foto/PDF do PIX) — gate no client e no server;
 *  2. confirmação explícita do valor líquido e do produtor.
 *
 * A Milsaca NÃO movimenta dinheiro — isto é só o registro de que a corretora
 * já pagou direto ao produtor.
 */
export function MarcarPagoButton({
  id,
  valorLiquido,
  produtorNome,
  full = false,
}: {
  id: string;
  valorLiquido: number;
  produtorNome: string;
  full?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [hasFile, setHasFile] = useState(false);

  return (
    <form action={marcarPago} encType="multipart/form-data">
      <input type="hidden" name="id" value={id} />

      <Button
        type="button"
        variant="primary"
        size="sm"
        className={
          full
            ? "h-9 w-full gap-1.5 text-caption"
            : "h-9 gap-1.5 px-3 text-caption"
        }
        onClick={() => dialogRef.current?.showModal()}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Marcar pago
      </Button>

      <dialog
        ref={dialogRef}
        className="rounded-2xl p-0 shadow-elevated backdrop:bg-neutral-900/60"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="w-[min(440px,92vw)] space-y-4 p-6">
          <h2 className="text-h3 text-milsaca-cafezal">Confirmar pagamento</h2>
          <p className="text-body-sm text-neutral-600">
            Confirmar pagamento de{" "}
            <strong className="text-milsaca-cafezal">
              {BRL.format(valorLiquido)}
            </strong>{" "}
            (líquido) a <strong className="text-milsaca-cafezal">{produtorNome}</strong>?
          </p>
          <p className="rounded-md bg-neutral-50 px-3 py-2 text-caption text-neutral-500">
            A Milsaca não movimenta dinheiro. Você pagou direto ao produtor —
            aqui é só o registro. Anexe o comprovante (foto ou PDF do PIX).
          </p>

          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-label text-milsaca-cafezal">
              <Paperclip className="h-3.5 w-3.5" />
              Comprovante <span className="text-danger-700">*</span>
            </span>
            <input
              type="file"
              name="comprovante"
              required
              accept="image/*,application/pdf"
              onChange={(e) => setHasFile(!!e.target.files?.length)}
              className="w-full rounded-md border border-neutral-200 bg-white text-body-sm text-neutral-600 file:mr-3 file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-body-sm file:font-medium file:text-milsaca-cafezal hover:file:bg-neutral-200"
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => dialogRef.current?.close()}
            >
              Cancelar
            </Button>
            <SubmitButton
              variant="success"
              disabled={!hasFile}
              pendingLabel="Registrando..."
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar pagamento
            </SubmitButton>
          </div>
        </div>
      </dialog>
    </form>
  );
}

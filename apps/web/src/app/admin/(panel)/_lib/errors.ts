// Re-export pra manter compatibilidade com imports existentes no admin.
// A implementação foi promovida pra src/lib/postgres-error.ts pra ser
// compartilhada com o painel da corretora.
export { friendlyPostgresError } from "@/lib/postgres-error";

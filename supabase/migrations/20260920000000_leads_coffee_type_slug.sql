-- Normaliza leads.coffee_type de label PT ("Arábica"/"Conillón") para o slug
-- canônico ("arabica"/"conillon"), alinhando com o enum coffee_specie usado em
-- lotes/cotacoes/preferências (habilita lookup de label e matching futuro
-- lead↔oferta↔perfil de comprador). Idempotente: linhas já em slug ficam
-- intactas. Aplicada no remoto via MCP apply_migration.
update public.leads
set coffee_type = case
  when lower(coffee_type) like 'ar%bica' then 'arabica'
  when lower(coffee_type) like 'conil%' or lower(coffee_type) = 'robusta' then 'conillon'
  else coffee_type
end
where coffee_type is not null
  and coffee_type not in ('arabica', 'conillon');

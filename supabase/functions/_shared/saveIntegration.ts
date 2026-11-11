// Salva (insert ou update) a linha de `integrations` de um provider single-instance.
//
// Por que não usar upsert({ onConflict: "client_id,provider" }):
// a migration 20260424_whatsapp_multiinstance removeu a constraint
// UNIQUE(client_id, provider) e criou um índice único por expressão
// (client_id, provider, COALESCE(instance_name, '')). O Postgres não aceita
// índice de expressão como alvo de ON CONFLICT, então o upsert falhava e,
// como o erro não era checado, a função respondia "success" sem salvar nada.
//
// Aqui fazemos select → update/insert e devolvemos o erro pra quem chamou.

// deno-lint-ignore no-explicit-any
type AdminClient = any;

export interface IntegrationRow {
  client_id: string;
  provider: string;
  status: string;
  config?: Record<string, unknown>;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
}

export async function saveIntegration(
  admin: AdminClient,
  row: IntegrationRow,
): Promise<{ id: string | null; error: string | null }> {
  const { data: existing, error: selectError } = await admin
    .from("integrations")
    .select("id")
    .eq("client_id", row.client_id)
    .eq("provider", row.provider)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (selectError) return { id: null, error: selectError.message };

  if (existing?.id) {
    const { error } = await admin
      .from("integrations")
      .update(row)
      .eq("id", existing.id);
    return { id: error ? null : existing.id, error: error?.message ?? null };
  }

  const { data: inserted, error } = await admin
    .from("integrations")
    .insert(row)
    .select("id")
    .single();
  return { id: inserted?.id ?? null, error: error?.message ?? null };
}

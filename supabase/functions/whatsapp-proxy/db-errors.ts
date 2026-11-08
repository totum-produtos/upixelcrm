// Mensagem para o usuário quando o insert/update em `integrations` falha.
// 23505 = violação do índice único (client_id, provider, instance_name).
export function integrationSaveError(err: { code?: string } | null | undefined): { status: number; error: string } {
  if (err?.code === "23505") {
    return { status: 409, error: "Esse número já está cadastrado neste CRM. Remova o número antigo antes de adicionar de novo." };
  }
  return { status: 500, error: "Erro ao salvar instância no banco de dados." };
}

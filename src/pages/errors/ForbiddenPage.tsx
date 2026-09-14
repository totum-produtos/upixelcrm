import { SystemStatePage } from "@/components/system/SystemStatePage";

export default function ForbiddenPage() {
  return (
    <SystemStatePage
      image="403-forbidden"
      eyebrow="Erro 403"
      title="Acesso negado"
      description="Seu perfil não tem permissão para abrir esta área. Peça ao administrador para revisar seu papel ou liberar o módulo."
      primaryLabel="Voltar ao dashboard"
      primaryTo="/dashboard"
      secondaryLabel="Meu perfil"
      secondaryTo="/profile"
    />
  );
}

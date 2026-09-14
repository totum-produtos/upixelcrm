import { SystemStatePage } from "@/components/system/SystemStatePage";

export default function InternalServerErrorPage() {
  return (
    <SystemStatePage
      image="500-internal-server-error"
      eyebrow="Erro 500"
      title="Erro interno do servidor"
      description="O sistema encontrou uma falha temporária. Tente novamente agora ou volte para o dashboard enquanto verificamos o serviço."
      primaryLabel="Tentar novamente"
      onPrimaryClick={() => window.location.reload()}
      secondaryLabel="Voltar ao dashboard"
      secondaryTo="/dashboard"
    />
  );
}

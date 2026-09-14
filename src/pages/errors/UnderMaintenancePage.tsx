import { SystemStatePage } from "@/components/system/SystemStatePage";

export default function UnderMaintenancePage() {
  return (
    <SystemStatePage
      image="503-under-maintenance"
      eyebrow="Manutenção"
      title="Sistema em manutenção"
      description="Estamos aplicando melhorias no uPixel. Aguarde alguns minutos e tente acessar novamente."
      primaryLabel="Tentar novamente"
      onPrimaryClick={() => window.location.reload()}
      secondaryLabel="Voltar ao início"
      secondaryTo="/"
    />
  );
}

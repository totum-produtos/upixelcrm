import { SystemStatePage } from "@/components/system/SystemStatePage";

export default function UnauthorizedPage() {
  return (
    <SystemStatePage
      image="401-unauthorized"
      eyebrow="Erro 401"
      title="Sessão necessária"
      description="Entre novamente para continuar usando o uPixel com segurança."
      primaryLabel="Fazer login"
      primaryTo="/login"
      secondaryLabel="Voltar ao início"
      secondaryTo="/"
    />
  );
}

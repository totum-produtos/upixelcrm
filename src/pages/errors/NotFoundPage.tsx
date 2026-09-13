import { SystemStatePage } from "@/components/system/SystemStatePage";

export default function NotFoundPage() {
  return (
    <SystemStatePage
      image="404-not-found"
      eyebrow="Erro 404"
      title="Página não encontrada"
      description="A página que você procura não existe, foi movida ou não está disponível para este workspace."
      primaryLabel="Voltar ao dashboard"
      primaryTo="/dashboard"
      secondaryLabel="Ir para login"
      secondaryTo="/login"
    />
  );
}

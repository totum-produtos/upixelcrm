// Status de sessão do OpenWA -> status de saúde gravado em integrations.health_status.
export function openwaHealth(sessionStatus: string | undefined): { status: string; details: string } {
  if (sessionStatus === "ready") return { status: "healthy", details: "Connected" };
  if (sessionStatus === "disconnected" || sessionStatus === "failed" || sessionStatus === "logged_out") {
    return { status: "disconnected", details: sessionStatus };
  }
  // created / starting / connecting / qr_ready: sessão viva, aguardando QR.
  return { status: "connecting", details: sessionStatus || "Unknown state" };
}

// Card do WhatsApp em "connecting": sem isto ele ficava girando para sempre,
// porque o botão some e ninguém consultava o servidor de novo.

/** Intervalo da consulta de status enquanto o card está em "connecting". */
export const CONNECTING_POLL_MS = 5_000;
/** Depois disso o card libera "Tentar de novo". */
export const CONNECTING_STUCK_MS = 60_000;

/** Status que encerram a espera (o card troca de estado). */
export function isTerminalStatus(status: string | null | undefined): boolean {
  return status === "connected" || status === "disconnected" || status === "configured" || status === "paused";
}

/** Já esperou demais em "connecting"? */
export function isConnectingStuck(since: number | null, now: number, limitMs = CONNECTING_STUCK_MS): boolean {
  return since !== null && now - since >= limitMs;
}

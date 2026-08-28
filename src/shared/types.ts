export type ChannelState =
  | "disconnected"
  | "connecting"
  | "qr_ready"
  | "connected"
  | "error";

export interface ChannelStatus {
  id: string;
  state: ChannelState;
  detail: string;
  since: number;
  qr?: string;
  account?: string;
  meta?: Record<string, unknown>;
}

export type Severity = "info" | "good" | "warn" | "error" | "active";

export interface EventSpec {
  label: string;
  severity: Severity;
  group: "reasoning" | "routing" | "execution" | "io" | "lifecycle" | "problem";
}

export interface LiveEvent {
  id: string;
  ts: number;
  type: string;
  label: string;
  severity: Severity;
  group: string;
  message: string;
  detail?: string;
  taskId?: string;
  durationMs?: number;
}

export interface WhatsAppAccount {
  id: string;
  status: ChannelStatus;
  hasSession: boolean;
  hasKnowledge: boolean;
  agentActive: boolean;
}

export interface WhatsAppListResponse {
  ok: boolean;
  max: number;
  accounts: WhatsAppAccount[];
}

export interface WhatsAppStatusResponse {
  id: string;
  connected: boolean;
  status: ChannelState;
  phone: string | null;
  qr: string | null;
  agentActive: boolean;
  message: string;
}

export interface WhatsAppAgentResponse {
  ok: boolean;
  id: string;
  active: boolean;
}

export interface WhatsAppKnowledgeResponse {
  ok: boolean;
  id: string;
  text: string;
}

export interface WhatsAppConnectResponse {
  ok: boolean;
  status: ChannelStatus;
}

export interface WhatsAppDisconnectResponse {
  ok: boolean;
  status: ChannelStatus;
}

export interface WhatsAppSendRequest {
  to: string;
  text: string;
  id?: string;
}

export interface WhatsAppSendResponse {
  ok: boolean;
  error?: string;
}
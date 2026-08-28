/**
 * Customer State Engine Types (Phase 2)
 */

export type SalesStage =
  | "NEW"
  | "GREETED"
  | "INTENT_IDENTIFIED"
  | "SERVICE_IDENTIFIED"
  | "QUALIFIED"
  | "PACKAGE_RECOMMENDED"
  | "PACKAGE_SELECTED"
  | "ORDER_INITIATED"
  | "DOCUMENTS_PENDING"
  | "DOCUMENTS_PARTIAL"
  | "DOCUMENTS_COMPLETE"
  | "PAYMENT_PENDING"
  | "COMPLETED"
  | "FOLLOW_UP";

export interface CustomerState {
  customer_id: string;
  phone_jid: string;
  stage: SalesStage;
  service?: string;
  selected_package?: string;
  company_name?: string;
  sic_code?: string;
  order_number?: string;
  missing_requirements: string[];
  collected_requirements: string[];
  last_interaction_ts: number;
  created_at: number;
  updated_at: number;
}

export interface StateTransitionEvent {
  customer_id: string;
  from_stage: SalesStage;
  to_stage: SalesStage;
  trigger: string;
  timestamp: number;
}

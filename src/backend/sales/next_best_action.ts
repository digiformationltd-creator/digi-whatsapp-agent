import { CustomerState } from "../state/types";

export class NextBestActionEngine {
  static computeNextAction(state: CustomerState): { action: string; prompt_directive: string } {
    switch (state.stage) {
      case "NEW":
      case "GREETED":
        return {
          action: "DISCOVER_NEEDS",
          prompt_directive: "Ask warm discovery questions to identify whether they need UK LTD formation, US LLC, or banking."
        };

      case "INTENT_IDENTIFIED":
      case "QUALIFIED":
        return {
          action: "RECOMMEND_PACKAGE",
          prompt_directive: "Present our formation packages clearly, highlighting Silver (£170) as the most popular all-inclusive choice."
        };

      case "PACKAGE_SELECTED":
        return {
          action: "REQUEST_ORDER_OR_DOCS",
          prompt_directive: "Customer has selected a package. Prompt them to place an order or share preferred company name and business category to initiate the filing."
        };

      case "ORDER_INITIATED":
      case "DOCUMENTS_PENDING":
        return {
          action: "COLLECT_KYC_CHECKLIST",
          prompt_directive: "Provide the clean KYC checklist (ID, proof of address, selfie verification link) and politely ask them to share the documents."
        };

      case "DOCUMENTS_PARTIAL":
        return {
          action: "REMIND_MISSING_DOCUMENTS",
          prompt_directive: `Remind customer of remaining missing documents: ${state.missing_requirements.join(", ")}.`
        };

      case "DOCUMENTS_COMPLETE":
      case "PAYMENT_PENDING":
        return {
          action: "REQUEST_PAYMENT_CONFIRMATION",
          prompt_directive: "All documents verified. Ask for payment screenshot so registration can be submitted to Companies House immediately."
        };

      case "COMPLETED":
        return {
          action: "OFFER_ADDITIONAL_SERVICES",
          prompt_directive: "Congratulate them and offer banking setup or address compliance add-ons."
        };

      default:
        return {
          action: "ASSIST_CUSTOMER",
          prompt_directive: "Assist customer helpfully according to company guidelines."
        };
    }
  }
}

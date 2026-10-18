import { CustomerState } from "../state/types";

export class NextBestActionEngine {
  static computeNextAction(state: CustomerState): { action: string; prompt_directive: string } {
    switch (state.stage) {
      case "NEW":
      case "GREETED":
        return {
          action: "DISCOVER_NEEDS",
          prompt_directive: "Welcome the customer politely and briefly ask how you can assist them with our software or services according to the Knowledge Base."
        };

      case "INTENT_IDENTIFIED":
      case "QUALIFIED":
        return {
          action: "RECOMMEND_PACKAGE",
          prompt_directive: "Present our packages or products clearly with exact prices from the Knowledge Base, highlighting the best value option."
        };

      case "PACKAGE_SELECTED":
        return {
          action: "REQUEST_ORDER_OR_DOCS",
          prompt_directive: "The customer is interested in a product or licence. Clearly guide them on how to buy, payment methods, or required details strictly as per the Knowledge Base."
        };

      case "ORDER_INITIATED":
      case "DOCUMENTS_PENDING":
        return {
          action: "COLLECT_ORDER_DETAILS",
          prompt_directive: "Provide the required checklist for order completion (e.g. name, email, payment confirmation) and politely ask them to share it."
        };

      case "DOCUMENTS_PARTIAL":
        return {
          action: "REMIND_MISSING_DETAILS",
          prompt_directive: `Remind customer of the remaining details required to complete their setup: ${state.missing_requirements.join(", ")}.`
        };

      case "DOCUMENTS_COMPLETE":
      case "PAYMENT_PENDING":
        return {
          action: "REQUEST_PAYMENT_CONFIRMATION",
          prompt_directive: "Ask for payment transaction screenshot or confirmation so their licence key and download link can be dispatched immediately."
        };

      case "COMPLETED":
        return {
          action: "OFFER_SUPPORT_OR_ADDONS",
          prompt_directive: "Thank them, confirm their order is active, and ask if they need any setup assistance or additional licences."
        };

      default:
        return {
          action: "ASSIST_CUSTOMER",
          prompt_directive: "Assist customer helpfully according to company knowledge base guidelines."
        };
    }
  }
}

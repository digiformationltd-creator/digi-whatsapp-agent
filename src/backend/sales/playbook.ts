import { getActiveCompanyProfile } from "../knowledge/domains";

export interface ObjectionMatch {
  matched: boolean;
  objection_type?: string;
  response_guidance?: string;
}

export class SalesPlaybook {
  static evaluateObjection(text: string): ObjectionMatch {
    const t = (text || "").toLowerCase();
    const profile = getActiveCompanyProfile();

    // 1. Price Pushback / Discount Request
    if (/\b(discount|kam karo|zyada hai|expensive|mehnga|kuch kam|koi riayat|concession)\b/i.test(t)) {
      return {
        matched: true,
        objection_type: "PRICE_PUSHBACK",
        response_guidance: "Hold firm on the listed official prices. Politely explain the comprehensive value and inclusions provided in our packages. If customer has budget limits, recommend starting with our entry-level package."
      };
    }

    // 2. Hesitation / 'Let me think about it'
    if (/\b(soch kar|think about it|baad me|later|check karke|phir bataunga|decide later)\b/i.test(t)) {
      return {
        matched: true,
        objection_type: "HESITATION",
        response_guidance: "Politely acknowledge without putting high pressure. Reassure them that our team is available anytime, and offer to share the requirements checklist or answer any specific doubt they might have."
      };
    }

    // 3. Trust & Legitimate Company Verification
    if (/\b(scam|real hai|real company|legitimate|legit|genuine|fake|trust|proof|registered ho|guarantee|safe)\b/i.test(t)) {
      const highlights = profile.highlights.length > 0 ? profile.highlights.join(", ") : "Official business operations";
      return {
        matched: true,
        objection_type: "TRUST_VERIFICATION",
        response_guidance: `Reassure the customer with verified facts: ${profile.name} is an officially verified business${profile.company_number ? ` (Company #${profile.company_number})` : ""}${profile.founder ? ` led by ${profile.founder}` : ""}${profile.address ? ` based at ${profile.address}` : ""}. Trust highlights: ${highlights}.`
      };
    }

    return { matched: false };
  }
}

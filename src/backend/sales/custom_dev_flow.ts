import { getActiveCompanyProfile } from "../knowledge/domains";

export class CustomDevDiscovery {
  static isCustomDevQuery(text: string): boolean {
    const t = (text || "").toLowerCase();
    return /\b(website|web app|custom software|mobile app|application|landing page|ecommerce website|shopify store|full stack|custom project|bespoke|custom development)\b/i.test(t);
  }

  static getDiscoveryPromptDirective(): string {
    const profile = getActiveCompanyProfile();
    const contactText = profile.phone || profile.email ? ` at ${profile.phone || profile.email}` : "";
    const teamLead = profile.founder ? ` led by ${profile.founder}` : "";
    return (
      "=== CUSTOM INQUIRY / BESPOKE DISCOVERY GUIDELINES ===\n" +
      "The customer is asking about custom work or bespoke project development. DO NOT quote a fixed price upfront.\n" +
      "1. Ask concise discovery questions: (a) Business type & industry, (b) What features / scope they need, (c) Target timeline.\n" +
      `2. Explain that our senior team${teamLead} prepares tailored quotes based on exact specifications.\n` +
      `3. Offer to connect directly with the team${contactText} for a consultation.`
    );
  }
}

import { getActiveCompanyProfile } from "../knowledge/domains";

export class HumanHandoff {
  static isHandoffRequested(text: string): boolean {
    const t = (text || "").toLowerCase();
    const profile = getActiveCompanyProfile();
    const founderToken = (profile.founder || "").toLowerCase().split(/\s+/)[0] || "owner";
    return /\b(call me|talk to human|agent se baat|real person|human agent|call par baat|direct baat|support rep|human help)\b/i.test(t) ||
           (founderToken.length > 2 && t.includes(founderToken));
  }

  static getHandoffMessage(): string {
    const profile = getActiveCompanyProfile();
    const contactPerson = profile.founder ? ` / ${profile.founder}` : "";
    return (
      `Ji bilkul! Aap hamari senior team${contactPerson} se direct rabta kar sakte hain:\n\n` +
      (profile.phone ? `📞 WhatsApp / Call: ${profile.phone}\n` : "") +
      (profile.email ? `📧 Email: ${profile.email}\n` : "") +
      (profile.whatsapp_link ? `🔗 Direct Link: ${profile.whatsapp_link}\n\n` : "\n") +
      `Hum aapko mukammal guidance aur direct assistance provide karenge.`
    );
  }
}

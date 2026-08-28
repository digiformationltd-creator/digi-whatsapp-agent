import { MarkdownKnowledgeLoader } from "./markdown_loader";

/**
 * Typed Dynamic Knowledge Domains
 * Automatically resolves from active knowledge markdown files at runtime.
 */

export function getActiveCompanyProfile() {
  const dynamic = MarkdownKnowledgeLoader.getBusinessProfile();
  return {
    name: dynamic.name || "Digiformation Ltd",
    founder: dynamic.founder || "Muhammad Haroon",
    company_number: dynamic.company_number || "16994903",
    address: dynamic.address || "Office 1006, 85 Dunstall Hill, Wolverhampton, United Kingdom, WV6 0SR",
    email: dynamic.email || "info@digiformation.co.uk",
    phone: dynamic.phone || "+92 316 446 7464",
    whatsapp_link: dynamic.whatsapp_link || "https://wa.me/923164467464",
    hours: dynamic.hours || "Mon–Sat 10:00 AM – 11:00 PM (UTC+5) · Sunday closed",
    highlights: dynamic.highlights.length > 0 ? dynamic.highlights : [
      "8+ years experience",
      "300+ clients worldwide",
      "71+ UK companies registered under the founder",
      "98% client retention",
      "24-hour ID verification turnaround"
    ]
  };
}

export const COMPANY_PROFILE = {
  get name() { return getActiveCompanyProfile().name; },
  get founder() { return getActiveCompanyProfile().founder; },
  get company_number() { return getActiveCompanyProfile().company_number; },
  get address() { return getActiveCompanyProfile().address; },
  get email() { return getActiveCompanyProfile().email; },
  get phone() { return getActiveCompanyProfile().phone; },
  get whatsapp_link() { return getActiveCompanyProfile().whatsapp_link; },
  get hours() { return getActiveCompanyProfile().hours; },
  get highlights() { return getActiveCompanyProfile().highlights; }
};

export const UK_PACKAGES = [
  {
    name: "Starter",
    price: "£140",
    timeline: "3–5 business days",
    includes: [
      "UK LTD company registration",
      "Companies House official fee included",
      "Digital certificate of incorporation",
      "Memorandum & articles of association",
      "Share certificate",
      "ID verification"
    ]
  },
  {
    name: "Silver",
    tag: "Most Popular",
    price: "£170",
    timeline: "3–5 business days",
    includes: [
      "Everything in Starter package",
      "Digital AND printed certificate of incorporation",
      "Registered office address (1 year mail handling included)",
      "Companies House authentication code",
      "HMRC UTR number reference"
    ]
  },
  {
    name: "Gold",
    price: "£180",
    timeline: "3–5 business days",
    includes: [
      "Everything in Silver package",
      "Director service address (protects home address privacy)"
    ]
  },
  {
    name: "Platinum",
    price: "£200",
    timeline: "3–5 business days",
    includes: [
      "Everything in Gold package",
      "Premium London registered office address"
    ]
  }
];

export const USA_LLC_PACKAGES = [
  {
    name: "Starter",
    price: "£150",
    includes: "US LLC registration, shared business address, EIN, digital documents, 24/7 support"
  },
  {
    name: "Silver",
    tag: "Most Popular",
    price: "£200",
    includes: "Starter + unique business address (portal access & mail support)"
  },
  {
    name: "Gold",
    price: "£400",
    includes: "Silver + ITIN number included"
  }
];

export const BANKING_SOLUTIONS = [
  { tier: "£20 Setup", providers: ["PayPal", "Payoneer", "WorldFirst", "Stripe"] },
  { tier: "£50 Setup", providers: ["Tide", "Sunrate", "Zyla", "Airwallex", "Mollie", "ZionPe", "Wallester", "PingPong", "Grey", "TapTap Send", "Nsave Business"] },
  { tier: "£70 Setup", providers: ["Wise Business"] }
];

export const COMPLIANCE_SERVICES = [
  { service: "Company Name Change (NM01)", price: "£30" },
  { service: "Company Address Change (AD01)", price: "£10" },
  { service: "Confirmation Statement (incl. £50 CH fee)", price: "£65" },
  { service: "Annual Accounts Filing (micro/small/dormant)", price: "£100+" },
  { service: "Director / Shareholder Appoint or Remove", price: "£10" },
  { service: "LTD ID Verification", price: "£20" }
];

export const KYC_REQUIREMENTS = {
  verification_link: "https://verify.didit.me/u/dzhdYtifRt-jeb3kZsSptg",
  checklist: [
    "Company name (preferred business name)",
    "Business nature / activity (SIC code category)",
    "Home / street address (where mail can be received)",
    "Email address (for official Companies House codes)",
    "ID Card / Passport / Driving Licence (clear photo or PDF)",
    "Proof of address (recent utility bill or bank statement within 3 months)",
    "Live selfie verification via Didit link"
  ]
};

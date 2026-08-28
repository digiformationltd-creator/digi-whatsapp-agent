/**
 * Universal Business Configuration Interface (Phase 10)
 * Allows any future business to run on this exact Core Sales OS without modifying engine code.
 */

export interface PackageDefinition {
  name: string;
  price: string;
  tag?: string;
  timeline?: string;
  includes: string[] | string;
}

export interface BusinessProfile {
  name: string;
  founder: string;
  company_number?: string;
  address: string;
  email: string;
  phone: string;
  whatsapp_link: string;
  hours: string;
  highlights: string[];
}

export interface BusinessConfiguration {
  id: string;
  profile: BusinessProfile;
  packages: PackageDefinition[];
  secondary_packages?: PackageDefinition[];
  add_on_services?: Array<{ service: string; price: string }>;
  banking_services?: Array<{ tier: string; providers: string[] }>;
  kyc_checklist?: string[];
  verification_link?: string;
  default_recommended_package: string;
}

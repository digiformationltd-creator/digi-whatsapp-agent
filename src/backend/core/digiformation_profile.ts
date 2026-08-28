import { BusinessConfiguration } from "./business_config";
import {
  COMPANY_PROFILE,
  UK_PACKAGES,
  USA_LLC_PACKAGES,
  BANKING_SOLUTIONS,
  COMPLIANCE_SERVICES,
  KYC_REQUIREMENTS,
} from "../knowledge/domains";

export const DigiFormationConfig: BusinessConfiguration = {
  id: "digiformation_uk",
  profile: COMPANY_PROFILE,
  packages: UK_PACKAGES,
  secondary_packages: USA_LLC_PACKAGES,
  add_on_services: COMPLIANCE_SERVICES,
  banking_services: BANKING_SOLUTIONS,
  kyc_checklist: KYC_REQUIREMENTS.checklist,
  verification_link: KYC_REQUIREMENTS.verification_link,
  default_recommended_package: "Silver (£170)",
};

import { VoiceEligibilityResult } from "./types";

/**
 * Detects whether the text is English, Arabic, or Urdu/Roman Urdu
 */
export function detectLanguage(text: string): "en" | "ar" | "ur" | "roman_urdu" | "other" {
  if (!text) return "other";
  const clean = text.trim();

  // Arabic script detection
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(clean)) {
    // Check if specifically Urdu nastaliq chars (ٹ، ڈ، ڑ، ں، ے، ہ، ھ)
    if (/[ٹڈڑںےہھچپگ]/.test(clean)) {
      return "ur";
    }
    return "ar";
  }

  // Roman Urdu keyword detection
  const romanUrduPattern = /\b(aap|tum|ham|hum|kya|kyun|kaise|mera|meri|mere|hoga|hogi|hoge|hai|hain|han|nhi|nahi|kar|karo|karna|chahiye|wala|wali|wale|batao|bataen|shukriya|khairiyat|boht|zyada|kitna|kitne|bhej|dein)\b/i;
  if (romanUrduPattern.test(clean)) {
    return "roman_urdu";
  }

  // English detection
  if (/^[a-zA-Z0-9\s.,!?'"£$%&()\-:;–—/]+$/.test(clean) || /\b(the|is|are|you|we|our|package|packages|company|formation|registration|details|hello|welcome|thanks|price|cost)\b/i.test(clean)) {
    return "en";
  }

  return "other";
}

/**
 * Checks whether text contains links or multiple copyable price lists
 */
export function containsCopyableContent(text: string): boolean {
  if (!text) return false;

  // 1. URL / Link detection (http, https, www, verify.didit.me)
  if (/https?:\/\/|www\.|\.me\/|\.com\/|\.co\.uk\//i.test(text)) {
    return true;
  }

  // 2. Email detection
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) {
    return true;
  }

  // 3. Multi-line price lists (more than 2 bullet points with prices)
  const priceMatches = text.match(/£\d+|\$\d+|Rs\.?\s*\d+/g);
  if (priceMatches && priceMatches.length >= 3) {
    return true;
  }

  return false;
}

/**
 * Deterministic Voice Reply Eligibility Rule (§41)
 */
export function evaluateVoiceEligibility(
  isVoiceInbound: boolean,
  replyText: string
): VoiceEligibilityResult {
  if (!isVoiceInbound) {
    return {
      eligible: false,
      reason: "Inbound message was not a voice note (text-only conversation)",
      language: "en",
      isTextOnlyRequired: true,
    };
  }

  const lang = detectLanguage(replyText);

  // Groq TTS confirmed supported languages: English ('en') and Arabic ('ar')
  // Urdu and Roman Urdu are NOT confirmed supported -> fallback to text!
  if (lang !== "en" && lang !== "ar") {
    return {
      eligible: false,
      reason: `Reply language '${lang}' is not confirmed supported by Groq TTS (Urdu/Roman Urdu -> text fallback)`,
      language: lang,
      isTextOnlyRequired: true,
    };
  }

  // Check if reply contains copyable links or multi-price list
  if (containsCopyableContent(replyText)) {
    return {
      eligible: false,
      reason: "Reply contains links, email, or multiple package prices that customer must copy/read as text",
      language: lang,
      isTextOnlyRequired: true,
    };
  }

  return {
    eligible: true,
    reason: `Inbound voice message + supported language (${lang}) + clean concise text -> eligible for voice reply`,
    language: lang,
    isTextOnlyRequired: false,
  };
}

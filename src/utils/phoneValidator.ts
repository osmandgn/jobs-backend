// UK phone number validation and formatting utilities

// UK mobile number regex patterns
const UK_MOBILE_WITH_COUNTRY = /^\+447\d{9}$/;
const UK_MOBILE_WITHOUT_COUNTRY = /^07\d{9}$/;

export function isValidUKPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '');
  return UK_MOBILE_WITH_COUNTRY.test(cleaned) || UK_MOBILE_WITHOUT_COUNTRY.test(cleaned);
}

export function formatUKPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');

  // If it starts with 0, replace with +44
  if (cleaned.startsWith('0')) {
    return '+44' + cleaned.slice(1);
  }

  // If it starts with 44 (without +), add +
  if (cleaned.startsWith('44') && !cleaned.startsWith('+')) {
    return '+' + cleaned;
  }

  return cleaned;
}

export function normalizeUKPhone(phone: string): string | null {
  const cleaned = phone.replace(/\s/g, '');

  if (!isValidUKPhone(cleaned)) {
    return null;
  }

  return formatUKPhone(cleaned);
}

export function maskPhone(phone: string): string {
  if (!phone) return '';

  // Show first 4 and last 2 digits
  // +447123456789 -> +4471******89
  if (phone.length >= 10) {
    const visibleStart = phone.slice(0, 5);
    const visibleEnd = phone.slice(-2);
    const maskedLength = phone.length - 7;
    return `${visibleStart}${'*'.repeat(maskedLength)}${visibleEnd}`;
  }

  return phone;
}

export default {
  isValidUKPhone,
  formatUKPhone,
  normalizeUKPhone,
  maskPhone,
};

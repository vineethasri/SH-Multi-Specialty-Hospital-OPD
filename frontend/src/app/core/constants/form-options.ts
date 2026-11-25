export interface CountryCodeOption {
  code: string;
  country: string;
  iso: string;
}

export const BLOOD_GROUPS: readonly string[] = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
];

export const COUNTRY_CODES: readonly CountryCodeOption[] = [
  { code: '+91', country: 'India', iso: 'IN' },
  { code: '+1', country: 'United States / Canada', iso: 'US/CA' },
  { code: '+44', country: 'United Kingdom', iso: 'GB' },
  { code: '+971', country: 'United Arab Emirates', iso: 'AE' },
  { code: '+966', country: 'Saudi Arabia', iso: 'SA' },
  { code: '+974', country: 'Qatar', iso: 'QA' },
  { code: '+968', country: 'Oman', iso: 'OM' },
  { code: '+965', country: 'Kuwait', iso: 'KW' },
  { code: '+973', country: 'Bahrain', iso: 'BH' },
  { code: '+65', country: 'Singapore', iso: 'SG' },
  { code: '+60', country: 'Malaysia', iso: 'MY' },
  { code: '+61', country: 'Australia', iso: 'AU' },
  { code: '+64', country: 'New Zealand', iso: 'NZ' },
  { code: '+94', country: 'Sri Lanka', iso: 'LK' },
  { code: '+977', country: 'Nepal', iso: 'NP' },
  { code: '+880', country: 'Bangladesh', iso: 'BD' },
  { code: '+92', country: 'Pakistan', iso: 'PK' },
  { code: '+975', country: 'Bhutan', iso: 'BT' },
  { code: '+960', country: 'Maldives', iso: 'MV' },
  { code: '+49', country: 'Germany', iso: 'DE' },
  { code: '+33', country: 'France', iso: 'FR' },
  { code: '+39', country: 'Italy', iso: 'IT' },
  { code: '+34', country: 'Spain', iso: 'ES' },
  { code: '+31', country: 'Netherlands', iso: 'NL' },
  { code: '+41', country: 'Switzerland', iso: 'CH' },
  { code: '+353', country: 'Ireland', iso: 'IE' },
  { code: '+46', country: 'Sweden', iso: 'SE' },
  { code: '+47', country: 'Norway', iso: 'NO' },
  { code: '+45', country: 'Denmark', iso: 'DK' },
  { code: '+81', country: 'Japan', iso: 'JP' },
  { code: '+82', country: 'South Korea', iso: 'KR' },
  { code: '+86', country: 'China', iso: 'CN' },
  { code: '+852', country: 'Hong Kong', iso: 'HK' },
  { code: '+66', country: 'Thailand', iso: 'TH' },
  { code: '+62', country: 'Indonesia', iso: 'ID' },
  { code: '+63', country: 'Philippines', iso: 'PH' },
  { code: '+84', country: 'Vietnam', iso: 'VN' },
  { code: '+27', country: 'South Africa', iso: 'ZA' },
  { code: '+234', country: 'Nigeria', iso: 'NG' },
  { code: '+254', country: 'Kenya', iso: 'KE' },
  { code: '+20', country: 'Egypt', iso: 'EG' },
  { code: '+55', country: 'Brazil', iso: 'BR' },
  { code: '+52', country: 'Mexico', iso: 'MX' },
  { code: '+7', country: 'Russia / Kazakhstan', iso: 'RU' },
  { code: '+90', country: 'Turkey', iso: 'TR' },
  { code: '+972', country: 'Israel', iso: 'IL' }
];

export function formatPhoneWithCode(countryCode: string, localNumber: string): string {
  const cleanLocal = localNumber.trim().replace(/^\+\d{1,4}\s*/, '');
  return `${countryCode.trim()} ${cleanLocal}`.trim();
}

export function splitPhoneNumber(fullPhone?: string | null): { countryCode: string; localNumber: string } {
  if (!fullPhone) return { countryCode: '+91', localNumber: '' };
  const trimmed = fullPhone.trim();
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  const match = sorted.find((c) => trimmed.startsWith(c.code));
  if (match) {
    return {
      countryCode: match.code,
      localNumber: trimmed.slice(match.code.length).trim()
    };
  }
  return { countryCode: '+91', localNumber: trimmed };
}

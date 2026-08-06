export type AIResponseLanguage = 'bn' | 'en' | 'bilingual';

const BANGLA_SCRIPT = /[\u0980-\u09FF]/;
const BILINGUAL_REQUEST = /\b(?:bilingual|both languages?|bangla and english|english and bangla)\b|বাংলা\s*(?:ও|এবং|আর)\s*ইংরেজি|ইংরেজি\s*(?:ও|এবং|আর)\s*বাংলা/i;
const BANGLISH_STRONG_WORDS = new Set([
  'ami', 'amake', 'amar', 'apni', 'apnar', 'koro', 'korun', 'kore', 'korbo', 'chai', 'chao',
  'dao', 'den', 'dekhাও', 'dekhao', 'modhe', 'moddhe', 'khabar', 'khawar', 'khai', 'khabo',
  'bhalo', 'valo', 'jhal', 'lagbe', 'ache', 'ase', 'nai', 'naki', 'jonno', 'kemon', 'kothay',
  'ajke', 'ekta', 'kichu', 'taka', 'beshi', 'kom', 'sajest'
]);
const BANGLISH_SUPPORT_WORDS = new Set(['er', 'e', 'ki', 'ta', 'theke', 'diye', 'sathe', 'ar', 'na']);

export const detectAIResponseLanguage = (message: string): AIResponseLanguage => {
  const normalized = message.toLowerCase().trim();
  if (BILINGUAL_REQUEST.test(normalized)) return 'bilingual';
  if (BANGLA_SCRIPT.test(normalized)) return 'bn';

  const words = normalized.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const strongMatches = words.filter(word => BANGLISH_STRONG_WORDS.has(word)).length;
  const supportMatches = words.filter(word => BANGLISH_SUPPORT_WORDS.has(word)).length;
  return strongMatches >= 1 || supportMatches >= 2 ? 'bn' : 'en';
};

export const getLanguageInstruction = (language: AIResponseLanguage) => {
  if (language === 'bn') {
    return 'Reply naturally and entirely in Bangla script. The user may have written Banglish, but do not reply in Banglish. Keep database food and restaurant proper names unchanged.';
  }
  if (language === 'bilingual') {
    return 'The user explicitly requested a bilingual response. Reply in Bangla script and English, with clearly separated sections.';
  }
  return 'Reply naturally and entirely in English. Do not mix Bangla or Banglish into the response.';
};

export const localizeDigits = (value: number, language: AIResponseLanguage) =>
  language === 'bn' || language === 'bilingual'
    ? new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 2 }).format(value)
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);

export type StudyLanguage = 'ko' | 'ja';

const LANGUAGE_KEY = 'korean-study:language';

export function getStudyLanguage(): StudyLanguage {
  const raw = localStorage.getItem(LANGUAGE_KEY);
  return raw === 'ja' ? 'ja' : 'ko';
}

export function setStudyLanguage(language: StudyLanguage) {
  localStorage.setItem(LANGUAGE_KEY, language);
  window.dispatchEvent(new Event('study-language-change'));
}

export function getTargetLanguageLabel(language: StudyLanguage): string {
  return language === 'ja' ? 'Tiếng Nhật' : 'Tiếng Hàn';
}

export function getAppTitle(language: StudyLanguage): string {
  return language === 'ja' ? 'Học tiếng Nhật' : 'Học tiếng Hàn';
}


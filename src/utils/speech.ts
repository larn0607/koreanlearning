export function speakKorean(text: string | undefined | null) {
  if (!text) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Web Speech API not supported in this browser.');
    return;
  }

  const trimmed = text.trim();
  if (!trimmed) return;

  // Cancel any ongoing speech to avoid overlap
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(trimmed);

  try {
    const voices = window.speechSynthesis.getVoices();
    const koVoice =
      voices.find(v => v.lang?.toLowerCase().startsWith('ko')) ||
      voices.find(v => v.lang?.toLowerCase().includes('ko-kr'));
    if (koVoice) {
      utterance.voice = koVoice;
    } else {
      utterance.lang = 'ko-KR';
    }
  } catch {
    utterance.lang = 'ko-KR';
  }

  utterance.rate = 1;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
}


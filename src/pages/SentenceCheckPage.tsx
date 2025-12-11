import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { SentenceItem } from '../types';
import { normalizeNewlines } from '../utils/text';
import { loadWrongIds, saveWrongIds } from '../utils/csv';

const STORAGE_KEY_PREFIX = 'korean-study:sentences';

function loadSentences(cardId?: string): SentenceItem[] {
  const key = cardId ? `${STORAGE_KEY_PREFIX}:${cardId}` : STORAGE_KEY_PREFIX;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SentenceItem[];
  } catch {
    return [];
  }
}

// Load input history for a sentence
function loadInputHistory(sentenceId: string, cardId?: string): string {
  const historyKey = `korean-study:sentence-input-history:${cardId ? `${cardId}:` : ''}${sentenceId}`;
  const raw = localStorage.getItem(historyKey);
  return raw || '';
}

// Save input history for a sentence
function saveInputHistory(sentenceId: string, input: string, cardId?: string) {
  const historyKey = `korean-study:sentence-input-history:${cardId ? `${cardId}:` : ''}${sentenceId}`;
  localStorage.setItem(historyKey, input);
}

// Load correct sentences (sentences that were answered correctly)
function loadCorrectSentences(cardId?: string, isWrongOnlyMode?: boolean): Set<string> {
  const correctKey = isWrongOnlyMode
    ? `korean-study:sentence-correct-wrong:${cardId ? `${cardId}:` : ''}all`
    : `korean-study:sentence-correct:${cardId ? `${cardId}:` : ''}all`;
  const raw = localStorage.getItem(correctKey);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as { ids: string[]; savedAt: number };
    const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
    if (!parsed || !Array.isArray(parsed.ids) || !parsed.savedAt || Date.now() - parsed.savedAt > EIGHT_HOURS_MS) {
      localStorage.removeItem(correctKey);
      return new Set();
    }
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

// Save correct sentence ID
function saveCorrectSentence(sentenceId: string, cardId?: string, isWrongOnlyMode?: boolean) {
  const correctKey = isWrongOnlyMode
    ? `korean-study:sentence-correct-wrong:${cardId ? `${cardId}:` : ''}all`
    : `korean-study:sentence-correct:${cardId ? `${cardId}:` : ''}all`;
  const current = loadCorrectSentences(cardId, isWrongOnlyMode);
  current.add(sentenceId);
  localStorage.setItem(correctKey, JSON.stringify({
    ids: Array.from(current),
    savedAt: Date.now()
  }));
}

// Split Korean sentence into words (simple word segmentation)
function splitKoreanWords(sentence: string): string[] {
  // Remove punctuation and split by spaces
  const cleaned = sentence.replace(/[.,!?;:]/g, ' ').trim();
  return cleaned.split(/\s+/).filter(w => w.length > 0);
}

// Compare user input with correct sentence word by word
function compareSentences(userInput: string, correctSentence: string): Array<{ word: string; isCorrect: boolean }> {
  const userWords = splitKoreanWords(userInput);
  const correctWords = splitKoreanWords(correctSentence);
  
  const result: Array<{ word: string; isCorrect: boolean }> = [];
  const maxLen = Math.max(userWords.length, correctWords.length);
  
  for (let i = 0; i < maxLen; i++) {
    const userWord = userWords[i] || '';
    const correctWord = correctWords[i] || '';
    
    if (i < userWords.length) {
      // Check if word matches (case-insensitive, trim spaces)
      const isCorrect = userWord.trim().toLowerCase() === correctWord.trim().toLowerCase();
      result.push({ word: userWord, isCorrect });
    } else {
      // User input is shorter - mark missing words as incorrect
      result.push({ word: '', isCorrect: false });
    }
  }
  
  return result;
}

// Parse vocabulary: word|category|hanviet\nword2|category2|hanviet2
function parseVocabulary(vocab: string): Array<{ word: string; category: string; hanviet: string }> {
  if (!vocab.trim()) return [];
  // Normalize newlines: convert literal \n to actual newlines
  const normalized = normalizeNewlines(vocab);
  return normalized.split('\n').map(line => {
    const parts = line.split('|');
    return {
      word: parts[0] || '',
      category: parts[1] || '',
      hanviet: parts[2] || ''
    };
  }).filter(v => v.word);
}

// Parse grammar: analysis\n---\nexample1\nexample2
function parseGrammar(grammar: string): { analysis: string; examples: string[] } {
  if (!grammar.trim()) return { analysis: '', examples: [] };
  // Normalize newlines: convert literal \n to actual newlines
  const normalized = normalizeNewlines(grammar);
  const parts = normalized.split('\n---\n');
  const analysis = parts[0] || '';
  const examples = parts.slice(1).map(e => normalizeNewlines(e)).filter(e => e.trim());
  return { analysis, examples };
}

export function SentenceCheckPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  
  // Check if we're in wrong-only mode (must be before useState that uses it)
  const wrongOnlyKey = `korean-study:check-wrong-only:sentences${cardId ? `:${cardId}` : ''}`;
  const isWrongOnlyMode = localStorage.getItem(wrongOnlyKey) === 'true';
  
  const [items] = useState<SentenceItem[]>(() => loadSentences(cardId));
  const [correctIds, setCorrectIds] = useState<Set<string>>(() => loadCorrectSentences(cardId, isWrongOnlyMode));
  const [shuffledDeck, setShuffledDeck] = useState<SentenceItem[]>([]);
  const [index, setIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<Array<{ word: string; isCorrect: boolean }>>([]);
  const [previousWrongInput, setPreviousWrongInput] = useState<string>('');
  
  // Load wrong IDs if in wrong-only mode
  const wrongIds = useMemo(() => {
    if (!isWrongOnlyMode) return new Set<string>();
    return loadWrongIds('sentences', cardId);
  }, [isWrongOnlyMode, cardId]);

  // Initialize shuffled deck when items change, filter out correct sentences
  useEffect(() => {
    let deckAll = items.filter(i => i.sentence && !correctIds.has(i.id));
    
    // If in wrong-only mode, filter to only wrong sentences
    if (isWrongOnlyMode) {
      deckAll = deckAll.filter(i => wrongIds.has(i.id));
    }
    
    if (deckAll.length > 0) {
      const shuffled = [...deckAll].sort(() => Math.random() - 0.5);
      setShuffledDeck(shuffled);
      setIndex(0);
    } else {
      setShuffledDeck([]);
      setIndex(0);
    }
  }, [items, correctIds, isWrongOnlyMode, wrongIds]);

  const deck = useMemo(() => shuffledDeck.filter(i => !correctIds.has(i.id)), [shuffledDeck, correctIds]);
  const current = deck[index];
  const correctCount = correctIds.size;

  // Load previous input when card changes
  useEffect(() => {
    if (current) {
      const previousInput = loadInputHistory(current.id, cardId);
      // Check if previous input was wrong (not all words correct)
      if (previousInput) {
        const prevComparison = compareSentences(previousInput, current.sentence);
        const allCorrect = prevComparison.length > 0 && prevComparison.every(r => r.isCorrect);
        if (!allCorrect) {
          // Previous input was wrong, show it as preview
          setPreviousWrongInput(previousInput);
          setUserInput(''); // Clear input field
        } else {
          // Previous input was correct, don't show it
          setPreviousWrongInput('');
          setUserInput('');
        }
      } else {
        setPreviousWrongInput('');
        setUserInput('');
      }
      setShowResult(false);
      setComparisonResult([]);
    }
  }, [current, cardId]);

  // Keep index within bounds
  useEffect(() => {
    if (deck.length === 0) {
      setIndex(0);
      return;
    }
    if (index >= deck.length) {
      setIndex(0);
    }
  }, [deck, index]);

  function goNext() {
    const len = deck.length;
    if (len === 0) return;
    const nextIndex = (index + 1) % len;
    // If it's the same item (only 1 item left or cycling back), reset to allow input again
    if (nextIndex === index && showResult) {
      setShowResult(false);
      setUserInput('');
      setComparisonResult([]);
      // Don't change index, just reset the state
      return;
    }
    setIndex(nextIndex);
  }

  function goPrev() {
    const len = deck.length;
    if (len === 0) return;
    const prevIndex = (index - 1 + len) % len;
    // If it's the same item (only 1 item left or cycling back), reset to allow input again
    if (prevIndex === index && showResult) {
      setShowResult(false);
      setUserInput('');
      setComparisonResult([]);
      // Don't change index, just reset the state
      return;
    }
    setIndex(prevIndex);
  }

  function checkAnswer() {
    if (!current) return;
    
    const comparison = compareSentences(userInput, current.sentence);
    setComparisonResult(comparison);
    setShowResult(true);
    
    // Check if all words are correct
    const allCorrect = comparison.length > 0 && comparison.every(r => r.isCorrect);
    
    if (allCorrect) {
      // Mark as correct and save
      const newCorrectIds = new Set(correctIds);
      newCorrectIds.add(current.id);
      setCorrectIds(newCorrectIds);
      saveCorrectSentence(current.id, cardId, isWrongOnlyMode);
      
      // Clear wrong input history when answer is correct
      const historyKey = `korean-study:sentence-input-history:${cardId ? `${cardId}:` : ''}${current.id}`;
      localStorage.removeItem(historyKey);
      setPreviousWrongInput('');
      // Don't remove from wrong items - keep history of wrong answers
      
      // Auto move to next after 1 second
      setTimeout(() => {
        // Check if deck still has items after marking as correct
        const updatedDeck = items.filter(i => i.sentence && !newCorrectIds.has(i.id));
        if (updatedDeck.length > 0) {
          goNext();
        } else {
          // No more items, just reset state
          setShowResult(false);
          setUserInput('');
          setComparisonResult([]);
        }
      }, 1000);
    } else {
      // Save wrong input as history
      saveInputHistory(current.id, userInput, cardId);
      // Save wrong sentence flag to localStorage
      const currentWrongIds = loadWrongIds('sentences', cardId);
      currentWrongIds.add(current.id);
      saveWrongIds('sentences', currentWrongIds, cardId);
    }
  }

  // Autofocus input when card changes and result is hidden
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!showResult && current) {
      inputRef.current?.focus();
    }
  }, [current, showResult]);

  // When showing result, allow Enter to trigger Next
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && showResult && deck.length > 0) {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showResult, deck.length]);

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !showResult && current) {
      checkAnswer();
    }
  }

  // Early return if no current item (after all hooks)
  if (!current) {
    if (items.length === 0) {
      return (
        <div className="list-page">
          <div className="toolbar">
            <button className="btn" onClick={() => {
              if (isWrongOnlyMode) {
                localStorage.removeItem(wrongOnlyKey);
              }
              navigate(cardId ? `/sentences/${cardId}` : '/sentences');
            }}>
              ← Quay lại
            </button>
          </div>
          <div className="empty">
            {isWrongOnlyMode ? 'Chưa có câu nào đã nhập sai để kiểm tra.' : 'Chưa có dữ liệu để kiểm tra.'}
          </div>
        </div>
      );
    }
    
    // All items are correct
    return (
      <div className="list-page">
        <div className="toolbar">
          <button className="btn" onClick={() => {
            if (isWrongOnlyMode) {
              localStorage.removeItem(wrongOnlyKey);
            }
            navigate(cardId ? `/sentences/${cardId}` : '/sentences');
          }}>
            ← Quay lại
          </button>
          <div className="spacer" />
          <span style={{ 
            fontSize: '14px', 
            color: '#22c55e', 
            fontWeight: 600,
            padding: '4px 12px',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '6px'
          }}>
            ✓ Đúng: {correctCount} / {items.length}
          </span>
        </div>
        <div style={{ 
          textAlign: 'center', 
          padding: '48px 24px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', color: '#22c55e' }}>
            🎉 Hoàn thành!
          </div>
          <div style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            {isWrongOnlyMode ? 'Bạn đã trả lời đúng tất cả các câu đã sai!' : 'Bạn đã trả lời đúng tất cả các câu!'}
          </div>
          <div style={{ 
            padding: '16px', 
            background: 'rgba(34, 197, 94, 0.1)', 
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#22c55e' }}>
              {correctCount} / {items.length} câu đúng
            </div>
          </div>
          <button className="btn primary" onClick={() => {
            // Reset correct sentences
            const correctKey = isWrongOnlyMode
              ? `korean-study:sentence-correct-wrong:${cardId ? `${cardId}:` : ''}all`
              : `korean-study:sentence-correct:${cardId ? `${cardId}:` : ''}all`;
            localStorage.removeItem(correctKey);
            setCorrectIds(new Set());
            // Reload page
            window.location.reload();
          }}>
            Làm lại từ đầu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="list-page">
      <div className="toolbar">
        <button className="btn" onClick={() => navigate(cardId ? `/sentences/${cardId}` : '/sentences')}>
          ← Quay lại
        </button>
        <div className="spacer" />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Câu: {index + 1} / {deck.length}
          </span>
          <span style={{ 
            fontSize: '14px', 
            color: '#22c55e', 
            fontWeight: 600,
            padding: '4px 12px',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '6px'
          }}>
            ✓ Đúng: {correctCount}
          </span>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 24, 
        maxWidth: '800px', 
        margin: '0 auto',
        padding: '24px'
      }}>
        {/* Vietnamese translation - Preview */}
        {current && (
          <div style={{ 
            padding: '20px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            border: '2px solid #667eea',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px', fontWeight: 500 }}>
              📝 Câu cần dịch (Tiếng Việt):
            </div>
            <div style={{ fontSize: '20px', color: '#ffffff', fontWeight: 500, lineHeight: '1.5' }}>
              {current.vietnamese || '(Chưa có bản dịch tiếng Việt)'}
            </div>
          </div>
        )}

        {/* Previous wrong input preview */}
        {previousWrongInput && !showResult && (
          <div style={{ 
            padding: '12px 16px', 
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            borderLeft: '4px solid #ef4444'
          }}>
            <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '6px', fontWeight: 500 }}>
              ⚠️ Câu đã nhập sai trước đó:
            </div>
            <div style={{ fontSize: '14px', color: '#ef4444', fontStyle: 'italic' }}>
              {previousWrongInput}
            </div>
          </div>
        )}

        {/* Input area */}
        {current && (
          <>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '16px' }}>
                Nhập câu tiếng Hàn tương ứng:
              </label>
              <input
                ref={inputRef}
                type="text"
                className="input"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={previousWrongInput ? "Nhập lại câu tiếng Hàn..." : "Nhập câu tiếng Hàn..."}
                disabled={showResult}
                style={{ width: '100%', fontSize: '18px', padding: '14px', border: '2px solid var(--border)' }}
              />
            </div>

            {/* Check button */}
            {!showResult && (
              <button className="btn primary" onClick={checkAnswer} style={{ width: '100%' }}>
                Kiểm tra
              </button>
            )}
          </>
        )}

        {/* Result display */}
        {showResult && current && (() => {
          const allCorrect = comparisonResult.length > 0 && comparisonResult.every(r => r.isCorrect);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {allCorrect ? (
                <>
                  <div style={{ 
                    padding: '20px', 
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '2px solid #22c55e',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#22c55e', marginBottom: '8px' }}>
                      Chính xác!
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      Câu này sẽ được bỏ qua trong lần kiểm tra tiếp theo.
                    </div>
                  </div>

                  {/* Vocabulary */}
                  {current.vocabulary && (
                    <div style={{ userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>
                      <div className="label" style={{ marginBottom: 4, fontWeight: 600 }}>Từ vựng:</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {parseVocabulary(current.vocabulary).map((v, idx) => (
                          <div key={idx} style={{ padding: '8px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>{v.word}</div>
                            {v.category && <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)', marginBottom: 2 }}>Loại: {v.category}</div>}
                            {v.hanviet && <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>Hán Việt: {v.hanviet}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grammar */}
                  {current.grammar && (() => {
                    const { analysis, examples } = parseGrammar(current.grammar);
                    return (
                      <div style={{ userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>
                        <div className="label" style={{ marginBottom: 4, fontWeight: 600 }}>Ngữ pháp:</div>
                        {analysis && (
                          <div className="value" style={{ whiteSpace:'pre-wrap', userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible', marginBottom: 8 }}>{normalizeNewlines(analysis)}</div>
                        )}
                        {examples.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div className="label" style={{ marginBottom: 4 }}>Ví dụ:</div>
                            {examples.map((ex, idx) => (
                              <div key={idx} style={{ padding: '8px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: 4 }}>
                                <div className="value" style={{ whiteSpace:'pre-wrap', userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>{normalizeNewlines(ex)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <>
                  {/* User input with color coding */}
                  <div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Câu bạn đã nhập:
                    </div>
                    <div style={{ 
                      padding: '16px', 
                      background: 'var(--panel)', 
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px',
                      fontSize: '16px',
                      lineHeight: '1.6'
                    }}>
                      {comparisonResult.map((item, idx) => (
                        <span
                          key={idx}
                          style={{
                            color: item.isCorrect ? '#22c55e' : '#ef4444',
                            fontWeight: item.isCorrect ? 500 : 400,
                            backgroundColor: item.isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          {item.word || '(thiếu)'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Correct answer */}
                  <div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Câu đúng:
                    </div>
                    <div style={{ 
                      padding: '16px', 
                      background: 'var(--panel)', 
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '16px',
                      lineHeight: '1.6'
                    }}>
                      {current.sentence}
                    </div>
                  </div>

                  {/* Vocabulary */}
                  {current.vocabulary && (
                    <div style={{ userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>
                      <div className="label" style={{ marginBottom: 4, fontWeight: 600 }}>Từ vựng:</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {parseVocabulary(current.vocabulary).map((v, idx) => (
                          <div key={idx} style={{ padding: '8px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>{v.word}</div>
                            {v.category && <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)', marginBottom: 2 }}>Loại: {v.category}</div>}
                            {v.hanviet && <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>Hán Việt: {v.hanviet}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grammar */}
                  {current.grammar && (() => {
                    const { analysis, examples } = parseGrammar(current.grammar);
                    return (
                      <div style={{ userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>
                        <div className="label" style={{ marginBottom: 4, fontWeight: 600 }}>Ngữ pháp:</div>
                        {analysis && (
                          <div className="value" style={{ whiteSpace:'pre-wrap', userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible', marginBottom: 8 }}>{normalizeNewlines(analysis)}</div>
                        )}
                        {examples.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div className="label" style={{ marginBottom: 4 }}>Ví dụ:</div>
                            {examples.map((ex, idx) => (
                              <div key={idx} style={{ padding: '8px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: 4 }}>
                                <div className="value" style={{ whiteSpace:'pre-wrap', userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>{normalizeNewlines(ex)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Navigation buttons */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" onClick={goPrev} style={{ flex: 1 }}>
                      ← Trước
                    </button>
                    <button className="btn primary" onClick={goNext} style={{ flex: 1 }}>
                      Tiếp theo →
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}


import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { StudyItem } from '../types';
import { normalizeNewlines } from '../utils/text';
import { loadWrongIds, saveWrongIds } from '../utils/csv';
import { speakKorean } from '../utils/speech';

const STORAGE_KEY_PREFIX = 'korean-study:';

function loadItems(category: string, cardId?: string): StudyItem[] {
  const key = STORAGE_KEY_PREFIX + (cardId ? `${category}:${cardId}` : category);
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StudyItem[];
  } catch {
    return [];
  }
}

export function CheckPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract category from pathname
  const category: 'vocab' | 'grammar' | null = location.pathname.includes('/vocab/') ? 'vocab' : 
                                                location.pathname.includes('/grammar/') ? 'grammar' : null;
  const [items] = useState<StudyItem[]>(() => {
    if (!category) return [];
    return loadItems(category, cardId);
  });
  const [shuffledDeck, setShuffledDeck] = useState<StudyItem[]>([]);
  const [index, setIndex] = useState(0);
  
  // Check if we're in wrong-only mode
  const wrongOnlyKey = `korean-study:check-wrong-only:${cardId ? `${category}:${cardId}` : category}`;
  const isWrongOnlyMode = localStorage.getItem(wrongOnlyKey) === 'true';
  
  // Use separate storage key for wrong-only mode
  const storageKey = isWrongOnlyMode 
    ? `korean-study:check-wrong:${cardId ? `${category}:${cardId}` : category}`
    : `korean-study:check:${cardId ? `${category}:${cardId}` : category}`;
  
  const [learnedIds, setLearnedIds] = useState<Set<string>>(() => {
    // Calculate storage key inside initializer to ensure it's correct
    const wrongOnlyFlag = localStorage.getItem(`korean-study:check-wrong-only:${cardId ? `${category}:${cardId}` : category}`) === 'true';
    const key = wrongOnlyFlag 
      ? `korean-study:check-wrong:${cardId ? `${category}:${cardId}` : category}`
      : `korean-study:check:${cardId ? `${category}:${cardId}` : category}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as { ids: string[]; savedAt: number };
      const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
      if (!parsed || !Array.isArray(parsed.ids) || !parsed.savedAt || Date.now() - parsed.savedAt > EIGHT_HOURS_MS) {
        localStorage.removeItem(key);
        return new Set();
      }
      return new Set(parsed.ids);
    } catch {
      return new Set();
    }
  });
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Load wrong IDs if in wrong-only mode
  const wrongIds = useMemo(() => {
    if (!isWrongOnlyMode || !category) return new Set<string>();
    return loadWrongIds(category, cardId);
  }, [isWrongOnlyMode, category, cardId]);

  // Initialize shuffled deck when items change
  useEffect(() => {
    let deckAll = items.filter(i => i.korean || i.vietnamese || i.english);
    
    // If in wrong-only mode, filter to only wrong items
    if (isWrongOnlyMode) {
      deckAll = deckAll.filter(i => wrongIds.has(i.id));
    }
    
    if (deckAll.length > 0) {
      // Shuffle the deck
      const shuffled = [...deckAll].sort(() => Math.random() - 0.5);
      setShuffledDeck(shuffled);
      setIndex(0);
    } else {
      setShuffledDeck([]);
      setIndex(0);
    }
  }, [items, isWrongOnlyMode, wrongIds]);

  const deck = useMemo(() => shuffledDeck.filter(i => !learnedIds.has(i.id)), [shuffledDeck, learnedIds]);
  const totalAll = shuffledDeck.length;
  const learned = learnedIds.size;
  const notLearned = Math.max(0, totalAll - learned);
  const current = deck[index] ?? deck[deck.length - 1];

  // Keep index within bounds when deck changes
  useEffect(() => {
    if (deck.length === 0) {
      setIndex(0);
      return;
    }
    if (index >= deck.length) {
      setIndex(0);
    }
  }, [deck, index]);

  // Reset input and result when current card changes
  useEffect(() => {
    setUserInput('');
    setShowResult(false);
    setIsCorrect(false);
  }, [current]);

  function goNext() {
    const len = deck.length;
    if (len === 0) return;
    // Always advance index cyclically relative to current filtered deck
    setIndex(prev => (prev + 1) % len);
  }

  function goPrev() {
    const len = deck.length;
    if (len === 0 || index === 0) return;
    setIndex(prev => (prev - 1 + len) % len);
  }

  function checkAnswer() {
    if (!current) return;
    
    const userAnswer = userInput.trim().toLowerCase();
    const correctAnswer = current.korean.toLowerCase();
    
    const correct = userAnswer === correctAnswer;
    setIsCorrect(correct);
    setShowResult(true);

    // Luôn phát âm từ tiếng Hàn sau khi kiểm tra (đúng hoặc sai)
    speakKorean(current.korean);

    // Don't move item to end immediately - wait for nextQuestion()
  }

  // Autofocus input when card changes and result is hidden
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!showResult) {
      inputRef.current?.focus();
    }
  }, [current, showResult]);

  // When showing result, allow Enter to trigger Next
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && showResult && deck.length > 0) {
        e.preventDefault();
        nextQuestion();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showResult, index, deck.length, isCorrect]);

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !showResult && current) {
      checkAnswer();
    }
  }

  function nextQuestion() {
    if (isCorrect) {
      // Mark as learned and persist
      const curId = current?.id;
      if (curId) {
        setLearnedIds(prev => {
          const next = new Set(prev);
          next.add(curId);
          try {
            localStorage.setItem(storageKey, JSON.stringify({ ids: Array.from(next), savedAt: Date.now() }));
          } catch { }
          return next;
        });
        // Don't remove from wrong items - keep history of wrong answers
      }
      // Advance to next remaining (deck will shrink on render)
      goNext();
    } else {
      // Requeue wrong item to end of the underlying shuffled deck
      const curId = current?.id;
      if (!curId || !category) {
        goNext();
        return;
      }
      // Save wrong item flag to localStorage
      const currentWrongIds = loadWrongIds(category, cardId);
      currentWrongIds.add(curId);
      saveWrongIds(category, currentWrongIds, cardId);
      
      setShuffledDeck(prev => {
        const newDeck = [...prev];
        const idxInShuffled = newDeck.findIndex(i => i.id === curId);
        if (idxInShuffled >= 0) {
          const [currentItem] = newDeck.splice(idxInShuffled, 1);
          newDeck.push(currentItem);
        }
        return newDeck;
      });
      // Ensure we can still proceed when only one item remains in deck
      // If only one item is in deck, keep index at 0 but hide result to allow next attempt
      if (deck.length === 1) {
        setShowResult(false);
        setUserInput('');
        setIsCorrect(false);
        // keep index as 0
      } else {
        goNext();
      }
    }
  }

  if (!category) {
    return (
      <div className="list-page">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Category không hợp lệ</p>
          <button className="btn" onClick={() => navigate('/')}>Về trang chủ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="list-page">
      <div className="toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn" onClick={() => {
            // Clear wrong-only mode flag when going back
            if (isWrongOnlyMode) {
              localStorage.removeItem(wrongOnlyKey);
            }
            navigate(cardId ? `/${category}/${cardId}` : `/${category}`);
          }}>
            ← Quay lại
          </button>
          <span className={`badge ${category}`}>{category === 'vocab' ? 'Từ vựng' : 'Ngữ pháp'}</span>
          <div style={{ fontWeight: 600, fontSize: 18 }}>
            {isWrongOnlyMode ? 'Kiểm tra từ đã sai' : 'Kiểm tra từ vựng'}
          </div>
          {isWrongOnlyMode && (
            <span style={{ 
              fontSize: '14px', 
              color: '#ef4444', 
              fontWeight: 600,
              padding: '4px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '6px',
              marginLeft: '8px'
            }}>
              Chế độ: Từ đã sai
            </span>
          )}
        </div>
      </div>

      <div style={{ 
        maxWidth: 'min(720px, calc(100vw - 32px))', 
        margin: '0 auto', 
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 200px)'
      }}>
        <div style={{ flex: '0 0 auto', marginBottom: '12px' }}>
          <div className="detail" style={{ 
            marginBottom: 0, 
            fontSize: '14px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label">Đã thuộc:</span> 
              <span className="value" style={{ fontWeight: '600' }}>{learned}/{totalAll}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label">Chưa thuộc:</span> 
              <span className="value" style={{ fontWeight: '600' }}>{notLearned}</span>
            </div>
          </div>
        </div>

        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {totalAll === 0 ? (
            <div style={{ 
              padding: '16px', 
              border: '1px solid #22305c', 
              borderRadius: '8px', 
              marginBottom: '12px', 
              background: 'rgba(255,255,255,0.02)',
              fontSize: '15px'
            }}>
              Không có từ vựng nào để kiểm tra.
            </div>
          ) : deck.length === 0 ? (
            <div style={{ 
              padding: '16px', 
              border: '1px solid #22305c', 
              borderRadius: '8px', 
              marginBottom: '12px', 
              background: 'rgba(255,255,255,0.02)',
              fontSize: '15px'
            }}>
              {isWrongOnlyMode ? 'Bạn đã hoàn thành tất cả từ đã sai. 🎉' : 'Bạn đã hoàn thành tất cả từ cần ôn. 🎉'}
            </div>
          ) : (
            <div
              className="card check-modal-card"
              style={{
                padding: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                marginBottom: '12px',
                background: showResult ? (isCorrect ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)') : 'transparent',
                position: 'relative',
                flex: '1 1 auto',
                minHeight: 0,
                overflow: 'auto',
                transform: 'none !important',
                transition: 'none !important'
              }}
            >
              {/* Question section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <span className="label" style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    display: 'block',
                    marginBottom: '4px'
                  }}>Tiếng Việt:</span>
                  <div style={{ 
                    fontSize: '16px', 
                    marginTop: '4px', 
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.4',
                    wordBreak: 'break-word'
                  }}>
                    {normalizeNewlines(current.vietnamese)}
                  </div>
                </div>
                <div>
                  <span className="label" style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    display: 'block',
                    marginBottom: '4px'
                  }}>Tiếng Anh:</span>
                  <div style={{ 
                    fontSize: '16px', 
                    marginTop: '4px', 
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.4',
                    wordBreak: 'break-word'
                  }}>
                    {normalizeNewlines(current.english)}
                  </div>
                </div>
              </div>

              {/* Input section */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '600' 
                }}>
                  Nhập tiếng Hàn:
                </label>
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập từ tiếng Hàn..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    background: showResult ? (isCorrect ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)') : 'white',
                    boxSizing: 'border-box'
                  }}
                  ref={inputRef}
                  disabled={showResult}
                />
              </div>

              {/* Result section */}
              {showResult && (
                <div style={{ 
                  marginBottom: '16px', 
                  padding: '12px', 
                  borderRadius: '6px',
                  background: isCorrect ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                  border: `1px solid ${isCorrect ? '#4CAF50' : '#f44336'}`
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ 
                      fontSize: '18px', 
                      fontWeight: 'bold',
                      color: isCorrect ? '#4CAF50' : '#f44336',
                      marginRight: '8px',
                      flexShrink: 0
                    }}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span style={{ 
                      fontSize: '16px', 
                      fontWeight: '600',
                      color: isCorrect ? '#4CAF50' : '#f44336',
                      lineHeight: '1.2'
                    }}>
                      {isCorrect ? 'Chính xác!' : 'Sai rồi!'}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <span className="label" style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      display: 'block',
                      marginBottom: '4px'
                    }}>Đáp án đúng:</span>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <div style={{ 
                        fontSize: '16px', 
                        marginTop: '4px', 
                        whiteSpace: 'pre-wrap', 
                        fontWeight: '600',
                        lineHeight: '1.4',
                        wordBreak: 'break-word',
                        flex: 1
                      }}>
                        {normalizeNewlines(current.korean)}
                      </div>
                      <button
                        className="btn small"
                        type="button"
                        onClick={() => speakKorean(current.korean)}
                        title="Phát âm đáp án đúng"
                        style={{ flexShrink: 0, padding: '4px 8px' }}
                      >
                        🔊
                      </button>
                    </div>
                  </div>

                  {current.description && (
                    <div style={{ marginBottom: '8px' }}>
                      <span className="label" style={{ 
                        fontSize: '14px', 
                        fontWeight: '600',
                        display: 'block',
                        marginBottom: '4px'
                      }}>Mô tả:</span>
                      <div style={{ 
                        fontSize: '14px', 
                        marginTop: '4px', 
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.4',
                        wordBreak: 'break-word'
                      }}>
                        {normalizeNewlines(current.description)}
                      </div>
                    </div>
                  )}

                  {(current.example1_ko || current.example1_vi || current.example1_en) && (
                    <div style={{ marginBottom: '8px' }}>
                      <span className="label" style={{ 
                        fontSize: '14px', 
                        fontWeight: '600',
                        display: 'block',
                        marginBottom: '4px'
                      }}>Ví dụ 1:</span>
                      <div style={{ 
                        fontSize: '14px', 
                        marginTop: '4px',
                        lineHeight: '1.4'
                      }}>
                        <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong>KO:</strong>
                          <span style={{ wordBreak: 'break-word', flex: 1 }}>{normalizeNewlines(current.example1_ko)}</span>
                          {current.example1_ko && (
                            <button
                              className="btn small"
                              type="button"
                              onClick={() => speakKorean(current.example1_ko)}
                              title="Phát âm ví dụ 1"
                              style={{ flexShrink: 0, padding: '4px 8px' }}
                            >
                              🔊
                            </button>
                          )}
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          <strong>VI:</strong> <span style={{ wordBreak: 'break-word' }}>{normalizeNewlines(current.example1_vi)}</span>
                        </div>
                        <div>
                          <strong>EN:</strong> <span style={{ wordBreak: 'break-word' }}>{normalizeNewlines(current.example1_en)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {(current.example2_ko || current.example2_vi || current.example2_en) && (
                    <div>
                      <span className="label" style={{ 
                        fontSize: '14px', 
                        fontWeight: '600',
                        display: 'block',
                        marginBottom: '4px'
                      }}>Ví dụ 2:</span>
                      <div style={{ 
                        fontSize: '14px', 
                        marginTop: '4px',
                        lineHeight: '1.4'
                      }}>
                        <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong>KO:</strong>
                          <span style={{ wordBreak: 'break-word', flex: 1 }}>{normalizeNewlines(current.example2_ko)}</span>
                          {current.example2_ko && (
                            <button
                              className="btn small"
                              type="button"
                              onClick={() => speakKorean(current.example2_ko)}
                              title="Phát âm ví dụ 2"
                              style={{ flexShrink: 0, padding: '4px 8px' }}
                            >
                              🔊
                            </button>
                          )}
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          <strong>VI:</strong> <span style={{ wordBreak: 'break-word' }}>{normalizeNewlines(current.example2_vi)}</span>
                        </div>
                        <div>
                          <strong>EN:</strong> <span style={{ wordBreak: 'break-word' }}>{normalizeNewlines(current.example2_en)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mark indicator for learned items */}
              {current && learnedIds.has(current.id) && (
                <div style={{ 
                  position: 'absolute', 
                  top: '8px', 
                  right: '8px', 
                  background: '#4CAF50', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: '24px', 
                  height: '24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  ✓
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ 
          flex: '0 0 auto', 
          display: 'flex', 
          gap: '6px', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '12px', 
          flexWrap: 'wrap'
        }}>
          <div style={{ 
            display: 'flex', 
            gap: '6px', 
            flexWrap: 'wrap',
            flex: '1 1 auto',
            minWidth: 0
          }}>
            <button 
              className="btn" 
              onClick={goPrev}
              style={{ 
                padding: '10px', 
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                minWidth: 'auto',
                flex: '0 0 auto'
              }}
              disabled={deck.length <= 1 || index === 0}
            >
              ← Trước
            </button>
            <button 
              className="btn" 
              onClick={goNext}
              style={{ 
                padding: '10px', 
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                minWidth: 'auto',
                flex: '0 0 auto'
              }}
              disabled={deck.length <= 1 || index === deck.length - 1}
            >
              Sau →
            </button>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '6px', 
            flexWrap: 'wrap', 
            justifyContent: 'flex-end',
            flex: '1 1 auto',
            minWidth: 0
          }}>
            {!showResult ? (
              <button 
                className="btn" 
                onClick={checkAnswer}
                style={{ 
                  padding: '10px', 
                  fontSize: '14px',
                  minWidth: 'auto',
                  flex: '0 0 auto'
                }}
                disabled={!current}
              >
                Kiểm tra
              </button>
            ) : (
              <button 
                className="btn" 
                onClick={nextQuestion}
                style={{ 
                  padding: '10px', 
                  fontSize: '14px',
                  minWidth: 'auto',
                  flex: '0 0 auto'
                }}
                disabled={deck.length === 0}
              >
                Tiếp theo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


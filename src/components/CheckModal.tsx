import { useEffect, useMemo, useRef, useState } from 'react';
import type { StudyItem } from '../types';
import { normalizeNewlines } from '../utils/text';

type CheckModalProps = {
  items: StudyItem[];
  onClose: () => void;
  storageKey?: string;
};

export function CheckModal({ items, onClose, storageKey = 'korean-study:check:general' }: CheckModalProps) {
  const [shuffledDeck, setShuffledDeck] = useState<StudyItem[]>([]);
  const [index, setIndex] = useState(0);
  const [learnedIds, setLearnedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as { ids: string[]; savedAt: number };
      const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
      if (!parsed || !Array.isArray(parsed.ids) || !parsed.savedAt || Date.now() - parsed.savedAt > EIGHT_HOURS_MS) {
        localStorage.removeItem(storageKey);
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

  // Initialize shuffled deck when items change
  useEffect(() => {
    const deckAll = items.filter(i => i.korean || i.vietnamese || i.english);
    if (deckAll.length > 0) {
      // Shuffle the deck
      const shuffled = [...deckAll].sort(() => Math.random() - 0.5);
      setShuffledDeck(shuffled);
      setIndex(0);
    }
  }, [items]);

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

  // Note: Do not early-return before all hooks run to avoid hook order issues

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
      }
      // Advance to next remaining (deck will shrink on render)
      goNext();
    } else {
      // Requeue wrong item to end of the underlying shuffled deck
      const curId = current?.id;
      if (!curId) {
        goNext();
        return;
      }
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

  return (
    <div 
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        zIndex: 1000
      }}
    >
      <div 
        className="modal" 
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          width: '100%',
          maxWidth: 'min(720px, calc(100vw - 8px))',
          maxHeight: 'calc(100vh - 8px)',
          padding: 'clamp(8px, 2vw, 16px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ flex: '0 0 auto', marginBottom: 'clamp(8px, 2vw, 12px)' }}>
          <h3 className="modal-title" style={{ 
            marginTop: 0, 
            marginBottom: 'clamp(4px, 1.5vw, 8px)', 
            fontSize: 'clamp(16px, 4vw, 18px)',
            lineHeight: '1.2'
          }}>Kiểm tra từ vựng</h3>
          <div className="detail" style={{ 
            marginBottom: 0, 
            fontSize: 'clamp(12px, 3vw, 14px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 'clamp(4px, 1vw, 8px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label" style={{ fontSize: 'clamp(11px, 2.5vw, 13px)' }}>Đã thuộc:</span> 
              <span className="value" style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', fontWeight: '600' }}>{learned}/{totalAll}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label" style={{ fontSize: 'clamp(11px, 2.5vw, 13px)' }}>Chưa thuộc:</span> 
              <span className="value" style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', fontWeight: '600' }}>{notLearned}</span>
            </div>
            {/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label" style={{ fontSize: 'clamp(11px, 2.5vw, 13px)' }}>Câu hỏi:</span> 
              <span className="value" style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', fontWeight: '600' }}>{deck.length === 0 ? 0 : index + 1}/{deck.length}</span>
            </div> */}
          </div>
        </div>

        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {totalAll === 0 ? (
            <div style={{ 
              padding: 'clamp(12px, 3vw, 16px)', 
              border: '1px solid #22305c', 
              borderRadius: 'clamp(6px, 1.5vw, 8px)', 
              marginBottom: 'clamp(8px, 2vw, 12px)', 
              background: 'rgba(255,255,255,0.02)',
              fontSize: 'clamp(13px, 3vw, 15px)'
            }}>
              Không có từ vựng nào để kiểm tra.
            </div>
          ) : deck.length === 0 ? (
            <div style={{ 
              padding: 'clamp(12px, 3vw, 16px)', 
              border: '1px solid #22305c', 
              borderRadius: 'clamp(6px, 1.5vw, 8px)', 
              marginBottom: 'clamp(8px, 2vw, 12px)', 
              background: 'rgba(255,255,255,0.02)',
              fontSize: 'clamp(13px, 3vw, 15px)'
            }}>
              Bạn đã hoàn thành tất cả từ cần ôn. 🎉
            </div>
          ) : (
            <div
              className="card check-modal-card"
              style={{
                padding: 'clamp(12px, 3vw, 16px)',
                border: '1px solid #ddd',
                borderRadius: 'clamp(6px, 1.5vw, 8px)',
                marginBottom: 'clamp(8px, 2vw, 12px)',
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
              <div style={{ marginBottom: 'clamp(12px, 3vw, 16px)' }}>
                <div style={{ marginBottom: 'clamp(6px, 1.5vw, 8px)' }}>
                  <span className="label" style={{ 
                    fontSize: 'clamp(12px, 3vw, 14px)', 
                    fontWeight: '600',
                    display: 'block',
                    marginBottom: 'clamp(2px, 0.5vw, 4px)'
                  }}>Tiếng Việt:</span>
                  <div style={{ 
                    fontSize: 'clamp(14px, 3.5vw, 16px)', 
                    marginTop: 'clamp(2px, 0.5vw, 4px)', 
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.4',
                    wordBreak: 'break-word'
                  }}>
                    {normalizeNewlines(current.vietnamese)}
                  </div>
                </div>
                <div>
                  <span className="label" style={{ 
                    fontSize: 'clamp(12px, 3vw, 14px)', 
                    fontWeight: '600',
                    display: 'block',
                    marginBottom: 'clamp(2px, 0.5vw, 4px)'
                  }}>Tiếng Anh:</span>
                  <div style={{ 
                    fontSize: 'clamp(14px, 3.5vw, 16px)', 
                    marginTop: 'clamp(2px, 0.5vw, 4px)', 
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.4',
                    wordBreak: 'break-word'
                  }}>
                    {normalizeNewlines(current.english)}
                  </div>
                </div>
              </div>

              {/* Input section */}
              <div style={{ marginBottom: 'clamp(12px, 3vw, 16px)' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 'clamp(6px, 1.5vw, 8px)', 
                  fontSize: 'clamp(12px, 3vw, 14px)', 
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
                    padding: 'clamp(8px, 2vw, 12px)',
                    border: '1px solid #ddd',
                    borderRadius: 'clamp(4px, 1vw, 6px)',
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
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
                  marginBottom: 'clamp(12px, 3vw, 16px)', 
                  padding: 'clamp(8px, 2vw, 12px)', 
                  borderRadius: 'clamp(4px, 1vw, 6px)',
                  background: isCorrect ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                  border: `1px solid ${isCorrect ? '#4CAF50' : '#f44336'}`
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: 'clamp(6px, 1.5vw, 8px)',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ 
                      fontSize: 'clamp(16px, 4vw, 18px)', 
                      fontWeight: 'bold',
                      color: isCorrect ? '#4CAF50' : '#f44336',
                      marginRight: 'clamp(6px, 1.5vw, 8px)',
                      flexShrink: 0
                    }}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span style={{ 
                      fontSize: 'clamp(14px, 3.5vw, 16px)', 
                      fontWeight: '600',
                      color: isCorrect ? '#4CAF50' : '#f44336',
                      lineHeight: '1.2'
                    }}>
                      {isCorrect ? 'Chính xác!' : 'Sai rồi!'}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: 'clamp(6px, 1.5vw, 8px)' }}>
                    <span className="label" style={{ 
                      fontSize: 'clamp(12px, 3vw, 14px)', 
                      fontWeight: '600',
                      display: 'block',
                      marginBottom: 'clamp(2px, 0.5vw, 4px)'
                    }}>Đáp án đúng:</span>
                    <div style={{ 
                      fontSize: 'clamp(14px, 3.5vw, 16px)', 
                      marginTop: 'clamp(2px, 0.5vw, 4px)', 
                      whiteSpace: 'pre-wrap', 
                      fontWeight: '600',
                      lineHeight: '1.4',
                      wordBreak: 'break-word'
                    }}>
                      {normalizeNewlines(current.korean)}
                    </div>
                  </div>

                  {current.description && (
                    <div style={{ marginBottom: 'clamp(6px, 1.5vw, 8px)' }}>
                      <span className="label" style={{ 
                        fontSize: 'clamp(12px, 3vw, 14px)', 
                        fontWeight: '600',
                        display: 'block',
                        marginBottom: 'clamp(2px, 0.5vw, 4px)'
                      }}>Mô tả:</span>
                      <div style={{ 
                        fontSize: 'clamp(12px, 3vw, 14px)', 
                        marginTop: 'clamp(2px, 0.5vw, 4px)', 
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.4',
                        wordBreak: 'break-word'
                      }}>
                        {normalizeNewlines(current.description)}
                      </div>
                    </div>
                  )}

                  {(current.example1_ko || current.example1_vi || current.example1_en) && (
                    <div style={{ marginBottom: 'clamp(6px, 1.5vw, 8px)' }}>
                      <span className="label" style={{ 
                        fontSize: 'clamp(12px, 3vw, 14px)', 
                        fontWeight: '600',
                        display: 'block',
                        marginBottom: 'clamp(2px, 0.5vw, 4px)'
                      }}>Ví dụ 1:</span>
                      <div style={{ 
                        fontSize: 'clamp(12px, 3vw, 14px)', 
                        marginTop: 'clamp(2px, 0.5vw, 4px)',
                        lineHeight: '1.4'
                      }}>
                        <div style={{ marginBottom: 'clamp(2px, 0.5vw, 4px)' }}>
                          <strong>KO:</strong> <span style={{ wordBreak: 'break-word' }}>{normalizeNewlines(current.example1_ko)}</span>
                        </div>
                        <div style={{ marginBottom: 'clamp(2px, 0.5vw, 4px)' }}>
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
                        fontSize: 'clamp(12px, 3vw, 14px)', 
                        fontWeight: '600',
                        display: 'block',
                        marginBottom: 'clamp(2px, 0.5vw, 4px)'
                      }}>Ví dụ 2:</span>
                      <div style={{ 
                        fontSize: 'clamp(12px, 3vw, 14px)', 
                        marginTop: 'clamp(2px, 0.5vw, 4px)',
                        lineHeight: '1.4'
                      }}>
                        <div style={{ marginBottom: 'clamp(2px, 0.5vw, 4px)' }}>
                          <strong>KO:</strong> <span style={{ wordBreak: 'break-word' }}>{normalizeNewlines(current.example2_ko)}</span>
                        </div>
                        <div style={{ marginBottom: 'clamp(2px, 0.5vw, 4px)' }}>
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
                  top: 'clamp(6px, 1.5vw, 8px)', 
                  right: 'clamp(6px, 1.5vw, 8px)', 
                  background: '#4CAF50', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: 'clamp(20px, 5vw, 24px)', 
                  height: 'clamp(20px, 5vw, 24px)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: 'clamp(10px, 2.5vw, 12px)', 
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
          gap: 'clamp(4px, 1vw, 6px)', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: 'clamp(8px, 2vw, 12px)', 
          flexWrap: 'wrap'
        }}>
          <div style={{ 
            display: 'flex', 
            gap: 'clamp(4px, 1vw, 6px)', 
            flexWrap: 'wrap',
            flex: '1 1 auto',
            minWidth: 0
          }}>
            <button 
              className="btn" 
              onClick={goPrev}
              style={{ 
                padding: 'clamp(6px, 1.5vw, 10px)', 
                fontSize: 'clamp(11px, 2.5vw, 14px)',
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(2px, 0.5vw, 4px)',
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
                padding: 'clamp(6px, 1.5vw, 10px)', 
                fontSize: 'clamp(11px, 2.5vw, 14px)',
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(2px, 0.5vw, 4px)',
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
            gap: 'clamp(4px, 1vw, 6px)', 
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
                  padding: 'clamp(6px, 1.5vw, 10px)', 
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
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
                  padding: 'clamp(6px, 1.5vw, 10px)', 
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  minWidth: 'auto',
                  flex: '0 0 auto'
                }}
                disabled={deck.length === 0}
              >
                Tiếp theo
              </button>
            )}
            <button 
              className="btn" 
              onClick={onClose}
              style={{ 
                padding: 'clamp(6px, 1.5vw, 10px)', 
                fontSize: 'clamp(11px, 2.5vw, 14px)',
                minWidth: 'auto',
                flex: '0 0 auto'
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

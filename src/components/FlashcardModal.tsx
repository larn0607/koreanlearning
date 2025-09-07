import { useEffect, useMemo, useState } from 'react';
import type { StudyItem } from '../types';
import { normalizeNewlines } from '../utils/text';

type FlashcardModalProps = {
  items: StudyItem[];
  onClose: () => void;
  storageKey?: string;
};

export function FlashcardModal({ items, onClose, storageKey = 'korean-study:flashcards:general' }: FlashcardModalProps) {
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
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [cardFlipStates, setCardFlipStates] = useState<Map<string, boolean>>(new Map());
  const [isFlipped, setIsFlipped] = useState(false);

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

  const deck = useMemo(() => shuffledDeck, [shuffledDeck]); // Show all cards including learned ones
  const totalAll = shuffledDeck.length;
  const learned = learnedIds.size;
  const notLearned = Math.max(0, totalAll - learned);
  const current = deck[index];

  // Update flip state when current card changes
  useEffect(() => {
    if (current && current.id) {
      const cardFlipState = cardFlipStates.get(current.id);
      setIsFlipped(cardFlipState || false);
    }
  }, [current, cardFlipStates]);

  // Early returns after all hooks
  if (shuffledDeck.length === 0) return null;
  if (!current) return null;

  function goNext() {
    const len = deck.length;
    if (len === 0) return;
    setIndex(prev => (prev + 1) % len);
  }

  function goPrev() {
    const len = deck.length;
    if (len === 0) return;
    setIndex(prev => (prev - 1 + len) % len);
  }

  function markKnown() {
    if (!current || !current.id) return;
    setLearnedIds(prev => {
      const next = new Set(prev);
      next.add(current.id);
      try {
        localStorage.setItem(storageKey, JSON.stringify({ ids: Array.from(next), savedAt: Date.now() }));
      } catch { }
      return next;
    });
    // move index but respect updated deck on next render
    setIndex(prev => (prev >= deck.length - 1 ? 0 : prev));
  }

  function markUnknown() {
    goNext();
  }

  function toggleFlip() {
    if (!current || !current.id) return;
    
    // Mark card as viewed when first flipped
    setViewedIds(prev => {
      const next = new Set(prev);
      next.add(current.id);
      return next;
    });
    
    // Update flip state for this specific card
    const newFlipState = !isFlipped;
    setIsFlipped(newFlipState);
    setCardFlipStates(prev => {
      const next = new Map(prev);
      next.set(current.id, newFlipState);
      return next;
    });
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
        padding: '8px',
        zIndex: 1000
      }}
    >
      <div 
        className="modal" 
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '95vh',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ flex: '0 0 auto', marginBottom: '12px' }}>
          <h3 className="modal-title" style={{ marginTop: 0, marginBottom: '8px', fontSize: '18px' }}>Flashcards</h3>
          <div className="detail" style={{ marginBottom: 0, fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span className="label" style={{ width: 'auto', marginRight: '8px' }}>Đã thuộc:</span> 
              <span className="value">{learned}/{totalAll}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span className="label" style={{ width: 'auto', marginRight: '8px' }}>Chưa thuộc:</span> 
              <span className="value">{notLearned}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label" style={{ width: 'auto', marginRight: '8px' }}>Đã xem:</span> 
              <span className="value">{viewedIds.size}/{totalAll}</span>
            </div>
          </div>
        </div>
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {totalAll === 0 ? (
            <div style={{ padding: 16, border: '1px solid #22305c', borderRadius: 8, marginBottom: 12, background: 'rgba(255,255,255,0.02)' }}>
              Không có thẻ nào để học.
            </div>
          ) : (
            <div
              className="card flashcard-container"
              style={{
                padding: 0,
                border: '1px solid #ddd',
                borderRadius: 8,
                marginBottom: 12,
                perspective: 1000,
                background: 'transparent',
                position: 'relative',
                flex: '1 1 auto',
                minHeight: 0,
                transform: 'none !important',
                transition: 'none !important'
              }}
            >
            <div
              style={{
                transition: 'transform 0.4s ease',
                transformStyle: 'preserve-3d',
                position: 'relative',
                height: '100%',
                minHeight: '300px',
                maxHeight: '60vh',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              <div
                style={{
                  position: 'absolute', inset: 0,
                  backfaceVisibility: 'hidden',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  alignItems: 'center',
                  padding: '12px',
                  borderRadius: 8,
                  overflowY: 'auto',
                  background: learnedIds.has(current.id) ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                }}
              >
                <span style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 700, textAlign: 'center', margin:0 as any, whiteSpace:'pre-wrap', display:'block', lineHeight: '1.3' }}>{normalizeNewlines(current.korean)}</span>
                {learnedIds.has(current.id) && (
                  <div style={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8, 
                    background: '#4CAF50', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: 24, 
                    height: 24, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: 12, 
                    fontWeight: 'bold' 
                  }}>
                    ✓
                  </div>
                )}
              </div>
              <div
                style={{
                  position: 'absolute', inset: 0,
                  backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
                  padding: '12px',
                  borderRadius: 8,
                  display: 'flex', flexDirection: 'column',
                  overflowY: 'auto',
                  background: learnedIds.has(current.id) ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                }}
              >
                <span style={{ fontSize: 'clamp(16px, 3.5vw, 18px)', fontWeight: 600, marginBottom: 6, whiteSpace:'pre-wrap', lineHeight: '1.3' }}>{normalizeNewlines(current.korean)}</span>
                <span style={{ color: '#555', whiteSpace:'pre-wrap', fontSize: 'clamp(14px, 3vw, 16px)', lineHeight: '1.4' }}>{normalizeNewlines(current.vietnamese)}</span>
                <span style={{ color: '#777', whiteSpace:'pre-wrap', fontSize: 'clamp(13px, 2.8vw, 15px)', lineHeight: '1.4' }}>{normalizeNewlines(current.english)}</span>
                {learnedIds.has(current.id) && (
                  <div style={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8, 
                    background: '#4CAF50', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: 24, 
                    height: 24, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: 12, 
                    fontWeight: 'bold' 
                  }}>
                    ✓
                  </div>
                )}
                {current.description && (
                  <div><span style={{ color: '#fff', whiteSpace:'pre-wrap', margin:0, fontSize: 'clamp(12px, 2.5vw, 14px)', lineHeight: '1.4' }}>{normalizeNewlines(current.description)}</span></div>
                )}
                {(current.example1_ko || current.example1_vi || current.example1_en) && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ marginBottom: 4 }}><span className="label" style={{ fontSize: 'clamp(11px, 2.2vw, 12px)' }}>Ví dụ 1 (KO):</span> <span className="value" style={{ whiteSpace:'pre-wrap', fontSize: 'clamp(12px, 2.5vw, 14px)' }}>{normalizeNewlines(current.example1_ko)}</span></div>
                    <div style={{ marginBottom: 4 }}><span className="label" style={{ fontSize: 'clamp(11px, 2.2vw, 12px)' }}>Ví dụ 1 (VI):</span> <span className="value" style={{ whiteSpace:'pre-wrap', fontSize: 'clamp(12px, 2.5vw, 14px)' }}>{normalizeNewlines(current.example1_vi)}</span></div>
                    <div><span className="label" style={{ fontSize: 'clamp(11px, 2.2vw, 12px)' }}>Ví dụ 1 (EN):</span> <span className="value" style={{ whiteSpace:'pre-wrap', fontSize: 'clamp(12px, 2.5vw, 14px)' }}>{normalizeNewlines(current.example1_en)}</span></div>
                  </div>
                )}
                {(current.example2_ko || current.example2_vi || current.example2_en) && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ marginBottom: 4 }}><span className="label" style={{ fontSize: 'clamp(11px, 2.2vw, 12px)' }}>Ví dụ 2 (KO):</span> <span className="value" style={{ whiteSpace:'pre-wrap', fontSize: 'clamp(12px, 2.5vw, 14px)' }}>{normalizeNewlines(current.example2_ko)}</span></div>
                    <div style={{ marginBottom: 4 }}><span className="label" style={{ fontSize: 'clamp(11px, 2.2vw, 12px)' }}>Ví dụ 2 (VI):</span> <span className="value" style={{ whiteSpace:'pre-wrap', fontSize: 'clamp(12px, 2.5vw, 14px)' }}>{normalizeNewlines(current.example2_vi)}</span></div>
                    <div><span className="label" style={{ fontSize: 'clamp(11px, 2.2vw, 12px)' }}>Ví dụ 2 (EN):</span> <span className="value" style={{ whiteSpace:'pre-wrap', fontSize: 'clamp(12px, 2.5vw, 14px)' }}>{normalizeNewlines(current.example2_en)}</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
        <div style={{ flex: '0 0 auto', display: 'flex', gap: '6px', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button 
              className="btn" 
              onClick={goPrev}
              style={{ 
                padding: '6px 10px', 
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                minWidth: 'auto'
              }}
              disabled={deck.length <= 1}
            >
              ← Trước
            </button>
            <button 
              className="btn" 
              onClick={goNext}
              style={{ 
                padding: '6px 10px', 
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                minWidth: 'auto'
              }}
              disabled={deck.length <= 1}
            >
              Sau →
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button 
              className="btn" 
              onClick={toggleFlip}
              style={{ 
                padding: '6px 10px', 
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                minWidth: 'auto'
              }}
            >
              Lật thẻ
            </button>
            {current && current.id && !learnedIds.has(current.id) && (
              <>
                <button 
                  className="btn" 
                  onClick={markUnknown}
                  style={{ 
                    padding: '6px 10px', 
                    fontSize: 'clamp(12px, 2.5vw, 14px)',
                    minWidth: 'auto'
                  }}
                >
                  Chưa thuộc
                </button>
                <button 
                  className="btn" 
                  onClick={markKnown}
                  style={{ 
                    padding: '6px 10px', 
                    fontSize: 'clamp(12px, 2.5vw, 14px)',
                    minWidth: 'auto'
                  }}
                >
                  Đã thuộc
                </button>
              </>
            )}
            {current && current.id && learnedIds.has(current.id) && (
              <button 
                className="btn" 
                onClick={() => {
                  if (!current || !current.id) return;
                  setLearnedIds(prev => {
                    const next = new Set(prev);
                    next.delete(current.id);
                    try {
                      localStorage.setItem(storageKey, JSON.stringify({ ids: Array.from(next), savedAt: Date.now() }));
                    } catch { }
                    return next;
                  });
                }}
                style={{ 
                  background: '#f44336', 
                  padding: '6px 10px', 
                  fontSize: 'clamp(12px, 2.5vw, 14px)',
                  minWidth: 'auto'
                }}
              >
                Bỏ đánh dấu
              </button>
            )}
            <button 
              className="btn" 
              onClick={onClose}
              style={{ 
                padding: '6px 10px', 
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                minWidth: 'auto'
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



import { useEffect, useMemo, useState } from 'react';
import type { StudyItem } from '../types';
import { normalizeNewlines } from '../utils/text';

type FlashcardModalProps = {
  items: StudyItem[];
  onClose: () => void;
  storageKey?: string;
};

export function FlashcardModal({ items, onClose, storageKey = 'korean-study:flashcards:general' }: FlashcardModalProps) {
  const deckAll = useMemo(() => items.filter(i => i.korean || i.vietnamese || i.english), [items]);
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
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [deckAll.length]);

  const deck = useMemo(() => deckAll.filter(i => !learnedIds.has(i.id)), [deckAll, learnedIds]);
  if (deckAll.length === 0) return null;

  const totalAll = deckAll.length;
  const learned = learnedIds.size;
  const notLearned = Math.max(0, totalAll - learned);
  const current = deck[index];

  function goNext() {
    const len = deck.length;
    if (len === 0) return;
    setIndex(prev => (prev + 1) % len);
    setIsFlipped(false);
  }

  function markKnown() {
    if (!current) return;
    setLearnedIds(prev => {
      const next = new Set(prev);
      next.add(current.id);
      try {
        localStorage.setItem(storageKey, JSON.stringify({ ids: Array.from(next), savedAt: Date.now() }));
      } catch { }
      return next;
    });
    setIsFlipped(false);
    // move index but respect updated deck on next render
    setIndex(prev => (prev >= deck.length - 1 ? 0 : prev));
  }

  function markUnknown() {
    if (!isFlipped) {
      setIsFlipped(true);
    } else {
      goNext();
    }
  }

  function toggleFlip() {
    setIsFlipped(prev => !prev);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Flashcards</h3>
        <div className="detail" style={{ marginBottom: 12 }}>
          <div><span className="label">Đã thuộc:</span> <span className="value">{learned}/{totalAll}</span></div>
          <div><span className="label">Chưa thuộc:</span> <span className="value">{notLearned}</span></div>
        </div>
        {notLearned === 0 ? (
          <div style={{ padding: 16, border: '1px solid #22305c', borderRadius: 8, marginBottom: 12, background: 'rgba(255,255,255,0.02)' }}>
            Bạn đã thuộc hết tất cả thẻ trong bộ hiện tại. Quay lại sau hoặc thêm nội dung mới.
          </div>
        ) : (
          <div
            className="card"
            onClick={toggleFlip}
            style={{
              padding: 0,
              border: '1px solid #ddd',
              borderRadius: 8,
              marginBottom: 12,
              cursor: 'pointer',
              perspective: 1000,
              background: 'transparent'
            }}
          >
            <div
              style={{
                transition: 'transform 0.4s ease',
                transformStyle: 'preserve-3d',
                position: 'relative',
                height: 410,
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              <div
                style={{
                  position: 'absolute', inset: 0,
                  backfaceVisibility: 'hidden',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  alignItems: 'center',
                  padding: 16,
                  borderRadius: 8,
                  overflowY: 'auto'
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', margin:0 as any, whiteSpace:'pre-wrap', display:'block' }}>{normalizeNewlines(current.korean)}</span>
              </div>
              <div
                style={{
                  position: 'absolute', inset: 0,
                  backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
                  padding: 16,
                  borderRadius: 8,
                  display: 'flex', flexDirection: 'column',
                  overflowY: 'auto'
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, whiteSpace:'pre-wrap' }}>{normalizeNewlines(current.korean)}</span>
                <span style={{ color: '#555', whiteSpace:'pre-wrap' }}>{normalizeNewlines(current.vietnamese)}</span>
                <span style={{ color: '#777', whiteSpace:'pre-wrap' }}>{normalizeNewlines(current.english)}</span>
                {current.description && (
                  <pre style={{ color: '#fff', whiteSpace:'pre-wrap', margin:0 }}>{current.description}</pre>
                )}
                {(current.example1_ko || current.example1_vi || current.example1_en) && (
                  <div style={{ marginTop: 8 }}>
                    <div><span className="label">Ví dụ 1 (KO):</span> <span className="value" style={{ whiteSpace:'pre-wrap' }}>{normalizeNewlines(current.example1_ko)}</span></div>
                    <div><span className="label">Ví dụ 1 (VI):</span> <span className="value" style={{ whiteSpace:'pre-wrap' }}>{normalizeNewlines(current.example1_vi)}</span></div>
                    <div><span className="label">Ví dụ 1 (EN):</span> <span className="value" style={{ whiteSpace:'pre-wrap' }}>{normalizeNewlines(current.example1_en)}</span></div>
                  </div>
                )}
                {(current.example2_ko || current.example2_vi || current.example2_en) && (
                  <div style={{ marginTop: 8 }}>
                    <div><span className="label">Ví dụ 2 (KO):</span> <span className="value" style={{ whiteSpace:'pre-wrap' }}>{normalizeNewlines(current.example2_ko)}</span></div>
                    <div><span className="label">Ví dụ 2 (VI):</span> <span className="value" style={{ whiteSpace:'pre-wrap' }}>{normalizeNewlines(current.example2_vi)}</span></div>
                    <div><span className="label">Ví dụ 2 (EN):</span> <span className="value" style={{ whiteSpace:'pre-wrap' }}>{normalizeNewlines(current.example2_en)}</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {notLearned > 0 && <button className="btn" onClick={markUnknown}>Chưa thuộc</button>}
          {notLearned > 0 && <button className="btn" onClick={markKnown}>Đã thuộc</button>}
          <button className="btn" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}



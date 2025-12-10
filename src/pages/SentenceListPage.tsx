import { useEffect, useMemo, useState } from 'react';
import type { SentenceItem } from '../types';
import { exportSentencesToCSV, parseSentencesCSV, areItemsDifferent } from '../utils/csv';
import { normalizeNewlines } from '../utils/text';
import { useParams, useNavigate } from 'react-router-dom';

const STORAGE_KEY_PREFIX = 'korean-study:sentences';

function loadSentences(cardId?: string): SentenceItem[] {
  const key = cardId ? `${STORAGE_KEY_PREFIX}:${cardId}` : STORAGE_KEY_PREFIX;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try { return JSON.parse(raw) as SentenceItem[]; } catch { return []; }
}

function saveSentences(items: SentenceItem[], cardId?: string) {
  const key = cardId ? `${STORAGE_KEY_PREFIX}:${cardId}` : STORAGE_KEY_PREFIX;
  localStorage.setItem(key, JSON.stringify(items));
}

export function SentenceListPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<SentenceItem[]>(() => loadSentences(cardId));
  const [selected, setSelected] = useState<SentenceItem | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    saveSentences(items, cardId);
  }, [items, cardId]);

  useEffect(() => {
    setItems(loadSentences(cardId));
    setSelected(null);
  }, [cardId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.sentence.toLowerCase().includes(q) ||
      i.vocabulary.toLowerCase().includes(q) ||
      i.grammar.toLowerCase().includes(q)
    );
  }, [items, query]);

  function handleImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    parseSentencesCSV(file).then(newItems => {
      setItems(prev => {
        const map = new Map<string, SentenceItem>();
        [...prev, ...newItems].forEach(i => map.set(i.id, i));
        const mergedItems = Array.from(map.values());
        
        if (areItemsDifferent(prev, mergedItems)) {
          // Could clear flashcard storage if needed in the future
        }
        
        return mergedItems;
      });
      e.target.value = '';
    });
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function handleClearAll() {
    const confirmed = window.confirm('Bạn có chắc muốn xóa tất cả dữ liệu hiện tại?');
    if (!confirmed) return;
    setSelected(null);
    setItems([]);
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

  return (
    <div className="list-page">
      <div className="toolbar">
        <input className="search" placeholder="Tìm kiếm..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="spacer" />
        <label className="btn">
          Import CSV
          <input type="file" accept=".csv" onChange={handleImportChange} hidden />
        </label>
        <label className="btn" onClick={() => exportSentencesToCSV(items, `sentences_${cardId || 'all'}.csv`)}>Export CSV</label>
        <label className="btn danger" onClick={handleClearAll}>Xóa tất cả</label>
        <label className="btn" onClick={() => navigate(cardId ? `/sentences/${cardId}/wrong` : '/sentences/wrong')}>Từ đã sai</label>
        <label className="btn" onClick={() => navigate(cardId ? `/sentences/${cardId}/check` : '/sentences/check')}>Kiểm tra</label>
      </div>

      <div className="table">
        <div className="thead" style={{ gridTemplateColumns: '2fr 1.5fr 0.8fr' }}>
          <div>Câu</div>
          <div>Từ vựng</div>
          <div>Hành động</div>
        </div>
        <div className="tbody">
          {filtered.map(n => {
            const vocabList = parseVocabulary(n.vocabulary);
            const vocabPreview = vocabList.slice(0, 2).map(v => v.word).join(', ') + (vocabList.length > 2 ? '...' : '');
            return (
              <div className="row" key={n.id} style={{ gridTemplateColumns: '2fr 1.5fr 0.8fr', cursor: 'pointer' }} onClick={() => setSelected(n)}>
                <div className="cell"><div className="cell-input">{n.sentence.substring(0, 80)}{n.sentence.length > 80 ? '...' : ''}</div></div>
                <div className="cell"><div className="cell-input">{vocabPreview || '-'}</div></div>
                <div className="cell actions">
                  <button className="btn small" onClick={(e) => { e.stopPropagation(); setSelected(n); }}>Xem</button>
                  <button className="btn small danger" onClick={(e) => { e.stopPropagation(); removeItem(n.id); }}>Xóa</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="empty">Chưa có dữ liệu. Hãy import CSV.</div>
          )}
        </div>
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" style={{ 
            userSelect: 'text', 
            WebkitUserSelect: 'text', 
            MozUserSelect: 'text',
            msUserSelect: 'text',
            position: 'relative', 
            zIndex: 1001,
            pointerEvents: 'auto',
            overflow: 'visible',
            maxWidth: '800px'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Chi tiết câu</h3>
            <div style={{ display:'grid', gap:12, overflow: 'visible' }}>
              <div style={{ userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>
                <div className="label" style={{ marginBottom: 4, fontWeight: 600 }}>Câu (Tiếng Hàn):</div>
                <div className="value" style={{ whiteSpace:'pre-wrap', userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible', fontSize: '1.1em' }}>{normalizeNewlines(selected.sentence)}</div>
              </div>
              
              {selected.vietnamese && (
                <div style={{ userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>
                  <div className="label" style={{ marginBottom: 4, fontWeight: 600 }}>Câu (Tiếng Việt):</div>
                  <div className="value" style={{ whiteSpace:'pre-wrap', userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible', fontSize: '1em' }}>{normalizeNewlines(selected.vietnamese)}</div>
                </div>
              )}
              
              {selected.vocabulary && (
                <div style={{ userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>
                  <div className="label" style={{ marginBottom: 4, fontWeight: 600 }}>Từ vựng:</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {parseVocabulary(selected.vocabulary).map((v, idx) => (
                      <div key={idx} style={{ padding: '8px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>{v.word}</div>
                        {v.category && <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)', marginBottom: 2 }}>Loại: {v.category}</div>}
                        {v.hanviet && <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>Hán Việt: {v.hanviet}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selected.grammar && (() => {
                const { analysis, examples } = parseGrammar(selected.grammar);
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
            </div>
            <button style={{ marginTop:8 }} className="btn" onClick={() => setSelected(null)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}


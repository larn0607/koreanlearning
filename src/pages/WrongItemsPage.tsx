import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { StudyItem, SentenceItem } from '../types';
import { exportToCSV, exportSentencesToCSV, loadWrongIds } from '../utils/csv';
import { ItemModal } from '../components/ItemModal';
import { normalizeNewlines } from '../utils/text';

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

function loadSentences(cardId?: string): SentenceItem[] {
  const key = cardId ? `${STORAGE_KEY_PREFIX}sentences:${cardId}` : `${STORAGE_KEY_PREFIX}sentences`;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SentenceItem[];
  } catch {
    return [];
  }
}

export function WrongItemsPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract category from pathname
  const category: 'vocab' | 'grammar' | 'sentences' | null = 
    location.pathname.startsWith('/vocab') ? 'vocab' : 
    location.pathname.startsWith('/grammar') ? 'grammar' :
    location.pathname.startsWith('/sentences') ? 'sentences' : null;
  
  const [wrongItems, setWrongItems] = useState<StudyItem[]>([]);
  const [wrongSentences, setWrongSentences] = useState<SentenceItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<StudyItem | null>(null);
  const [selectedSentence, setSelectedSentence] = useState<SentenceItem | null>(null);

  useEffect(() => {
    if (!category) return;
    
    const categoryKey = category === 'sentences' ? 'sentences' : category;
    const ids = loadWrongIds(categoryKey, cardId);
    
    if (category === 'sentences') {
      const allSentences = loadSentences(cardId);
      const wrong = allSentences.filter(s => ids.has(s.id));
      setWrongSentences(wrong);
    } else {
      const allItems = loadItems(category, cardId);
      const wrong = allItems.filter(i => ids.has(i.id));
      setWrongItems(wrong);
    }
  }, [category, cardId]);

  function handleExportCSV() {
    if (category === 'sentences') {
      exportSentencesToCSV(wrongSentences, `wrong_sentences_${cardId || 'all'}.csv`);
    } else {
      exportToCSV(wrongItems, `wrong_${category}_${cardId || 'all'}.csv`);
    }
  }

  function handleCheck() {
    // Set flag to indicate we're checking wrong items only
    const wrongOnlyKey = category === 'sentences'
      ? `korean-study:check-wrong-only:sentences${cardId ? `:${cardId}` : ''}`
      : `korean-study:check-wrong-only:${cardId ? `${category}:${cardId}` : category}`;
    localStorage.setItem(wrongOnlyKey, 'true');
    
    if (category === 'sentences') {
      navigate(cardId ? `/sentences/${cardId}/check` : '/sentences/check');
    } else {
      navigate(cardId ? `/${category}/${cardId}/check` : `/${category}/check`);
    }
  }

  // Parse vocabulary: word|category|hanviet\nword2|category2|hanviet2
  function parseVocabulary(vocab: string): Array<{ word: string; category: string; hanviet: string }> {
    if (!vocab.trim()) return [];
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
    const normalized = normalizeNewlines(grammar);
    const parts = normalized.split('\n---\n');
    const analysis = parts[0] || '';
    const examples = parts.slice(1).map(e => normalizeNewlines(e)).filter(e => e.trim());
    return { analysis, examples };
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

  const categoryName = category === 'vocab' ? 'Từ vựng' : category === 'grammar' ? 'Ngữ pháp' : 'Câu';
  const wrongCount = category === 'sentences' ? wrongSentences.length : wrongItems.length;

  return (
    <div className="list-page">
      <div className="toolbar">
        <button className="btn" onClick={() => {
          if (category === 'sentences') {
            navigate(cardId ? `/sentences/${cardId}` : '/sentences');
          } else {
            navigate(cardId ? `/${category}/${cardId}` : `/${category}`);
          }
        }}>
          ← Quay lại
        </button>
        <div className="spacer" />
        <span className={`badge ${category}`}>{categoryName}</span>
        <div style={{ fontWeight: 600, fontSize: 18 }}>Từ đã nhập sai ({wrongCount})</div>
        <div className="spacer" />
        <button className="btn" onClick={handleExportCSV} disabled={wrongCount === 0}>
          Export CSV
        </button>
        <button className="btn primary" onClick={handleCheck} disabled={wrongCount === 0}>
          Kiểm tra
        </button>
      </div>

      <div style={{ 
        maxWidth: 'min(1200px, calc(100vw - 32px))', 
        margin: '0 auto', 
        padding: '16px'
      }}>
        {wrongCount === 0 ? (
          <div style={{ 
            padding: '48px 24px', 
            textAlign: 'center',
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            background: 'rgba(255,255,255,0.02)',
            fontSize: '16px'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>✓</div>
            <div>Không có từ nào đã nhập sai.</div>
          </div>
        ) : category === 'sentences' ? (
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: '2fr 1.5fr 0.8fr' }}>
              <div>Câu</div>
              <div>Tiếng Việt</div>
              <div>Hành động</div>
            </div>
            <div className="tbody">
              {wrongSentences.map(item => (
                <div className="row" key={item.id} style={{ gridTemplateColumns: '2fr 1.5fr 0.8fr' }}>
                  <div className="cell">
                    <div className="cell-input">{item.sentence.substring(0, 80)}{item.sentence.length > 80 ? '...' : ''}</div>
                  </div>
                  <div className="cell">
                    <div className="cell-input">{item.vietnamese.substring(0, 60)}{item.vietnamese.length > 60 ? '...' : ''}</div>
                  </div>
                  <div className="cell actions">
                    <button className="btn small" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSentence(item);
                    }}>Xem chi tiết</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="table">
            <div className="thead">
              <div>Tiếng Hàn</div>
              <div>Tiếng Việt</div>
              <div>Tiếng Anh</div>
              <div>Hành động</div>
            </div>
            <div className="tbody">
              {wrongItems.map(item => (
                <div className="row" key={item.id}>
                  <div className="cell">
                    <div className="cell-input">{item.korean}</div>
                  </div>
                  <div className="cell">
                    <div className="cell-input">{item.vietnamese}</div>
                  </div>
                  <div className="cell">
                    <div className="cell-input">{item.english}</div>
                  </div>
                  <div className="cell actions">
                    <button className="btn small" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                    }}>Xem chi tiết</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal for vocab/grammar items */}
      <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />

      {/* Modal for sentences */}
      {selectedSentence && (
        <div className="modal-backdrop" onClick={() => setSelectedSentence(null)}>
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
                <div className="value" style={{ whiteSpace:'pre-wrap', userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible', fontSize: '1.1em' }}>{normalizeNewlines(selectedSentence.sentence)}</div>
              </div>
              
              {selectedSentence.vietnamese && (
                <div style={{ userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>
                  <div className="label" style={{ marginBottom: 4, fontWeight: 600 }}>Câu (Tiếng Việt):</div>
                  <div className="value" style={{ whiteSpace:'pre-wrap', userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible', fontSize: '1em' }}>{normalizeNewlines(selectedSentence.vietnamese)}</div>
                </div>
              )}
              
              {selectedSentence.vocabulary && (
                <div style={{ userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>
                  <div className="label" style={{ marginBottom: 4, fontWeight: 600 }}>Từ vựng:</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {parseVocabulary(selectedSentence.vocabulary).map((v, idx) => (
                      <div key={idx} style={{ padding: '8px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>{v.word}</div>
                        {v.category && <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)', marginBottom: 2 }}>Loại: {v.category}</div>}
                        {v.hanviet && <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>Hán Việt: {v.hanviet}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedSentence.grammar && (() => {
                const { analysis, examples } = parseGrammar(selectedSentence.grammar);
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
            <button style={{ marginTop:8 }} className="btn" onClick={() => setSelectedSentence(null)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}


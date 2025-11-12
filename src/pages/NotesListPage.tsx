import { useEffect, useMemo, useState } from 'react';
import type { NoteItem } from '../types';
import { exportNotesToCSV, parseNotesCSV, clearFlashcardStorage, areItemsDifferent } from '../utils/csv';
import { normalizeNewlines } from '../utils/text';
import { useParams } from 'react-router-dom';

const STORAGE_KEY_PREFIX = 'korean-study:notes';

function loadNotes(cardId?: string): NoteItem[] {
  const key = cardId ? `${STORAGE_KEY_PREFIX}:${cardId}` : STORAGE_KEY_PREFIX;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try { return JSON.parse(raw) as NoteItem[]; } catch { return []; }
}

function saveNotes(items: NoteItem[], cardId?: string) {
  const key = cardId ? `${STORAGE_KEY_PREFIX}:${cardId}` : STORAGE_KEY_PREFIX;
  localStorage.setItem(key, JSON.stringify(items));
}

export function NotesListPage() {
  const { cardId } = useParams();
  const [items, setItems] = useState<NoteItem[]>(() => loadNotes(cardId));
  const [selected, setSelected] = useState<NoteItem | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    saveNotes(items, cardId);
  }, [items, cardId]);

  useEffect(() => {
    setItems(loadNotes(cardId));
    setSelected(null);
  }, [cardId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.example.toLowerCase().includes(q)
    );
  }, [items, query]);

  function handleImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    parseNotesCSV(file).then(newItems => {
      setItems(prev => {
        const map = new Map<string, NoteItem>();
        [...prev, ...newItems].forEach(i => map.set(i.id, i));
        const mergedItems = Array.from(map.values());
        
        if (areItemsDifferent(prev, mergedItems)) {
          clearFlashcardStorage('vocab');
          clearFlashcardStorage('grammar');
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

  return (
    <div className="list-page">
      <div className="toolbar">
        <input className="search" placeholder="Tìm kiếm..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="spacer" />
        <label className="btn">
          Import CSV
          <input type="file" accept=".csv" onChange={handleImportChange} hidden />
        </label>
        <label className="btn" onClick={() => exportNotesToCSV(items, `notes_${cardId || 'all'}.csv`)}>Export CSV</label>
        <label className="btn danger" onClick={handleClearAll}>Xóa tất cả</label>
      </div>

      <div className="table">
        <div className="thead" style={{ gridTemplateColumns: '1.5fr 2fr 0.8fr' }}>
          <div>Tiêu đề</div>
          <div>Mô tả</div>
          <div>Hành động</div>
        </div>
        <div className="tbody">
          {filtered.map(n => (
            <div className="row" key={n.id} style={{ gridTemplateColumns: '1.5fr 2fr 0.8fr' }}>
              <div className="cell"><div className="cell-input">{n.title}</div></div>
              <div className="cell"><div className="cell-input">{n.description.substring(0, 100)}{n.description.length > 100 ? '...' : ''}</div></div>
              <div className="cell actions">
                <button className="btn small" onClick={() => setSelected(n)}>Xem</button>
                <button className="btn small danger" onClick={() => removeItem(n.id)}>Xóa</button>
              </div>
            </div>
          ))}
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
            overflow: 'visible'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{selected.title}</h3>
            <div style={{ display:'grid', gap:8, overflow: 'visible' }}>
              <div style={{ userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>
                <div className="label" style={{ marginBottom: 4 }}>Mô tả:</div>
                <div className="value" style={{ whiteSpace:'pre-wrap', userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>{normalizeNewlines(selected.description)}</div>
              </div>
              {selected.example && (
                <div style={{ userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>
                  <div className="label" style={{ marginBottom: 4 }}>Ví dụ:</div>
                  <div className="value" style={{ whiteSpace:'pre-wrap', userSelect: 'text', WebkitUserSelect: 'text', msUserSelect: 'text', MozUserSelect: 'text', overflow: 'visible' }}>{normalizeNewlines(selected.example)}</div>
                </div>
              )}
            </div>
            <button style={{ marginTop:8 }} className="btn" onClick={() => setSelected(null)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}


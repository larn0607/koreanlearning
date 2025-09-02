import { useEffect, useMemo, useState } from 'react';
import type { NoteItem } from '../types';
import { exportNotesToCSV, parseNotesCSV } from '../utils/csv';
import { normalizeNewlines } from '../utils/text';

const STORAGE_KEY = 'korean-study:notes';

function loadNotes(): NoteItem[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as NoteItem[]; } catch { return []; }
}

function saveNotes(items: NoteItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function NotesPage() {
  const [items, setItems] = useState<NoteItem[]>(loadNotes);
  const [selected, setSelected] = useState<NoteItem | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => { saveNotes(items); }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.summary.toLowerCase().includes(q)
    );
  }, [items, query]);

  function handleImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    parseNotesCSV(file).then(newItems => {
      setItems(prev => {
        const map = new Map<string, NoteItem>();
        [...prev, ...newItems].forEach(i => map.set(i.id, i));
        return Array.from(map.values());
      });
      e.target.value = '';
    });
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
        <label className="btn" onClick={() => exportNotesToCSV(items, 'notes.csv')}>Export CSV</label>
      </div>

      <div className="table">
        <div className="thead">
          <div>Nội dung</div>
          <div>Tóm tắt</div>
        </div>
        <div className="tbody">
          {filtered.map(n => (
            <div className="row" key={n.id}>
              <div className="cell"><div className="cell-input">{n.title}</div></div>
              <div className="cell"><div className="cell-input">{n.summary}</div></div>
              <div className="cell actions">
                <button className="btn small" onClick={() => setSelected(n)}>Xem</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty">Chưa có dữ liệu. Hãy import CSV.</div>
          )}
        </div>
      </div>

      {selected && (
        <div className="modal-backdrop">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{selected.title}</h3>
            <div style={{ display:'grid', gap:8 }}>
              <div><span className="label">Tóm tắt:</span> <span className="value" style={{ whiteSpace:'pre-wrap' }}>{normalizeNewlines(selected.summary)}</span></div>
              {selected.description_1 && <div><span className="label">Mô tả 1:</span> <span className="value" style={{ whiteSpace:'pre-wrap' }}>{normalizeNewlines(selected.description_1)}</span></div>}
              {selected.description_2 && <div><span className="label">Mô tả 2:</span> <span className="value" style={{ whiteSpace:'pre-wrap' }}>{normalizeNewlines(selected.description_2)}</span></div>}
              {selected.description_3 && <div><span className="label">Mô tả 3:</span> <span className="value" style={{ whiteSpace:'pre-wrap' }}>{normalizeNewlines(selected.description_3)}</span></div>}
              {selected.example_1 && <div><span className="label">Ví dụ 1:</span> <span className="value" style={{ whiteSpace:'pre-wrap' }}>{normalizeNewlines(selected.example_1)}</span></div>}
              {selected.example_2 && <div><span className="label">Ví dụ 2:</span> <span className="value" style={{ whiteSpace:'pre-wrap' }}>{normalizeNewlines(selected.example_2)}</span></div>}
              {selected.example_3 && <div><span className="label">Ví dụ 3:</span> <span className="value" style={{ whiteSpace:'pre-wrap' }}>{normalizeNewlines(selected.example_3)}</span></div>}
            </div>
            <button style={{ marginTop:8 }} className="btn" onClick={() => setSelected(null)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}



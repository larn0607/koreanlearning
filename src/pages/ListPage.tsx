import { useEffect, useMemo, useState } from 'react';
import { ItemModal } from '../components/ItemModal';
import { EditItemModal } from '../components/EditItemModal';
import { FlashcardModal } from '../components/FlashcardModal';
import type { StudyItem } from '../types';
import { useParams, useNavigate } from 'react-router-dom';
import { exportToCSV, parseCSV, clearFlashcardStorage, areItemsDifferent, clearCheckStorage, clearWrongItemsStorage } from '../utils/csv';

type ListPageProps = {
  category: 'vocab' | 'grammar';
};

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

function saveItems(category: string, items: StudyItem[], cardId?: string) {
  const key = STORAGE_KEY_PREFIX + (cardId ? `${category}:${cardId}` : category);
  localStorage.setItem(key, JSON.stringify(items));
}

export function ListPage({ category }: ListPageProps) {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<StudyItem[]>(() => loadItems(category, cardId));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showFlash, setShowFlash] = useState(false);
  const [editing, setEditing] = useState<StudyItem | null>(null);

  useEffect(() => {
    saveItems(category, items, cardId);
  }, [items, cardId]);

  useEffect(() => {
    setItems(loadItems(category, cardId));
    setSelectedId(null);
  }, [category, cardId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.korean.toLowerCase().includes(q) ||
      i.vietnamese.toLowerCase().includes(q) ||
      i.english.toLowerCase().includes(q)
    );
  }, [items, query]);

  function handleImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    parseCSV(file).then(newItems => {
      setItems(prev => {
        // merge by id if exists, else append
        const map = new Map<string, StudyItem>();
        [...prev, ...newItems].forEach(i => map.set(i.id, i));
        const mergedItems = Array.from(map.values());
        
        // Check if the merged data is different from current data
        if (areItemsDifferent(prev, mergedItems)) {
          const categoryKey = cardId ? `${category}:${cardId}` : category;
          // Clear flashcard storage when data changes
          clearFlashcardStorage(categoryKey);
          // Clear check storage when data changes
          clearCheckStorage(categoryKey);
          // Clear wrong items storage when data changes
          clearWrongItemsStorage(categoryKey);
        }
        
        return mergedItems;
      });
      e.target.value = '';
    });
  }

  // editing disabled in readonly list view

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function handleClearAll() {
    const confirmed = window.confirm('Bạn có chắc muốn xóa tất cả dữ liệu hiện tại?');
    if (!confirmed) return;
    const categoryKey = cardId ? `${category}:${cardId}` : category;
    clearFlashcardStorage(categoryKey);
    clearCheckStorage(categoryKey);
    clearWrongItemsStorage(categoryKey);
    setSelectedId(null);
    setEditing(null);
    setItems([]);
  }

  return (
    <div className="list-page">
      <div className="toolbar">
        <input
          className="search"
          placeholder="Tìm kiếm..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="spacer" />
        <label className="btn">
          Import CSV
          <input type="file" accept=".csv" onChange={handleImportChange} hidden />
        </label>
        <label className="btn" onClick={() => exportToCSV(items, `${category}_${cardId}.csv`)}>Export CSV</label>
        <label className="btn danger" onClick={handleClearAll}>Xóa tất cả</label>
        <label className="btn" onClick={() => setShowFlash(true)}>Flashcard</label>
        <label className="btn" onClick={() => navigate(cardId ? `/${category}/${cardId}/wrong` : `/${category}/wrong`)}>Từ đã sai</label>
        <label className="btn" onClick={() => {
          // Clear wrong-only mode flag when entering check from list page
          const wrongOnlyKey = `korean-study:check-wrong-only:${cardId ? `${category}:${cardId}` : category}`;
          localStorage.removeItem(wrongOnlyKey);
          navigate(cardId ? `/${category}/${cardId}/check` : `/${category}/check`);
        }}>Kiểm tra</label>
      </div>

      <div className="table">
        <div className="thead">
          <div>Tiếng Hàn</div>
          <div>Tiếng Việt</div>
          <div>Tiếng Anh</div>
          <div>Hành động</div>
        </div>
        <div className="tbody">
          {filtered.map(item => (
            <div className="row" key={item.id} onClick={() => setSelectedId(item.id)} style={{ cursor: 'pointer' }}>
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
                {/* <button className="btn small" onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}>Xem</button> */}
                <button className="btn small" onClick={(e) => { e.stopPropagation(); setEditing(item); }}>Chỉnh sửa</button>
                <button className="btn small danger" onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}>Xóa</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty">Chưa có dữ liệu. Hãy thêm hoặc import CSV.</div>
          )}
        </div>
      </div>

      <ItemModal item={items.find(i => i.id === selectedId) ?? null} onClose={() => setSelectedId(null)} />
      <EditItemModal
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(updated) => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))}
      />
      {showFlash && (
        <FlashcardModal
          items={filtered}
          onClose={() => setShowFlash(false)}
          storageKey={`korean-study:flashcards:${cardId ? `${category}:${cardId}` : category}`}
        />
      )}
    </div>
  );
}



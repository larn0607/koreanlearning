import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type Card = {
  id: string;
  name: string;
  createdAt: number;
};

const CARDS_KEY_PREFIX = 'korean-study:cards:notes';

function loadCards(): Card[] {
  const raw = localStorage.getItem(CARDS_KEY_PREFIX);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Card[];
  } catch {
    return [];
  }
}

function saveCards(cards: Card[]) {
  localStorage.setItem(CARDS_KEY_PREFIX, JSON.stringify(cards));
}

export function NotesCategoryPage() {
  const [cards, setCards] = useState<Card[]>(() => loadCards());
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setCards(loadCards());
    setShowAdd(false);
    setName('');
  }, []);

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => b.createdAt - a.createdAt);
  }, [cards]);

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = cards.some(c => c.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      window.alert('Tên thẻ đã tồn tại. Vui lòng chọn tên khác.');
      return;
    }
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const newCard: Card = { id, name: trimmed, createdAt: Date.now() };
    const next = [newCard, ...cards];
    setCards(next);
    saveCards(next);
    setName('');
    setShowAdd(false);
  }

  function handleDelete(cardId: string) {
    const confirmed = window.confirm('Xóa thẻ này? Dữ liệu bên trong vẫn được giữ.');
    if (!confirmed) return;
    const next = cards.filter(c => c.id !== cardId);
    setCards(next);
    saveCards(next);
  }

  function migrateStorageKeys(oldName: string, newName: string) {
    const itemsOldKey = `korean-study:notes:${oldName}`;
    const itemsNewKey = `korean-study:notes:${newName}`;
    const itemsRaw = localStorage.getItem(itemsOldKey);
    if (itemsRaw != null) {
      localStorage.setItem(itemsNewKey, itemsRaw);
      localStorage.removeItem(itemsOldKey);
    }
  }

  function startRename(card: Card) {
    setRenamingId(card.id);
    setRenameValue(card.name);
  }

  function confirmRename() {
    const targetId = renamingId;
    const newName = renameValue.trim();
    if (!targetId || !newName) {
      setRenamingId(null);
      setRenameValue('');
      return;
    }
    const old = cards.find(c => c.id === targetId);
    if (!old || old.name === newName) {
      setRenamingId(null);
      setRenameValue('');
      return;
    }
    const exists = cards.some(c => c.id !== targetId && c.name.trim().toLowerCase() === newName.toLowerCase());
    if (exists) {
      window.alert('Tên thẻ đã tồn tại. Vui lòng chọn tên khác.');
      return;
    }
    const next = cards.map(c => c.id === targetId ? { ...c, name: newName } : c);
    setCards(next);
    saveCards(next);
    migrateStorageKeys(old.name, newName);
    setRenamingId(null);
    setRenameValue('');
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue('');
  }

  return (
    <div className="list-page">
      <div className="toolbar">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className="badge notes">Note</span>
          <div style={{ fontWeight: 600, fontSize: 18 }}>Danh sách thẻ</div>
        </div>
        <div className="spacer" />
        <button className="btn primary" onClick={() => setShowAdd(true)}>+ Thêm thẻ</button>
      </div>

      <div className="table cards">
        <div className="thead">
          <div>Tên thẻ</div>
          <div>Ngày tạo</div>
          <div>Hành động</div>
        </div>
        <div className="tbody">
          {sortedCards.map(card => (
            <div className="row" key={card.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/notes/${card.name}`)}>
              <div className="cell">
                <div className="cell-input">{card.name}</div>
              </div>
              <div className="cell">
                <div className="cell-input">{new Date(card.createdAt).toLocaleString()}</div>
              </div>
              <div className="cell actions">
                <Link className="btn small" to={`/notes/${card.name}`} onClick={(e) => e.stopPropagation()}>Mở</Link>
                <button className="btn small" onClick={(e) => { e.stopPropagation(); startRename(card); }}>Sửa</button>
                <button className="btn small danger" onClick={(e) => { e.stopPropagation(); handleDelete(card.id); }}>Xóa</button>
              </div>
            </div>
          ))}
          {sortedCards.length === 0 && (
            <div className="empty">Chưa có thẻ nào cho Note. Nhấn "Thêm" để tạo.</div>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Tạo thẻ mới</h3>
            <div className="form-grid">
              <div>
                <label className="label" htmlFor="cardName">Tên thẻ</label>
                <input
                  id="cardName"
                  className="input"
                  placeholder="Ví dụ: Bài 1, Chủ đề Động từ, ..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                  autoFocus
                />
                <div className="helper">{(() => {
                  const trimmed = name.trim();
                  const isDup = trimmed && cards.some(c => c.name.trim().toLowerCase() === trimmed.toLowerCase());
                  return isDup ? 'Tên thẻ đã tồn tại.' : 'Đặt tên ngắn gọn, dễ nhận biết.';
                })()}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowAdd(false)}>Hủy</button>
              <button className="btn primary" onClick={handleCreate} disabled={!name.trim() || cards.some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase())}>Tạo</button>
            </div>
          </div>
        </div>
      )}

      {renamingId && (
        <div className="modal-backdrop" onClick={cancelRename}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Đổi tên thẻ</h3>
            <div className="form-grid">
              <div>
                <label className="label" htmlFor="renameCard">Tên mới</label>
                <input
                  id="renameCard"
                  className="input"
                  placeholder="Nhập tên thẻ mới"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); }}
                  autoFocus
                />
                <div className="helper">{(() => {
                  const trimmed = renameValue.trim();
                  const isDup = trimmed && cards.some(c => c.id !== renamingId && c.name.trim().toLowerCase() === trimmed.toLowerCase());
                  return isDup ? 'Tên thẻ đã tồn tại.' : '';
                })()}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={cancelRename}>Hủy</button>
              <button className="btn primary" onClick={confirmRename} disabled={!renameValue.trim() || cards.some(c => c.id !== renamingId && c.name.trim().toLowerCase() === renameValue.trim().toLowerCase())}>Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


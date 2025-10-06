import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type CategoryPageProps = {
  category: 'vocab' | 'grammar';
};

type Card = {
  id: string;
  name: string;
  createdAt: number;
};

const CARDS_KEY_PREFIX = 'korean-study:cards:';

function loadCards(category: string): Card[] {
  const raw = localStorage.getItem(CARDS_KEY_PREFIX + category);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Card[];
  } catch {
    return [];
  }
}

function saveCards(category: string, cards: Card[]) {
  localStorage.setItem(CARDS_KEY_PREFIX + category, JSON.stringify(cards));
}

export function CategoryPage({ category }: CategoryPageProps) {
  const [cards, setCards] = useState<Card[]>(() => loadCards(category));
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setCards(loadCards(category));
    setShowAdd(false);
    setName('');
  }, [category]);

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => b.createdAt - a.createdAt);
  }, [cards]);

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const newCard: Card = { id, name: trimmed, createdAt: Date.now() };
    const next = [newCard, ...cards];
    setCards(next);
    saveCards(category, next);
    setName('');
    setShowAdd(false);
  }

  function handleDelete(cardId: string) {
    const confirmed = window.confirm('Xóa thẻ này? Dữ liệu bên trong vẫn được giữ.');
    if (!confirmed) return;
    const next = cards.filter(c => c.id !== cardId);
    setCards(next);
    saveCards(category, next);
  }

  return (
    <div className="list-page">
      <div className="toolbar">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className={`badge ${category}`}>{category === 'vocab' ? 'Từ vựng' : 'Ngữ pháp'}</span>
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
            <div className="row" key={card.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/${category}/${card.id}`)}>
              <div className="cell">
                <div className="cell-input">{card.name}</div>
              </div>
              <div className="cell">
                <div className="cell-input">{new Date(card.createdAt).toLocaleString()}</div>
              </div>
              <div className="cell actions">
                <Link className="btn small" to={`/${category}/${card.id}`} onClick={(e) => e.stopPropagation()}>Mở</Link>
                <button className="btn small danger" onClick={(e) => { e.stopPropagation(); handleDelete(card.id); }}>Xóa</button>
              </div>
            </div>
          ))}
          {sortedCards.length === 0 && (
            <div className="empty">Chưa có thẻ nào cho {category === 'vocab' ? 'Từ vựng' : 'Ngữ pháp'}. Nhấn "Thêm" để tạo.</div>
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
                <div className="helper">Đặt tên ngắn gọn, dễ nhận biết.</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowAdd(false)}>Hủy</button>
              <button className="btn primary" onClick={handleCreate} disabled={!name.trim()}>Tạo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



import { useState } from 'react';
import type { StudyItem } from '../types';

type EditItemModalProps = {
  item: StudyItem | null;
  onClose: () => void;
  onSave: (item: StudyItem) => void;
};

export function EditItemModal({ item, onClose, onSave }: EditItemModalProps) {
  if (!item) return null;

  const [form, setForm] = useState<StudyItem>({ ...item });

  function handleChange<K extends keyof StudyItem>(key: K, value: StudyItem[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
    onClose();
  }

  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="modal-title">Chỉnh sửa</h3>
        <form onSubmit={handleSubmit} style={{ display:'grid', gap: 8, overflowY: 'auto', paddingRight: 4, flex: 1 }}>
          <label style={{ display:'grid', gap:4 }}>
            <span className="label">Tiếng Hàn</span>
            <input className="cell-input" value={form.korean} onChange={(e) => handleChange('korean', e.target.value)} />
          </label>
          <label style={{ display:'grid', gap:4 }}>
            <span className="label">Tiếng Việt</span>
            <input className="cell-input" value={form.vietnamese} onChange={(e) => handleChange('vietnamese', e.target.value)} />
          </label>
          <label style={{ display:'grid', gap:4 }}>
            <span className="label">Tiếng Anh</span>
            <input className="cell-input" value={form.english} onChange={(e) => handleChange('english', e.target.value)} />
          </label>
          <label style={{ display:'grid', gap:4 }}>
            <span className="label">Mô tả</span>
            <textarea className="cell-input" value={form.description ?? ''} onChange={(e) => handleChange('description', e.target.value)} />
          </label>
          <fieldset style={{ border:'1px solid var(--border)', borderRadius:8, padding:8 }}>
            <legend style={{ color:'#aab8ff' }}>Ví dụ 1</legend>
            <label style={{ display:'grid', gap:4 }}>
              <span className="label">KO</span>
              <input className="cell-input" value={form.example1_ko ?? ''} onChange={(e) => handleChange('example1_ko', e.target.value)} />
            </label>
            <label style={{ display:'grid', gap:4 }}>
              <span className="label">VI</span>
              <input className="cell-input" value={form.example1_vi ?? ''} onChange={(e) => handleChange('example1_vi', e.target.value)} />
            </label>
            <label style={{ display:'grid', gap:4 }}>
              <span className="label">EN</span>
              <input className="cell-input" value={form.example1_en ?? ''} onChange={(e) => handleChange('example1_en', e.target.value)} />
            </label>
          </fieldset>
          <fieldset style={{ border:'1px solid var(--border)', borderRadius:8, padding:8 }}>
            <legend style={{ color:'#aab8ff' }}>Ví dụ 2</legend>
            <label style={{ display:'grid', gap:4 }}>
              <span className="label">KO</span>
              <input className="cell-input" value={form.example2_ko ?? ''} onChange={(e) => handleChange('example2_ko', e.target.value)} />
            </label>
            <label style={{ display:'grid', gap:4 }}>
              <span className="label">VI</span>
              <input className="cell-input" value={form.example2_vi ?? ''} onChange={(e) => handleChange('example2_vi', e.target.value)} />
            </label>
            <label style={{ display:'grid', gap:4 }}>
              <span className="label">EN</span>
              <input className="cell-input" value={form.example2_en ?? ''} onChange={(e) => handleChange('example2_en', e.target.value)} />
            </label>
          </fieldset>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8, position:'sticky', bottom:0, background:'var(--panel)', paddingTop:8 }}>
            <button type="button" className="btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  );
}



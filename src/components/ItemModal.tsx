import type { StudyItem } from '../types';
import { normalizeNewlines } from '../utils/text';

type ItemModalProps = {
  item: StudyItem | null;
  onClose: () => void;
};

export function ItemModal({ item, onClose }: ItemModalProps) {
  if (!item) return null;
  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px',
      zIndex: 1000
    }}>
      <div className="modal" style={{
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
      }} onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Chi tiết</h3>
        <div className="detail">
          <div><span className="label">Tiếng Hàn:</span> <span className="value" style={{ whiteSpace: 'pre-wrap' }}>{normalizeNewlines(item.korean)}</span></div>
          <div><span className="label">Tiếng Việt:</span> <span className="value" style={{ whiteSpace: 'pre-wrap' }}>{normalizeNewlines(item.vietnamese)}</span></div>
          <div><span className="label">Tiếng Anh:</span> <span className="value" style={{ whiteSpace: 'pre-wrap' }}>{normalizeNewlines(item.english)}</span></div>
          {item.description && (
            <div><span className="label">Mô tả:</span> <span className="value" style={{ whiteSpace: 'pre-wrap' }}>{normalizeNewlines(item.description)}</span></div>
          )}
          {(item.example1_ko || item.example1_vi || item.example1_en) && (
            <div style={{ marginTop: 8 }}>
              <div><span className="label">Ví dụ 1 (KO):</span> <span className="value" style={{ whiteSpace: 'pre-wrap' }}>{normalizeNewlines(item.example1_ko)}</span></div>
              <div><span className="label">Ví dụ 1 (VI):</span> <span className="value" style={{ whiteSpace: 'pre-wrap' }}>{normalizeNewlines(item.example1_vi)}</span></div>
              <div><span className="label">Ví dụ 1 (EN):</span> <span className="value" style={{ whiteSpace: 'pre-wrap' }}>{normalizeNewlines(item.example1_en)}</span></div>
            </div>
          )}
          {(item.example2_ko || item.example2_vi || item.example2_en) && (
            <div style={{ marginTop: 8 }}>
              <div><span className="label">Ví dụ 2 (KO):</span> <span className="value" style={{ whiteSpace: 'pre-wrap' }}>{normalizeNewlines(item.example2_ko)}</span></div>
              <div><span className="label">Ví dụ 2 (VI):</span> <span className="value" style={{ whiteSpace: 'pre-wrap' }}>{normalizeNewlines(item.example2_vi)}</span></div>
              <div><span className="label">Ví dụ 2 (EN):</span> <span className="value" style={{ whiteSpace: 'pre-wrap' }}>{normalizeNewlines(item.example2_en)}</span></div>
            </div>
          )}
        </div>
        <button style={{ marginTop: 8 }} className="btn" onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
}


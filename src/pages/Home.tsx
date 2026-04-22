import { Link } from 'react-router-dom';
import { useState } from 'react';
import { getStudyLanguage, setStudyLanguage, type StudyLanguage } from '../utils/language';

export function Home() {
  const [language, setLanguage] = useState<StudyLanguage>(() => getStudyLanguage());

  function changeLanguage(next: StudyLanguage) {
    setStudyLanguage(next);
    setLanguage(next);
  }

  return (
    <>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600 }}>Ngôn ngữ học:</span>
          <button
            className={`btn ${language === 'ko' ? 'primary' : ''}`}
            onClick={() => changeLanguage('ko')}
            type="button"
          >
            Tiếng Hàn
          </button>
          <button
            className={`btn ${language === 'ja' ? 'primary' : ''}`}
            onClick={() => changeLanguage('ja')}
            type="button"
          >
            Tiếng Nhật
          </button>
        </div>
      </div>
      <div className="home-grid">
      <Link to="/vocab" className="card">
        <h2>📚 Từ vựng</h2>
        <p>
          Luyện tập từ vựng {language === 'ja' ? 'tiếng Nhật' : 'tiếng Hàn'} với nghĩa Việt và Anh.
        </p>
      </Link>
      <Link to="/grammar" className="card">
        <h2>🧩 Ngữ pháp</h2>
        <p>Ôn các mẫu ngữ pháp và ví dụ ({language === 'ja' ? 'Nhật' : 'Hàn'}).</p>
      </Link>
      <Link to="/notes" className="card">
        <h2>📝 Note</h2>
        <p>Ghi chú học tập: tiêu đề, tóm tắt và ví dụ.</p>
      </Link>
      <Link to="/sentences" className="card">
        <h2>💬 Câu</h2>
        <p>Học câu {language === 'ja' ? 'tiếng Nhật' : 'tiếng Hàn'} với từ vựng chính và phân tích ngữ pháp.</p>
      </Link>
      </div>
    </>
  );
}



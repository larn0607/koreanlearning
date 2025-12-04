import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="home-grid">
      <Link to="/vocab" className="card">
        <h2>📚 Từ vựng</h2>
        <p>Luyện tập từ vựng tiếng Hàn với nghĩa Việt và Anh.</p>
      </Link>
      <Link to="/grammar" className="card">
        <h2>🧩 Ngữ pháp</h2>
        <p>Ôn các mẫu ngữ pháp và ví dụ.</p>
      </Link>
      <Link to="/notes" className="card">
        <h2>📝 Note</h2>
        <p>Ghi chú học tập: tiêu đề, tóm tắt và ví dụ.</p>
      </Link>
      <Link to="/sentences" className="card">
        <h2>💬 Câu</h2>
        <p>Học câu tiếng Hàn với từ vựng chính và phân tích ngữ pháp.</p>
      </Link>
    </div>
  );
}



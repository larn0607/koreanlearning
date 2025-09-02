# Korean Study (Vocab • Grammar • Notes)

Ứng dụng web nhỏ giúp tự học tiếng Hàn:
- Quản lý danh sách Từ vựng (vocab) và Ngữ pháp (grammar)
- Ôn luyện bằng Flashcards với cơ chế đánh dấu "Đã thuộc" và ẩn trong 8 giờ
- Ghi chú học tập (Notes) có import/export CSV, xem chi tiết

## Chạy dự án

```bash
npm install
npm run dev
```

## Cấu trúc thư mục

```
vocab/
  data/                      # CSV mẫu (vocab, grammar, notes)
  public/
  src/
    components/              # Các modal và thành phần dùng chung
      EditItemModal.tsx      # Modal chỉnh sửa StudyItem
      ItemModal.tsx          # Modal xem chi tiết StudyItem
      FlashcardModal.tsx     # Modal flashcards (đảo thẻ, đếm đã thuộc)
    pages/
      Home.tsx               # Trang chủ, điều hướng tới vocab/grammar/notes
      ListPage.tsx           # Danh sách mục theo category (vocab|grammar)
      NotesPage.tsx          # Danh sách ghi chú, import/export, xem chi tiết
    utils/
      csv.ts                 # Hàm parse/export CSV cho study items và notes
      text.ts                # Tiện ích xử lý xuống dòng (\n)
    types.ts                 # Khai báo kiểu StudyItem và NoteItem
  dist/                      # Build output Vite
  README.md
```

## Tính năng chính

- Vocab/Grammar
  - Tìm kiếm theo KO/VI/EN
  - Import/Export CSV, lưu `localStorage` theo category
  - Xem chi tiết qua modal; Chỉnh sửa từng record qua Edit modal

- Flashcards
  - Lật thẻ để xem mặt sau; đánh dấu Đã thuộc/Chưa thuộc
  - Ẩn thẻ đã thuộc trong 8 giờ (lưu `localStorage` theo category)

- Notes
  - List "Nội dung" và "Tóm tắt"
  - Import/Export CSV với format:
    `id,title,summary,description_1,description_2,description_3,example_1,example_2,example_3`
  - Nhấn item để xem toàn bộ chi tiết

## Công nghệ

- React + TypeScript + Vite
- react-router-dom
- papaparse (CSV)

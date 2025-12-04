export type StudyItem = {
  id: string;
  korean: string;
  vietnamese: string;
  english: string;
  description?: string;
  example1_ko?: string;
  example1_vi?: string;
  example1_en?: string;
  example2_ko?: string;
  example2_vi?: string;
  example2_en?: string;
};

export type NoteItem = {
  id: string;
  title: string;
  description: string;
  example: string;
};

export type SentenceItem = {
  id: string;
  sentence: string;
  vietnamese: string;
  vocabulary: string; // Format: word|category|hanviet\nword2|category2|hanviet2
  grammar: string; // Format: analysis\n---\nexample1\nexample2
};



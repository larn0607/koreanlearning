import Papa, { type ParseResult } from 'papaparse';
import type { StudyItem, NoteItem } from '../types';

export function parseCSV(file: File): Promise<StudyItem[]> {
    debugger;
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<Record<string, string>>) => {
        const rows = results.data as Array<Record<string, string>>;
        const items: StudyItem[] = rows.map((row, index) => ({
          id: row.id || `${Date.now()}-${index}`,
          korean: row.korean || row.Korean || '',
          vietnamese: row.vietnamese || row.Vietnamese || row.Viet || '',
          english: row.english || row.English || '',
          description: row.description || row.Description || '',
          example1_ko: row.example1_ko || row.example1KO || row.example1Ko || row.Example1_ko || '',
          example1_vi: row.example1_vi || row.Example1_vi || '',
          example1_en: row.example1_en || row.Example1_en || '',
          example2_ko: row.example2_ko || row.example2KO || row.example2Ko || row.Example2_ko || '',
          example2_vi: row.example2_vi || row.Example2_vi || '',
          example2_en: row.example2_en || row.Example2_en || ''
        })).filter(i => i.korean || i.vietnamese || i.english);
        resolve(items);
      },
      error: (error: unknown) => reject(error)
    });
  });
}

export function exportToCSV(items: StudyItem[], filename = 'export.csv') {
  const csv = Papa.unparse(items);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseNotesCSV(file: File): Promise<NoteItem[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<Record<string, string>>) => {
        const rows = results.data as Array<Record<string, string>>;
        const items: NoteItem[] = rows.map((row, index) => ({
          id: row.id || `${Date.now()}-${index}`,
          title: row.title || row.Title || '',
          summary: row.summary || row.Summary || '',
          description_1: row.description_1 || row.Description_1 || '',
          description_2: row.description_2 || row.Description_2 || '',
          description_3: row.description_3 || row.Description_3 || '',
          example_1: row.example_1 || row.Example_1 || '',
          example_2: row.example_2 || row.Example_2 || '',
          example_3: row.example_3 || row.Example_3 || ''
        })).filter(i => i.title || i.summary);
        resolve(items);
      },
      error: (error: unknown) => reject(error)
    });
  });
}

export function exportNotesToCSV(items: NoteItem[], filename = 'notes.csv') {
  const csv = Papa.unparse(items);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}



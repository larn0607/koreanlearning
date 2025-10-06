import Papa, { type ParseResult } from 'papaparse';
import type { StudyItem, NoteItem } from '../types';

export function parseCSV(file: File): Promise<StudyItem[]> {
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
  // Ensure header has no quotes; quote all data fields (including id)
  const fields = [
    'id',
    'korean',
    'vietnamese',
    'english',
    'description',
    'example1_ko',
    'example1_vi',
    'example1_en',
    'example2_ko',
    'example2_vi',
    'example2_en'
  ];
  // First, generate CSV with quotes for all fields
  const csvAllQuoted = Papa.unparse(items, {
    columns: fields,
    quotes: true,
    header: true
  } as any);
  // Replace header line with plain header (no quotes)
  const lines = csvAllQuoted.split('\n');
  if (lines.length > 0) {
    lines[0] = fields.join(',');
  }
  const csv = lines.join('\n');
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

// Utility function to clear flashcard storage for a category
export function clearFlashcardStorage(category: string) {
  const storageKey = `korean-study:flashcards:${category}`;
  localStorage.removeItem(storageKey);
}

// Utility function to clear check storage for a category
export function clearCheckStorage(category: string) {
  const storageKey = `korean-study:check:${category}`;
  localStorage.removeItem(storageKey);
}

// Utility function to check if two arrays of items are different
export function areItemsDifferent<T extends { id: string }>(current: T[], imported: T[]): boolean {
  // If lengths are different, they're different
  if (current.length !== imported.length) return true;
  
  // Create maps for easier comparison
  const currentMap = new Map(current.map(item => [item.id, item]));
  const importedMap = new Map(imported.map(item => [item.id, item]));
  
  // Check if all IDs exist in both
  for (const id of currentMap.keys()) {
    if (!importedMap.has(id)) return true;
  }
  for (const id of importedMap.keys()) {
    if (!currentMap.has(id)) return true;
  }
  
  // Check if any content is different (deep comparison)
  for (const [id, currentItem] of currentMap) {
    const importedItem = importedMap.get(id);
    if (!importedItem) return true;
    
    // Compare all properties
    for (const key in currentItem) {
      if (currentItem[key] !== importedItem[key]) {
        return true;
      }
    }
  }
  
  return false;
}



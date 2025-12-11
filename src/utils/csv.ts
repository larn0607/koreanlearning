import Papa, { type ParseResult } from 'papaparse';
import type { StudyItem, NoteItem, SentenceItem } from '../types';

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
          description: row.description || row.Description || '',
          example: row.example || row.Example || ''
        })).filter(i => i.title || i.description);
        resolve(items);
      },
      error: (error: unknown) => reject(error)
    });
  });
}

export function exportNotesToCSV(items: NoteItem[], filename = 'notes.csv') {
  const fields = ['id', 'title', 'description', 'example'];
  const csvAllQuoted = Papa.unparse(items, {
    columns: fields,
    quotes: true,
    header: true
  } as any);
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

// Utility function to clear flashcard storage for a category
export function clearFlashcardStorage(category: string) {
  const storageKey = `korean-study:flashcards:${category}`;
  localStorage.removeItem(storageKey);
}

// Utility function to clear check storage for a category
export function clearCheckStorage(category: string) {
  const storageKey = `korean-study:check:${category}`;
  localStorage.removeItem(storageKey);
  // Also clear wrong-only check storage
  const wrongCheckKey = `korean-study:check-wrong:${category}`;
  localStorage.removeItem(wrongCheckKey);
  // Clear wrong-only mode flag
  const wrongOnlyFlagKey = `korean-study:check-wrong-only:${category}`;
  localStorage.removeItem(wrongOnlyFlagKey);
}

// Utility function to clear wrong items storage for a category
export function clearWrongItemsStorage(category: string) {
  const wrongKey = `korean-study:wrong:${category}`;
  localStorage.removeItem(wrongKey);
}

// Utility function to load wrong IDs with 8-hour expiration check
export function loadWrongIds(category: string, cardId?: string): Set<string> {
  const wrongKey = category.startsWith('sentences')
    ? `korean-study:wrong:sentences${cardId ? `:${cardId}` : ''}`
    : `korean-study:wrong:${cardId ? `${category}:${cardId}` : category}`;
  try {
    const wrongRaw = localStorage.getItem(wrongKey);
    if (!wrongRaw) return new Set();
    
    // Try to parse as new format with timestamp
    try {
      const parsed = JSON.parse(wrongRaw) as { ids: string[]; savedAt: number } | string[];
      
      // Check if it's the new format (object with savedAt)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'savedAt' in parsed) {
        const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
        if (!parsed.savedAt || Date.now() - parsed.savedAt > EIGHT_HOURS_MS) {
          localStorage.removeItem(wrongKey);
          return new Set();
        }
        return new Set(parsed.ids);
      }
      
      // Old format (just array) - migrate to new format
      if (Array.isArray(parsed)) {
        const migrated = { ids: parsed, savedAt: Date.now() };
        localStorage.setItem(wrongKey, JSON.stringify(migrated));
        return new Set(parsed);
      }
    } catch {
      // If parsing fails, try as old format
      const parsed = JSON.parse(wrongRaw) as string[];
      if (Array.isArray(parsed)) {
        const migrated = { ids: parsed, savedAt: Date.now() };
        localStorage.setItem(wrongKey, JSON.stringify(migrated));
        return new Set(parsed);
      }
    }
    
    return new Set();
  } catch {
    return new Set();
  }
}

// Utility function to save wrong IDs with timestamp
export function saveWrongIds(category: string, ids: Set<string>, cardId?: string) {
  const wrongKey = category.startsWith('sentences')
    ? `korean-study:wrong:sentences${cardId ? `:${cardId}` : ''}`
    : `korean-study:wrong:${cardId ? `${category}:${cardId}` : category}`;
  const data = { ids: Array.from(ids), savedAt: Date.now() };
  localStorage.setItem(wrongKey, JSON.stringify(data));
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

export function parseSentencesCSV(file: File): Promise<SentenceItem[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<Record<string, string>>) => {
        const rows = results.data as Array<Record<string, string>>;
        const items: SentenceItem[] = rows.map((row, index) => ({
          id: row.id || `${Date.now()}-${index}`,
          sentence: row.sentence || row.Sentence || '',
          vietnamese: row.vietnamese || row.Vietnamese || '',
          vocabulary: row.vocabulary || row.Vocabulary || '',
          grammar: row.grammar || row.Grammar || ''
        })).filter(i => i.sentence);
        resolve(items);
      },
      error: (error: unknown) => reject(error)
    });
  });
}

export function exportSentencesToCSV(items: SentenceItem[], filename = 'sentences.csv') {
  const fields = ['id', 'sentence', 'vietnamese', 'vocabulary', 'grammar'];
  const csvAllQuoted = Papa.unparse(items, {
    columns: fields,
    quotes: true,
    header: true
  } as any);
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



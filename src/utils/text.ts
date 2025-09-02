export function normalizeNewlines(input: string | undefined | null): string {
  if (input == null) return '';
  // Convert literal "\n" sequences into real newlines
  return String(input).replace(/\\n/g, '\n');
}



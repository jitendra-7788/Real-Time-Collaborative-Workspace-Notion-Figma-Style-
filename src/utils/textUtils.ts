export function calculateReadingTime(text: string): { words: number; minutes: number } {
  if (!text || text.trim() === '') {
    return { words: 0, minutes: 1 };
  }
  // Strip HTML tags if present
  const cleanText = text.replace(/<[^>]*>/g, ' ');
  const words = cleanText.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return { words, minutes };
}

export function extractHeadings(htmlOrText: string): Array<{ id: string; level: number; text: string }> {
  const headings: Array<{ id: string; level: number; text: string }> = [];
  const regex = /<h([1-3])[^>]*>(.*?)<\/h\1>/gi;
  let match;
  let index = 0;
  while ((match = regex.exec(htmlOrText)) !== null) {
    const level = parseInt(match[1], 10);
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    if (text) {
      const id = `heading-${index++}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      headings.push({ id, level, text });
    }
  }
  return headings;
}

export function highlightMatches(text: string, query: string): Array<{ text: string; isMatch: boolean }> {
  if (!query || query.trim() === '') {
    return [{ text, isMatch: false }];
  }
  const cleanQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${cleanQuery})`, 'gi');
  const parts = text.split(regex).filter((part) => part.length > 0);
  return parts.map((part) => ({
    text: part,
    isMatch: part.toLowerCase() === query.trim().toLowerCase(),
  }));
}

export function searchScore(item: { title: string; content?: string; tags?: string[] }, query: string): number {
  if (!query) return 1;
  const q = query.toLowerCase().trim();
  const title = item.title.toLowerCase();
  const content = (item.content || '').toLowerCase();
  
  if (title === q) return 100;
  if (title.startsWith(q)) return 80;
  if (title.includes(q)) return 60;
  
  if (item.tags && item.tags.some((tag) => tag.toLowerCase().includes(q))) {
    return 40;
  }
  if (content.includes(q)) return 20;
  return 0;
}

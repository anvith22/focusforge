import { ParkedThought } from '../types';

const STORAGE_KEY = 'focusforge_parked_thoughts';

export function getParkedThoughts(): ParkedThought[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveParkedThoughts(thoughts: ParkedThought[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(thoughts));
    window.dispatchEvent(new CustomEvent('focusforge-thoughts-changed'));
  } catch (err) {
    console.error('Failed to save parked thoughts:', err);
  }
}

export function addParkedThought(
  content: string,
  category: 'urgent_later' | 'idea' | 'random' = 'idea',
  sessionId?: string | null
): ParkedThought {
  const current = getParkedThoughts();
  const newThought: ParkedThought = {
    id: `thought-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    content: content.trim(),
    category,
    created_at: new Date().toISOString(),
    session_id: sessionId || null,
    converted_to_task: false,
  };
  saveParkedThoughts([newThought, ...current]);
  return newThought;
}

export function deleteParkedThought(id: string) {
  const current = getParkedThoughts();
  saveParkedThoughts(current.filter((t) => t.id !== id));
}

export function markThoughtConverted(id: string) {
  const current = getParkedThoughts();
  saveParkedThoughts(
    current.map((t) => (t.id === id ? { ...t, converted_to_task: true } : t))
  );
}

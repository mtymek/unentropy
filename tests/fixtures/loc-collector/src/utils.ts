// Utility functions
export function formatDate(date: Date): string {
  const dateString = date.toISOString();
  return dateString.substring(0, 10);
}

export function parseJsonSafe<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

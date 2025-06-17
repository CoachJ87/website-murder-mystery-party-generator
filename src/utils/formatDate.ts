import { formatDistanceToNow } from 'date-fns';

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "recently";
  }
}

// Keep the old function for backward compatibility
export function formatRelativeTime(dateString: string): string {
  return formatDate(dateString);
}

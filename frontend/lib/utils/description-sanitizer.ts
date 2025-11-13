/**
 * Description Sanitization Utility
 * Sanitizes PetFinder descriptions for safe use in AI prompts
 */

/**
 * Sanitize a PetFinder description by:
 * - Stripping HTML tags
 * - Removing PII (emails, phone numbers)
 * - Normalizing whitespace
 * - Truncating to 1,500 characters
 */
export function sanitizeDescription(description: string | null | undefined): string {
  if (!description) {
    return '';
  }

  let sanitized = String(description);

  // Strip HTML tags (simple regex approach - handles most common cases)
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  sanitized = sanitized
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  // Remove email addresses
  sanitized = sanitized.replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '');

  // Remove phone numbers (North American and international formats)
  sanitized = sanitized.replace(/\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})\b/g, '');

  // Normalize whitespace
  sanitized = sanitized
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/\n\s*\n/g, '\n') // Multiple newlines to single newline
    .trim();

  // Truncate to 1,500 characters with ellipsis if needed
  const MAX_LENGTH = 1500;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH - 3) + '...';
  }

  return sanitized;
}


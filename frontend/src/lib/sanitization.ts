export const MAX_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_CONTACT_INFO_LENGTH = 200;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Trims whitespace and removes HTML tags from the input string.
 * @param text The input string to sanitize.
 * @returns The sanitized string.
 */
export function sanitizeInput(text: string): string {
  if (!text) return "";
  // Trim whitespace
  let sanitized = text.trim();
  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>?/gm, "");
  return sanitized;
}

/**
 * Validates that the input string does not exceed the maximum length.
 * @param text The input string to validate.
 * @param maxLength The maximum allowed length.
 * @param fieldName The name of the field for the error message.
 * @throws ValidationError if the input exceeds the maximum length.
 */
export function validateInput(
  text: string,
  maxLength: number,
  fieldName: string,
): void {
  if (text && text.length > maxLength) {
    throw new ValidationError(
      `${fieldName} cannot exceed ${maxLength} characters.`,
    );
  }
}

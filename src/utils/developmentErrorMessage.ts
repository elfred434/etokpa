/**
 * Returns a bounded diagnostic message only in Vite development mode. It never
 * returns stacks, credentials or full URLs; production receives no raw message.
 */
export function getDevelopmentErrorMessage(error: unknown, maxLength = 500): string | undefined {
  if (!import.meta.env.DEV) return undefined;

  let rawMessage: string | undefined;
  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error && typeof error === 'object') {
    const value = error as {
      message?: unknown;
      response?: { data?: { message?: unknown } };
    };
    rawMessage = typeof value.response?.data?.message === 'string'
      ? value.response.data.message
      : typeof value.message === 'string'
        ? value.message
        : undefined;
  }
  if (!rawMessage) return undefined;

  const message = rawMessage
    .split(/\r?\n/)
    .filter((line) => !/^\s*(?:at\s+\S+|#\d+\s+|file\s+["']|[-=]{3,}\s*stack|stack trace\b|traceback\b|caused by:\s|[^\s@]+@(?:https?|file):)/i.test(line))
    .join(' ')
    .replace(/\bBearer\s*:?\s*[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/\b(?:ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{16,}\b/gi, '[redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gi, '[redacted]')
    .replace(/\b(password|token|secret|authorization|api[_ -]?key|client[_ -]?secret|access[_ -]?token|refresh[_ -]?token|app[_ -]?key|private[_ -]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/https?:\/\/[^\s]+/gi, '[URL]')
    .replace(/\b[A-Za-z0-9_-]{48,}\b/g, '[redacted]')
    .replace(/[\t ]+/g, ' ')
    .trim()
    .slice(0, maxLength);

  return message || undefined;
}

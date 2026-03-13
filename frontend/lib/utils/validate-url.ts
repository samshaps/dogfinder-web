/**
 * Validates a URL by making a lightweight HEAD request.
 * Returns true for 2xx/3xx responses, false for 4xx/5xx or timeouts.
 *
 * Used to detect dead adoption links from RescueGroups before serving results.
 */
export async function validateUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

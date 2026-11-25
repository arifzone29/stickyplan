import { MAX_MAPS_URL_LENGTH, type MapsParseResult } from './types';

const DEDICATED_MAPS_HOSTS = new Set([
  'maps.app.goo.gl',
  'maps.google.com',
  'maps.google.co.id',
]);

const GOOGLE_MAPS_PATH_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'google.co.id',
  'www.google.co.id',
  'goo.gl',
]);

const EMBEDDED_HTTPS_URL_REGEX = /https:\/\/[^\s"'<>]+/i;
const ANY_SCHEME_PREFIX_REGEX = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const TRAILING_PUNCTUATION_REGEX = /[).,;!?\]}]+$/;

function stripTrailingPunctuation(rawUrl: string): string {
  return rawUrl.replace(TRAILING_PUNCTUATION_REGEX, '');
}

export function isAllowedGoogleMapsUrl(rawUrl: string): boolean {
  if (!rawUrl || rawUrl.length > MAX_MAPS_URL_LENGTH) return false;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;
  if (parsed.username !== '' || parsed.password !== '') return false;

  const hostname = parsed.hostname.toLowerCase();
  if (DEDICATED_MAPS_HOSTS.has(hostname)) return true;

  if (GOOGLE_MAPS_PATH_HOSTS.has(hostname)) {
    return (
      parsed.pathname === '/maps' || parsed.pathname.startsWith('/maps/')
    );
  }

  return false;
}

export function buildGoogleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function parseSmartMapsInput(
  rawInput: string | null | undefined,
): MapsParseResult {
  if (rawInput === null || rawInput === undefined) {
    return { status: 'empty', url: null };
  }

  const trimmed = rawInput.trim();
  if (trimmed.length === 0) {
    return { status: 'empty', url: null };
  }

  if (trimmed.length > MAX_MAPS_URL_LENGTH) {
    return {
      status: 'invalid',
      message: 'Tautan lokasi terlalu panjang (maksimal 2.048 karakter).',
    };
  }

  const embeddedHttpsMatch = EMBEDDED_HTTPS_URL_REGEX.exec(trimmed);
  if (embeddedHttpsMatch) {
    const candidateUrl = stripTrailingPunctuation(embeddedHttpsMatch[0]);
    if (!isAllowedGoogleMapsUrl(candidateUrl)) {
      return {
        status: 'invalid',
        message:
          'Hanya tautan resmi HTTPS Google Maps (maps.app.goo.gl atau google.com/maps) yang diizinkan.',
      };
    }
    return { status: 'direct_url', url: candidateUrl };
  }

  if (ANY_SCHEME_PREFIX_REGEX.test(trimmed)) {
    return {
      status: 'invalid',
      message:
        'Skema tautan tidak aman atau tidak didukung. Gunakan tautan resmi https:// Google Maps atau ketik nama tempat.',
    };
  }

  return {
    status: 'search_fallback',
    query: trimmed,
    url: buildGoogleMapsSearchUrl(trimmed),
  };
}

import { describe, expect, it } from 'vitest';
import { isAllowedGoogleMapsUrl, parseSmartMapsInput } from '../../src/domain/mapsUrl';

describe('mapsUrl parser and sanitizer', () => {
  it('returns empty status for blank or whitespace-only input', () => {
    expect(parseSmartMapsInput('')).toEqual({ status: 'empty', url: null });
    expect(parseSmartMapsInput('    ')).toEqual({ status: 'empty', url: null });
  });

  it('accepts official HTTPS Google Maps links across global and Indonesian domains', () => {
    const validUrls = [
      'https://maps.app.goo.gl/XyZ123AbC',
      'https://maps.google.com/?q=-6.175392,106.827153',
      'https://maps.google.co.id/maps?q=Bandung',
      'https://www.google.com/maps/place/Monumen+Nasional',
      'https://google.com/maps/search/?api=1&query=Gambir',
      'https://www.google.co.id/maps/dir/Jakarta/Bandung',
      'https://goo.gl/maps/9xYzAbC',
    ];

    for (const url of validUrls) {
      expect(isAllowedGoogleMapsUrl(url)).toBe(true);
      expect(parseSmartMapsInput(url)).toEqual({
        status: 'direct_url',
        url,
      });
    }
  });

  it('extracts clean HTTPS Maps link from mixed mobile Share text with address and punctuation', () => {
    const sharedText =
      'Hotel Majapahit Surabaya\nJl. Tunjungan No.65, Genteng\n(https://maps.app.goo.gl/XyZ123AbC).';
    expect(parseSmartMapsInput(sharedText)).toEqual({
      status: 'direct_url',
      url: 'https://maps.app.goo.gl/XyZ123AbC',
    });
  });

  it('converts plain location names into safe Google Maps search fallback URLs', () => {
    const res = parseSmartMapsInput('Stasiun Gambir Pintu Selatan');
    expect(res).toEqual({
      status: 'search_fallback',
      query: 'Stasiun Gambir Pintu Selatan',
      url: 'https://www.google.com/maps/search/?api=1&query=Stasiun%20Gambir%20Pintu%20Selatan',
    });
  });

  it('rejects XSS schemes, non-HTTPS links, lookalike domains, and non-maps Google paths', () => {
    const maliciousInputs = [
      'javascript:alert(1)',
      'JAVASCRIPT:alert(document.cookie)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'http://maps.google.com/?q=Jakarta',
      'https://evil.com/maps/place/Fake',
      'https://maps.google.com.evil.com/?q=1',
      'https://www.google.com/search?q=not+maps',
      'https://goo.gl/not-maps-shortlink',
      `https://maps.app.goo.gl/${'a'.repeat(2100)}`,
    ];

    for (const bad of maliciousInputs) {
      const parsed = parseSmartMapsInput(bad);
      expect(parsed.status).toBe('invalid');
    }
  });
});

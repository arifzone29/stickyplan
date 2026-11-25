import { describe, expect, it } from 'vitest';
import {
  formatDaySheetAsPlainText,
  formatTripAsPlainText,
} from '../../src/domain/textFormatter';
import { createLampungDefaultStore } from '../../src/domain/seedData';

describe('textFormatter (WhatsApp / Notes backup v2.0)', () => {
  it('formats single day sheet and full trip cleanly into WhatsApp text', () => {
    const store = createLampungDefaultStore();
    const day1Text = formatDaySheetAsPlainText(store.day_sheets[0]!);
    expect(day1Text).toContain('*Kamis, 26 Nov 2026*');
    expect(day1Text).toContain('_Kedatangan dan Kunjungan ke Mitra_');
    expect(day1Text).toContain('• 10:30 - Penjemputan rombongan');

    const fullText = formatTripAsPlainText(store);
    expect(fullText).toContain('*Audit Perum LKBN ANTARA Biro Lampung*');
    expect(fullText).toContain('Kamis, 26 Nov 2026 — Kedatangan dan Kunjungan ke Mitra');
    expect(fullText).toContain('Jumat, 27 Nov 2026 — Lanjutan Kunjungan ke Mitra');
  });
});

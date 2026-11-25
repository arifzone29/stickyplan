import { describe, expect, it } from 'vitest';
import { parseBulkInputText } from '../../src/domain/bulkParser';

describe('bulkParser (Pipe, Word/Excel Tab, and WhatsApp Space formats)', () => {
  it('parses pipe-delimited rows with time normalization and smart Maps conversion', () => {
    const raw =
      '9.00 | Kunjungan ke Saibumi | Peninjauan mitra daerah | Saibumi Lampung\n14:45 | Radar Lampung | Evaluasi PSO | https://maps.app.goo.gl/RadarLpg1';

    const items = parseBulkInputText(raw);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      start_time: '09:00',
      title: 'Kunjungan ke Saibumi',
      description: 'Peninjauan mitra daerah',
      maps_url:
        'https://www.google.com/maps/search/?api=1&query=Saibumi%20Lampung',
    });
    expect(items[1]).toEqual({
      start_time: '14:45',
      title: 'Radar Lampung',
      description: 'Evaluasi PSO',
      maps_url: 'https://maps.app.goo.gl/RadarLpg1',
    });
  });

  it('parses Word/Excel tab-separated tables, skips header row, and preserves time range in description', () => {
    const excelPaste = [
      'Waktu\tAgenda\tKeterangan\tLokasi',
      '10.30–12.00\tPenjemputan rombongan\tMenjemput tim Komdigi di bandara\tBandara Radin Inten II Lampung',
      '17.00–selesai\tPengantaran ke hotel\tIstirahat malam',
    ].join('\n');

    const items = parseBulkInputText(excelPaste);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      start_time: '10:30',
      title: 'Penjemputan rombongan',
      description: '10.30–12.00 | Menjemput tim Komdigi di bandara',
      maps_url:
        'https://www.google.com/maps/search/?api=1&query=Bandara%20Radin%20Inten%20II%20Lampung',
    });
    expect(items[1]).toEqual({
      start_time: '17:00',
      title: 'Pengantaran ke hotel',
      description: '17.00–selesai | Istirahat malam',
      maps_url: null,
    });
  });

  it('parses fast WhatsApp space-separated schedule lines and nullifies unsafe Maps schemes', () => {
    const waText = [
      '09:00 Check in hotel',
      '10.30-12.00 Penjemputan rombongan',
      '13:00 | Makan siang | Di Mbok Wito | javascript:alert(1)',
    ].join('\n');

    const items = parseBulkInputText(waText);
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({
      start_time: '09:00',
      title: 'Check in hotel',
      description: null,
      maps_url: null,
    });
    expect(items[1]).toEqual({
      start_time: '10:30',
      title: 'Penjemputan rombongan',
      description: '10.30-12.00',
      maps_url: null,
    });
    expect(items[2]?.maps_url).toBeNull();
  });
});

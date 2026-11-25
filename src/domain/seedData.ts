import type { StickyPlanStoreV1 } from './types';

const LAMPUNG_SEED_DATA: StickyPlanStoreV1 = {
  schema_version: 1,
  last_exported_at: null,
  trip: {
    id: 'trip-audit-antara-lampung-2026',
    title: 'Audit Perum LKBN ANTARA Biro Lampung',
    created_at: '2026-11-25T16:40:00+07:00',
    updated_at: '2026-11-25T16:40:00+07:00',
  },
  day_sheets: [
    {
      id: 'day-2026-11-26',
      date: '2026-11-26',
      note_color: 'warm-yellow',
      day_summary: 'Kedatangan dan Kunjungan ke Mitra',
      items: [
        {
          id: 'item-1-1',
          start_time: '10:30',
          title: 'Penjemputan rombongan',
          description:
            '10.30–12.00 | Menjemput tim Komdigi dan staf ANTARA Pusat di Bandara Radin Inten II.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=Bandara+Radin+Inten+II+Lampung',
        },
        {
          id: 'item-1-2',
          start_time: '13:00',
          title: 'Perjalanan menuju Mbok Wito',
          description:
            '13.00–14.00 | Perjalanan dari Bandara Radin Inten II menuju Mbok Wito.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=Mbok+Wito+Lampung',
        },
        {
          id: 'item-1-3',
          start_time: '14:00',
          title: 'Makan siang bersama',
          description: '14.00–14.30 | Makan siang bersama di Mbok Wito.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=Mbok+Wito+Lampung',
        },
        {
          id: 'item-1-4',
          start_time: '14:30',
          title: 'Perjalanan menuju Radar',
          description: '14.30–14.45 | Perjalanan dari Mbok Wito menuju Radar.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=Radar+Lampung',
        },
        {
          id: 'item-1-5',
          start_time: '14:45',
          title: 'Kunjungan ke Radar',
          description:
            '14.45–15.45 | Kegiatan kunjungan dan peninjauan di Radar.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=Radar+Lampung',
        },
        {
          id: 'item-1-6',
          start_time: '15:45',
          title: 'Perjalanan menuju La Nugraha',
          description: '15.45–16.00 | Perjalanan dari Radar menuju La Nugraha.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=La+Nugraha+Lampung',
        },
        {
          id: 'item-1-7',
          start_time: '16:00',
          title: 'Kunjungan ke La Nugraha',
          description:
            '16.00–17.00 | Kegiatan kunjungan dan peninjauan di La Nugraha.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=La+Nugraha+Lampung',
        },
        {
          id: 'item-1-8',
          start_time: '17:00',
          title: 'Pengantaran ke Hotel Grand Mercure Lampung',
          description:
            '17.00–selesai | Mengantarkan tim Komdigi dan staf ANTARA Pusat menuju Hotel Grand Mercure Lampung untuk beristirahat.',
          maps_url: 'https://maps.app.goo.gl/n1AaRHHuubSzGed98',
        },
      ],
    },
    {
      id: 'day-2026-11-27',
      date: '2026-11-27',
      note_color: 'mint',
      day_summary: 'Lanjutan Kunjungan ke Mitra',
      items: [
        {
          id: 'item-2-1',
          start_time: '09:00',
          title: 'Penjemputan rombongan',
          description:
            '09.00–10.00 | Menjemput tim Komdigi dan staf terkait di hotel.',
          maps_url: null,
        },
        {
          id: 'item-2-2',
          start_time: '10:30',
          title: 'Perjalanan menuju Saibumi',
          description: '10.30–11.00 | Perjalanan dari hotel menuju Saibumi.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=Saibumi+Lampung',
        },
        {
          id: 'item-2-3',
          start_time: '11:00',
          title: 'Kunjungan ke Saibumi',
          description:
            '11.00–12.00 | Kegiatan kunjungan dan peninjauan di Saibumi.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=Saibumi+Lampung',
        },
        {
          id: 'item-2-4',
          start_time: '12:00',
          title: "Sholat Jum'at",
          description: "12.00–13.00 | Sholat Jum'at di Masjid Al-Bakrie.",
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=Masjid+Al+Bakrie+Lampung',
        },
        {
          id: 'item-2-5',
          start_time: '13:00',
          title: 'Makan siang bersama',
          description: '13.00–13.50 | Makan siang di rumah makan Buk Lin.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=Rumah+Makan+Buk+Lin+Lampung',
        },
        {
          id: 'item-2-6',
          start_time: '13:50',
          title: 'Perjalanan menuju Harian KinniID',
          description:
            '13.50–14.00 | Perjalanan dari rumah makan Buk Lin menuju kantor Harian KinniID.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=Harian+KinniID+Lampung',
        },
        {
          id: 'item-2-7',
          start_time: '14:00',
          title: 'Kunjungan ke Harian KinniID',
          description:
            '14.00–15.00 | Kegiatan kunjungan dan peninjauan di Harian KinniID.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=Harian+KinniID+Lampung',
        },
        {
          id: 'item-2-8',
          start_time: '15:00',
          title: 'Perjalanan menuju LKBN ANTARA',
          description:
            '15.00–15.15 | Perjalanan dari Harian Kinni menuju kantor LKBN ANTARA Biro Lampung.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=LKBN+ANTARA+Biro+Lampung',
        },
        {
          id: 'item-2-9',
          start_time: '15:15',
          title: 'Istirahat dan sholat',
          description:
            '15.15–18.30 | Waktu istirahat dan pelaksanaan ibadah sholat di LKBN ANTARA Biro Lampung.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=LKBN+ANTARA+Biro+Lampung',
        },
        {
          id: 'item-2-10',
          start_time: '18:30',
          title: 'Perjalanan menuju WaHaHa Seafood',
          description:
            '18.30–18.40 | Perjalanan dari kantor LKBN ANTARA Biro Lampung menuju WaHaHa Seafood.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=WaHaHa+Seafood+Lampung',
        },
        {
          id: 'item-2-11',
          start_time: '18:40',
          title: 'Makan malam bersama',
          description:
            '18.40–selesai | Makan malam bersama tim Komdigi dan staf ANTARA di Seafood Wahaha.',
          maps_url:
            'https://www.google.com/maps/search/?api=1&query=WaHaHa+Seafood+Lampung',
        },
      ],
    },
  ],
};

export function createLampungDefaultStore(): StickyPlanStoreV1 {
  return structuredClone(LAMPUNG_SEED_DATA);
}

export function upgradeLampungSeedStoreIfNeeded(
  store: StickyPlanStoreV1,
): { store: StickyPlanStoreV1; changed: boolean } {
  if (store.trip.id !== 'trip-audit-antara-lampung-2026') {
    return { store, changed: false };
  }

  let changed = false;
  const updatedSheets = store.day_sheets.map((sheet) => {
    if (sheet.date !== '2026-11-26') return sheet;
    const updatedItems = sheet.items.map((item) => {
      if (
        item.id === 'item-1-8' &&
        item.start_time === '17:00' &&
        item.title === 'Pengantaran ke hotel' &&
        item.maps_url === null
      ) {
        changed = true;
        return {
          ...item,
          title: 'Pengantaran ke Hotel Grand Mercure Lampung',
          description:
            '17.00–selesai | Mengantarkan tim Komdigi dan staf ANTARA Pusat menuju Hotel Grand Mercure Lampung untuk beristirahat.',
          maps_url: 'https://maps.app.goo.gl/n1AaRHHuubSzGed98',
        };
      }
      return item;
    });
    return changed ? { ...sheet, items: updatedItems } : sheet;
  });

  if (!changed) return { store, changed: false };

  return {
    store: {
      ...store,
      day_sheets: updatedSheets,
    },
    changed: true,
  };
}

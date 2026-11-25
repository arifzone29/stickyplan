import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../src/app';
import {
  createLocalStorageRepository,
  type StorageBackend,
} from '../../src/storage/repository';

class TestStorage implements StorageBackend {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe('StickyPlan v2.0 UI flows (Lampung Rundown, Bulk Input, Reorder & ConfirmModal)', () => {
  let storage: TestStorage;

  beforeEach(() => {
    storage = new TestStorage();
  });

  it('boots with Audit Perum LKBN ANTARA Biro Lampung on Kamis 26 Nov 2026 and navigates to 27 Nov', async () => {
    const repo = createLocalStorageRepository({
      storage,
      storageKey: 'ui_v2_test',
    });

    render(<App repository={repo} getTodayLocal={() => '2026-11-26'} />);

    expect(
      screen.getByText('Audit Perum LKBN ANTARA Biro Lampung'),
    ).toBeInTheDocument();
    expect(screen.getByText('Kamis, 26 Nov 2026')).toBeInTheDocument();
    expect(
      screen.getByText('Kedatangan dan Kunjungan ke Mitra'),
    ).toBeInTheDocument();
    expect(screen.getByText('8 kegiatan')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hari Berikutnya/i }));
    expect(screen.getByText('Jumat, 27 Nov 2026')).toBeInTheDocument();
    expect(screen.getByText('11 kegiatan')).toBeInTheDocument();
  });

  it('supports single-open accordion, touch reorder + Urutkan Jam, Bulk Input live preview, and ConfirmModal delete', async () => {
    const repo = createLocalStorageRepository({
      storage,
      storageKey: 'ui_v2_test',
    });

    render(<App repository={repo} getTodayLocal={() => '2026-11-26'} />);

    // Open first item ("Penjemputan rombongan") -> check Maps link & move down
    fireEvent.click(screen.getByText('Penjemputan rombongan'));
    const mapsLink = screen.getByRole('link', { name: /Buka di Google Maps/i });
    expect(mapsLink).toHaveAttribute('target', '_blank');
    expect(mapsLink).toHaveAttribute('rel', 'noopener noreferrer');

    fireEvent.click(
      screen.getByRole('button', { name: /Geser ke bawah: Penjemputan rombongan/i }),
    );
    let titles = screen
      .getAllByTestId('activity-title')
      .map((el) => el.textContent);
    expect(titles[0]).toBe('Perjalanan menuju Mbok Wito');
    expect(titles[1]).toBe('Penjemputan rombongan');

    // Click "Urutkan Jam" to restore chronological order
    fireEvent.click(screen.getByRole('button', { name: /Urutkan Jam/i }));
    titles = screen
      .getAllByTestId('activity-title')
      .map((el) => el.textContent);
    expect(titles[0]).toBe('Penjemputan rombongan');

    // Open "+ Tambah Kegiatan" -> switch to Bulk Input tab -> verify Live Preview & submit
    fireEvent.click(screen.getByRole('button', { name: /^Tambah Kegiatan$/i }));
    fireEvent.click(screen.getByRole('tab', { name: /Bulk Input/i }));
    fireEvent.input(screen.getByLabelText(/Tempel Daftar Jadwal/i), {
      target: {
        value:
          'Waktu\tAgenda\tKeterangan\tLokasi\n08.00–09.30\tBoarding Bandara Soetta\tPenerbangan pagi ke Lampung\tBandara Soekarno Hatta',
      },
    });
    expect(
      screen.getByText(/Live Preview — 1 kegiatan terdeteksi/i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Masukkan 1 Kegiatan ke Tanggal Ini/i,
      }),
    );
    titles = screen
      .getAllByTestId('activity-title')
      .map((el) => el.textContent);
    expect(titles[0]).toBe('Boarding Bandara Soetta');

    // Delete via custom ConfirmModal (not window.confirm)
    fireEvent.click(screen.getByText('Boarding Bandara Soetta'));
    fireEvent.click(
      screen.getByRole('button', {
        name: /Hapus Kegiatan Boarding Bandara Soetta/i,
      }),
    );
    expect(screen.getByText('Hapus Kegiatan?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ya, Hapus/i }));
    expect(
      screen.queryByText('Boarding Bandara Soetta'),
    ).not.toBeInTheDocument();
  });

  it('loads lazy DataManageSheet, resets to Lampung default, and recovers corrupt JSON via Safe Mode', async () => {
    const repo = createLocalStorageRepository({
      storage,
      storageKey: 'ui_v2_test',
    });

    const { unmount } = render(
      <App repository={repo} getTodayLocal={() => '2026-11-26'} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Kelola Data/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/Terakhir di-backup: Belum pernah/i),
      ).toBeInTheDocument();
    });
    unmount();

    const corruptStorage = new TestStorage();
    corruptStorage.setItem('corrupt_v2', '{corrupted');
    const corruptRepo = createLocalStorageRepository({
      storage: corruptStorage,
      storageKey: 'corrupt_v2',
    });

    render(<App repository={corruptRepo} getTodayLocal={() => '2026-11-26'} />);
    expect(screen.getByText(/Mode Pemulihan Data/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reset Safe Mode/i }));
    expect(
      screen.getByText('Audit Perum LKBN ANTARA Biro Lampung'),
    ).toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../src/app';
import { createLocalStorageRepository, type StorageBackend } from '../../src/storage/repository';

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

describe('StickyPlan full UI flows (Phases 3, 4, and 5)', () => {
  let storage: TestStorage;

  beforeEach(() => {
    storage = new TestStorage();
  });

  it('auto-lands on today local sheet and jumps directly across registered dates (25 Nov -> 27 Nov)', async () => {
    const repo = createLocalStorageRepository({
      storage,
      namespace: 'ui_test',
      getTodayLocal: () => '2026-11-25',
    });

    render(<App repository={repo} getTodayLocal={() => '2026-11-25'} />);

    expect(screen.getByText('Itinerary Saya')).toBeInTheDocument();
    expect(screen.getByText('Rabu, 25 Nov 2026')).toBeInTheDocument();
    expect(
      screen.getByText(/Belum ada kegiatan di tanggal ini/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /\+ Tanggal/i }));
    const dateInput = screen.getByLabelText(/Pilih Tanggal/i);
    fireEvent.input(dateInput, { target: { value: '2026-11-27' } });
    fireEvent.click(screen.getByRole('button', { name: /Tambah Tanggal/i }));

    expect(screen.getByText('Jumat, 27 Nov 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hari Sebelumnya/i }));
    expect(screen.getByText('Rabu, 25 Nov 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hari Berikutnya/i }));
    expect(screen.getByText('Jumat, 27 Nov 2026')).toBeInTheDocument();
  });

  it('adds activities sorted chronologically, sanitizes shared Maps URL, and enforces 2-step delete', async () => {
    const repo = createLocalStorageRepository({
      storage,
      namespace: 'ui_test',
      getTodayLocal: () => '2026-11-25',
    });

    render(<App repository={repo} getTodayLocal={() => '2026-11-25'} />);

    fireEvent.click(screen.getByRole('button', { name: /\+ Kegiatan/i }));
    fireEvent.input(screen.getByLabelText(/Jam Mulai/i), {
      target: { value: '14:00' },
    });
    fireEvent.input(screen.getByLabelText(/Judul Kegiatan/i), {
      target: { value: 'Check-in Hotel Majapahit' },
    });
    fireEvent.input(screen.getByLabelText(/Catatan \/ Deskripsi/i), {
      target: { value: 'Kode Booking: TRV-991' },
    });
    fireEvent.input(screen.getByLabelText(/Link atau Nama Lokasi Google Maps/i), {
      target: {
        value: 'Hotel Majapahit Jl. Tunjungan https://maps.app.goo.gl/MjpHt1',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Kegiatan/i }));

    fireEvent.click(screen.getByRole('button', { name: /\+ Kegiatan/i }));
    fireEvent.input(screen.getByLabelText(/Jam Mulai/i), {
      target: { value: '08:30' },
    });
    fireEvent.input(screen.getByLabelText(/Judul Kegiatan/i), {
      target: { value: 'Kereta Pagi Gambir' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Kegiatan/i }));

    const titles = screen
      .getAllByTestId('activity-title')
      .map((el) => el.textContent);
    expect(titles).toEqual(['Kereta Pagi Gambir', 'Check-in Hotel Majapahit']);

    const mapsLink = screen.getByRole('link', { name: /Buka di Google Maps/i });
    expect(mapsLink).toHaveAttribute('href', 'https://maps.app.goo.gl/MjpHt1');
    expect(mapsLink).toHaveAttribute('target', '_blank');
    expect(mapsLink).toHaveAttribute('rel', 'noopener noreferrer');

    const editButtons = screen.getAllByRole('button', {
      name: /Edit Kegiatan/i,
    });
    fireEvent.click(editButtons[0]!);

    fireEvent.click(screen.getByRole('button', { name: /^Hapus Kegiatan$/i }));
    expect(screen.getByText('Kereta Pagi Gambir')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Yakin Hapus/i }));
    expect(screen.queryByText('Kereta Pagi Gambir')).not.toBeInTheDocument();
  });

  it('loads lazy Data Management sheet showing backup status and recovers corrupt storage via Safe Mode', async () => {
    const repo = createLocalStorageRepository({
      storage,
      namespace: 'ui_test',
      getTodayLocal: () => '2026-11-25',
    });

    const { unmount } = render(
      <App repository={repo} getTodayLocal={() => '2026-11-25'} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Kelola Data/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/Terakhir di-backup: Belum pernah/i),
      ).toBeInTheDocument();
    });
    unmount();

    const corruptStorage = new TestStorage();
    corruptStorage.setItem('corrupt_ns:store', '{corrupted-data');
    const corruptRepo = createLocalStorageRepository({
      storage: corruptStorage,
      namespace: 'corrupt_ns',
      getTodayLocal: () => '2026-11-25',
    });

    render(<App repository={corruptRepo} getTodayLocal={() => '2026-11-25'} />);
    expect(screen.getByText(/Mode Pemulihan Data/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Reset Safe Mode/i }));
    expect(screen.getByText('Rabu, 25 Nov 2026')).toBeInTheDocument();
  });
});

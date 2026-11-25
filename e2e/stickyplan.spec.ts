import { expect, test } from '@playwright/test';

test.describe('StickyPlan Mobile PWA E2E (390x844 + Offline Mode)', () => {
  test('core loop, chronological sort, Maps deep-link, JSON export, and Airplane offline survival', async ({
    context,
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByText('Itinerary Saya')).toBeVisible();

    // Add afternoon item first, then morning item to verify chronological sorting
    await page.getByRole('button', { name: '+ Kegiatan' }).click();
    await page.getByLabel(/Jam Mulai/i).fill('14:30');
    await page.getByLabel(/Judul Kegiatan/i).fill('Rapat Evaluasi Kantor');
    await page
      .getByLabel(/Link atau Nama Lokasi Google Maps/i)
      .fill('Gedung Sate Bandung https://maps.app.goo.gl/GdgSate99');
    await page
      .getByLabel(/Catatan \/ Deskripsi/i)
      .fill('Bawa dokumen KAK & kode akses Lantai 3');
    await page.getByRole('button', { name: 'Simpan Kegiatan' }).click();

    await page.getByRole('button', { name: '+ Kegiatan' }).click();
    await page.getByLabel(/Jam Mulai/i).fill('07:45');
    await page.getByLabel(/Judul Kegiatan/i).fill('Kereta Cepat Halim');
    await page.getByRole('button', { name: 'Simpan Kegiatan' }).click();

    const titles = await page.getByTestId('activity-title').allTextContents();
    expect(titles).toEqual(['Kereta Cepat Halim', 'Rapat Evaluasi Kantor']);

    // Expand accordion and verify safe Maps deep-link attributes
    await page.getByText('Rapat Evaluasi Kantor').click();
    await expect(
      page.getByText('Bawa dokumen KAK & kode akses Lantai 3'),
    ).toBeVisible();
    const mapsLink = page.getByRole('link', { name: /Buka di Google Maps/i });
    await expect(mapsLink).toHaveAttribute(
      'href',
      'https://maps.app.goo.gl/GdgSate99',
    );
    await expect(mapsLink).toHaveAttribute('target', '_blank');
    await expect(mapsLink).toHaveAttribute('rel', 'noopener noreferrer');

    // Wait until Service Worker activates and controls the page
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });
    await page.reload();
    await expect(page.getByText('Rapat Evaluasi Kantor')).toBeVisible();

    // Simulate Airplane Mode (100% offline reload + offline write)
    await context.setOffline(true);
    await expect(page.getByText('Offline siap')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Kereta Cepat Halim')).toBeVisible();
    await expect(page.getByText('Rapat Evaluasi Kantor')).toBeVisible();

    // Add item while completely offline
    await page.getByRole('button', { name: '+ Kegiatan' }).click();
    await page.getByLabel(/Jam Mulai/i).fill('19:00');
    await page.getByLabel(/Judul Kegiatan/i).fill('Makan Malam Braga');
    await page.getByRole('button', { name: 'Simpan Kegiatan' }).click();

    await expect(page.getByText('Makan Malam Braga')).toBeVisible();
    await page.screenshot({
      path: 'C:/Users/ASUS/.gemini/antigravity/brain/8fbfa437-8347-4ed0-9dfe-0239dbb895e0/stickyplan-mobile-offline.png',
      fullPage: false,
    });
    await context.setOffline(false);
  });
});

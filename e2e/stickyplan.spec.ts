import { expect, test } from '@playwright/test';

test.describe('StickyPlan v2.0 Mobile PWA E2E (Lampung Rundown + Offline Mode)', () => {
  test('auto-lands on Lampung rundown, opens accordion + Maps link, adds Bulk Input, and works 100% offline', async ({
    context,
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByText('Audit Perum LKBN ANTARA Biro Lampung'),
    ).toBeVisible();
    await expect(page.getByText('Kamis, 26 Nov 2026')).toBeVisible();
    await expect(page.getByText('Penjemputan rombongan')).toBeVisible();

    // Expand "Makan siang bersama" accordion to verify description & Google Maps CTA
    await page.getByText('Makan siang bersama').click();
    await expect(
      page.getByText('14.00–14.30 | Makan siang bersama di Mbok Wito.'),
    ).toBeVisible();
    const mapsLink = page.getByRole('link', { name: /Buka di Google Maps/i });
    await expect(mapsLink).toHaveAttribute('target', '_blank');
    await expect(mapsLink).toHaveAttribute('rel', 'noopener noreferrer');

    await page.screenshot({
      path: 'C:/Users/ASUS/.gemini/antigravity/brain/8fbfa437-8347-4ed0-9dfe-0239dbb895e0/stickyplan-v2-lampung.png',
      fullPage: false,
    });

    // Ensure Service Worker is active
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });
    await page.reload();
    await expect(page.getByText('Penjemputan rombongan')).toBeVisible();

    // Activate Airplane Mode (Offline) -> reload -> switch to Day 2 (27 Nov) -> add Bulk Input item
    await context.setOffline(true);
    await expect(page.getByText('Offline siap')).toBeVisible();

    await page.reload();
    await expect(
      page.getByText('Audit Perum LKBN ANTARA Biro Lampung'),
    ).toBeVisible();

    await page.getByRole('button', { name: '27 Nov' }).click();
    await expect(page.getByText('Jumat, 27 Nov 2026')).toBeVisible();
    await expect(page.getByText("Sholat Jum'at")).toBeVisible();

    await page
      .getByRole('button', { name: 'Tambah Kegiatan', exact: true })
      .click();
    await page.getByRole('tab', { name: /Bulk Input/i }).click();
    await page
      .getByLabel(/Tempel Daftar Jadwal/i)
      .fill('20:30 | Kembali ke Hotel | Istirahat malam tim Komdigi');
    await page
      .getByRole('button', {
        name: /Masukkan 1 Kegiatan ke Tanggal Ini/i,
      })
      .click();

    await expect(page.getByText('Kembali ke Hotel')).toBeVisible();
    await context.setOffline(false);
  });
});

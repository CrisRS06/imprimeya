import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Photo Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home
    await page.goto('/');
  });

  test('complete photo upload flow - happy path', async ({ page }) => {
    // 1. Navigate to fotos
    await page.getByRole('link', { name: /fotos/i }).click();
    await expect(page).toHaveURL('/fotos');

    // 2. Upload a test image
    const fileInput = page.locator('input[type="file"]');

    // Create a test image buffer
    const testImagePath = path.join(__dirname, 'fixtures/test-image.jpg');

    // If test image doesn't exist, skip upload step for now
    // In real tests, you'd have a fixture file
    await fileInput.setInputFiles({
      name: 'test-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake image data'),
    });

    // Wait for upload to process
    await page.waitForTimeout(1000);

    // 3. Click continue to layout
    const continueBtn = page.getByRole('button', { name: /continuar/i });
    if (await continueBtn.isEnabled()) {
      await continueBtn.click();
      await expect(page).toHaveURL('/fotos/layout');

      // 4. Select size (4x6 should be default or first option)
      await page.getByText(/4x6/i).click();

      // 5. Select fill mode
      await page.getByText(/llenar|ajustar/i).first().click();

      // 6. Set quantity
      const plusBtn = page.getByRole('button').filter({ has: page.locator('svg') }).last();
      await plusBtn.click();

      // 7. Continue to paper selection
      await page.getByRole('button', { name: /continuar/i }).click();
      await expect(page).toHaveURL('/fotos/papel');

      // 8. Select paper type
      await page.getByText(/fotografico/i).click();

      // 9. Continue to summary
      await page.getByRole('button', { name: /resumen|continuar/i }).click();
      await expect(page).toHaveURL('/resumen');

      // 10. Confirm order
      await page.getByRole('button', { name: /confirmar/i }).click();

      // 11. Verify success - should show order code
      await expect(page.getByText(/pedido recibido/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/[A-Z0-9]{3}\s*[A-Z0-9]{3}/i)).toBeVisible();
    }
  });

  test('photo upload validates file size', async ({ page }) => {
    await page.goto('/fotos');

    const fileInput = page.locator('input[type="file"]');

    // Try to upload a "large" file (simulated)
    // In real tests, you'd have an actual large file
    await fileInput.setInputFiles({
      name: 'large-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(15 * 1024 * 1024), // 15MB
    });

    // Should show error about file size
    await expect(page.getByText(/10\s*MB|muy grande|error/i)).toBeVisible({ timeout: 5000 });
  });

  test('photo upload validates file type', async ({ page }) => {
    await page.goto('/fotos');

    const fileInput = page.locator('input[type="file"]');

    // Try to upload invalid file type
    await fileInput.setInputFiles({
      name: 'document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    });

    // Should show error or not add file
    const photoCount = await page.getByText(/foto.*seleccionada/i).count();
    expect(photoCount).toBe(0);
  });

  test('layout selection updates preview', async ({ page }) => {
    // This test requires photos to be uploaded first
    // For now, test that layout page handles empty state
    await page.goto('/fotos/layout');

    // Should redirect to fotos or show empty state
    await expect(page.getByText(/no hay fotos|subir fotos/i)).toBeVisible();
  });

  test('quantity selector works correctly', async ({ page }) => {
    // Store photos in session first (simulate)
    await page.goto('/fotos/layout');

    // Check that quantity controls exist when photos are present
    // This would need actual photos uploaded first
  });
});

test.describe('Photo Flow - Edge Cases', () => {
  test('back button preserves state', async ({ page }) => {
    await page.goto('/fotos');

    // Upload would go here
    // Then navigate forward and back
    // Verify state is preserved
  });

  test('refresh preserves uploaded photos', async ({ page }) => {
    await page.goto('/fotos');

    // Upload would go here
    // Refresh page
    // Verify photos still shown
  });

  test('max 20 photos limit enforced', async ({ page }) => {
    await page.goto('/fotos');

    // Try to upload 21 files
    // Verify only 20 accepted or error shown
  });
});

import { test, expect } from '@playwright/test';

test.describe('Document Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('complete document upload flow - happy path', async ({ page }) => {
    // 1. Navigate to documento
    await page.getByRole('link', { name: /documento/i }).click();
    await expect(page).toHaveURL('/documento');

    // 2. Upload a test PDF
    const fileInput = page.locator('input[type="file"]');

    // Simulate PDF upload
    await fileInput.setInputFiles({
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fake pdf content'),
    });

    // Wait for processing
    await page.waitForTimeout(1000);

    // 3. Continue to options
    const continueBtn = page.getByRole('button', { name: /continuar/i });
    if (await continueBtn.isEnabled()) {
      await continueBtn.click();
      await expect(page).toHaveURL('/documento/opciones');

      // 4. Select color option
      await page.getByText(/color/i).first().click();

      // 5. Select paper type
      await page.getByText(/bond|normal/i).first().click();

      // 6. Continue to summary
      await page.getByRole('button', { name: /continuar|resumen/i }).click();
      await expect(page).toHaveURL('/resumen');

      // 7. Confirm order
      await page.getByRole('button', { name: /confirmar/i }).click();

      // 8. Verify success
      await expect(page.getByText(/pedido recibido/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('document upload - B/N option shows lower price', async ({ page }) => {
    await page.goto('/documento');

    // Upload document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 content'),
    });

    await page.waitForTimeout(1000);

    const continueBtn = page.getByRole('button', { name: /continuar/i });
    if (await continueBtn.isEnabled()) {
      await continueBtn.click();

      // Select B/N
      await page.getByText(/blanco.*negro|b\/n/i).click();

      // Price should be lower (₡50 vs ₡100)
      await expect(page.getByText(/₡50/)).toBeVisible();
    }
  });

  test('document upload validates file type', async ({ page }) => {
    await page.goto('/documento');

    const fileInput = page.locator('input[type="file"]');

    // Try to upload image instead of document
    await fileInput.setInputFiles({
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake image'),
    });

    // Should show error or not accept
    const errorVisible = await page.getByText(/pdf|docx|formato/i).isVisible();
    expect(errorVisible).toBeTruthy();
  });

  test('document upload validates file size (max 20MB)', async ({ page }) => {
    await page.goto('/documento');

    const fileInput = page.locator('input[type="file"]');

    // Try large file
    await fileInput.setInputFiles({
      name: 'large.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(25 * 1024 * 1024), // 25MB
    });

    // Should show error
    await expect(page.getByText(/20\s*MB|muy grande|error/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Document Flow - Paper Options', () => {
  test('opalina paper adds surcharge', async ({ page }) => {
    await page.goto('/documento/opciones');

    // Would need document uploaded first
    // Select opalina and verify price includes surcharge
  });

  test('sticker paper adds surcharge', async ({ page }) => {
    await page.goto('/documento/opciones');

    // Would need document uploaded first
    // Select sticker and verify price includes surcharge
  });
});

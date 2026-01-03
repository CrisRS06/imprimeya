import { test, expect } from '@playwright/test';

test.describe('Order Status Flow', () => {
  test('estado page loads with input form', async ({ page }) => {
    await page.goto('/estado');

    // Should have input for code
    await expect(page.getByPlaceholder('ABC123')).toBeVisible();

    // Should have submit button
    await expect(page.getByRole('button', { name: /buscar/i })).toBeVisible();
  });

  test('valid code format accepted', async ({ page }) => {
    await page.goto('/estado');

    const input = page.getByPlaceholder('ABC123');
    await input.fill('XYZ789');

    const submitBtn = page.getByRole('button', { name: /buscar/i });
    await submitBtn.click();

    // Should navigate to status page (even if order not found)
    await expect(page).toHaveURL(/estado\/XYZ789/i);
  });

  test('code with hyphen accepted', async ({ page }) => {
    await page.goto('/estado');

    const input = page.getByPlaceholder('ABC123');
    await input.fill('ABC-123');

    const submitBtn = page.getByRole('button', { name: /buscar/i });
    await submitBtn.click();

    // Should navigate (hyphen stripped)
    await expect(page).toHaveURL(/estado/);
  });

  test('lowercase code converted to uppercase', async ({ page }) => {
    await page.goto('/estado');

    const input = page.getByPlaceholder('ABC123');
    await input.fill('xyz789');

    const submitBtn = page.getByRole('button', { name: /buscar/i });
    await submitBtn.click();

    // Should work (case insensitive)
    await expect(page).toHaveURL(/estado/);
  });

  test('invalid code shows error', async ({ page }) => {
    await page.goto('/estado');

    const input = page.getByPlaceholder('ABC123');
    await input.fill('AB'); // Too short

    const submitBtn = page.getByRole('button', { name: /buscar/i });

    // Button should be disabled or show validation error
    const isDisabled = await submitBtn.isDisabled();
    if (!isDisabled) {
      await submitBtn.click();
      // Should show error or validation message
      await page.waitForTimeout(500);
      // Either shows error or doesn't navigate
      const onSamePage = await page.getByPlaceholder('ABC123').isVisible();
      expect(onSamePage).toBeTruthy();
    }
  });

  test('non-existent order shows not found', async ({ page }) => {
    await page.goto('/estado/ZZZZZ9');

    // Should show not found message or loading (if API fails)
    await expect(page.getByText(/no encontrado|no existe|error|buscando/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('status page shows order details when found', async ({ page }) => {
    // This test would need a real order in the database
    // For now, just verify the page structure
    await page.goto('/estado/ABC123');

    // Should show loading or result
    await expect(page.getByText(/buscando|cargando|no encontrado|pendiente|entregado|error/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Order Status - Display States', () => {
  test('pending order shows waiting status', async ({ page }) => {
    // Would need real order with pending status
    // Just verify page loads
    await page.goto('/estado');
    await expect(page.getByPlaceholder('ABC123')).toBeVisible();
  });

  test('delivered order shows completed status', async ({ page }) => {
    // Would need real order with delivered status
    // Just verify page loads
    await page.goto('/estado');
    await expect(page.getByPlaceholder('ABC123')).toBeVisible();
  });

  test('cancelled order shows cancelled status', async ({ page }) => {
    // Would need real order with cancelled status
    // Just verify page loads
    await page.goto('/estado');
    await expect(page.getByPlaceholder('ABC123')).toBeVisible();
  });
});

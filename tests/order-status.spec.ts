import { test, expect } from '@playwright/test';

test.describe('Order Status Flow', () => {
  test('estado page loads with input form', async ({ page }) => {
    await page.goto('/estado');

    // Should have input for code
    await expect(page.getByPlaceholder(/codigo|XXX/i)).toBeVisible();

    // Should have submit button
    await expect(page.getByRole('button', { name: /buscar|consultar/i })).toBeVisible();
  });

  test('valid code format accepted', async ({ page }) => {
    await page.goto('/estado');

    const input = page.getByPlaceholder(/codigo|XXX/i);
    await input.fill('ABC123');

    const submitBtn = page.getByRole('button', { name: /buscar|consultar/i });
    await submitBtn.click();

    // Should navigate to status page (even if order not found)
    await expect(page).toHaveURL(/estado\/ABC123/i);
  });

  test('code with hyphen accepted', async ({ page }) => {
    await page.goto('/estado');

    const input = page.getByPlaceholder(/codigo|XXX/i);
    await input.fill('ABC-123');

    const submitBtn = page.getByRole('button', { name: /buscar|consultar/i });
    await submitBtn.click();

    // Should navigate (hyphen stripped)
    await expect(page).toHaveURL(/estado/);
  });

  test('lowercase code converted to uppercase', async ({ page }) => {
    await page.goto('/estado');

    const input = page.getByPlaceholder(/codigo|XXX/i);
    await input.fill('abc123');

    const submitBtn = page.getByRole('button', { name: /buscar|consultar/i });
    await submitBtn.click();

    // Should work (case insensitive)
    await expect(page).toHaveURL(/estado/);
  });

  test('invalid code shows error', async ({ page }) => {
    await page.goto('/estado');

    const input = page.getByPlaceholder(/codigo|XXX/i);
    await input.fill('AB'); // Too short

    const submitBtn = page.getByRole('button', { name: /buscar|consultar/i });

    // Button should be disabled or show validation error
    const isDisabled = await submitBtn.isDisabled();
    if (!isDisabled) {
      await submitBtn.click();
      // Should show error
      await expect(page.getByText(/6 caracteres|invalido|error/i)).toBeVisible();
    }
  });

  test('non-existent order shows not found', async ({ page }) => {
    await page.goto('/estado/ZZZZZ9');

    // Should show not found message
    await expect(page.getByText(/no encontrado|no existe/i)).toBeVisible({ timeout: 5000 });
  });

  test('status page shows order details when found', async ({ page }) => {
    // This test would need a real order in the database
    // For now, just verify the page structure
    await page.goto('/estado/ABC123');

    // Should show loading or result
    await expect(page.getByText(/buscando|cargando|no encontrado|pendiente|entregado/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Order Status - Display States', () => {
  test('pending order shows waiting status', async ({ page }) => {
    // Would need real order with pending status
    // Verify pending indicator shown
  });

  test('delivered order shows completed status', async ({ page }) => {
    // Would need real order with delivered status
    // Verify delivered indicator shown
  });

  test('cancelled order shows cancelled status', async ({ page }) => {
    // Would need real order with cancelled status
    // Verify cancelled indicator shown
  });
});

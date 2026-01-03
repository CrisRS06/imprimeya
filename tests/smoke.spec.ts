import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - All Pages Load', () => {
  // Client pages
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ImprimeYA/i);
    // Check that main product cards exist
    await expect(page.getByRole('heading', { name: 'Fotos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Documentos' })).toBeVisible();
  });

  test('fotos page loads', async ({ page }) => {
    await page.goto('/fotos');
    await expect(page.getByText(/seleccionar|arrastra/i)).toBeVisible();
  });

  test('fotos layout page loads', async ({ page }) => {
    await page.goto('/fotos/layout');
    // Will redirect or show empty state without photos
    await expect(page).toHaveURL(/fotos/);
  });

  test('fotos papel page loads', async ({ page }) => {
    await page.goto('/fotos/papel');
    await expect(page).toHaveURL(/fotos/);
  });

  test('documento page loads', async ({ page }) => {
    await page.goto('/documento');
    // Check for the main heading
    await expect(page.getByRole('heading', { name: 'Documentos' })).toBeVisible();
  });

  test('estado page loads', async ({ page }) => {
    await page.goto('/estado');
    // Check for code input
    await expect(page.getByPlaceholder(/ABC123/i)).toBeVisible();
  });

  test('resumen page loads', async ({ page }) => {
    await page.goto('/resumen');
    // Will redirect without order data
    await expect(page).toHaveURL(/\//);
  });

  // Staff pages
  test('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard');
    // Dashboard shows PIN login first
    await expect(page.getByRole('heading', { name: /acceso staff/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
  });
});

test.describe('Navigation Tests', () => {
  test('can navigate from home to fotos', async ({ page }) => {
    await page.goto('/');
    // The cards are buttons, not links
    await page.locator('button', { hasText: 'Fotos' }).click();
    await expect(page).toHaveURL('/fotos');
  });

  test('can navigate from home to documento', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: 'Documentos' }).click();
    await expect(page).toHaveURL('/documento');
  });

  test('can navigate from home to estado', async ({ page }) => {
    await page.goto('/');
    // "Consultar estado de pedido" is a button
    await page.getByRole('button', { name: /consultar estado/i }).click();
    await expect(page).toHaveURL('/estado');
  });
});

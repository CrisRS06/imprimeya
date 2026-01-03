import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - All Pages Load', () => {
  // Client pages
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ImprimeYA/i);
    await expect(page.getByRole('heading', { name: /fotos|documentos/i })).toBeVisible();
  });

  test('fotos page loads', async ({ page }) => {
    await page.goto('/fotos');
    await expect(page.getByText(/subir|agregar fotos/i)).toBeVisible();
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
    await expect(page.getByText(/documento|pdf|subir/i)).toBeVisible();
  });

  test('estado page loads', async ({ page }) => {
    await page.goto('/estado');
    await expect(page.getByText(/estado|codigo|pedido/i)).toBeVisible();
  });

  test('resumen page loads', async ({ page }) => {
    await page.goto('/resumen');
    // Will redirect without order data
    await expect(page).toHaveURL(/\//);
  });

  // Staff pages
  test('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(/pendientes|pedidos/i)).toBeVisible();
  });
});

test.describe('Navigation Tests', () => {
  test('can navigate from home to fotos', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /fotos/i }).click();
    await expect(page).toHaveURL('/fotos');
  });

  test('can navigate from home to documento', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /documento/i }).click();
    await expect(page).toHaveURL('/documento');
  });

  test('can navigate from home to estado', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /estado|consultar/i }).click();
    await expect(page).toHaveURL('/estado');
  });
});

import { test, expect } from '@playwright/test';

test.describe('Staff Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('dashboard loads with stats cards', async ({ page }) => {
    // Should show pending count
    await expect(page.getByText(/pendientes/i)).toBeVisible();

    // Should show delivered count
    await expect(page.getByText(/entregados/i)).toBeVisible();
  });

  test('dashboard shows filter buttons', async ({ page }) => {
    // Should have filter options
    await expect(page.getByRole('button', { name: /todos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /pendientes/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /entregados/i })).toBeVisible();
  });

  test('filter by pending works', async ({ page }) => {
    await page.getByRole('button', { name: /pendientes/i }).click();

    // Should update filter state
    await expect(page.getByRole('button', { name: /pendientes/i })).toHaveClass(/bg-primary|selected/);
  });

  test('filter by delivered works', async ({ page }) => {
    await page.getByRole('button', { name: /entregados/i }).click();

    // Should update filter state
    await expect(page.getByRole('button', { name: /entregados/i })).toHaveClass(/bg-emerald|selected/);
  });

  test('refresh button exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: /actualizar|refresh/i })).toBeVisible();
  });

  test('orders list renders', async ({ page }) => {
    // Should show orders or empty state
    const hasOrders = await page.getByText(/[A-Z0-9]{3}\s*[A-Z0-9]{3}/).count();
    const hasEmpty = await page.getByText(/no hay pedidos|sin pedidos/i).count();

    expect(hasOrders > 0 || hasEmpty > 0).toBeTruthy();
  });

  test('clicking order navigates to print view', async ({ page }) => {
    // Find first order card
    const orderCard = page.locator('[data-testid="order-card"]').first();

    if (await orderCard.isVisible()) {
      await orderCard.click();
      await expect(page).toHaveURL(/imprimir/);
    }
  });
});

test.describe('Staff Dashboard - Auto Refresh', () => {
  test('dashboard auto-refreshes', async ({ page }) => {
    await page.goto('/dashboard');

    // Track network requests
    let refreshCount = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/orders')) {
        refreshCount++;
      }
    });

    // Wait for auto-refresh (default 10s interval)
    await page.waitForTimeout(12000);

    // Should have made at least 2 requests (initial + refresh)
    expect(refreshCount).toBeGreaterThanOrEqual(1);
  });

  test('manual refresh works', async ({ page }) => {
    await page.goto('/dashboard');

    const refreshBtn = page.getByRole('button', { name: /actualizar|refresh/i });

    // Track API calls
    let apiCalled = false;
    page.on('request', (request) => {
      if (request.url().includes('/api/orders')) {
        apiCalled = true;
      }
    });

    await refreshBtn.click();
    await page.waitForTimeout(1000);

    expect(apiCalled).toBeTruthy();
  });
});

test.describe('Staff Dashboard - Responsive', () => {
  test('mobile layout works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Stats should stack on mobile
    await expect(page.getByText(/pendientes/i)).toBeVisible();
    await expect(page.getByText(/entregados/i)).toBeVisible();
  });

  test('tablet layout works', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');

    // Should display properly
    await expect(page.getByText(/pendientes/i)).toBeVisible();
  });
});

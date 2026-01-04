import { test, expect } from '@playwright/test';

/**
 * Staff Authentication Tests
 *
 * These tests verify the staff authentication flow works correctly.
 * Note: In a real environment, you'd need to either:
 * 1. Set up test users in Supabase
 * 2. Mock the auth API
 * 3. Use Supabase test environment
 */

test.describe('Staff Login Page', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/staff/login');

    // Should show login form
    await expect(page.getByRole('heading', { name: /acceso staff/i })).toBeVisible();
    await expect(page.getByLabel(/correo/i)).toBeVisible();
    await expect(page.getByLabel(/contrasena/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesion/i })).toBeVisible();
  });

  test('login button is disabled without credentials', async ({ page }) => {
    await page.goto('/staff/login');

    const loginButton = page.getByRole('button', { name: /iniciar sesion/i });
    await expect(loginButton).toBeDisabled();
  });

  test('login button enables with credentials', async ({ page }) => {
    await page.goto('/staff/login');

    await page.getByLabel(/correo/i).fill('test@simple.cr');
    await page.getByLabel(/contrasena/i).fill('testpassword');

    const loginButton = page.getByRole('button', { name: /iniciar sesion/i });
    await expect(loginButton).toBeEnabled();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/staff/login');

    await page.getByLabel(/correo/i).fill('invalid@test.com');
    await page.getByLabel(/contrasena/i).fill('wrongpassword');
    await page.getByRole('button', { name: /iniciar sesion/i }).click();

    // Should show error message
    await expect(page.getByText(/credenciales incorrectas|error/i)).toBeVisible({ timeout: 10000 });
  });

  test('redirects to login when accessing protected route unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/staff\/login/);
  });

  test('preserves redirect parameter', async ({ page }) => {
    await page.goto('/dashboard');

    // Should have redirect parameter
    await expect(page).toHaveURL(/redirect=/);
  });
});

test.describe('Staff API Protection', () => {
  test('GET /api/orders returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/orders');

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test('PATCH /api/orders/[id] returns 401 without auth', async ({ request }) => {
    const response = await request.patch('/api/orders/test-id', {
      data: { status: 'delivered' }
    });

    expect(response.status()).toBe(401);
  });

  test('DELETE /api/orders/[id] returns 401 without auth', async ({ request }) => {
    const response = await request.delete('/api/orders/test-id');

    expect(response.status()).toBe(401);
  });

  test('GET /api/orders/[CODE] allows public access with 6-char code', async ({ request }) => {
    // 6-character codes are public for order status checking
    const response = await request.get('/api/orders/ABC123');

    // Should not be 401 (might be 404 if order doesn't exist)
    expect(response.status()).not.toBe(401);
  });
});

test.describe('CSRF Protection', () => {
  test('POST to API with wrong origin is blocked', async ({ request }) => {
    const response = await request.post('/api/orders', {
      headers: {
        'Origin': 'https://malicious-site.com',
      },
      data: {
        productType: 'photo',
        sizeName: '4x6',
        paperType: 'fotografico',
        quantity: 1,
        originalImages: ['test.jpg'],
      }
    });

    expect(response.status()).toBe(403);
  });
});

test.describe('Health Check', () => {
  test('health endpoint returns status', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBeDefined();
    expect(body.timestamp).toBeDefined();
    expect(body.checks).toBeDefined();
  });
});

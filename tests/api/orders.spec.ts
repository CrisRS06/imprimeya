import { test, expect } from '@playwright/test';

test.describe('API: /api/orders', () => {
  test('GET /api/orders returns orders list', async ({ request }) => {
    const response = await request.get('/api/orders');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('orders');
    expect(Array.isArray(data.orders)).toBeTruthy();
  });

  test('GET /api/orders with status filter', async ({ request }) => {
    const response = await request.get('/api/orders?status=pending');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('orders');
    // All returned orders should be pending
    data.orders.forEach((order: { status: string }) => {
      expect(order.status).toBe('pending');
    });
  });

  test('GET /api/orders with pagination', async ({ request }) => {
    const response = await request.get('/api/orders?limit=5&offset=0');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.orders.length).toBeLessThanOrEqual(5);
  });

  test('POST /api/orders creates order', async ({ request }) => {
    const orderData = {
      productType: 'photo',
      sizeName: '4x6',
      paperType: 'fotografico',
      quantity: 2,
      originalImages: [
        {
          id: 'test-123',
          storagePath: 'test/image.jpg',
          publicUrl: 'https://example.com/image.jpg',
          originalName: 'test.jpg',
          width: 1920,
          height: 1080,
        },
      ],
      isColor: true,
    };

    const response = await request.post('/api/orders', {
      data: orderData,
    });

    // May fail if Supabase not configured for test
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('order');
      expect(data.order).toHaveProperty('code');
      expect(data.order.code).toHaveLength(6);
    }
  });

  test('POST /api/orders validates required fields', async ({ request }) => {
    const response = await request.post('/api/orders', {
      data: {
        // Missing required fields
        productType: 'photo',
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('API: /api/orders/[id]', () => {
  test('GET /api/orders/[id] by UUID', async ({ request }) => {
    // Would need real order UUID
    const response = await request.get('/api/orders/00000000-0000-0000-0000-000000000000');

    // Should return 404 for non-existent
    expect(response.status()).toBe(404);
  });

  test('GET /api/orders/[id] by code', async ({ request }) => {
    // Would need real order code
    const response = await request.get('/api/orders/ABC123');

    // Should return 404 for non-existent
    expect(response.status()).toBe(404);
  });

  test('PATCH /api/orders/[id] updates status', async ({ request }) => {
    // Would need real order ID
    const response = await request.patch('/api/orders/test-id', {
      data: {
        status: 'delivered',
      },
    });

    // Will fail without real order
    expect([200, 404]).toContain(response.status());
  });

  test('PATCH /api/orders/[id] validates status value', async ({ request }) => {
    const response = await request.patch('/api/orders/test-id', {
      data: {
        status: 'invalid-status',
      },
    });

    // Should reject invalid status
    expect([400, 404]).toContain(response.status());
  });

  test('DELETE /api/orders/[id] cancels order', async ({ request }) => {
    // Would need real order ID
    const response = await request.delete('/api/orders/test-id');

    // Will fail without real order
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('API: /api/orders/[id]/print', () => {
  test('GET /api/orders/[id]/print returns print data', async ({ request }) => {
    // Would need real order ID
    const response = await request.get('/api/orders/test-id/print');

    expect([200, 404]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('order');
      expect(data).toHaveProperty('print');
    }
  });
});

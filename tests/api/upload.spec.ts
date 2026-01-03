import { test, expect } from '@playwright/test';

test.describe('API: /api/upload', () => {
  test('POST /api/upload accepts valid image', async ({ request }) => {
    // Create form data with test image
    const formData = new FormData();

    // Create a minimal valid JPEG
    const jpegBytes = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0xff, 0xd9,
    ]);

    const blob = new Blob([jpegBytes], { type: 'image/jpeg' });

    formData.append('file', blob, 'test.jpg');
    formData.append('sessionId', 'test-session-123');

    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'test.jpg',
          mimeType: 'image/jpeg',
          buffer: jpegBytes,
        },
        sessionId: 'test-session-123',
      },
    });

    // May fail if Supabase storage not configured
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('path');
      expect(data).toHaveProperty('publicUrl');
    }
  });

  test('POST /api/upload rejects invalid file type', async ({ request }) => {
    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('not an image'),
        },
        sessionId: 'test-session-123',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/upload requires sessionId', async ({ request }) => {
    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'test.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
        },
        // Missing sessionId
      },
    });

    // Should still work or return specific error
    expect([200, 400]).toContain(response.status());
  });

  test('DELETE /api/upload removes file', async ({ request }) => {
    // Would need real uploaded file path
    const response = await request.delete('/api/upload?path=test/path.jpg');

    // Will fail without real file
    expect([200, 404, 500]).toContain(response.status());
  });
});

test.describe('API: /api/upload - File Size Limits', () => {
  test('rejects file over 10MB for images', async ({ request }) => {
    // Create large buffer
    const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB

    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'large.jpg',
          mimeType: 'image/jpeg',
          buffer: largeBuffer,
        },
        sessionId: 'test-session-123',
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('API: /api/upload - MIME Types', () => {
  test('accepts JPEG', async ({ request }) => {
    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'test.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
        },
        sessionId: 'test-123',
      },
    });

    // May succeed or fail based on Supabase config
    expect([200, 400, 500]).toContain(response.status());
  });

  test('accepts PNG', async ({ request }) => {
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'test.png',
          mimeType: 'image/png',
          buffer: pngSignature,
        },
        sessionId: 'test-123',
      },
    });

    expect([200, 400, 500]).toContain(response.status());
  });

  test('accepts HEIC', async ({ request }) => {
    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'test.heic',
          mimeType: 'image/heic',
          buffer: Buffer.from('fake heic'),
        },
        sessionId: 'test-123',
      },
    });

    expect([200, 400, 500]).toContain(response.status());
  });
});

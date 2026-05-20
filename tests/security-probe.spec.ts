
//security-probe.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Security and Header Tests', () => {

  // A
  test('HTTPBin echoes EXACTLY what headers we send', async ({ request }) => {

    const customId = `id-${Math.random().toString(36).substring(2, 10)}`;

    const headersToSend = {
      'X-Attack-Test': 'alert(1)',
      'X-SQL-Test': "' OR 1=1 --",
      'X-Large-Header': 'A'.repeat(500),
      'Authorization': 'Bearer PROBETOKEN',
      'X-Custom-ID': customId
    };

    const response = await request.get(
      'https://httpbin.org/headers',
      {
        headers: headersToSend
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    const echoedHeaders = body.headers;

    // Assert all headers echoed unchanged
    expect(echoedHeaders['X-Attack-Test']).toBe('alert(1)');
    expect(echoedHeaders['X-Sql-Test']).toBe("' OR 1=1 --");
    expect(echoedHeaders['X-Large-Header']).toBe('A'.repeat(500));
    expect(echoedHeaders['Authorization']).toBe('Bearer PROBETOKEN');
    expect(echoedHeaders['X-Custom-Id']).toBe(customId);

    // Assert XSS payload treated as literal string
    expect(echoedHeaders['X-Attack-Test']).not.toContain('<script>');
  });

  // B
  test('DummyJSON /auth/me headers audit', async ({ request }) => {

    // Login first to get valid token
    const loginResponse = await request.post(
      'https://dummyjson.com/auth/login',
      {
        data: {
          username: 'emilys',
          password: 'emilyspass'
        }
      }
    );

    const loginBody = await loginResponse.json();

    const token = loginBody.token;

    const response = await request.get(
      'https://dummyjson.com/auth/me',
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    expect(response.status()).toBe(200);

    const headers = response.headers();

    expect(headers['content-type']).toContain('application/json');

    expect(headers['access-control-allow-origin']).toBeTruthy();

    expect(
      headers['access-control-allow-origin'].includes('*') ||
      headers['access-control-allow-origin'].length > 0
    ).toBeTruthy();
  });

  // C
  test('Content-Type negotiation — JSON always returned', async ({ request }) => {

    const response = await request.get(
      'https://dummyjson.com/products/1',
      {
        headers: {
          Accept: 'application/xml'
        }
      }
    );

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];

    console.log(
      'Finding: DummyJSON returns JSON even when Accept: application/xml is sent'
    );

    expect(contentType).toContain('application/json');
  });

  // D
  test('CORS header present on DummyJSON response', async ({ request }) => {

    const response = await request.get(
      'https://dummyjson.com/products/1'
    );

    expect(response.status()).toBe(200);

    const headers = response.headers();

    expect(headers['access-control-allow-origin']).toBeTruthy();
  });

  // E
  test('HTTPBin anything echoes full request', async ({ request }) => {

    const requestBody = {
      sensitiveData: 'SHOULD_BE_ECHOED',
      nested: {
        a: 1,
        b: [1, 2, 3]
      }
    };

    const response = await request.post(
      'https://httpbin.org/anything',
      {
        data: requestBody
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.method).toBe('POST');

    expect(body.json.sensitiveData)
      .toBe('SHOULD_BE_ECHOED');

    expect(Array.isArray(body.json.nested.b))
      .toBeTruthy();

    expect(body.json.nested.b.length)
      .toBe(3);
  });

  // F
  test('UUID endpoint returns unique values', async ({ request }) => {

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const response1 = await request.get('https://httpbin.org/uuid');
    const response2 = await request.get('https://httpbin.org/uuid');
    const response3 = await request.get('https://httpbin.org/uuid');

    const body1 = await response1.json();
    const body2 = await response2.json();
    const body3 = await response3.json();

    const uuid1 = body1.uuid;
    const uuid2 = body2.uuid;
    const uuid3 = body3.uuid;

    console.log('UUID 1:', uuid1);
    console.log('UUID 2:', uuid2);
    console.log('UUID 3:', uuid3);

    // Non-empty
    expect(uuid1.length).toBeGreaterThan(0);
    expect(uuid2.length).toBeGreaterThan(0);
    expect(uuid3.length).toBeGreaterThan(0);

    // Unique
    expect(uuid1).not.toBe(uuid2);
    expect(uuid1).not.toBe(uuid3);
    expect(uuid2).not.toBe(uuid3);

    // UUID v4 format
    expect(uuidRegex.test(uuid1)).toBeTruthy();
    expect(uuidRegex.test(uuid2)).toBeTruthy();
    expect(uuidRegex.test(uuid3)).toBeTruthy();
  });

  // G
  test('Large payload response handled correctly', async ({ request }) => {

    const start = Date.now();

    const response = await request.get(
      'https://jsonplaceholder.typicode.com/comments'
    );

    const end = Date.now();

    const duration = end - start;

    console.log('Comments API time:', duration, 'ms');

    expect(response.status()).toBe(200);

    expect(duration).toBeLessThan(5000);

    const body = await response.json();

    expect(Array.isArray(body)).toBeTruthy();

    expect(body.length).toBe(500);

    // No empty comment bodies
    for (const comment of body) {
      expect(comment.body.trim().length).toBeGreaterThan(0);
    }
  });

});
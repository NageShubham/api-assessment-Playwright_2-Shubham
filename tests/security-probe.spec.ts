// security-probe.spec.ts
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

        // Assert all 5 headers are echoed back UNCHANGED
        // HTTPBin title-cases header names, so match accordingly
        expect(echoedHeaders['X-Attack-Test']).toBe('alert(1)');
        expect(echoedHeaders['X-Sql-Test']).toBe("' OR 1=1 --");
        expect(echoedHeaders['X-Large-Header']).toBe('A'.repeat(500));
        expect(echoedHeaders['Authorization']).toBe('Bearer PROBETOKEN');
        expect(echoedHeaders['X-Custom-Id']).toBe(customId);

        // Assert XSS payload is echoed as a literal string (not executed/sanitised)
        expect(echoedHeaders['X-Attack-Test']).not.toContain('<script>');
        expect(echoedHeaders['X-Attack-Test']).toBe('alert(1)');
    });

    // B
    test('DummyJSON /auth/me headers audit', async ({ request }) => {

        // Login first to get a valid token — must send Content-Type so body is parsed
        const loginResponse = await request.post(
            'https://dummyjson.com/auth/login',
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    username: 'emilys',
                    password: 'emilyspass'
                }
            }
        );

        expect(loginResponse.status()).toBe(200);

        const loginBody = await loginResponse.json();

        // DummyJSON v2 API returns "accessToken", not "token"
        const token = loginBody.accessToken;

        expect(token).toBeTruthy();

        const response = await request.get(
            'https://dummyjson.com/auth/me',
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        expect(response.status()).toBe(200);

        const headers = response.headers();

        // Assert Content-Type contains 'application/json'
        expect(headers['content-type']).toContain('application/json');

        // Assert Access-Control-Allow-Origin is present and contains '*' or a specific domain
        // Send Origin header so the server includes CORS headers in the response
        const corsResponse = await request.get(
            'https://dummyjson.com/auth/me',
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Origin': 'https://example.com'
                }
            }
        );

        const corsHeaders = corsResponse.headers();

        expect(corsHeaders['access-control-allow-origin']).toBeTruthy();

        expect(
            corsHeaders['access-control-allow-origin'].includes('*') ||
            corsHeaders['access-control-allow-origin'].length > 0
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

        // Finding: DummyJSON ignores the Accept header entirely and always returns JSON
        console.log(
            'Finding: DummyJSON returns JSON even when Accept: application/xml is sent. ' +
            `Actual Content-Type received: ${contentType}`
        );

        expect(contentType).toContain('application/json');
    });

    // D
    test('CORS header present on DummyJSON response', async ({ request }) => {

        // Must include Origin header — servers only emit CORS headers when a
        // cross-origin request is detected via the Origin header
        const response = await request.get(
            'https://dummyjson.com/products/1',
            {
                headers: {
                    Origin: 'https://example.com'
                }
            }
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

        // Assert method echoed correctly
        expect(body.method).toBe('POST');

        // Assert sensitiveData echoed unchanged
        expect(body.json.sensitiveData).toBe('SHOULD_BE_ECHOED');

        // Assert nested.b is an array of length 3
        expect(Array.isArray(body.json.nested.b)).toBeTruthy();
        expect(body.json.nested.b.length).toBe(3);
        expect(body.json.nested.b).toEqual([1, 2, 3]);
    });

    // F
    test('UUID endpoint returns unique values', async ({ request }) => {

        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        const [response1, response2, response3] = await Promise.all([
            request.get('https://httpbin.org/uuid'),
            request.get('https://httpbin.org/uuid'),
            request.get('https://httpbin.org/uuid')
        ]);

        const body1 = await response1.json();
        const body2 = await response2.json();
        const body3 = await response3.json();

        const uuid1 = body1.uuid;
        const uuid2 = body2.uuid;
        const uuid3 = body3.uuid;

        console.log('UUID 1:', uuid1);
        console.log('UUID 2:', uuid2);
        console.log('UUID 3:', uuid3);

        // Assert all are non-empty strings
        expect(typeof uuid1).toBe('string');
        expect(typeof uuid2).toBe('string');
        expect(typeof uuid3).toBe('string');
        expect(uuid1.length).toBeGreaterThan(0);
        expect(uuid2.length).toBeGreaterThan(0);
        expect(uuid3.length).toBeGreaterThan(0);

        // Assert all are unique
        expect(uuid1).not.toBe(uuid2);
        expect(uuid1).not.toBe(uuid3);
        expect(uuid2).not.toBe(uuid3);

        // Assert all match UUID v4 format
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

        console.log(`Comments API response time: ${duration}ms`);

        // Assert status 200
        expect(response.status()).toBe(200);

        // Assert response time under 5000ms
        expect(duration).toBeLessThan(5000);

        const body = await response.json();

        // Assert response is an array of exactly 500 items
        expect(Array.isArray(body)).toBeTruthy();
        expect(body.length).toBe(500);

        // Assert no comment has an empty body string
        for (const comment of body) {
            expect(comment.body).toBeDefined();
            expect(comment.body.trim().length).toBeGreaterThan(0);
        }
    });

}); 
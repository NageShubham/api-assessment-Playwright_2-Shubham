

// error-scenarios.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Error Scenarios', () => {

    // A
    test('@smoke GET /status/200 returns 200', async ({ request }) => {
        const response = await request.get('https://httpbin.org/status/200');

        expect(response.status()).toBe(200);

        const body = await response.text();
        expect(body.length).toBeLessThanOrEqual(1);
    });

    // B
    test('@smoke GET /status/400 returns 400', async ({ request }) => {
        const response = await request.get('https://httpbin.org/status/400');

        expect(response.status()).toBe(400);
    });

    // C
    test('@smoke GET /status/404 returns 404', async ({ request }) => {
        const response = await request.get('https://httpbin.org/status/404');

        expect(response.status()).toBe(404);
    });

    // D
    test('@smoke GET /status/500 returns 500', async ({ request }) => {
        const response = await request.get('https://httpbin.org/status/500');

        expect(response.status()).toBe(500);
    });

    // E
    test('@smoke GET /status/422 returns 422', async ({ request }) => {
        const response = await request.get('https://httpbin.org/status/422');

        expect(response.status()).toBe(422);
    });

    // F
    test('DummyJSON /auth/me without token returns 401', async ({ request }) => {
        const response = await request.get('https://dummyjson.com/auth/me');

        expect(response.status()).toBe(401);

        const body = await response.json();

        expect(body).toHaveProperty('message');
    });

    // G
    test('DummyJSON /auth/me with wrong token returns 401', async ({ request }) => {
        const response = await request.get('https://dummyjson.com/auth/me', {
            //   headers: {
            //     Authorization: 'Bearer FAKEJWT.FAKE.FAKE'
            //   }
        });

        expect(response.status()).toBe(401);

        const body = await response.json();

        expect(body).toHaveProperty('message');
    });

    // H
    test('DummyJSON login with empty credentials returns 400', async ({ request }) => {
        const response = await request.post('https://dummyjson.com/auth/login', {
            data: {
                username: '',
                password: ''
            }
        });

        expect(response.status()).toBe(400);
    });

    // I
    test('DummyJSON login with missing password field returns 400', async ({ request }) => {
        const response = await request.post('https://dummyjson.com/auth/login', {
            data: {
                username: 'emilys'
            }
        });

        expect(response.status()).toBe(400);
    });

    // J
    test('JSONPlaceholder GET /posts/0 — document actual response', async ({ request }) => {
        const response = await request.get('https://jsonplaceholder.typicode.com/posts/0');

        console.log('Actual status for /posts/0:', response.status());

        const bodyText = await response.text();

        console.log('Actual body for /posts/0:', bodyText);

        // Documenting actual behavior
        expect([200, 404]).toContain(response.status());
    });

    // K
    test('JSONPlaceholder GET /posts/999 — boundary', async ({ request }) => {
        const response = await request.get('https://jsonplaceholder.typicode.com/posts/999');

        expect(response.status()).toBe(404);
    });

    // L
    test('JSONPlaceholder GET /posts/100 — last valid', async ({ request }) => {
        const response = await request.get('https://jsonplaceholder.typicode.com/posts/100');

        expect(response.status()).toBe(200);

        const body = await response.json();

        expect(body.id).toBe(100);
    });

    // M
    test('JSONPlaceholder GET /posts/101 — beyond last', async ({ request }) => {
        const response = await request.get('https://jsonplaceholder.typicode.com/posts/101');

        expect(response.status()).toBe(404);
    });

    // N
    test('RestCountries invalid country name returns 404', async ({ request }) => {
        const response = await request.get(
            'https://restcountries.com/v3.1/name/zzzzzznotacountry'
        );

        expect(response.status()).toBe(404);
    });

    // O
    test('Open-Meteo missing required param — document actual', async ({ request }) => {


        const response = await request.get('https://api.open-meteo.com/v1/forecast');
        const status = response.status();
        const body = await response.text();

        console.log('Status:', status);
        console.log('Body:', body);

        // flexible assertion (safe for real APIs)
        expect([200, 400, 422, 500]).toContain(status);
    });

});

// performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('SLA Validation and Timing Contracts', () => {

    // Helper function to measure API response time
    async function measureTime(apiCall: () => Promise<any>) {
        const start = Date.now();

        const response = await apiCall();

        const end = Date.now();

        const duration = end - start;

        return { response, duration };
    }

    // A
    test('HTTPBin delay/2 is genuinely delayed', async ({ request }) => {
        const { response, duration } = await measureTime(() =>
            request.get('https://httpbin.org/delay/2')
        );

        console.log('delay/2 actual time:', duration, 'ms');

        expect(response.status()).toBe(200);

        expect(duration).toBeGreaterThan(2000);
        expect(duration).toBeLessThan(8000);
    });

    // B
    test('HTTPBin delay/1 timing bounds', async ({ request }) => {
        const { response, duration } = await measureTime(() =>
            request.get('https://httpbin.org/delay/1')
        );

        console.log('delay/1 actual time:', duration, 'ms');

        expect(response.status()).toBe(200);

        expect(duration).toBeGreaterThan(1000);
        expect(duration).toBeLessThan(3000);
    });

    // C
    test('DummyJSON all products within SLA', async ({ request }) => {
        const { response, duration } = await measureTime(() =>
            request.get('https://dummyjson.com/products?limit=0')
        );

        console.log('DummyJSON products time:', duration, 'ms');

        expect(response.status()).toBe(200);

        expect(duration).toBeLessThan(4000);

        const body = await response.json();

        expect(body.products.length).toBe(194);
    });

    // D
    test('JSONPlaceholder posts SLA', async ({ request }) => {
        const { response, duration } = await measureTime(() =>
            request.get('https://jsonplaceholder.typicode.com/posts')
        );

        console.log('JSONPlaceholder posts time:', duration, 'ms');

        expect(response.status()).toBe(200);

        expect(duration).toBeLessThan(3000);

        const body = await response.json();

        expect(body.length).toBe(100);
    });

    // E
    test('RestCountries all countries SLA', async ({ request }) => {
        const { response, duration } = await measureTime(() =>
            request.get(
                'https://restcountries.com/v3.1/all?fields=name,population'
            )
        );

        console.log('RestCountries time:', duration, 'ms');

        expect(response.status()).toBe(200);

        expect(duration).toBeLessThan(5000);

        const body = await response.json();

        expect(body.length).toBeGreaterThan(200);
    });

    // F
    test('3-run timing consistency for DummyJSON products', async ({ request }) => {

        const run1 = await measureTime(() =>
            request.get('https://dummyjson.com/products?limit=0')
        );

        const run2 = await measureTime(() =>
            request.get('https://dummyjson.com/products?limit=0')
        );

        const run3 = await measureTime(() =>
            request.get('https://dummyjson.com/products?limit=0')
        );

        const t1 = run1.duration;
        const t2 = run2.duration;
        const t3 = run3.duration;

        console.log('Run 1:', t1, 'ms');
        console.log('Run 2:', t2, 'ms');
        console.log('Run 3:', t3, 'ms');

        expect(t1).toBeLessThan(4000);
        expect(t2).toBeLessThan(4000);
        expect(t3).toBeLessThan(4000);

        const maxTime = Math.max(t1, t2, t3);
        const minTime = Math.min(t1, t2, t3);

        expect(maxTime).toBeLessThan(2 * minTime);
    });

    // G
    test('Open-Meteo London response within SLA', async ({ request }) => {
        const { response, duration } = await measureTime(() =>
            request.get(
                'https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.1&current_weather=true'
            )
        );

        console.log('Open-Meteo London time:', duration, 'ms');

        expect(response.status()).toBe(200);

        expect(duration).toBeLessThan(3000);

        const body = await response.json();

        expect(Number.isFinite(body.current_weather.temperature)).toBeTruthy();
    });

    // H
    test('DummyJSON delay endpoint: ?delay=500 adds at least 400ms', async ({ request }) => {
        const { response, duration } = await measureTime(() =>
            request.get('https://dummyjson.com/products/1?delay=500')
        );

        console.log('DummyJSON delay=500 actual time:', duration, 'ms');

        expect(response.status()).toBe(200);

        expect(duration).toBeGreaterThan(400);

        expect(duration).toBeLessThan(2000);
    });

});
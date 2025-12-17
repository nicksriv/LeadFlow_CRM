// Test setup file
import { beforeAll } from 'vitest';
import 'dotenv/config';

beforeAll(() => {
    // Ensure we're using test environment
    process.env.NODE_ENV = 'test';

    console.log('🧪 Test environment initialized');
});

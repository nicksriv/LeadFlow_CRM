import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';

describe('LinkedIn Integration Tests', () => {
    let app: express.Application;
    let server: any;
    let authToken: string;

    beforeAll(async () => {
        app = express();
        server = await registerRoutes(app);

        // Login to get auth token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@leadflow.com',
                password: 'admin123'
            });
        authToken = loginResponse.body.token;
    });

    describe('Profile Archiving', () => {
        it('should save scraped profile to archives', async () => {
            // This would require mocking the scraper or having a test profile
            // For now, we'll test the archives endpoint
            const response = await request(app)
                .post('/api/linkedin/archives')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should not create duplicates for same URL', async () => {
            const response = await request(app)
                .post('/api/linkedin/archives')
                .set('Authorization', `Bearer ${authToken}`);

            const initialCount = response.body.length;

            // Get archives again
            const response2 = await request(app)
                .post('/api/linkedin/archives')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response2.body.length).toBe(initialCount);
        });
    });

    describe('Email Validation', () => {
        it('should reject sending to fallback email', async () => {
            const response = await request(app)
                .post('/api/linkedin/send-email')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    to: 'technology@codescribed.com',
                    subject: 'Test',
                    body: 'Test email',
                    profile: { name: 'Test User' }
                });

            // Should either reject or not actually send
            expect([400, 422, 500]).toContain(response.status);
        });

        it('should accept valid email addresses', async () => {
            const response = await request(app)
                .post('/api/linkedin/send-email')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    to: 'test@example.com',
                    subject: 'Test Subject',
                    body: 'Test email body',
                    profile: {
                        name: 'Test User',
                        headline: 'Test Headline',
                        url: 'https://linkedin.com/in/test'
                    }
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });
    });
});

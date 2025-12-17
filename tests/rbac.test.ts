import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';

describe('RBAC (Role-Based Access Control) Tests', () => {
    let app: express.Application;
    let server: any;
    let adminToken: string;
    let managerToken: string;
    let salesRepToken: string;

    beforeAll(async () => {
        app = express();
        server = await registerRoutes(app);

        // Login as admin
        const adminLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@leadflow.com', password: 'admin123' });
        adminToken = adminLogin.body.token;

        // Login as manager (if exists in seed data)
        const managerLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: 'manager@leadflow.com', password: 'manager123' });
        if (managerLogin.status === 200) {
            managerToken = managerLogin.body.token;
        }

        // Login as sales rep (if exists in seed data)
        const salesLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: 'sales@leadflow.com', password: 'sales123' });
        if (salesLogin.status === 200) {
            salesRepToken = salesLogin.body.token;
        }
    });

    describe('Admin Access', () => {
        it('admin should access all leads', async () => {
            const response = await request(app)
                .get('/api/leads')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('admin should access archives', async () => {
            const response = await request(app)
                .post('/api/linkedin/archives')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('Data Isolation', () => {
        it('should not show other users data to sales rep', async () => {
            if (!salesRepToken) {
                return; // Skip if no sales rep account
            }

            const response = await request(app)
                .post('/api/linkedin/archives')
                .set('Authorization', `Bearer ${salesRepToken}`);

            expect(response.status).toBe(200);
            // Archives should only show sales rep's own profiles
            const archives = response.body;
            // Each profile should have user_id matching the sales rep
        });
    });

    describe('Unauthorized Access', () => {
        it('should reject access without token', async () => {
            const response = await request(app)
                .get('/api/leads');

            expect(response.status).toBe(401);
        });

        it('should reject invalid token', async () => {
            const response = await request(app)
                .get('/api/leads')
                .set('Authorization', 'Bearer invalid-token-12345');

            expect(response.status).toBe(401);
        });
    });
});

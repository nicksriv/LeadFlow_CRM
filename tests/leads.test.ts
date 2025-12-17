import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';

describe('Lead Management Tests', () => {
    let app: express.Application;
    let server: any;
    let authToken: string;
    let testLeadId: string;

    beforeAll(async () => {
        app = express();
        server = await registerRoutes(app);

        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@leadflow.com', password: 'admin123' });
        authToken = loginResponse.body.token;
    });

    describe('CRUD Operations', () => {
        it('should create a new lead', async () => {
            const response = await request(app)
                .post('/api/leads')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Test Lead',
                    email: 'test@example.com',
                    position: 'CEO',
                    company: 'Test Company',
                    status: 'cold'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe('Test Lead');

            testLeadId = response.body.id;
        });

        it('should retrieve all leads', async () => {
            const response = await request(app)
                .get('/api/leads')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });

        it('should retrieve a specific lead', async () => {
            if (!testLeadId) return;

            const response = await request(app)
                .get(`/api/leads/${testLeadId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(testLeadId);
        });

        it('should update a lead', async () => {
            if (!testLeadId) return;

            const response = await request(app)
                .patch(`/api/leads/${testLeadId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    status: 'warm',
                    company: 'Updated Company'
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('warm');
            expect(response.body.company).toBe('Updated Company');
        });

        it('should delete a lead', async () => {
            if (!testLeadId) return;

            const response = await request(app)
                .delete(`/api/leads/${testLeadId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);

            // Verify deletion
            const getResponse = await request(app)
                .get(`/api/leads/${testLeadId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(getResponse.status).toBe(404);
        });
    });

    describe('Email Integration', () => {
        it('should create lead and conversation when sending email', async () => {
            const response = await request(app)
                .post('/api/linkedin/send-email')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    to: 'newlead@example.com',
                    subject: 'Test Email',
                    body: 'Test email body',
                    profile: {
                        name: 'New Lead from Email',
                        headline: 'CEO at TestCo',
                        url: 'https://linkedin.com/in/newlead'
                    }
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify lead was created
            const leadsResponse = await request(app)
                .get('/api/leads')
                .set('Authorization', `Bearer ${authToken}`);

            const newLead = leadsResponse.body.find((l: any) =>
                l.linkedinUrl === 'https://linkedin.com/in/newlead'
            );

            expect(newLead).toBeDefined();
            expect(newLead.email).toBe('newlead@example.com');
        });
    });
});

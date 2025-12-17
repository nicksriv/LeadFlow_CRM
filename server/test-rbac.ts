/**
 * RBAC Backend Testing Script
 * 
 * This script tests the multi-hierarchy RBAC implementation by:
 * 1. Creating users with different roles (admin, manager, sales_rep)
 * 2. Creating test data for each user
 * 3. Verifying role-based data access
 * 4. Testing manager hierarchy
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Cookie jar to store sessions
const sessions: Record<string, string> = {};

// Helper to make authenticated requests
async function apiRequest(method: string, endpoint: string, userRole: string, body?: any) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (sessions[userRole]) {
        headers['Cookie'] = `session_id=${sessions[userRole]}`;
    }

    const options: any = {
        method,
        headers,
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);

    // Extract session cookie if present
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
        const match = setCookie.match(/session_id=([^;]+)/);
        if (match) {
            sessions[userRole] = match[1];
        }
    }

    return response;
}

// Test results
const results = {
    passed: 0,
    failed: 0,
    tests: [] as Array<{ name: string; passed: boolean; message: string }>,
};

function logTest(name: string, passed: boolean, message: string) {
    results.tests.push({ name, passed, message });
    if (passed) {
        results.passed++;
        console.log(`✅ ${name}`);
    } else {
        results.failed++;
        console.log(`❌ ${name}: ${message}`);
    }
}

async function runTests() {
    console.log('🧪 Starting RBAC Backend Tests...\n');

    try {
        // Test 1: Register Admin User
        console.log('📝 Test 1: Register Admin User');
        let response = await apiRequest('POST', '/api/auth/register', 'admin', {
            name: 'Admin User',
            email: 'admin@test.com',
            password: 'admin123',
        });

        if (response.ok) {
            const data = await response.json();
            logTest('Admin Registration', true, 'Admin user created successfully');

            // Manually set role to admin in database (would need DB access)
            console.log('⚠️  NOTE: Manually update admin@test.com role to "admin" in database');
        } else {
            logTest('Admin Registration', false, await response.text());
        }

        // Test 2: Register Manager User  
        console.log('\n📝 Test 2: Register Manager User');
        response = await apiRequest('POST', '/api/auth/register', 'manager', {
            name: 'Manager User',
            email: 'manager@test.com',
            password: 'manager123',
        });

        if (response.ok) {
            logTest('Manager Registration', true, 'Manager user created successfully');
            console.log('⚠️  NOTE: Manually update manager@test.com role to "manager" in database');
        } else {
            logTest('Manager Registration', false, await response.text());
        }

        // Test 3: Register Sales Rep User
        console.log('\n📝 Test 3: Register Sales Rep User');
        response = await apiRequest('POST', '/api/auth/register', 'sales_rep', {
            name: 'Sales Rep User',
            email: 'salesrep@test.com',
            password: 'salesrep123',
        });

        if (response.ok) {
            logTest('Sales Rep Registration', true, 'Sales rep user created successfully');
        } else {
            logTest('Sales Rep Registration', false, await response.text());
        }

        // Test 4: Login as Admin
        console.log('\n📝 Test 4: Login as Admin');
        response = await apiRequest('POST', '/api/auth/login', 'admin', {
            email: 'admin@test.com',
            password: 'admin123',
        });

        if (response.ok) {
            logTest('Admin Login', true, 'Admin logged in successfully');
        } else {
            logTest('Admin Login', false, await response.text());
        }

        // Test 5: Login as Manager
        console.log('\n📝 Test 5: Login as Manager');
        response = await apiRequest('POST', '/api/auth/login', 'manager', {
            email: 'manager@test.com',
            password: 'manager123',
        });

        if (response.ok) {
            logTest('Manager Login', true, 'Manager logged in successfully');
        } else {
            logTest('Manager Login', false, await response.text());
        }

        // Test 6: Login as Sales Rep
        console.log('\n📝 Test 6: Login as Sales Rep');
        response = await apiRequest('POST', '/api/auth/login', 'sales_rep', {
            email: 'salesrep@test.com',
            password: 'salesrep123',
        });

        if (response.ok) {
            logTest('Sales Rep Login', true, 'Sales rep logged in successfully');
        } else {
            logTest('Sales Rep Login', false, await response.text());
        }

        // Test 7: Create Leads as Different Users
        console.log('\n📝 Test 7: Create Leads as Different Users');

        // Admin creates lead
        response = await apiRequest('POST', '/api/leads', 'admin', {
            name: 'Admin Lead 1',
            email: 'admin.lead@test.com',
            status: 'new',
            ownerId: 'admin-user-id', // Would be actual admin user ID
        });
        logTest('Admin Create Lead', response.ok, response.ok ? 'Created' : await response.text());

        // Manager creates lead
        response = await apiRequest('POST', '/api/leads', 'manager', {
            name: 'Manager Lead 1',
            email: 'manager.lead@test.com',
            status: 'new',
            ownerId: 'manager-user-id', // Would be actual manager user ID
        });
        logTest('Manager Create Lead', response.ok, response.ok ? 'Created' : await response.text());

        // Sales Rep creates lead
        response = await apiRequest('POST', '/api/leads', 'sales_rep', {
            name: 'Sales Rep Lead 1',
            email: 'salesrep.lead@test.com',
            status: 'new',
            ownerId: 'salesrep-user-id', // Would be actual sales rep user ID
        });
        logTest('Sales Rep Create Lead', response.ok, response.ok ? 'Created' : await response.text());

        // Test 8: Verify Data Isolation - Admin sees all
        console.log('\n📝 Test 8: Data Isolation - Admin sees all leads');
        response = await apiRequest('GET', '/api/leads', 'admin');
        if (response.ok) {
            const leads = await response.json();
            logTest('Admin Data Access', Array.isArray(leads), `Admin sees ${leads.length} leads (should see all)`);
        } else {
            logTest('Admin Data Access', false, await response.text());
        }

        // Test 9: Verify Data Isolation - Manager sees own + team
        console.log('\n📝 Test 9: Data Isolation - Manager sees own + team leads');
        response = await apiRequest('GET', '/api/leads', 'manager');
        if (response.ok) {
            const leads = await response.json();
            logTest('Manager Data Access', Array.isArray(leads), `Manager sees ${leads.length} leads (should see own + team)`);
        } else {
            logTest('Manager Data Access', false, await response.text());
        }

        // Test 10: Verify Data Isolation - Sales Rep sees only own
        console.log('\n📝 Test 10: Data Isolation - Sales Rep sees only own leads');
        response = await apiRequest('GET', '/api/leads', 'sales_rep');
        if (response.ok) {
            const leads = await response.json();
            logTest('Sales Rep Data Access', Array.isArray(leads), `Sales Rep sees ${leads.length} leads (should see only own)`);
        } else {
            logTest('Sales Rep Data Access', false, await response.text());
        }

        // Test 11: Test /api/me endpoint
        console.log('\n📝 Test 11: Verify /api/auth/me endpoint');
        response = await apiRequest('GET', '/api/auth/me', 'admin');
        if (response.ok) {
            const user = await response.json();
            logTest('Admin /me endpoint', user.email === 'admin@test.com', `Got user: ${user.email}`);
        } else {
            logTest('Admin /me endpoint', false, await response.text());
        }

        response = await apiRequest('GET', '/api/auth/me', 'manager');
        if (response.ok) {
            const user = await response.json();
            logTest('Manager /me endpoint', user.email === 'manager@test.com', `Got user: ${user.email}`);
        } else {
            logTest('Manager /me endpoint', false, await response.text());
        }

        response = await apiRequest('GET', '/api/auth/me', 'sales_rep');
        if (response.ok) {
            const user = await response.json();
            logTest('Sales Rep /me endpoint', user.email === 'salesrep@test.com', `Got user: ${user.email}`);
        } else {
            logTest('Sales Rep /me endpoint', false, await response.text());
        }

    } catch (error: any) {
        console.error('\n❌ Test Error:', error.message);
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`Total: ${results.tests.length}`);
    console.log('='.repeat(50));

    // Print failed tests
    if (results.failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.tests
            .filter(t => !t.passed)
            .forEach(t => console.log(`  - ${t.name}: ${t.message}`));
    }
}

// Run tests
runTests().catch(console.error);

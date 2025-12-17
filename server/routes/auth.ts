import { Router } from 'express';
import AuthService from '../auth';
import { z } from 'zod';

const router = Router();

// Register schema
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1, 'Name is required'),
});

// Login schema  
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = registerSchema.parse(req.body);

        const user = await AuthService.register(email, password, name);

        res.json({
            success: true,
            user,
            message: 'Registration successful',
        });
    } catch (error: any) {
        console.error('[Auth] Registration error:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors,
            });
        }

        res.status(400).json({ error: error.message || 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const result = await AuthService.login(email, password);

        // Set session cookie
        res.cookie('session_id', result.sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({
            success: true,
            user: result.user,
            message: 'Login successful',
        });
    } catch (error: any) {
        console.error('[Auth] Login error:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors,
            });
        }

        res.status(401).json({ error: error.message || 'Login failed' });
    }
});

// POST /api/auth/logout
router.post('/logout', AuthService.requireAuth, async (req, res) => {
    try {
        if (req.sessionId) {
            await AuthService.logout(req.sessionId);
        }

        res.clearCookie('session_id');

        res.json({
            success: true,
            message: 'Logout successful',
        });
    } catch (error: any) {
        console.error('[Auth] Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// GET /api/auth/me - Get current user
router.get('/me', AuthService.requireAuth, async (req, res) => {
    // Return user directly to match frontend expectations
    res.json(req.user);
});

export default router;

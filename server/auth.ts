import bcrypt from 'bcryptjs';
import { db } from './db';
import { users, sessions } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
                role: string;
            };
            sessionId?: string;
        }
    }
}

export class AuthService {
    /**
     * Hash a password using bcrypt
     */
    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }

    /**
     * Compare password with hash
     */
    static async comparePassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Create a new user
     */
    static async register(email: string, password: string, name: string) {
        // Check if user already exists
        const existing = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (existing) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const passwordHash = await this.hashPassword(password);

        // Create user
        const [user] = await db.insert(users).values({
            email,
            passwordHash,
            name,
            role: 'sales_rep',
            isActive: 1,
        }).returning();

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };
    }

    /**
     * Authenticate user and create session
     */
    static async login(email: string, password: string) {
        // Find user
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (!user || !user.passwordHash) {
            throw new Error('Invalid email or password');
        }

        // Check if user is active
        if (user.isActive !== 1) {
            throw new Error('Account is deactivated');
        }

        // Verify password
        const isValid = await this.comparePassword(password, user.passwordHash);
        if (!isValid) {
            throw new Error('Invalid email or password');
        }

        // Create session (expires in 7 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const [session] = await db.insert(sessions).values({
            userId: user.id,
            expiresAt,
        }).returning();

        return {
            sessionId: session.id,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }

    /**
     * Verify session and get user
     */
    static async verifySession(sessionId: string) {
        const session = await db.query.sessions.findFirst({
            where: eq(sessions.id, sessionId),
            with: {
                user: true,
            },
        });

        if (!session) {
            return null;
        }

        // Check if session expired
        if (new Date() > session.expiresAt) {
            // Delete expired session
            await db.delete(sessions).where(eq(sessions.id, sessionId));
            return null;
        }

        return {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role,
        };
    }

    /**
     * Logout (delete session)
     */
    static async logout(sessionId: string) {
        await db.delete(sessions).where(eq(sessions.id, sessionId));
    }

    /**
     * Middleware to require authentication
     */
    static requireAuth = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Skip auth for /api/auth routes (already handled by router)
            if (req.path.startsWith('/auth')) {
                return next();
            }

            console.log(`[Auth Middleware] ${req.method} ${req.path} - checking auth...`);

            // Get session ID from cookie
            const sessionId = req.cookies?.session_id;

            if (!sessionId) {
                console.log(`[Auth Middleware] No session cookie found`);
                return res.status(401).json({ error: 'Not authenticated' });
            }

            // Validate session
            const user = await AuthService.verifySession(sessionId);

            if (!user) {
                console.log(`[Auth Middleware] Invalid session: ${sessionId}`);
                return res.status(401).json({ error: 'Session expired or invalid' });
            }

            console.log(`[Auth Middleware] Authenticated as: ${user.email} (${user.role})`);

            // Attach user and sessionId to request
            req.user = user;
            req.sessionId = sessionId;

            next();
        } catch (error: any) {
            console.error('[Auth Middleware] Error:', error);
            res.status(500).json({ error: 'Authentication error' });
        }
    };

    /**
     * Optional auth - attach user if session exists but don't require it
     */
    static optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sessionId = req.cookies?.session_id;

            if (sessionId) {
                const user = await AuthService.verifySession(sessionId);
                if (user) {
                    req.user = user;
                    req.sessionId = sessionId;
                }
            }

            next();
        } catch (error) {
            console.error('[Auth] Error in optionalAuth middleware:', error);
            next();
        }
    };
}

export default AuthService;

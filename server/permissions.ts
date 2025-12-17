import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage.js";

// Use the simplified user type that matches req.user from auth middleware
type AuthUser = {
    id: string;
    email: string;
    name: string;
    role: string;
};

/**
 * Permission enum - defines all possible permissions in the system
 */
export enum Permission {
    // Data access permissions
    VIEW_OWN_DATA = "view_own_data",
    VIEW_TEAM_DATA = "view_team_data",
    VIEW_ALL_DATA = "view_all_data",

    // Lead management permissions
    MANAGE_OWN_LEADS = "manage_own_leads",
    MANAGE_TEAM_LEADS = "manage_team_leads",
    ASSIGN_LEADS = "assign_leads",
    DELETE_LEADS = "delete_leads",

    // User management permissions
    VIEW_USERS = "view_users",
    MANAGE_USERS = "manage_users",

    // System permissions
    MANAGE_SETTINGS = "manage_settings",
    VIEW_ANALYTICS = "view_analytics",
    VIEW_TEAM_ANALYTICS = "view_team_analytics",
}

/**
 * Role to permissions mapping
 * Defines what each role can do
 */
export const RolePermissions: Record<string, Permission[]> = {
    admin: [
        // Admins have all permissions
        Permission.VIEW_ALL_DATA,
        Permission.VIEW_TEAM_DATA,
        Permission.VIEW_OWN_DATA,
        Permission.MANAGE_OWN_LEADS,
        Permission.MANAGE_TEAM_LEADS,
        Permission.ASSIGN_LEADS,
        Permission.DELETE_LEADS,
        Permission.VIEW_USERS,
        Permission.MANAGE_USERS,
        Permission.MANAGE_SETTINGS,
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_TEAM_ANALYTICS,
    ],
    manager: [
        // Managers can manage their team
        Permission.VIEW_TEAM_DATA,
        Permission.VIEW_OWN_DATA,
        Permission.MANAGE_OWN_LEADS,
        Permission.MANAGE_TEAM_LEADS,
        Permission.ASSIGN_LEADS,
        Permission.DELETE_LEADS, // Can delete team leads
        Permission.VIEW_USERS, // Can view team members
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_TEAM_ANALYTICS,
    ],
    sales_rep: [
        // Sales reps can only manage their own data
        Permission.VIEW_OWN_DATA,
        Permission.MANAGE_OWN_LEADS,
        Permission.VIEW_ANALYTICS, // Own analytics only
    ],
};

/**
 * Permission Service - handles role-based access control
 */
export default class PermissionService {
    /**
     * Check if a user has a specific permission
     */
    static hasPermission(user: AuthUser, permission: Permission): boolean {
        const rolePermissions = RolePermissions[user.role] || [];
        return rolePermissions.includes(permission);
    }

    /**
     * Express middleware to require a specific permission
     */
    static requirePermission(permission: Permission) {
        return (req: Request, res: Response, next: NextFunction) => {
            if (!req.user) {
                return res.status(401).json({
                    error: "Unauthorized: Authentication required"
                });
            }

            if (!this.hasPermission(req.user, permission)) {
                return res.status(403).json({
                    error: "Forbidden: Insufficient permissions",
                    required: permission,
                    userRole: req.user.role
                });
            }

            next();
        };
    }

    /**
     * Get all user IDs that the current user can access
     * Returns array of user IDs based on role hierarchy
     */
    static async getAccessibleUserIds(user: AuthUser): Promise<string[]> {
        // Admin can access all users
        if (user.role === "admin") {
            const allUsers = await storage.getUsers();
            return allUsers.map(u => u.id);
        }

        // Manager can access self + subordinates
        if (user.role === "manager") {
            const subordinates = await storage.getUsersByManager(user.id);
            return [user.id, ...subordinates.map(s => s.id)];
        }

        // Sales rep can only access own data
        return [user.id];
    }

    /**
     * Check if user can access a specific user's data
     */
    static async canAccessUser(currentUser: AuthUser, targetUserId: string): Promise<boolean> {
        const accessibleIds = await this.getAccessibleUserIds(currentUser);
        return accessibleIds.includes(targetUserId);
    }

    /**
     * Get user's subordinates recursively (for managers)
     */
    static async getAllSubordinates(userId: string) {
        const directSubordinates = await storage.getUsersByManager(userId);

        // Recursively get subordinates of subordinates
        const allSubordinates = [...directSubordinates];

        for (const subordinate of directSubordinates) {
            if (subordinate.role === "manager") {
                const subSubordinates = await this.getAllSubordinates(subordinate.id);
                allSubordinates.push(...subSubordinates);
            }
        }

        return allSubordinates;
    }

    /**
     * Check if user is admin
     */
    static isAdmin(user: AuthUser): boolean {
        return user.role === "admin";
    }

    /**
     * Check if user is manager or above
     */
    static isManagerOrAbove(user: AuthUser): boolean {
        return user.role === "admin" || user.role === "manager";
    }
}

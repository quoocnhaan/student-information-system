import type { UserRole } from "../types/auth";

export const roleRoutes: Record<UserRole, string> = {
    teacher: "/",
    student: "/",
};
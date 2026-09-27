export type UserRole =
    | "student"
    | "teacher";

export interface User {
    id: string;
    username: string;
    role: UserRole;
}
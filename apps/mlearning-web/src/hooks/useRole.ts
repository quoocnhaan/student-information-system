import { useAuth } from "../auth/AuthContext";

/** Lấy role từ AuthContext (cùng nguồn với CourseCatalog) */
export const useIsTeacher = () => {
  const { user } = useAuth();
  return user?.role === "teacher";
};
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  User,
  BookOpen,
  Calendar,
  FileText,
  BarChart2,
  TrendingUp,
  LogOut,
  GraduationCap,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { name: "Trang chủ", path: "/", icon: Home },
  { name: "Thông tin cá nhân", path: "/profile", icon: User },
  { name: "Đăng ký môn học", path: "/register", icon: BookOpen },
  { name: "Thời khóa biểu", path: "/schedule", icon: Calendar },
  { name: "Lịch thi", path: "/exam-schedule", icon: FileText },
  { name: "Kết quả học tập", path: "/results", icon: BarChart2 },
  { name: "Tiến độ học tập", path: "/progress", icon: TrendingUp },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-[280px] bg-[#112440] text-white flex flex-col h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="px-6 py-8 flex items-center gap-3">
        <GraduationCap className="w-10 h-10 text-white" />
        <h1 className="font-bold text-[15px] leading-tight uppercase tracking-wider">
          Hệ thống thông tin
          <br />
          sinh viên
        </h1>
      </div>

      <nav className="flex-1 px-4 flex flex-col gap-1.5">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-[15px] font-medium relative group",
                isActive
                  ? "bg-[#2563EB] text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-300 hover:bg-[#1E3A5F] hover:text-white",
              )}
            >
              <item.icon
                className={clsx(
                  "w-5 h-5",
                  isActive
                    ? "text-white"
                    : "text-slate-400 group-hover:text-white transition-colors",
                )}
              />
              <span className="flex-1">{item.name}</span>
              {(item as any).badge && (
                <span className="bg-red-500 text-white text-[11px] font-bold rounded-full w-[22px] h-[22px] flex items-center justify-center">
                  {(item as any).badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 mt-auto">
        <div className="text-[13px] text-slate-400/80 italic text-center mb-6 leading-relaxed relative"></div>
        <button className="flex items-center justify-center gap-2 w-full py-3 border border-slate-600/50 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-[15px]">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}

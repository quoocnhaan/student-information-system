import { Bell, ChevronRight } from "lucide-react";
import clsx from "clsx";

const notifications = [
  {
    type: "Học vụ",
    title: "Đăng ký môn học kỳ 1 năm học 2025-2026",
    date: "05/09/2025",
    typeColor: "bg-indigo-100 text-indigo-700",
  },
  {
    type: "Học bổng",
    title: "Thông báo học bổng khuyến khích học tập",
    date: "03/09/2025",
    typeColor: "bg-emerald-100 text-emerald-700",
  },
  {
    type: "Thi cử",
    title: "Lịch thi giữa kỳ học kỳ 1",
    date: "01/09/2025",
    typeColor: "bg-orange-100 text-orange-700",
  },
  {
    type: "Hệ thống",
    title: "Cập nhật quy định đăng ký môn học",
    date: "28/08/2025",
    typeColor: "bg-purple-100 text-purple-700",
  },
];

export default function NotificationsList() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-800 text-lg">
            Thông báo mới nhất
          </h3>
        </div>
        <a
          href="#"
          className="text-blue-600 text-sm font-medium hover:underline flex items-center"
        >
          Xem tất cả <ChevronRight className="w-4 h-4" />
        </a>
      </div>

      <div className="flex flex-col gap-4">
        {notifications.map((note, idx) => (
          <div
            key={idx}
            className="flex gap-4 items-start p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group"
          >
            <div
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 mt-0.5 whitespace-nowrap w-[72px] text-center",
                note.typeColor,
              )}
            >
              {note.type}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-800 text-[14px] leading-snug mb-1 group-hover:text-blue-600 transition-colors">
                {note.title}
              </h4>
              <p className="text-slate-400 text-xs">{note.date}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

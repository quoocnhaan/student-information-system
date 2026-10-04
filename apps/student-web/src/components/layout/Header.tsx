import { useState, useRef, useEffect } from "react";
import { Search, Bell, CheckCircle, Info, AlertTriangle } from "lucide-react";

const notifications = [
  {
    id: 1,
    type: "Học vụ",
    title: "Đăng ký môn học kỳ 1 năm học 2025-2026",
    time: "2 giờ trước",
    isRead: false,
    icon: <Info className="w-4 h-4 text-indigo-600" />,
    bgColor: "bg-indigo-100",
  },
  {
    id: 2,
    type: "Học bổng",
    title: "Thông báo học bổng khuyến khích học tập",
    time: "1 ngày trước",
    isRead: false,
    icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    bgColor: "bg-emerald-100",
  },
  {
    id: 3,
    type: "Thi cử",
    title: "Lịch thi giữa kỳ học kỳ 1",
    time: "2 ngày trước",
    isRead: true,
    icon: <AlertTriangle className="w-4 h-4 text-orange-600" />,
    bgColor: "bg-orange-100",
  },
];

export default function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <header className="h-[80px] bg-white sticky top-0 z-50 flex items-center justify-between px-8">
      {/* Search Bar */}
      <div className="flex-1 max-w-2xl">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-4" />
          <input
            type="text"
            placeholder="Tìm kiếm thông tin sinh viên, môn học, học phần..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-full text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-8 ml-8">
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button 
            className={`relative p-2 transition-colors rounded-full ${showNotifications ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="w-6 h-6" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute top-full right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800">Thông báo</h3>
                <button className="text-sm text-blue-600 hover:underline font-medium">Đánh dấu đã đọc</button>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.map((note) => (
                  <div 
                    key={note.id} 
                    className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!note.isRead ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full ${note.bgColor} flex items-center justify-center shrink-0`}>
                      {note.icon}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${!note.isRead ? 'font-semibold text-slate-800' : 'text-slate-600'} leading-snug mb-1`}>
                        {note.title}
                      </p>
                      <span className="text-xs text-slate-400">{note.time}</span>
                    </div>
                    {!note.isRead && (
                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0"></div>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-3 text-center border-t border-slate-100">
                <a href="/notifications" className="text-sm font-medium text-blue-600 hover:underline">
                  Xem tất cả thông báo
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-200">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 text-[15px]">Nguyễn Minh Anh</span>
            <span className="text-slate-500 text-[13px]">MSSV: 21127045</span>
          </div>
        </div>
      </div>
    </header>
  );
}

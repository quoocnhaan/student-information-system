import {
  GraduationCap,
  Layers,
  PieChart,
  BookOpen,
  Calendar,
  Bell,
  CheckSquare,
  ChevronRight,
  Clock,
  TrendingUp,
  MapPin,
  ChevronDown,
  FileText,
} from "lucide-react";
import clsx from "clsx";

const stats = [
  {
    title: "GPA hiện tại",
    value: "3.26",
    subValue: "↑ 0.12 so với kỳ trước",
    subValueColor: "text-emerald-500",
    icon: GraduationCap,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    title: "Tín chỉ đã hoàn thành",
    value: "65 / 120",
    subValue: "54%",
    subValueColor: "text-slate-500",
    icon: Layers,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-50",
    progress: 54,
    progressColor: "bg-blue-600",
  },
  {
    title: "Tiến độ chương trình",
    value: "54%",
    icon: PieChart,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
    progress: 54,
    progressColor: "bg-emerald-500",
  },
  {
    title: "Số môn học kỳ này",
    value: "6",
    subValue: "HK1 - 2025/2026",
    subValueColor: "text-slate-500",
    icon: BookOpen,
    iconColor: "text-indigo-500",
    bgColor: "bg-indigo-50",
  },
];

const todayClasses = [
  {
    time: "08:00 - 10:00",
    name: "Lập trình hướng đối tượng",
    room: "IT101 | P. A1.301",
    teacher: "Nguyễn Văn A",
    status: "Đang học",
    statusColor: "bg-emerald-100 text-emerald-700",
  },
  {
    time: "10:15 - 12:15",
    name: "Cấu trúc dữ liệu và giải thuật",
    room: "IT102 | P. A1.305",
    teacher: "Trần Thị B",
    status: "Sắp tới",
    statusColor: "bg-blue-100 text-blue-700",
  },
  {
    time: "13:30 - 15:30",
    name: "Cơ sở dữ liệu",
    room: "DB101 | P. B2.102",
    teacher: "Lê Văn C",
    status: "Sắp tới",
    statusColor: "bg-blue-100 text-blue-700",
  },
];

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

const exams = [
  {
    day: "22",
    month: "Th09",
    name: "Cơ sở dữ liệu",
    time: "08:00 - 10:00",
    room: "P. B2.101",
    remaining: "Còn 5 ngày",
  },
  {
    day: "25",
    month: "Th09",
    name: "Mạng máy tính",
    time: "13:30 - 15:30",
    room: "P. B2.203",
    remaining: "Còn 8 ngày",
  },
  {
    day: "29",
    month: "Th09",
    name: "Lập trình hướng đối tượng",
    time: "08:00 - 10:00",
    room: "P. A1.301",
    remaining: "Còn 12 ngày",
  },
];

const subjects = [
  { code: "IT101", name: "Lập trình hướng đối tượng", grade: 8.2 },
  { code: "IT102", name: "Cấu trúc dữ liệu và giải thuật", grade: 8.7 },
  { code: "DB101", name: "Cơ sở dữ liệu", grade: 7.8 },
  { code: "NET102", name: "Mạng máy tính", grade: 7.2 },
  { code: "OS101", name: "Hệ điều hành", grade: 8.8 },
  { code: "AI101", name: "Trí tuệ nhân tạo", grade: 6.0 },
];

const todos = [
  {
    icon: CheckSquare,
    iconBg: "bg-red-100 text-red-600",
    title: "Đăng ký môn học",
    deadline: "Hạn: 20/09/2025",
    action: "Đăng ký",
    actionColor: "bg-blue-600 text-white",
  },
  {
    icon: CheckSquare,
    iconBg: "bg-orange-100 text-orange-600",
    title: "Đóng học phí kỳ mới",
    deadline: "Hạn: 25/09/2025",
    action: "Xem",
    actionColor: "bg-blue-50 text-blue-600",
  },
  {
    icon: CheckSquare,
    iconBg: "bg-emerald-100 text-emerald-600",
    title: "Đăng ký xét học bổng",
    deadline: "Hạn: 30/09/2025",
    action: "Nộp",
    actionColor: "bg-blue-50 text-blue-600",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
      {/* Banner */}
      <div className="bg-white rounded-2xl p-8 flex justify-between items-center relative overflow-hidden shadow-sm border border-slate-100">
        {/* Background Graphic placeholder */}
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-blue-50 to-white opacity-50 z-0"></div>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            Xin chào, Nguyễn Minh Anh <span className="text-2xl">👋</span>
          </h2>
          <p className="text-slate-500 text-lg mb-4">
            Chúc bạn có một ngày học tập hiệu quả!
          </p>
          <p className="text-slate-400 italic font-serif">
            "Học không phải là để biết nhiều, mà là để làm được nhiều hơn."
          </p>
        </div>

        <div className="relative z-10 bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm self-start">
          <Calendar className="w-5 h-5 text-slate-500" />
          <span className="font-medium text-slate-700">
            Học kỳ 1 năm học 2025 - 2026
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400 ml-2" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-500 font-medium mb-1">{stat.title}</p>
                <h3 className="text-3xl font-bold text-slate-800">
                  {stat.value}
                </h3>
              </div>
              <div
                className={clsx(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  stat.bgColor,
                )}
              >
                <stat.icon className={clsx("w-6 h-6", stat.iconColor)} />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm mt-auto">
              {stat.progress !== undefined ? (
                <div className="w-full">
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-transparent">0</span>
                    <span className="text-slate-600">{stat.subValue}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={clsx("h-2 rounded-full", stat.progressColor)}
                      style={{ width: `${stat.progress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <span className={clsx("font-medium", stat.subValueColor)}>
                  {stat.subValue}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lịch học hôm nay */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-lg">
                Lịch học hôm nay
              </h3>
            </div>
            <a
              href="#"
              className="text-blue-600 text-sm font-medium hover:underline flex items-center"
            >
              Xem thời khóa biểu <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="flex flex-col gap-4 flex-1">
            {todayClasses.map((cls, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="w-24 text-sm font-semibold text-slate-700 shrink-0 pt-1">
                  {cls.time}
                </div>
                <div className="flex-1 border-l-2 border-blue-100 pl-4 pb-4 relative">
                  <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5 border-2 border-white"></div>
                  <h4 className="font-bold text-slate-800 text-[15px] mb-1">
                    {cls.name}
                  </h4>
                  <p className="text-slate-500 text-sm mb-1">{cls.room}</p>
                  <p className="text-slate-500 text-sm mb-3">
                    GV: {cls.teacher}
                  </p>
                  <span
                    className={clsx(
                      "text-xs font-semibold px-2.5 py-1 rounded-md",
                      cls.statusColor,
                    )}
                  >
                    {cls.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Thông báo */}
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

        {/* Lịch thi */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-lg">
                Lịch thi sắp tới
              </h3>
            </div>
            <a
              href="#"
              className="text-blue-600 text-sm font-medium hover:underline flex items-center"
            >
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="flex flex-col gap-3">
            {exams.map((exam, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl hover:border-blue-100 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-xl w-14 h-14 shrink-0">
                  <span className="font-bold text-xl leading-none">
                    {exam.day}
                  </span>
                  <span className="text-xs font-semibold">{exam.month}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-[15px] mb-1">
                    {exam.name}
                  </h4>
                  <div className="flex items-center gap-3 text-slate-500 text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {exam.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {exam.room}
                    </span>
                  </div>
                </div>
                <span className="text-orange-500 bg-orange-50 px-2.5 py-1 rounded-md text-xs font-bold shrink-0">
                  {exam.remaining}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tiến độ học tập */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-lg">
                Tiến độ học tập
              </h3>
            </div>
            <a
              href="#"
              className="text-blue-600 text-sm font-medium hover:underline flex items-center"
            >
              Xem chi tiết <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="flex flex-col gap-6 mb-8 mt-2">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-slate-700 text-sm">
                  Bắt buộc
                </span>
                <span className="font-bold text-slate-700 text-sm">
                  72%{" "}
                  <span className="text-slate-400 font-normal">(12/12)</span>
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className="bg-blue-500 h-2.5 rounded-full"
                  style={{ width: "72%" }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-slate-700 text-sm">
                  Tự chọn
                </span>
                <span className="font-bold text-slate-700 text-sm">
                  40% <span className="text-slate-400 font-normal">(8/20)</span>
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className="bg-purple-500 h-2.5 rounded-full"
                  style={{ width: "40%" }}
                ></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-auto">
            <div className="bg-slate-50 p-4 rounded-xl text-center">
              <p className="text-slate-500 text-xs font-medium mb-1">
                Tổng số tín chỉ
              </p>
              <p className="text-xl font-bold text-slate-800">120</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl text-center">
              <p className="text-slate-500 text-xs font-medium mb-1">
                Đã hoàn thành
              </p>
              <p className="text-xl font-bold text-emerald-600">65</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl text-center">
              <p className="text-slate-500 text-xs font-medium mb-1">Còn lại</p>
              <p className="text-xl font-bold text-blue-600">55</p>
            </div>
          </div>
        </div>

        {/* Môn học kỳ này */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-lg">
                Môn học học kỳ này
              </h3>
            </div>
            <a
              href="#"
              className="text-blue-600 text-sm font-medium hover:underline flex items-center"
            >
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="flex flex-col -mx-2">
            {subjects.map((sub, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-slate-500 font-mono text-sm w-12 shrink-0">
                    {sub.code}
                  </span>
                  <span className="font-semibold text-slate-700 text-sm truncate">
                    {sub.name}
                  </span>
                </div>
                <span
                  className={clsx(
                    "font-bold text-sm px-2 py-1 rounded",
                    sub.grade >= 8.0
                      ? "text-emerald-600 bg-emerald-50"
                      : sub.grade >= 7.0
                        ? "text-blue-600 bg-blue-50"
                        : "text-orange-600 bg-orange-50",
                  )}
                >
                  {sub.grade.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Việc cần làm */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-lg">Việc cần làm</h3>
            </div>
            <a
              href="#"
              className="text-blue-600 text-sm font-medium hover:underline flex items-center"
            >
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="flex flex-col gap-4">
            {todos.map((todo, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl"
              >
                <div
                  className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    todo.iconBg,
                  )}
                >
                  <todo.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-sm mb-1">
                    {todo.title}
                  </h4>
                  <p className="text-slate-500 text-xs">{todo.deadline}</p>
                </div>
                <button
                  className={clsx(
                    "px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                    todo.actionColor,
                    todo.actionColor.includes("text-white")
                      ? "hover:bg-blue-700"
                      : "hover:bg-blue-100",
                  )}
                >
                  {todo.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

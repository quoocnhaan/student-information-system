import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import clsx from "clsx";
import { Link } from "react-router-dom";

const exams = [
  {
    id: 1,
    code: "IT101",
    name: "Lập trình hướng đối tượng",
    group: "01",
    date: "08/09/2025",
    dayName: "Thứ 2",
    time: "08:00 - 10:00",
    room: "P. A1.301",
    type: "Trực tiếp",
    status: "Đã thi",
    statusColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    id: 2,
    code: "IT102",
    name: "Cấu trúc dữ liệu và giải thuật",
    group: "01",
    date: "15/09/2025",
    dayName: "Thứ 2",
    time: "13:30 - 15:00",
    room: "P. B2.101",
    type: "Trực tiếp",
    status: "Sắp thi",
    statusColor: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    id: 3,
    code: "IT103",
    name: "Cơ sở dữ liệu",
    group: "01",
    date: "22/09/2025",
    dayName: "Thứ 2",
    time: "08:00 - 10:00",
    room: "P. A1.302",
    type: "Trực tiếp",
    status: "Chưa thi",
    statusColor: "bg-slate-50 text-slate-500 border-slate-200",
  },
  {
    id: 4,
    code: "IT104",
    name: "Mạng máy tính",
    group: "01",
    date: "29/09/2025",
    dayName: "Thứ 2",
    time: "13:30 - 15:30",
    room: "P. B2.101",
    type: "Trực tiếp",
    status: "Chưa thi",
    statusColor: "bg-slate-50 text-slate-500 border-slate-200",
  },
  {
    id: 5,
    code: "IT105",
    name: "Hệ điều hành",
    group: "01",
    date: "06/10/2025",
    dayName: "Thứ 2",
    time: "08:00 - 10:00",
    room: "P. C1.201",
    type: "Trực tiếp",
    status: "Chưa thi",
    statusColor: "bg-slate-50 text-slate-500 border-slate-200",
  },
  {
    id: 6,
    code: "IT106",
    name: "Phát triển web",
    group: "01",
    date: "13/10/2025",
    dayName: "Thứ 2",
    time: "13:30 - 15:00",
    room: "P. A1.302",
    type: "Trực tiếp",
    status: "Chưa thi",
    statusColor: "bg-slate-50 text-slate-500 border-slate-200",
  },
  {
    id: 7,
    code: "IT107",
    name: "Trí tuệ nhân tạo",
    group: "01",
    date: "20/10/2025",
    dayName: "Thứ 2",
    time: "08:00 - 10:00",
    room: "P. B2.102",
    type: "Trực tiếp",
    status: "Chưa thi",
    statusColor: "bg-slate-50 text-slate-500 border-slate-200",
  },
  {
    id: 8,
    code: "IT108",
    name: "Đồ họa máy tính",
    group: "01",
    date: "27/10/2025",
    dayName: "Thứ 2",
    time: "13:30 - 16:00",
    room: "P. C1.202",
    type: "Trực tiếp",
    status: "Chưa thi",
    statusColor: "bg-slate-50 text-slate-500 border-slate-200",
  },
];

const calendarDays = [
  { day: 1, type: "none" },
  { day: 2, type: "done" },
  { day: 3, type: "none" },
  { day: 4, type: "none" },
  { day: 5, type: "none" },
  { day: 6, type: "none" },
  { day: 7, type: "none" },
  { day: 8, type: "done" },
  { day: 9, type: "none" },
  { day: 10, type: "none" },
  { day: 11, type: "none" },
  { day: 12, type: "none" },
  { day: 13, type: "none" },
  { day: 14, type: "none" },
  { day: 15, type: "upcoming" },
  { day: 16, type: "upcoming", active: true },
  { day: 17, type: "none" },
  { day: 18, type: "none" },
  { day: 19, type: "none" },
  { day: 20, type: "none" },
  { day: 21, type: "none" },
  { day: 22, type: "pending" },
  { day: 23, type: "none" },
  { day: 24, type: "none" },
  { day: 25, type: "none" },
  { day: 26, type: "none" },
  { day: 27, type: "none" },
  { day: 28, type: "none" },
  { day: 29, type: "pending" },
  { day: 30, type: "none" },
];

export default function ExamSchedulePage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              to="/"
              className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </Link>
            <h1 className="text-3xl font-bold text-[#112440]">Lịch thi</h1>
          </div>
          <p className="text-slate-500 ml-11">
            Xem lịch thi các học phần của bạn. Vui lòng kiểm tra kỹ thông tin
            phòng thi, thời gian và chuẩn bị đầy đủ trước khi tham gia.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm text-sm">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700">
            Thứ 3, 16 tháng 9, 2025
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column (Table) */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:border-blue-400 transition-colors">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-700 text-[14px] flex-1">
                Học kỳ 1 năm học 2025-2026
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>

            <div className="w-64 bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:border-blue-400 transition-colors">
              <span className="font-medium text-slate-700 text-[14px] flex-1">
                Tất cả môn học
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>

            <div className="w-48 bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:border-blue-400 transition-colors">
              <span className="font-medium text-slate-700 text-[14px] flex-1">
                Tất cả hình thức thi
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>

            <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors text-[14px]">
              <RefreshCw className="w-4 h-4" /> Làm mới
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                    <th className="font-semibold py-4 px-6 w-16 text-center">
                      STT
                    </th>
                    <th className="font-semibold py-4 px-6 w-28">
                      Mã học phần
                    </th>
                    <th className="font-semibold py-4 px-6">Tên học phần</th>
                    <th className="font-semibold py-4 px-6 w-32">Ngày thi</th>
                    <th className="font-semibold py-4 px-6 w-32">Thời gian</th>
                    <th className="font-semibold py-4 px-6 w-28">Phòng thi</th>
                    <th className="font-semibold py-4 px-6 text-center w-28">
                      Hình thức
                    </th>
                    <th className="font-semibold py-4 px-6 text-center w-28">
                      Ghi chú
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[14px]">
                  {exams.map((exam) => (
                    <tr
                      key={exam.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-4 px-6 text-center text-slate-500">
                        {exam.id}
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-mono">
                        {exam.code}
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-700 mb-0.5 leading-snug">
                          {exam.name}
                        </p>
                        <p className="text-slate-400 text-xs">
                          Nhóm: {exam.group}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-medium text-slate-700 mb-0.5">
                          {exam.date}
                        </p>
                        <p className="text-slate-400 text-xs">
                          ({exam.dayName})
                        </p>
                      </td>
                      <td className="py-4 px-6 text-slate-600">{exam.time}</td>
                      <td className="py-4 px-6 font-medium text-slate-700">
                        {exam.room}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                          {exam.type}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={clsx(
                            "px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border",
                            exam.statusColor,
                          )}
                        >
                          {exam.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between mt-auto">
              <span className="text-slate-500 text-sm">
                Hiển thị 1 - 8 trong tổng số 8 lịch thi
              </span>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white font-medium text-sm transition-colors">
                  1
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Mini Calendar */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-[16px]">
                  Lịch thi tháng 9/2025
                </h3>
              </div>
              <div className="flex gap-2">
                <button className="text-slate-400 hover:text-blue-600">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="text-slate-400 hover:text-blue-600">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center mb-2">
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                <div
                  key={d}
                  className="text-slate-500 font-medium text-[13px] py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center mb-6">
              {calendarDays.map((d, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center p-1.5 h-12 relative cursor-pointer group"
                >
                  <div
                    className={clsx(
                      "w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-medium transition-colors",
                      d.active
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-700 group-hover:bg-slate-100",
                    )}
                  >
                    {d.day}
                  </div>
                  {d.type !== "none" && (
                    <div
                      className={clsx(
                        "w-1.5 h-1.5 rounded-full mt-1",
                        d.type === "done"
                          ? "bg-emerald-500"
                          : d.type === "upcoming"
                            ? "bg-amber-500"
                            : "bg-slate-300",
                      )}
                    ></div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs font-medium px-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-slate-600">Đã thi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <span className="text-slate-600">Sắp thi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <span className="text-slate-600">Chưa thi</span>
              </div>
            </div>
          </div>

          {/* Thông tin quan trọng */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-[16px]">
                Thông tin quan trọng
              </h3>
            </div>

            <ul className="flex flex-col gap-3 text-[13px] text-slate-600 pl-4 list-disc marker:text-blue-500">
              <li className="pl-1">Có mặt trước giờ thi ít nhất 15 phút.</li>
              <li className="pl-1">
                Mang theo thẻ sinh viên và giấy tờ tùy thân.
              </li>
              <li className="pl-1 leading-relaxed">
                Không được mang điện thoại và thiết bị thu/phát sóng vào phòng
                thi.
              </li>
              <li className="pl-1 leading-relaxed">
                Theo dõi thông báo mới nhất từ nhà trường để cập nhật thay đổi
                (nếu có).
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

import {
  ArrowLeft,
  Calendar,
  Clock,
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  MoreVertical,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FilePlus,
  Check,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function RegisterCoursePage() {
  const availableCourses = [
    {
      id: "IT101",
      name: "Lập trình hướng đối tượng",
      credits: 3.5,
      schedule: "T2, T4\n08:00 - 10:00",
      room: "P. A1.301",
      status: "registered",
    },
    {
      id: "IT102",
      name: "Cấu trúc dữ liệu và giải thuật",
      credits: 3.5,
      schedule: "T3, T5\n13:30 - 15:00",
      room: "P. B2.101",
      status: "registered",
    },
    {
      id: "IT103",
      name: "Cơ sở dữ liệu",
      credits: 3.0,
      schedule: "T2, T4\n08:00 - 10:00",
      room: "P. A1.302",
      status: "registered",
    },
    {
      id: "IT104",
      name: "Mạng máy tính",
      credits: 3.0,
      schedule: "T3, T5\n13:30 - 15:30",
      room: "P. B2.101",
      status: "registered",
    },
    {
      id: "IT105",
      name: "Hệ điều hành",
      credits: 3.0,
      schedule: "T2, T4\n06:00 - 08:00",
      room: "P. C1.201",
      status: "available",
    },
    {
      id: "IT106",
      name: "Phát triển web",
      credits: 3.0,
      schedule: "T3, T5\n13:30 - 15:00",
      room: "P. A1.302",
      status: "available",
    },
    {
      id: "IT107",
      name: "Trí tuệ nhân tạo",
      credits: 3.0,
      schedule: "T2, T4\n08:00 - 10:00",
      room: "P. B2.102",
      status: "available",
    },
    {
      id: "IT108",
      name: "Đồ họa máy tính",
      credits: 3.0,
      schedule: "T3, T5\n13:30 - 16:00",
      room: "P. C1.202",
      status: "available",
    },
  ];

  const registeredCourses = [
    {
      id: "IT101",
      name: "Lập trình hướng đối tượng",
      credits: 3.5,
      schedule: "T2, T4  08:00 - 10:00",
    },
    {
      id: "IT102",
      name: "Cấu trúc dữ liệu và giải thuật",
      credits: 3.5,
      schedule: "T3, T5  13:30 - 15:00",
    },
    {
      id: "IT103",
      name: "Cơ sở dữ liệu",
      credits: 3.0,
      schedule: "T2, T4  08:00 - 10:00",
    },
    {
      id: "IT104",
      name: "Mạng máy tính",
      credits: 3.0,
      schedule: "T3, T5  13:30 - 15:30",
    },
    {
      id: "IT105",
      name: "Hệ điều hành",
      credits: 3.0,
      schedule: "T2, T4  06:00 - 08:00",
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto p-6 bg-[#F8FAFC] min-h-screen font-sans">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Link to="/register" className="p-2 hover:bg-slate-200 rounded-full transition-colors inline-block">
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Đăng ký môn học</h1>
        </div>
        <p className="text-slate-500 ml-12 text-sm">
          Chọn môn học trong học kỳ hiện tại. Hệ thống sẽ kiểm tra điều kiện,
          trùng lịch và số tín chỉ.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Content Area */}
        <div className="flex-1 space-y-6">
          {/* Current Semester Info Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 border border-blue-100">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Học kỳ hiện tại</p>
                <div className="flex items-center gap-3">
                  <h3 className="text-[15px] font-bold text-slate-800">
                    Học kỳ 1 năm học 2025 - 2026
                  </h3>
                  <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-[11px] font-semibold rounded-full">
                    Đang đăng ký
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden md:block w-px h-10 bg-slate-200"></div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center shrink-0 border border-slate-100">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">
                  Thời gian đăng ký
                </p>
                <p className="text-[15px] font-medium text-slate-700">
                  01/09/2025 - 10/09/2025
                </p>
              </div>
            </div>

            <div className="hidden md:block w-px h-10 bg-slate-200"></div>

            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
              Đổi học kỳ <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Filters Area */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm môn học, mã môn học..."
                className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <select className="block w-48 pl-3 pr-8 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm appearance-none cursor-pointer">
                <option>Tất cả môn học</option>
              </select>
              <select className="block w-48 pl-3 pr-8 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm appearance-none cursor-pointer">
                <option>Tất cả hình thức</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                <Filter className="w-4 h-4 text-slate-500" />
                Bộ lọc
              </button>
            </div>
          </div>

          {/* Table Area */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-white">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h2 className="text-[15px] font-bold text-slate-800">
                Danh sách môn học mở đăng ký
              </h2>
              <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[11px] font-bold rounded-full">
                12 môn học
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8FAFC]">
                    <th className="py-3 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Mã môn
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tên môn học
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Số TC
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Lịch học
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Hình thức
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                      Trạng thái
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {availableCourses.map((course, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-slate-700">
                        {course.id}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-800">
                        {course.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 font-medium text-center">
                        {course.credits.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                        {course.schedule}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {course.room}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            course.status === "registered"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {course.status === "registered"
                            ? "Đã đăng ký"
                            : "Chưa đăng ký"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {course.status === "registered" ? (
                          <button className="px-4 py-1.5 bg-slate-100 text-slate-400 rounded-md text-xs font-semibold cursor-not-allowed w-[100px]">
                            Đã đăng ký
                          </button>
                        ) : (
                          <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors shadow-sm w-[100px]">
                            Đăng ký
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-white">
              <span className="text-xs text-slate-500">
                Hiển thị 1 - 8 trong tổng số 8 môn học
              </span>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded bg-blue-600 text-white text-sm font-medium">
                  1
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="lg:w-[400px] shrink-0 space-y-6">
          {/* Registered Courses Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-slate-800">
                Môn học đã đăng ký trong học kỳ này
              </h2>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-full">
                5/7 môn
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 mb-5 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-[13px] text-emerald-700 font-medium leading-relaxed">
                Bạn đã đăng ký 5 môn, còn 2 môn nữa để đạt số tín chỉ tối thiểu
                (13/17 TC).
              </p>
            </div>

            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
              {registeredCourses.map((course, idx) => (
                <div key={idx} className="flex items-start gap-3 group">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-bold text-slate-800 mb-0.5 truncate group-hover:text-blue-600 transition-colors">
                      {course.id}{" "}
                      <span className="font-medium text-slate-600 ml-1">
                        {course.name}
                      </span>
                    </h4>
                    <p className="text-[12px] text-slate-500">
                      {course.credits.toFixed(1)} TC |{" "}
                      <span className="text-slate-400">{course.schedule}</span>
                    </p>
                  </div>
                  <button className="text-slate-300 hover:text-slate-500 p-1">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Registration Overview Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-slate-800 mb-5">
              Tổng quan đăng ký
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">
                    Tổng số môn đã đăng ký
                  </span>
                </div>
                <span className="text-[15px] font-bold text-slate-800">5</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FilePlus className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">
                    Tổng số môn đăng ký thêm
                  </span>
                </div>
                <span className="text-[15px] font-bold text-slate-800">0</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-600 block">
                      Tổng số tín chỉ
                    </span>
                    <span className="text-[11px] text-slate-400">
                      (Tối thiểu: 13 - Tối đa: 17)
                    </span>
                  </div>
                </div>
                <span className="text-[15px] font-bold text-slate-800">15</span>
              </div>
            </div>

            <Link to="/register/timetable">
              <button className="w-full py-3 bg-blue-400 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all hover:bg-blue-500 cursor-pointer">
                <Check className="w-4 h-4" />
                Xác nhận đăng ký
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

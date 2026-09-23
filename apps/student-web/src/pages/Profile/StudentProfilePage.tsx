import {
  Home,
  ChevronRight,
  GraduationCap,
  Layers,
  PieChart,
  BookOpen,
  User,
  Book,
  Calendar,
  FileText,
  TrendingUp,
  Search,
  Edit3,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function StudentProfilePage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
      {/* Header & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          >
            <Home className="w-4 h-4" />
            Trang chủ
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-blue-600 font-medium">Thông tin sinh viên</span>
        </div>

        <div className="relative bg-white rounded-2xl p-8 overflow-hidden shadow-sm border border-slate-100 flex justify-between items-center">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-blue-50 to-white opacity-50 z-0"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-[#112440] mb-2">
              Thông tin sinh viên
            </h1>
            <p className="text-slate-500 text-lg">
              Xem và quản lý thông tin cá nhân, học tập của bạn.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Profile Card */}
        <div className="xl:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative">
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-50 shrink-0">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                alt="Avatar"
                className="w-full h-full object-cover bg-slate-100"
              />
            </div>
            <div className="pt-2">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-slate-800">
                  Nguyễn Minh Anh
                </h2>
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
                  Sinh viên
                </span>
              </div>
              <p className="text-slate-500 font-medium mb-4">MSSV: 22302429</p>

              <div className="flex flex-col gap-3 text-sm">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5 text-slate-500 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" /> Khoa
                  </div>
                  <div className="col-span-7 font-medium text-slate-800">
                    Công nghệ thông tin
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5 text-slate-500 flex items-center gap-2">
                    <Book className="w-4 h-4" /> Lớp
                  </div>
                  <div className="col-span-7 font-medium text-slate-800">
                    CNTT2024A
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5 text-slate-500 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Ngành
                  </div>
                  <div className="col-span-7 font-medium text-slate-800">
                    Công nghệ thông tin
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5 text-slate-500 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" /> Khóa
                  </div>
                  <div className="col-span-7 font-medium text-slate-800">
                    2023 - 2027
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-start">
            <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              Đang học
            </span>
          </div>
        </div>

        {/* Stats Grid 2x2 */}
        <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GPA */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 text-blue-500 shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <p className="text-slate-500 font-medium mb-1">GPA hiện tại</p>
                <h3 className="text-3xl font-bold text-slate-800 mb-1">3.26</h3>
                <span className="text-emerald-500 text-sm font-medium">
                  ↑ 0.12 so với kỳ trước
                </span>
              </div>
            </div>
          </div>

          {/* Credits */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 text-blue-500 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="w-full">
                <p className="text-slate-500 font-medium mb-1">
                  Tín chỉ đã hoàn thành
                </p>
                <h3 className="text-3xl font-bold text-slate-800 mb-3">
                  65 / 120
                </h3>
                <div className="w-full">
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: "54%" }}
                    ></div>
                  </div>
                  <div className="text-right text-xs font-bold text-slate-600 mt-1">
                    54%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex items-start gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-500 shrink-0">
                <PieChart className="w-6 h-6" />
              </div>
              <div className="w-full">
                <p className="text-slate-500 font-medium mb-1">
                  Tiến độ chương trình
                </p>
                <h3 className="text-3xl font-bold text-slate-800 mb-3">54%</h3>
                <div className="w-full">
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-emerald-500 h-2.5 rounded-full"
                      style={{ width: "54%" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-slate-500 text-xs text-right mt-2">
              Còn lại 55 tín chỉ
            </p>
          </div>

          {/* Current Courses */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-50 text-purple-500 shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-slate-500 font-medium mb-1">
                  Môn học đang học
                </p>
                <h3 className="text-3xl font-bold text-slate-800 mb-2">6</h3>
                <span className="text-slate-500 text-sm">
                  Kỳ học hiện tại: HK1 - 2025/2026
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thông tin chung */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col relative">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-lg">
              Thông tin chung
            </h3>
          </div>

          <div className="flex flex-col gap-4 text-[14px]">
            <div className="flex justify-between border-b border-slate-50 pb-3">
              <span className="text-slate-500 w-1/3">Họ và tên</span>
              <span className="font-medium text-slate-800 flex-1">
                Nguyễn Minh Anh
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-3">
              <span className="text-slate-500 w-1/3">Ngày sinh</span>
              <span className="font-medium text-slate-800 flex-1">
                14/03/2005
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-3">
              <span className="text-slate-500 w-1/3">Giới tính</span>
              <span className="font-medium text-slate-800 flex-1">Nam</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-3">
              <span className="text-slate-500 w-1/3">Dân tộc</span>
              <span className="font-medium text-slate-800 flex-1">Kinh</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-3">
              <span className="text-slate-500 w-1/3">Số điện thoại</span>
              <span className="font-medium text-slate-800 flex-1">
                0912 345 678
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-3">
              <span className="text-slate-500 w-1/3">Email</span>
              <span className="font-medium text-slate-800 flex-1">
                minhanh.21127045@student.edu.vn
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-3">
              <span className="text-slate-500 w-1/3">Địa chỉ</span>
              <span className="font-medium text-slate-800 flex-1">
                Quận 7, TP. Hồ Chí Minh
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 w-1/3">Quê quán</span>
              <span className="font-medium text-slate-800 flex-1">Nghệ An</span>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors">
              <Edit3 className="w-4 h-4" />
              Chỉnh sửa
            </button>
          </div>
        </div>

        {/* Thông tin học tập */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col relative">
          <div className="flex items-center gap-2 mb-6">
            <Book className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-lg">
              Thông tin học tập
            </h3>
          </div>

          <div className="flex flex-col gap-4 text-[14px]">
            <div className="flex justify-between border-b border-slate-50 pb-3 items-center">
              <span className="text-slate-500 w-1/3">Trạng thái</span>
              <div className="flex-1">
                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-semibold">
                  Đang học
                </span>
              </div>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-3">
              <span className="text-slate-500 w-1/3">Hệ đào tạo</span>
              <span className="font-medium text-slate-800 flex-1">
                Đại học chính quy
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-3">
              <span className="text-slate-500 w-1/3">Bậc đào tạo</span>
              <span className="font-medium text-slate-800 flex-1">Đại học</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-3">
              <span className="text-slate-500 w-1/3">Ngành</span>
              <span className="font-medium text-slate-800 flex-1">
                Công nghệ thông tin
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-3">
              <span className="text-slate-500 w-1/3">Khoa</span>
              <span className="font-medium text-slate-800 flex-1">
                Công nghệ thông tin
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-3">
              <span className="text-slate-500 w-1/3">Khóa học</span>
              <span className="font-medium text-slate-800 flex-1">
                2023 - 2027
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-3">
              <span className="text-slate-500 w-1/3">Lớp</span>
              <span className="font-medium text-slate-800 flex-1">
                CNTT2024A
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 w-1/3">Cố vấn học tập</span>
              <span className="font-medium text-slate-800 flex-1">
                PGS.TS. Nguyễn Văn D
              </span>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors">
              <ExternalLink className="w-4 h-4" />
              Xem chi tiết học tập
            </button>
          </div>
        </div>

        {/* Tiện ích nhanh */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-blue-600 text-xl font-bold">⚡</span>
              <h3 className="font-bold text-slate-800 text-lg">
                Tiện ích nhanh
              </h3>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                to="/schedule"
                className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl transition-colors group border border-transparent hover:border-blue-100"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-slate-700 group-hover:text-blue-700">
                    Lịch học hôm nay
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
              </Link>
              <Link
                to="/register-courses"
                className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl transition-colors group border border-transparent hover:border-blue-100"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-slate-700 group-hover:text-blue-700">
                    Đăng ký môn học
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
              </Link>
              <Link
                to="/results"
                className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl transition-colors group border border-transparent hover:border-blue-100"
              >
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-slate-700 group-hover:text-blue-700">
                    Tra cứu điểm
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
              </Link>
              <Link
                to="/schedule"
                className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl transition-colors group border border-transparent hover:border-blue-100"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-slate-700 group-hover:text-blue-700">
                    Xem thời khóa biểu
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
              </Link>
              <Link
                to="/exam-schedule"
                className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl transition-colors group border border-transparent hover:border-blue-100"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-slate-700 group-hover:text-blue-700">
                    Xem lịch thi
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
              </Link>
              <Link
                to="/progress"
                className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl transition-colors group border border-transparent hover:border-blue-100"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-slate-700 group-hover:text-blue-700">
                    Xem tiến độ học tập
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-[15px]">
                  Học kỳ hiện tại
                </p>
                <p className="text-slate-800 font-semibold text-sm">
                  HK1 - 2025/2026
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  Từ 01/09/2025 đến 31/01/2026
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}

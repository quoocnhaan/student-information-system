import {
  ArrowLeft,
  Calendar,
  Clock,
  ArrowRight,
  Info,
  ClipboardList,
  ChevronDown,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function ChooseSemester() {

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8 bg-slate-50/50 min-h-screen font-sans">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <button className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Đăng ký môn học</h1>
        </div>
        <p className="text-slate-500 ml-12 text-sm">
          Chọn học kỳ bạn muốn đăng ký môn học
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          {/* Section 1: Dropdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                Học kỳ đăng ký
              </h2>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-slate-400" />
              </div>
              <select className="block w-full pl-10 pr-10 py-3 text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white text-slate-700 cursor-pointer">
                <option value="">Chọn học kỳ</option>
                <option value="1">Học kỳ 1 (2025 - 2026)</option>
                <option value="2">Học kỳ 2 (2025 - 2026)</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ChevronDown className="h-5 w-5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Section 2: Cards */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-semibold text-slate-800">
                Các học kỳ đang mở đăng ký
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Active */}
              <div className="border border-blue-100 bg-[#f4f8ff] rounded-xl p-5 flex flex-col h-full shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-blue-50">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-[11px] font-semibold rounded-full uppercase tracking-wide">
                    Đang đăng ký
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  Học kỳ 1
                </h3>
                <p className="text-slate-500 text-sm mb-6">2025 - 2026</p>

                <div className="mt-auto">
                  <div className="flex items-start gap-2 mb-4">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">
                        Thời gian đăng ký:
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        01/09/2025 – 10/09/2025
                      </p>
                    </div>
                  </div>
                  <Link to="/register/select">
                    <button className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm">
                      Xem môn học <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>

              {/* Card 2: Upcoming */}
              <div className="border border-slate-200 bg-white rounded-xl p-5 flex flex-col h-full shadow-sm hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                    <Calendar className="w-5 h-5 text-slate-400" />
                  </div>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-full uppercase tracking-wide">
                    Chưa mở
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  Học kỳ 2
                </h3>
                <p className="text-slate-500 text-sm mb-6">2025 - 2026</p>

                <div className="mt-auto">
                  <div className="flex items-start gap-2 mb-4">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">
                        Mở đăng ký:
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        15/01/2026
                      </p>
                    </div>
                  </div>
                  <button
                    className="w-full py-2.5 bg-slate-100 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed flex items-center justify-center gap-2"
                    disabled
                  >
                    Xem môn học <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card 3: Closed */}
              <div className="border border-slate-200 bg-white rounded-xl p-5 flex flex-col h-full shadow-sm hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                    <Calendar className="w-5 h-5 text-red-400" />
                  </div>
                  <span className="px-3 py-1 bg-red-50 text-red-600 text-[11px] font-semibold rounded-full uppercase tracking-wide">
                    Đã đóng
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  Học kỳ hè
                </h3>
                <p className="text-slate-500 text-sm mb-6">2025 - 2026</p>

                <div className="mt-auto">
                  <div className="flex items-start gap-2 mb-4">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">
                        Thời gian đăng ký:
                      </p>
                      <p className="text-sm font-medium text-slate-700">—</p>
                    </div>
                  </div>
                  <button
                    className="w-full py-2.5 bg-slate-100 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed flex items-center justify-center gap-2"
                    disabled
                  >
                    Xem môn học <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Info Alert */}
          <div className="bg-[#f0f7ff] border border-blue-100 rounded-xl p-4 flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0" />
            <p className="text-slate-700 text-sm">
              <span className="font-semibold">Vui lòng chọn học kỳ</span> để xem
              danh sách các học phần được mở đăng ký.
            </p>
          </div>
        </div>

        {/* Sidebar Process */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm sticky top-8">
            <div className="flex items-center gap-3 mb-8">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                Quy trình đăng ký
              </h2>
            </div>

            <div className="relative">
              {/* Vertical line connecting steps */}
              <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-slate-100"></div>

              <div className="space-y-8 relative">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="relative z-10 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border-[3px] border-white ring-1 ring-blue-100">
                    1
                  </div>
                  <div className="pt-1">
                    <h3 className="font-semibold text-slate-800 text-sm">
                      Chọn học kỳ
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Chọn học kỳ bạn muốn đăng ký
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="relative z-10 w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0 border-[3px] border-white ring-1 ring-slate-200">
                    2
                  </div>
                  <div className="pt-1">
                    <h3 className="font-medium text-slate-600 text-sm">
                      Chọn môn học
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Tìm và chọn các môn học phù hợp
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="relative z-10 w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0 border-[3px] border-white ring-1 ring-slate-200">
                    3
                  </div>
                  <div className="pt-1">
                    <h3 className="font-medium text-slate-600 text-sm">
                      Xác nhận đăng ký
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Kiểm tra thông tin trước khi đăng ký
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="relative z-10 w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0 border-[3px] border-white ring-1 ring-slate-200">
                    4
                  </div>
                  <div className="pt-1">
                    <h3 className="font-medium text-slate-600 text-sm">
                      Hoàn tất
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Đăng ký thành công
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

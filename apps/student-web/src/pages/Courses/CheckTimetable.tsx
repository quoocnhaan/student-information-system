import {
  ArrowLeft,
  Check,
  CheckCircle2,
  MoreHorizontal,
  Calendar,
  FileText,
  Info,
  Eye,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
export default function CheckTimetable() {
  const selectedCourses = [
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

  const timeSlots = [
    "06:00 - 08:00",
    "08:00 - 10:00",
    "10:00 - 12:00",
    "13:00 - 15:00",
    "15:00 - 17:00",
    "17:00 - 19:00",
    "19:00 - 21:00",
  ];
  const days = [
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "Chủ nhật",
  ];

  // Helper function to render a course block if it matches the slot
  const renderCellContent = (time: string, day: string) => {
    if (time === "06:00 - 08:00" && (day === "Thứ 2" || day === "Thứ 4")) {
      return (
        <div className="w-full h-full p-1">
          <div className="bg-[#EBE5FF] text-[#6938EF] rounded-lg w-full h-full flex flex-col items-center justify-center text-xs font-semibold p-1">
            <span>IT105</span>
            <span className="font-normal opacity-80">(3.0 TC)</span>
          </div>
        </div>
      );
    }
    if (time === "08:00 - 10:00" && (day === "Thứ 2" || day === "Thứ 4")) {
      return (
        <div className="w-full h-full p-1">
          <div className="bg-[#D1FADF] text-[#039855] rounded-lg w-full h-full flex flex-col items-center justify-center text-xs font-semibold p-1">
            <span>IT101</span>
            <span className="font-normal opacity-80">(3.5 TC)</span>
          </div>
        </div>
      );
    }
    if (time === "13:00 - 15:00" && (day === "Thứ 3" || day === "Thứ 5")) {
      return (
        <div className="w-full h-full p-1">
          <div className="bg-[#FEF0C7] text-[#DC6803] rounded-lg w-full h-full flex flex-col items-center justify-center text-xs font-semibold p-1">
            <span>IT102</span>
            <span className="font-normal opacity-80">(3.5 TC)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 lg:p-8 bg-[#F8FAFC] min-h-screen font-sans">
      {/* Header Area */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-2">
          <Link to="/register/select" className="p-2 hover:bg-slate-200 rounded-full transition-colors inline-block">
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">
            Kiểm tra lịch học
          </h1>
        </div>
        <p className="text-slate-500 ml-12 text-sm">
          Hệ thống sẽ kiểm tra lịch học, điều kiện tiên quyết và số tín chỉ của
          các môn bạn đã chọn.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center mb-10 w-full">
        <div className="flex items-center w-full max-w-4xl justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <span className="font-medium text-slate-700 text-sm hidden md:block">
              Chọn học kỳ
            </span>
          </div>
          <div className="flex-1 h-[2px] bg-slate-200 mx-4 max-w-[100px]"></div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <span className="font-medium text-slate-700 text-sm hidden md:block">
              Chọn môn học
            </span>
          </div>
          <div className="flex-1 h-[2px] bg-slate-200 mx-4 max-w-[100px]"></div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/30">
              3
            </div>
            <span className="font-bold text-slate-900 text-sm hidden md:block">
              Kiểm tra lịch
            </span>
          </div>
          <div className="flex-1 h-[2px] bg-slate-200 mx-4 max-w-[100px]"></div>

          <div className="flex items-center gap-3 opacity-50">
            <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-300 text-slate-400 flex items-center justify-center font-bold">
              4
            </div>
            <span className="font-medium text-slate-500 text-sm hidden md:block">
              Xác nhận đăng ký
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column - Selected Courses */}
        <div className="col-span-1 lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-[15px]">
                Danh sách môn đã chọn (5)
              </h2>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                5 môn
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {selectedCourses.map((course, idx) => (
                <div
                  key={idx}
                  className="p-3 hover:bg-slate-50 rounded-lg transition-colors group flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-bold text-slate-800 mb-1 truncate">
                      {course.id}
                    </h4>
                    <p className="text-[13px] font-medium text-slate-700 truncate mb-1">
                      {course.name}
                    </p>
                    <p className="text-[12px] text-slate-500">
                      {course.credits.toFixed(1)} TC{" "}
                      <span className="text-slate-300 mx-1">|</span>{" "}
                      {course.schedule}
                    </p>
                  </div>
                  <button className="text-slate-300 hover:text-slate-600 p-1 rounded transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 bg-blue-50/50 border-t border-blue-100">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] text-slate-600">
                      Tổng số môn:
                    </span>
                    <span className="text-[14px] font-bold text-slate-800">
                      5
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] text-slate-600">
                      Tổng số tín chỉ:
                    </span>
                    <span className="text-[14px] font-bold text-slate-800">
                      16
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    (Tối thiểu: 13 - Tối đa: 17)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - Timetable */}
        <div className="col-span-1 lg:col-span-6 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-[700px] flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-800 text-[15px]">
                Thời khóa biểu dự kiến
              </h2>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#D1FADF]/50 border border-[#D1FADF] rounded-full">
                <CheckCircle2 className="w-4 h-4 text-[#039855]" />
                <span className="text-[12px] font-semibold text-[#039855]">
                  Không có xung đột lịch
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto border border-slate-200 rounded-lg bg-white relative custom-scrollbar">
              <table className="w-full text-center border-collapse min-w-[600px] h-full">
                <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                  <tr>
                    <th className="border-b border-r border-slate-200 py-3 px-2 text-xs font-semibold text-slate-500 w-24">
                      Thời gian
                    </th>
                    {days.map((day) => (
                      <th
                        key={day}
                        className="border-b border-r border-slate-200 py-3 px-2 text-xs font-semibold text-slate-700"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((time) => (
                    <tr key={time} className="h-20">
                      <td className="border-b border-r border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/30">
                        {time}
                      </td>
                      {days.map((day) => (
                        <td
                          key={`${time}-${day}`}
                          className="border-b border-r border-slate-200 p-0 relative h-20 w-[14.28%]"
                        >
                          {renderCellContent(time, day)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Alert / Notice inside Middle column */}
            <div className="mt-5 bg-[#F0F6FF] border border-[#D1E0FF] rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-800 text-sm mb-2">
                  Lưu ý
                </h4>
                <ul className="list-disc list-inside text-[13px] text-slate-600 space-y-1.5">
                  <li>
                    Hệ thống đã kiểm tra và không phát hiện xung đột lịch học.
                  </li>
                  <li>
                    Tổng số tín chỉ nằm trong giới hạn cho phép (13 - 17 tín
                    chỉ).
                  </li>
                  <li>
                    Vui lòng xác nhận đăng ký để chuyển sang bước tiếp theo.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar Actions */}
        <div className="col-span-1 lg:col-span-3 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-slate-800 text-[15px]">
                Thông tin học kỳ
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[14px]">
                  Học kỳ 1 năm học 2025 - 2026
                </span>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded-full uppercase">
                  Đang đăng ký
                </span>
              </div>
              <div>
                <p className="text-[12px] text-slate-500 mb-1">
                  Thời gian đăng ký:{" "}
                  <span className="font-medium text-slate-700 ml-1">
                    01/09/2025 - 10/09/2025
                  </span>
                </p>
              </div>
              <button className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[13px] font-semibold transition-colors flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Thay đổi học kỳ
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-slate-800 text-[15px]">
                Tóm tắt đăng ký
              </h2>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-[13px] text-slate-600 font-medium">
                  Số môn đăng ký
                </span>
                <span className="font-bold text-slate-800">5</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-[13px] text-slate-600 font-medium">
                  Tổng số tín chỉ
                </span>
                <span className="font-bold text-slate-800">16</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-slate-600 font-medium">
                  Tình trạng
                </span>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-emerald-600 text-[13px]">
                    Hợp lệ
                  </span>
                </div>
              </div>
            </div>

            <button className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-blue-600 rounded-lg text-[13px] font-semibold transition-colors flex items-center justify-center gap-2">
              <Eye className="w-4 h-4" /> Xem chi tiết môn học
            </button>
          </div>

          <div className="pt-4 flex gap-3">
            <Link to="/register/select" className="flex-1">
              <button className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[14px] font-bold transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>
            </Link>

            <Link to="/register/confirm" className="flex-1">
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[14px] font-bold transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                Tiếp tục <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

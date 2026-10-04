import { ArrowLeft, Check, CheckCircle2, Calendar, FileText, Info, ChevronDown, Lightbulb, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ConfirmPage() {
  const selectedCourses = [
    { id: 'IT101', name: 'Lập trình hướng đối tượng', credits: 3.5, schedule: 'T2, T4\n08:00 - 10:00', room: 'P. A1.301' },
    { id: 'IT102', name: 'Cấu trúc dữ liệu và giải thuật', credits: 3.5, schedule: 'T3, T5\n13:30 - 15:00', room: 'P. B2.101' },
    { id: 'IT103', name: 'Cơ sở dữ liệu', credits: 3.0, schedule: 'T2, T4\n08:00 - 10:00', room: 'P. A1.302' },
    { id: 'IT104', name: 'Mạng máy tính', credits: 3.0, schedule: 'T3, T5\n13:30 - 15:30', room: 'P. B2.101' },
    { id: 'IT105', name: 'Hệ điều hành', credits: 3.0, schedule: 'T2, T4\n06:00 - 08:00', room: 'P. C1.201' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto p-6 lg:p-8 bg-[#F8FAFC] min-h-screen font-sans">
      {/* Header Area */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-2">
          <Link to="/register/timetable" className="p-2 hover:bg-slate-200 rounded-full transition-colors inline-block">
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Xác nhận đăng ký</h1>
        </div>
        <p className="text-slate-500 ml-12 text-sm">
          Vui lòng kiểm tra lại thông tin đăng ký môn học trước khi xác nhận.
        </p>
      </div>


      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column */}
        <div className="col-span-1 lg:col-span-8 space-y-6">
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-[16px] font-bold text-slate-800">Thông tin đăng ký</h2>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between border border-slate-100 bg-slate-50/50 rounded-xl p-5 gap-6">
              <div className="flex items-center gap-3 flex-1">
                <Calendar className="w-5 h-5 text-slate-400" />
                <h3 className="text-[15px] font-bold text-slate-800">Học kỳ 1 năm học 2025 - 2026</h3>
              </div>
              
              <div className="hidden md:block w-px h-10 bg-slate-200"></div>
              
              <div className="flex items-center justify-between gap-4 flex-1">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-[12px] text-slate-500 mb-0.5">Thời gian đăng ký</p>
                    <p className="text-[14px] font-medium text-slate-700">01/09/2025 - 10/09/2025</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-100 rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-[11px] font-semibold text-green-700 uppercase">Đang đăng ký</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-[16px] font-bold text-slate-800">Danh sách môn học đăng ký (5 môn)</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="py-3 px-5 text-[13px] font-semibold text-slate-500">STT</th>
                    <th className="py-3 px-5 text-[13px] font-semibold text-slate-500">Mã môn</th>
                    <th className="py-3 px-5 text-[13px] font-semibold text-slate-500">Tên môn học</th>
                    <th className="py-3 px-5 text-[13px] font-semibold text-slate-500 text-center">Số TC</th>
                    <th className="py-3 px-5 text-[13px] font-semibold text-slate-500">Lịch học</th>
                    <th className="py-3 px-5 text-[13px] font-semibold text-slate-500">Phòng học</th>
                    <th className="py-3 px-5 text-[13px] font-semibold text-slate-500 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedCourses.map((course, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-5 text-[13px] text-slate-600 font-medium">{idx + 1}</td>
                      <td className="py-4 px-5 text-[13px] font-bold text-slate-700">{course.id}</td>
                      <td className="py-4 px-5 text-[14px] font-medium text-slate-800">{course.name}</td>
                      <td className="py-4 px-5 text-[13px] text-slate-600 font-medium text-center">{course.credits.toFixed(1)}</td>
                      <td className="py-4 px-5 text-[12px] text-slate-600 whitespace-pre-line leading-relaxed">{course.schedule}</td>
                      <td className="py-4 px-5 text-[13px] text-slate-600">{course.room}</td>
                      <td className="py-4 px-5 text-center">
                        <span className="inline-flex px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[11px] font-semibold border border-green-100">
                          Đã đăng ký
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 bg-slate-50/80 border-t border-slate-100">
              <div className="bg-[#F0F6FF] border border-[#D1E0FF] rounded-lg p-3.5 flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0" />
                <p className="text-[13px] text-slate-700 font-medium">
                  Sau khi xác nhận, hệ thống sẽ kiểm tra điều kiện học, trùng lịch và gửi thông báo kết quả đăng ký.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link to="/register/timetable">
              <button className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[14px] font-bold transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>
            </Link>
            <Link to="/register">
              <button className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[14px] font-bold transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                <Check className="w-4 h-4" /> Xác nhận đăng ký
              </button>
            </Link>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-[16px] font-bold text-slate-800">Tóm tắt đăng ký</h2>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-[14px] text-slate-600 font-medium">Số môn đăng ký</span>
                <span className="text-[15px] font-bold text-slate-800">5</span>
              </div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-[14px] text-slate-600 font-medium">Tổng số tín chỉ</span>
                <span className="text-[15px] font-bold text-slate-800">16</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-slate-600 font-medium">Học phí dự kiến</span>
                <span className="text-[15px] font-bold text-slate-900">12.500.000 đ</span>
              </div>
            </div>

            <button className="w-full py-3 bg-[#F0F6FF] hover:bg-[#E0EEFF] text-blue-700 rounded-xl text-[13px] font-bold transition-colors flex items-center justify-between px-5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center font-serif text-[10px] text-blue-700">₫</div>
                Chi tiết học phí
              </div>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <h2 className="text-[16px] font-bold text-slate-800">Lưu ý quan trọng</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                <p className="text-[13px] text-slate-600 leading-relaxed">
                  Kiểm tra kỹ thời gian, phòng học và học phần của từng môn học.
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                <p className="text-[13px] text-slate-600 leading-relaxed">
                  Đảm bảo không trùng lịch với các môn đã đăng ký.
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                <p className="text-[13px] text-slate-600 leading-relaxed">
                  Chỉ xác nhận khi bạn đã chắc chắn với lựa chọn của mình.
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                <p className="text-[13px] text-slate-600 leading-relaxed">
                  Sau khi xác nhận, hệ thống sẽ tự động cập nhật vào thời khóa biểu của bạn.
                </p>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}

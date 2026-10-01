import { 
  TrendingUp, 
  Calendar,
  ChevronDown,
  GraduationCap,
  Layers,
  Star,
  BookOpen,
  Target,
  PieChart,
  BarChart2
} from "lucide-react";
import clsx from "clsx";

const courses = [
  { id: 1, code: "IT101", name: "Lập trình hướng đối tượng", credits: 3.5, score: 8.2, progress: 100, status: "Đạt", statusColor: "bg-emerald-100 text-emerald-700" },
  { id: 2, code: "IT102", name: "Cấu trúc dữ liệu và giải thuật", credits: 3.5, score: 8.7, progress: 100, status: "Đạt", statusColor: "bg-emerald-100 text-emerald-700" },
  { id: 3, code: "IT103", name: "Cơ sở dữ liệu", credits: 3.0, score: 7.8, progress: 100, status: "Đạt", statusColor: "bg-emerald-100 text-emerald-700" },
  { id: 4, code: "IT104", name: "Mạng máy tính", credits: 3.0, score: 7.2, progress: 100, status: "Đạt", statusColor: "bg-emerald-100 text-emerald-700" },
  { id: 5, code: "IT105", name: "Hệ điều hành", credits: 3.0, score: 8.8, progress: 100, status: "Đạt", statusColor: "bg-emerald-100 text-emerald-700" },
  { id: 6, code: "IT106", name: "Phát triển web", credits: 3.0, score: 8.8, progress: 85, status: "Đang học", statusColor: "bg-blue-100 text-blue-700" },
  { id: 7, code: "IT107", name: "Trí tuệ nhân tạo", credits: 3.0, score: 6.0, progress: 60, status: "Chưa đạt", statusColor: "bg-orange-100 text-orange-700" },
];

export default function StudyProgressPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-8">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#112440]">Tiến độ học tập</h1>
          </div>
          <p className="text-slate-500">Theo dõi tiến độ hoàn thành môn học, số tín chỉ và kết quả học tập của bạn trong từng học kỳ.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-slate-700 text-[15px]">Học kỳ 1 năm học 2025-2026</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-500 font-medium mb-1">Tổng số môn học</p>
              <h3 className="text-3xl font-bold text-slate-800 flex items-baseline gap-2">
                7 <span className="text-lg font-medium text-slate-400">/ 7</span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex-1 bg-slate-100 rounded-full h-2.5">
               <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '100%' }}></div>
             </div>
             <span className="text-sm font-bold text-slate-600 w-10 text-right">100%</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-500 font-medium mb-1">Tổng số tín chỉ</p>
              <h3 className="text-3xl font-bold text-slate-800 flex items-baseline gap-2">
                21 <span className="text-lg font-medium text-slate-400">/ 21</span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex-1 bg-slate-100 rounded-full h-2.5">
               <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '100%' }}></div>
             </div>
             <span className="text-sm font-bold text-slate-600 w-10 text-right">100%</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
              <Star className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-500 font-medium mb-1">Điểm trung bình học kỳ</p>
              <h3 className="text-3xl font-bold text-slate-800 flex items-baseline gap-2">
                3.26
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex-1 bg-slate-100 rounded-full h-2.5">
               <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: '100%' }}></div>
             </div>
             <span className="text-sm font-bold text-slate-600 w-10 text-right">100%</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <Target className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-500 font-medium mb-1">Tổng số môn đạt</p>
              <h3 className="text-3xl font-bold text-slate-800 flex items-baseline gap-2">
                6 <span className="text-lg font-medium text-slate-400">/ 7</span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex-1 bg-slate-100 rounded-full h-2.5">
               <div className="bg-orange-400 h-2.5 rounded-full" style={{ width: '86%' }}></div>
             </div>
             <span className="text-sm font-bold text-slate-600 w-10 text-right">86%</span>
          </div>
        </div>

      </div>

      {/* Main layout: Table + Right Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Courses Table */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-lg">Danh sách môn học</h3>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer shadow-sm text-sm">
              <span className="text-slate-600 font-medium">Học kỳ 1 năm học 2025-2026</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm">
                  <th className="font-semibold py-4 px-6 w-16 text-center">STT</th>
                  <th className="font-semibold py-4 px-6 w-24">Mã môn</th>
                  <th className="font-semibold py-4 px-6">Tên môn học</th>
                  <th className="font-semibold py-4 px-6 text-center w-24">Số tín chỉ</th>
                  <th className="font-semibold py-4 px-6 text-center w-24">Điểm TB</th>
                  <th className="font-semibold py-4 px-6 w-40">Tiến độ</th>
                  <th className="font-semibold py-4 px-6 text-center w-32">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="text-[14px]">
                {courses.map((course) => (
                  <tr key={course.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-center text-slate-500">{course.id}</td>
                    <td className="py-4 px-6 text-slate-500 font-mono">{course.code}</td>
                    <td className="py-4 px-6 font-medium text-slate-700">{course.name}</td>
                    <td className="py-4 px-6 text-center text-slate-600">{course.credits.toFixed(1)}</td>
                    <td className="py-4 px-6 text-center font-semibold text-slate-700">{course.score.toFixed(1)}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                           <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${course.progress}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 w-8">{course.progress}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={clsx("px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap", course.statusColor)}>
                        {course.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Cards */}
        <div className="flex flex-col gap-6">
          
          {/* Tổng quan tiến độ */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-6">
              <PieChart className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-[16px]">Tổng quan tiến độ</h3>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Circular progress visual */}
              <div className="relative w-32 h-32 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                   <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                   <circle cx="50" cy="50" r="40" stroke="#10b981" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - 0.86)} strokeLinecap="round" />
                   {/* Adding a blue segment for 'Đang học' */}
                   <circle cx="50" cy="50" r="40" stroke="#3b82f6" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - 0.14)} strokeDashoffset-adjusted={251.2 - (251.2 * 0.14)} strokeLinecap="round" style={{ strokeDashoffset: 251.2 * (1 - 0.14), transformOrigin: 'center', transform: 'rotate(310deg)' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-800 leading-none">86%</span>
                  <span className="text-[10px] text-slate-500 mt-1">Hoàn thành</span>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-600">Môn đã đạt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">6</span>
                    <span className="text-slate-400 text-xs w-8 text-right">(86%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <span className="text-slate-600">Đang học</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">1</span>
                    <span className="text-slate-400 text-xs w-8 text-right">(14%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="text-slate-600">Chưa đạt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">0</span>
                    <span className="text-slate-400 text-xs w-8 text-right">(0%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tiến độ theo khối kiến thức */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-6">
              <Layers className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-[16px]">Tiến độ theo khối kiến thức</h3>
            </div>
            
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-slate-700 text-sm">Bắt buộc</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-600 text-sm">100%</span>
                    <span className="text-slate-400 text-xs">(12/12 tín chỉ)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-slate-700 text-sm">Tự chọn</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 text-sm">0%</span>
                    <span className="text-slate-400 text-xs">(0/0 tín chỉ)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-slate-200 h-2.5 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Tình hình chung */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-6">
              <BarChart2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-[16px]">Tình hình chung</h3>
            </div>
            
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex justify-between border-b border-slate-50 pb-3">
                <span className="text-slate-500">Tổng số tín chỉ đăng ký</span>
                <span className="font-bold text-slate-800">21</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-3">
                <span className="text-slate-500">Tổng số tín chỉ đã hoàn thành</span>
                <span className="font-bold text-slate-800">18</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-3">
                <span className="text-slate-500">Tỷ lệ hoàn thành</span>
                <span className="font-bold text-slate-800">86%</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-500">Xếp loại học tập</span>
                <span className="font-bold text-slate-800">Khá</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

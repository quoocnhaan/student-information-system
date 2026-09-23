import { 
  GraduationCap, 
  Calendar,
  ChevronDown,
  ChevronRight,
  BookOpen
} from "lucide-react";
import clsx from "clsx";

const tabs = ["Tổng quan", "Chi tiết điểm", "Điểm chuyên cần", "Xếp loại"];

const courses = [
  { id: 1, code: "IT101", name: "Lập trình hướng đối tượng", credits: 3.5, midterm: 8.5, final: 8.0, total: 8.2, rank: "Giỏi", rankColor: "bg-emerald-100 text-emerald-700" },
  { id: 2, code: "IT102", name: "Cấu trúc dữ liệu và giải thuật", credits: 3.5, midterm: 8.8, final: 8.5, total: 8.7, rank: "Giỏi", rankColor: "bg-emerald-100 text-emerald-700" },
  { id: 3, code: "IT103", name: "Cơ sở dữ liệu", credits: 3.0, midterm: 8.0, final: 7.5, total: 7.8, rank: "Khá", rankColor: "bg-blue-100 text-blue-700" },
  { id: 4, code: "IT104", name: "Mạng máy tính", credits: 3.0, midterm: 7.5, final: 7.0, total: 7.2, rank: "Khá", rankColor: "bg-blue-100 text-blue-700" },
  { id: 5, code: "IT105", name: "Hệ điều hành", credits: 3.0, midterm: 8.7, final: 8.8, total: 8.8, rank: "Giỏi", rankColor: "bg-emerald-100 text-emerald-700" },
  { id: 6, code: "IT106", name: "Phát triển web", credits: 3.0, midterm: 9.0, final: 8.5, total: 8.8, rank: "Giỏi", rankColor: "bg-emerald-100 text-emerald-700" },
  { id: 7, code: "IT107", name: "Trí tuệ nhân tạo", credits: 3.0, midterm: 6.5, final: 5.5, total: 6.0, rank: "Trung bình", rankColor: "bg-orange-100 text-orange-700" },
];

const quizzes = [
  { id: 1, subject: "Lập trình hướng đối tượng", name: "Quiz 1 - Chương 1", time: "10/08/2025 10:30", score: 9.0, scoreColor: "bg-emerald-100 text-emerald-700" },
  { id: 2, subject: "Cấu trúc dữ liệu và giải thuật", name: "Quiz 1 - Bài tập 1", time: "22/08/2025 23:59", score: 8.5, scoreColor: "bg-emerald-100 text-emerald-700" },
  { id: 3, subject: "Cơ sở dữ liệu", name: "Quiz 2 - Cây nhị phân", time: "05/09/2025 09:15", score: 7.5, scoreColor: "bg-blue-100 text-blue-700" },
  { id: 4, subject: "Mạng máy tính", name: "Quiz 2 - Định tuyến", time: "19/09/2025 23:59", score: 9.5, scoreColor: "bg-emerald-100 text-emerald-700" },
  { id: 5, subject: "Trí tuệ nhân tạo", name: "Quiz 1 - Logic", time: "28/09/2025 08:00", score: 8.5, scoreColor: "bg-emerald-100 text-emerald-700" },
];

export default function StudentGradePage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-8">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#112440]">Kết quả học tập</h1>
          </div>
          <p className="text-slate-500">Xem điểm số, điểm thi và điểm các bài kiểm tra thường xuyên của bạn theo từng học kỳ.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-slate-700 text-[15px]">Học kỳ</span>
          <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>
          <span className="font-medium text-slate-700 text-[15px]">Học kỳ 1 năm học 2025-2026</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Stats Grid 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Môn A */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-3xl font-bold shrink-0 relative z-10">
            A
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 font-medium mb-1">Tổng số môn A</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-blue-600">4</h3>
              <span className="text-slate-400 font-medium">(57%)</span>
            </div>
          </div>
        </div>

        {/* Môn B */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-bold shrink-0 relative z-10">
            B
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 font-medium mb-1">Tổng số môn B</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-emerald-600">2</h3>
              <span className="text-slate-400 font-medium">(29%)</span>
            </div>
          </div>
        </div>

        {/* Môn C */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-3xl font-bold shrink-0 relative z-10">
            C
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 font-medium mb-1">Tổng số môn C</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-orange-600">1</h3>
              <span className="text-slate-400 font-medium">(14%)</span>
            </div>
          </div>
        </div>

        {/* ĐTB */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 relative z-10">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 font-medium mb-1">Điểm trung bình học kỳ</p>
            <h3 className="text-3xl font-bold text-purple-700">3.26</h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mt-2">
        <nav className="flex gap-8">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              className={clsx(
                "pb-4 font-semibold text-[15px] relative transition-colors",
                idx === 0 
                  ? "text-blue-600" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab}
              {idx === 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-t-full"></div>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">Danh sách môn học</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm">
                <th className="font-semibold py-4 px-6 w-16 text-center">STT</th>
                <th className="font-semibold py-4 px-6 w-24">Mã môn</th>
                <th className="font-semibold py-4 px-6">Tên môn học</th>
                <th className="font-semibold py-4 px-6 text-center">Tín chỉ</th>
                <th className="font-semibold py-4 px-6 text-center">
                  Điểm quá trình<br/><span className="text-xs font-normal">(40%)</span>
                </th>
                <th className="font-semibold py-4 px-6 text-center">
                  Điểm thi<br/><span className="text-xs font-normal">(60%)</span>
                </th>
                <th className="font-semibold py-4 px-6 text-center">Điểm tổng kết</th>
                <th className="font-semibold py-4 px-6 text-center">Xếp loại</th>
              </tr>
            </thead>
            <tbody className="text-[14px]">
              {courses.map((course) => (
                <tr key={course.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 text-center text-slate-500">{course.id}</td>
                  <td className="py-4 px-6 text-slate-500 font-mono">{course.code}</td>
                  <td className="py-4 px-6 font-medium text-slate-700">{course.name}</td>
                  <td className="py-4 px-6 text-center text-slate-600">{course.credits.toFixed(1)}</td>
                  <td className="py-4 px-6 text-center text-slate-600 font-medium">{course.midterm.toFixed(1)}</td>
                  <td className="py-4 px-6 text-center text-slate-600 font-medium">{course.final.toFixed(1)}</td>
                  <td className="py-4 px-6 text-center font-bold text-slate-800">{course.total.toFixed(1)}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={clsx("px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap", course.rankColor)}>
                      {course.rank}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quizzes Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-2">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg">Kết quả kiểm tra thường xuyên (Quiz)</h3>
          <a href="#" className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
            <BookOpen className="w-4 h-4" />
            Tất cả môn học <ChevronRight className="w-4 h-4" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm">
                <th className="font-semibold py-4 px-6 w-16 text-center">STT</th>
                <th className="font-semibold py-4 px-6 w-1/4">Môn học</th>
                <th className="font-semibold py-4 px-6">Bài kiểm tra</th>
                <th className="font-semibold py-4 px-6">Thời gian nộp</th>
                <th className="font-semibold py-4 px-6 text-center w-32">Điểm</th>
              </tr>
            </thead>
            <tbody className="text-[14px]">
              {quizzes.map((quiz) => (
                <tr key={quiz.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 text-center text-slate-500">{quiz.id}</td>
                  <td className="py-4 px-6 font-medium text-slate-700">{quiz.subject}</td>
                  <td className="py-4 px-6 text-slate-600">{quiz.name}</td>
                  <td className="py-4 px-6 text-slate-500">{quiz.time}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={clsx("px-3 py-1 rounded-full text-xs font-bold", quiz.scoreColor)}>
                      {quiz.score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

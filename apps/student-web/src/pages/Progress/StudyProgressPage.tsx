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
  BarChart2,
} from "lucide-react";
import clsx from "clsx";

const courses = [
  {
    id: 1,
    code: "IT101",
    name: "Lập trình hướng đối tượng",
    credits: 3.5,
    score: 8.2,
    gpa: 3.5,
  },
  {
    id: 2,
    code: "IT102",
    name: "Cấu trúc dữ liệu và giải thuật",
    credits: 3.5,
    score: 8.7,
    gpa: 4.0,
  },
  {
    id: 3,
    code: "IT103",
    name: "Cơ sở dữ liệu",
    credits: 3.0,
    score: 7.8,
    gpa: 3.0,
  },
  {
    id: 4,
    code: "IT104",
    name: "Mạng máy tính",
    credits: 3.0,
    score: 7.2,
    gpa: 3.0,
  },
  {
    id: 5,
    code: "IT105",
    name: "Hệ điều hành",
    credits: 3.0,
    score: 8.8,
    gpa: 4.0,
  },
  {
    id: 6,
    code: "IT106",
    name: "Phát triển web",
    credits: 3.0,
    score: 8.8,
    gpa: 4.0,
  },
  {
    id: 7,
    code: "IT107",
    name: "Trí tuệ nhân tạo",
    credits: 3.0,
    score: 6.0,
    gpa: 2.0,
  },
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
            <h1 className="text-3xl font-bold text-[#112440]">
              Tiến độ học tập
            </h1>
          </div>
          <p className="text-slate-500">
            Theo dõi tiến độ hoàn thành môn học, số tín chỉ và kết quả học tập
            của bạn trong từng học kỳ.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-slate-700 text-[15px]">
            Học kỳ 1 năm học 2025-2026
          </span>
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
                7{" "}
                <span className="text-lg font-medium text-slate-400">/ 7</span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: "100%" }}
              ></div>
            </div>
            <span className="text-sm font-bold text-slate-600 w-10 text-right">
              100%
            </span>
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
                21{" "}
                <span className="text-lg font-medium text-slate-400">/ 21</span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-2.5">
              <div
                className="bg-emerald-500 h-2.5 rounded-full"
                style={{ width: "100%" }}
              ></div>
            </div>
            <span className="text-sm font-bold text-slate-600 w-10 text-right">
              100%
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
              <Star className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-500 font-medium mb-1">
                Điểm trung bình học kỳ
              </p>
              <h3 className="text-3xl font-bold text-slate-800 flex items-baseline gap-2">
                3.26
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-auto">
            <span className="text-sm font-medium text-slate-500">Xếp loại:</span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">Giỏi</span>
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
                6{" "}
                <span className="text-lg font-medium text-slate-400">/ 7</span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-2.5">
              <div
                className="bg-orange-400 h-2.5 rounded-full"
                style={{ width: "86%" }}
              ></div>
            </div>
            <span className="text-sm font-bold text-slate-600 w-10 text-right">
              86%
            </span>
          </div>
        </div>
      </div>

      {/* Main layout: Table */}
      <div className="w-full">
        {/* Courses Table */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-lg">
                Danh sách môn học
              </h3>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer shadow-sm text-sm">
              <span className="text-slate-600 font-medium">
                Học kỳ 1 năm học 2025-2026
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm">
                  <th className="font-semibold py-4 px-6 w-16 text-center">
                    STT
                  </th>
                  <th className="font-semibold py-4 px-6 w-24">Mã môn</th>
                  <th className="font-semibold py-4 px-6">Tên môn học</th>
                  <th className="font-semibold py-4 px-6 text-center w-24">
                    Số tín chỉ
                  </th>
                  <th className="font-semibold py-4 px-6 text-center w-24">
                    Điểm TB
                  </th>
                  <th className="font-semibold py-4 px-6 text-center w-32">
                    GPA
                  </th>
                </tr>
              </thead>
              <tbody className="text-[14px]">
                {courses.map((course) => (
                  <tr
                    key={course.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-4 px-6 text-center text-slate-500">
                      {course.id}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono">
                      {course.code}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-700">
                      {course.name}
                    </td>
                    <td className="py-4 px-6 text-center text-slate-600">
                      {course.credits.toFixed(1)}
                    </td>
                    <td className="py-4 px-6 text-center font-semibold text-slate-700">
                      {course.score.toFixed(1)}
                    </td>
                    <td className="py-4 px-6 text-center font-semibold text-purple-600">
                      {course.gpa.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


      </div>
    </div>
  );
}

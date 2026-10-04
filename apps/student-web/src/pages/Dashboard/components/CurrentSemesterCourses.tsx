import { BookOpen, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const subjects = [
  { code: "IT101", name: "Lập trình hướng đối tượng", credits: 3.5 },
  { code: "IT102", name: "Cấu trúc dữ liệu và giải thuật", credits: 3.5 },
  { code: "DB101", name: "Cơ sở dữ liệu", credits: 3.0 },
  { code: "NET102", name: "Mạng máy tính", credits: 3.0 },
  { code: "OS101", name: "Hệ điều hành", credits: 3.0 },
  { code: "AI101", name: "Trí tuệ nhân tạo", credits: 3.0 },
];

export default function CurrentSemesterCourses() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-800 text-lg">Môn học học kỳ này</h3>
        </div>
        <Link
          to="/results"
          className="text-blue-600 text-sm font-medium hover:underline flex items-center"
        >
          Xem tất cả <ChevronRight className="w-4 h-4" />
        </Link>
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
            <span className="font-semibold text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 whitespace-nowrap">
              {sub.credits} TC
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

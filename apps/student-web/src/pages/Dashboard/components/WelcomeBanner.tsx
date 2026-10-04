import { Calendar, ChevronDown } from "lucide-react";

export default function WelcomeBanner() {
  return (
    <div className="bg-white rounded-2xl p-8 flex justify-between items-center relative overflow-hidden shadow-sm border border-slate-100">
      {/* Background Graphic placeholder */}
      <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-blue-50 to-white opacity-50 z-0"></div>

      <div className="relative z-10">
        <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-2">
          Xin chào, Nguyễn Minh Anh <span className="text-2xl">👋</span>
        </h2>
        <p className="text-slate-500 text-lg mb-4">
          Chúc bạn có một ngày học tập hiệu quả!
        </p>
      </div>

      <div className="relative z-10 bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm self-start">
        <Calendar className="w-5 h-5 text-slate-500" />
        <span className="font-medium text-slate-700">
          Học kỳ 1 năm học 2025 - 2026
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 ml-2" />
      </div>
    </div>
  );
}

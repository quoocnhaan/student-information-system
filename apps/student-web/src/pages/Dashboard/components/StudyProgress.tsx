import { TrendingUp, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function StudyProgress() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-800 text-lg">Tiến độ học tập</h3>
        </div>
        <Link
          to="/progress"
          className="text-blue-600 text-sm font-medium hover:underline flex items-center"
        >
          Xem chi tiết <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex flex-col gap-6 mb-8 mt-2">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-slate-700 text-sm">Bắt buộc</span>
            <span className="font-bold text-slate-700 text-sm">
              72% <span className="text-slate-400 font-normal">(12/12)</span>
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full"
              style={{ width: "72%" }}
            ></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-slate-700 text-sm">Tự chọn</span>
            <span className="font-bold text-slate-700 text-sm">
              40% <span className="text-slate-400 font-normal">(8/20)</span>
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className="bg-purple-500 h-2.5 rounded-full"
              style={{ width: "40%" }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-auto">
        <div className="bg-slate-50 p-4 rounded-xl text-center">
          <p className="text-slate-500 text-xs font-medium mb-1">
            Tổng số tín chỉ
          </p>
          <p className="text-xl font-bold text-slate-800">120</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl text-center">
          <p className="text-slate-500 text-xs font-medium mb-1">Đã hoàn thành</p>
          <p className="text-xl font-bold text-emerald-600">65</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl text-center">
          <p className="text-slate-500 text-xs font-medium mb-1">Còn lại</p>
          <p className="text-xl font-bold text-blue-600">55</p>
        </div>
      </div>
    </div>
  );
}

import { Calendar, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { Link } from "react-router-dom";

const todayClasses = [
  {
    time: "08:00 - 10:00",
    name: "Lập trình hướng đối tượng",
    room: "IT101 | P. A1.301",
    teacher: "Nguyễn Văn A",
    status: "Đang học",
    statusColor: "bg-emerald-100 text-emerald-700",
  },
  {
    time: "10:15 - 12:15",
    name: "Cấu trúc dữ liệu và giải thuật",
    room: "IT102 | P. A1.305",
    teacher: "Trần Thị B",
    status: "Sắp tới",
    statusColor: "bg-blue-100 text-blue-700",
  },
  {
    time: "13:30 - 15:30",
    name: "Cơ sở dữ liệu",
    room: "DB101 | P. B2.102",
    teacher: "Lê Văn C",
    status: "Sắp tới",
    statusColor: "bg-blue-100 text-blue-700",
  },
];

export default function TodayClasses() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-800 text-lg">Lịch học hôm nay</h3>
        </div>
        <Link
          to="/schedule"
          className="text-blue-600 text-sm font-medium hover:underline flex items-center"
        >
          Xem thời khóa biểu <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {todayClasses.map((cls, idx) => (
          <div key={idx} className="flex gap-4">
            <div className="w-24 text-sm font-semibold text-slate-700 shrink-0 pt-1">
              {cls.time}
            </div>
            <div className="flex-1 border-l-2 border-blue-100 pl-4 pb-4 relative">
              <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5 border-2 border-white"></div>
              <h4 className="font-bold text-slate-800 text-[15px] mb-1">
                {cls.name}
              </h4>
              <p className="text-slate-500 text-sm mb-1">{cls.room}</p>
              <p className="text-slate-500 text-sm mb-3">GV: {cls.teacher}</p>
              <span
                className={clsx(
                  "text-xs font-semibold px-2.5 py-1 rounded-md",
                  cls.statusColor,
                )}
              >
                {cls.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

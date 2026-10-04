import { FileText, ChevronRight, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const exams = [
  {
    day: "22",
    month: "Th09",
    name: "Cơ sở dữ liệu",
    time: "08:00 - 10:00",
    room: "P. B2.101",
    remaining: "Còn 5 ngày",
  },
  {
    day: "25",
    month: "Th09",
    name: "Mạng máy tính",
    time: "13:30 - 15:30",
    room: "P. B2.203",
    remaining: "Còn 8 ngày",
  },
  {
    day: "29",
    month: "Th09",
    name: "Lập trình hướng đối tượng",
    time: "08:00 - 10:00",
    room: "P. A1.301",
    remaining: "Còn 12 ngày",
  },
];

export default function UpcomingExams() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-800 text-lg">Lịch thi sắp tới</h3>
        </div>
        <Link
          to="/exam-schedule"
          className="text-blue-600 text-sm font-medium hover:underline flex items-center"
        >
          Xem tất cả <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {exams.map((exam, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl hover:border-blue-100 hover:shadow-sm transition-all"
          >
            <div className="flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-xl w-14 h-14 shrink-0">
              <span className="font-bold text-xl leading-none">{exam.day}</span>
              <span className="text-xs font-semibold">{exam.month}</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800 text-[15px] mb-1">
                {exam.name}
              </h4>
              <div className="flex items-center gap-3 text-slate-500 text-xs">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {exam.time}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {exam.room}
                </span>
              </div>
            </div>
            <span className="text-orange-500 bg-orange-50 px-2.5 py-1 rounded-md text-xs font-bold shrink-0">
              {exam.remaining}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

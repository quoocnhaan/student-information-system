import { 
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Info,
  Clock,
  MapPin,
  List,
  CalendarDays,
  Lightbulb
} from "lucide-react";
import clsx from "clsx";
import { Link } from "react-router-dom";

const days = [
  { name: "Thứ 2", date: "08/09" },
  { name: "Thứ 3", date: "09/09" },
  { name: "Thứ 4", date: "10/09" },
  { name: "Thứ 5", date: "11/09" },
  { name: "Thứ 6", date: "12/09" },
  { name: "Thứ 7", date: "13/09" },
  { name: "Chủ nhật", date: "14/09" }
];

const timeSlots = [
  { type: "header", name: "Sáng", time: "(07:00 - 09:00)" },
  { type: "slot", name: "Tiết 1", time: "(08:00 - 09:30)", key: "T1" },
  { type: "slot", name: "Tiết 2", time: "(09:45 - 11:15)", key: "T2" },
  { type: "header", name: "Chiều", time: "(13:00 - 15:00)" },
  { type: "slot", name: "Tiết 3", time: "(13:30 - 15:00)", key: "T3" },
  { type: "slot", name: "Tiết 4", time: "(15:15 - 16:45)", key: "T4" },
  { type: "header", name: "Tối", time: "(18:00 - 21:00)" },
  { type: "slot", name: "Tiết 5", time: "(18:00 - 19:30)", key: "T5" },
  { type: "slot", name: "Tiết 6", time: "(19:45 - 21:15)", key: "T6" }
];

// Mapping schedule by Day index (0-6) and Slot key
const schedule: Record<string, Record<string, any>> = {
  "0": { // Thứ 2
    "T1": { code: "IT101", name: "Lập trình hướng đối tượng", time: "08:00 - 09:30", room: "P. A1.301", color: "bg-blue-100/60 text-blue-800 border-blue-200" },
    "T3": { code: "IT102", name: "Cấu trúc dữ liệu và giải thuật", time: "13:30 - 15:00", room: "P. A1.302", color: "bg-purple-100/60 text-purple-800 border-purple-200" },
  },
  "1": { // Thứ 3
    "T2": { code: "IT103", name: "Cơ sở dữ liệu", time: "09:45 - 11:15", room: "P. B2.101", color: "bg-amber-100/60 text-amber-800 border-amber-200" },
    "T4": { code: "IT104", name: "Mạng máy tính", time: "15:15 - 16:45", room: "P. B2.101", color: "bg-red-100/60 text-red-800 border-red-200" },
  },
  "2": { // Thứ 4
    "T1": { code: "IT104", name: "Mạng máy tính", time: "08:00 - 09:30", room: "P. B2.101", color: "bg-emerald-100/60 text-emerald-800 border-emerald-200" },
    "T3": { code: "IT107", name: "Trí tuệ nhân tạo", time: "13:30 - 15:00", room: "P. D1.101", color: "bg-teal-100/60 text-teal-800 border-teal-200" },
  },
  "3": { // Thứ 5
    "T2": { code: "IT105", name: "Hệ điều hành", time: "09:45 - 11:15", room: "P. C1.201", color: "bg-rose-100/60 text-rose-800 border-rose-200" },
    "T4": { code: "IT102", name: "Cấu trúc dữ liệu và giải thuật", time: "15:15 - 16:45", room: "P. A1.302", color: "bg-sky-100/60 text-sky-800 border-sky-200" },
  },
  "4": { // Thứ 6
    "T1": { code: "IT106", name: "Phát triển web", time: "08:00 - 09:30", room: "P. C1.202", color: "bg-indigo-100/60 text-indigo-800 border-indigo-200" },
    "T3": { code: "IT108", name: "Đồ họa máy tính", time: "13:30 - 15:00", room: "P. B1.104", color: "bg-cyan-100/60 text-cyan-800 border-cyan-200" },
  }
};

const todayClasses = [
  { code: "IT102", name: "Cấu trúc dữ liệu và giải thuật", time: "08:00 - 09:30", room: "P. A1.302", dotColor: "bg-purple-500" },
  { code: "IT103", name: "Cơ sở dữ liệu", time: "09:45 - 11:15", room: "P. B2.101", dotColor: "bg-amber-500" },
  { code: "IT104", name: "Mạng máy tính", time: "13:30 - 15:00", room: "P. B2.101", dotColor: "bg-emerald-500" },
  { code: "IT105", name: "Hệ điều hành", time: "15:15 - 16:45", room: "P. C1.201", dotColor: "bg-rose-500" }
];

const legendColors = [
  { color: "bg-blue-500", name: "IT101 - Lập trình hướng đối tượng" },
  { color: "bg-purple-500", name: "IT102 - Cấu trúc dữ liệu và giải thuật" },
  { color: "bg-amber-500", name: "IT103 - Cơ sở dữ liệu" },
  { color: "bg-emerald-500", name: "IT104 - Mạng máy tính" },
  { color: "bg-rose-500", name: "IT105 - Hệ điều hành" },
  { color: "bg-indigo-500", name: "IT106 - Phát triển web" },
  { color: "bg-teal-500", name: "IT107 - Trí tuệ nhân tạo" },
  { color: "bg-cyan-500", name: "IT108 - Đồ họa máy tính" },
];

export default function TimeTablePage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-8">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/" className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </Link>
            <h1 className="text-3xl font-bold text-[#112440]">Thời khóa biểu</h1>
          </div>
          <p className="text-slate-500 ml-11">Xem lịch học chi tiết của bạn theo tuần. Thời khóa biểu được cập nhật tự động từ hệ thống đăng ký môn học.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm text-sm">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700">Thứ 3, 16 tháng 9, 2025</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Main Timetable (3 columns span) */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm w-72">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-700 text-sm flex-1">Học kỳ 1 năm học 2025-2026</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>

            <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-slate-200 p-1">
              <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <span className="text-sm font-medium text-slate-700 px-4">Tuần hiện tại</span>
              <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-1">
              <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
                <CalendarDays className="w-4 h-4" />
                Tuần
              </button>
              <button className="flex items-center gap-2 text-slate-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                <List className="w-4 h-4" />
                Ngày
              </button>
            </div>
          </div>

          {/* Timetable Grid */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex-1 relative">
             <div className="overflow-x-auto">
               <div className="min-w-[900px]">
                 {/* Header Row */}
                 <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50">
                   <div className="p-4 text-center border-r border-slate-100 flex items-center justify-center">
                     <span className="text-sm font-semibold text-slate-500">Thời gian</span>
                   </div>
                   {days.map((day, idx) => (
                     <div key={idx} className="p-3 text-center border-r border-slate-100 last:border-0">
                       <p className="font-bold text-slate-700 text-[14px]">{day.name}</p>
                       <p className="text-slate-400 text-xs">{day.date}</p>
                     </div>
                   ))}
                 </div>

                 {/* Body Rows */}
                 {timeSlots.map((slot, rowIndex) => (
                   <div key={rowIndex} className={clsx("grid grid-cols-8 border-b border-slate-100", slot.type === "header" ? "bg-slate-50/50" : "")}>
                     {/* Time column */}
                     <div className={clsx("p-3 border-r border-slate-100 flex flex-col justify-center", slot.type === "header" ? "items-start pl-6" : "items-center")}>
                       <p className={clsx("font-semibold", slot.type === "header" ? "text-slate-700 text-sm" : "text-slate-600 text-[13px]")}>{slot.name}</p>
                       <p className="text-slate-400 text-xs mt-0.5">{slot.time}</p>
                     </div>
                     
                     {/* Days columns */}
                     {days.map((_, colIndex) => {
                       const cellData = slot.type === "slot" ? schedule[colIndex.toString()]?.[slot.key as string] : null;
                       
                       return (
                         <div key={colIndex} className={clsx("p-1.5 border-r border-slate-100 last:border-0 relative", slot.type === "header" ? "" : "min-h-[110px]")}>
                           {cellData && (
                             <div className={clsx("w-full h-full p-2.5 rounded-xl border flex flex-col justify-start transition-all hover:shadow-md cursor-pointer", cellData.color)}>
                               <div className="flex items-center gap-1.5 mb-1.5">
                                 <BookOpen className="w-3.5 h-3.5 opacity-70 shrink-0" />
                                 <span className="text-[11px] font-bold opacity-80 uppercase tracking-wider">{cellData.code}</span>
                               </div>
                               <p className="font-bold text-[12px] leading-tight mb-2 line-clamp-2">{cellData.name}</p>
                               <div className="mt-auto flex flex-col gap-1">
                                  <p className="text-[10px] flex items-center gap-1 opacity-80">
                                    <Clock className="w-3 h-3" /> {cellData.time}
                                  </p>
                                  <p className="text-[10px] flex items-center gap-1 opacity-80">
                                    <MapPin className="w-3 h-3" /> {cellData.room}
                                  </p>
                               </div>
                             </div>
                           )}
                         </div>
                       );
                     })}
                   </div>
                 ))}
               </div>
             </div>
          </div>

          <div className="flex items-start gap-2 bg-blue-50/50 text-blue-800 p-4 rounded-xl border border-blue-100 text-sm">
            <Info className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
            <p><strong>Lưu ý:</strong> Thời khóa biểu có thể thay đổi. Vui lòng thường xuyên cập nhật thông báo từ nhà trường.</p>
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-6">
          
          {/* Hôm nay */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-lg">Hôm nay</h3>
              </div>
              <span className="text-slate-400 text-sm">16/09/2025</span>
            </div>
            
            <div className="flex flex-col gap-4 relative">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-100 rounded-full"></div>
              {todayClasses.map((cls, idx) => (
                <div key={idx} className="flex gap-4 items-start relative cursor-pointer group">
                  <div className={clsx("w-4 h-4 rounded-full border-4 border-white shrink-0 mt-0.5 z-10 shadow-sm", cls.dotColor)}></div>
                  <div className="flex-1 bg-slate-50/50 group-hover:bg-slate-50 p-3 rounded-xl transition-colors border border-transparent group-hover:border-slate-100">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-slate-800 text-[13px] leading-tight pr-4">{cls.code} - {cls.name}</h4>
                      <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                      <span>{cls.time}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span>{cls.room}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Màu sắc môn học */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
              </svg>
              <h3 className="font-bold text-slate-800 text-[16px]">Màu sắc môn học</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              {legendColors.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={clsx("w-3 h-3 rounded-full shrink-0", item.color)}></div>
                  <span className="text-slate-600 text-xs font-medium">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ghi chú */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-800 text-[16px]">Ghi chú</h3>
            </div>
            
            <ul className="flex flex-col gap-2 text-xs text-slate-600 pl-4 list-disc marker:text-slate-300">
              <li className="pl-1">Thời khóa biểu có thể thay đổi theo từng tuần.</li>
              <li className="pl-1 leading-relaxed">Vui lòng kiểm tra thông báo trên hệ thống để cập nhật thông tin mới nhất.</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}

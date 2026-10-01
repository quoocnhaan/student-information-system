import { GraduationCap, Layers, PieChart, BookOpen } from "lucide-react";
import clsx from "clsx";

const stats = [
  {
    title: "GPA hiện tại",
    value: "3.26",
    subValue: "↑ 0.12 so với kỳ trước",
    subValueColor: "text-emerald-500",
    icon: GraduationCap,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    title: "Tín chỉ đã hoàn thành",
    value: "65 / 120",
    subValue: "54%",
    subValueColor: "text-slate-500",
    icon: Layers,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-50",
    progress: 54,
    progressColor: "bg-blue-600",
  },
  {
    title: "Tiến độ chương trình",
    value: "54%",
    icon: PieChart,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
    progress: 54,
    progressColor: "bg-emerald-500",
  },
  {
    title: "Số môn học kỳ này",
    value: "6",
    subValue: "HK1 - 2025/2026",
    subValueColor: "text-slate-500",
    icon: BookOpen,
    iconColor: "text-indigo-500",
    bgColor: "bg-indigo-50",
  },
];

export default function StatCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-500 font-medium mb-1">{stat.title}</p>
              <h3 className="text-3xl font-bold text-slate-800">
                {stat.value}
              </h3>
            </div>
            <div
              className={clsx(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                stat.bgColor,
              )}
            >
              <stat.icon className={clsx("w-6 h-6", stat.iconColor)} />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm mt-auto">
            {stat.progress !== undefined ? (
              <div className="w-full">
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-transparent">0</span>
                  <span className="text-slate-600">{stat.subValue}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={clsx("h-2 rounded-full", stat.progressColor)}
                    style={{ width: `${stat.progress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <span className={clsx("font-medium", stat.subValueColor)}>
                {stat.subValue}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

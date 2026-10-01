import { CheckSquare, ChevronRight } from "lucide-react";
import clsx from "clsx";

const todos = [
  {
    icon: CheckSquare,
    iconBg: "bg-red-100 text-red-600",
    title: "Đăng ký môn học",
    deadline: "Hạn: 20/09/2025",
    action: "Đăng ký",
    actionColor: "bg-blue-600 text-white",
  },
  {
    icon: CheckSquare,
    iconBg: "bg-orange-100 text-orange-600",
    title: "Đóng học phí kỳ mới",
    deadline: "Hạn: 25/09/2025",
    action: "Xem",
    actionColor: "bg-blue-50 text-blue-600",
  },
  {
    icon: CheckSquare,
    iconBg: "bg-emerald-100 text-emerald-600",
    title: "Đăng ký xét học bổng",
    deadline: "Hạn: 30/09/2025",
    action: "Nộp",
    actionColor: "bg-blue-50 text-blue-600",
  },
];

export default function TodoList() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-800 text-lg">Việc cần làm</h3>
        </div>
        <a
          href="#"
          className="text-blue-600 text-sm font-medium hover:underline flex items-center"
        >
          Xem tất cả <ChevronRight className="w-4 h-4" />
        </a>
      </div>

      <div className="flex flex-col gap-4">
        {todos.map((todo, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl"
          >
            <div
              className={clsx(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                todo.iconBg,
              )}
            >
              <todo.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800 text-sm mb-1">
                {todo.title}
              </h4>
              <p className="text-slate-500 text-xs">{todo.deadline}</p>
            </div>
            <button
              className={clsx(
                "px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                todo.actionColor,
                todo.actionColor.includes("text-white")
                  ? "hover:bg-blue-700"
                  : "hover:bg-blue-100",
              )}
            >
              {todo.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

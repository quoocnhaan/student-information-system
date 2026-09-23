import { Search, Bell } from "lucide-react";

export default function Header() {
  return (
    <header className="h-[80px] bg-white sticky top-0 z-10 flex items-center justify-between px-8">
      {/* Search Bar */}
      <div className="flex-1 max-w-2xl">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-4" />
          <input
            type="text"
            placeholder="Tìm kiếm thông tin sinh viên, môn học, học phần..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-full text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-8 ml-8">
        <button className="relative p-2 text-slate-600 hover:text-blue-600 transition-colors">
          <Bell className="w-6 h-6" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-200">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 text-[15px]">Nguyễn Minh Anh</span>
            <span className="text-slate-500 text-[13px]">MSSV: 21127045</span>
          </div>
        </div>
      </div>
    </header>
  );
}

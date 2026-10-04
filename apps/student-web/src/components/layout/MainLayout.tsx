import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      
      <div className="flex-1 ml-[280px] flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="p-8 pb-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

import React from "react";

interface TopbarProps {
  activeTab: string;
  profile: any;
}

export default function Topbar({ activeTab, profile }: TopbarProps) {
  const getHeaderTitle = () => {
    if (activeTab === "overview") return "DASH_BOARD";
    if (activeTab === "products") return "INVENTORY";
    return "ORDER_MGT";
  };

  return (
    <header className="h-20 bg-white border-b-4 border-black flex items-center justify-between px-6 md:px-10 z-20 shrink-0">
      <h2 className="text-3xl font-black uppercase tracking-widest hidden md:block">
        {getHeaderTitle()}
      </h2>
      
      <div className="flex flex-1 md:flex-none justify-end items-center gap-4 md:gap-6">
        <div className="flex items-center bg-white border-4 border-black w-full md:w-80 h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-within:translate-x-1 focus-within:translate-y-1 focus-within:shadow-none transition-all">
          <span className="pl-3 font-bold opacity-50">🔍</span>
          <input type="text" placeholder="Search data..." className="w-full h-full bg-transparent px-3 font-bold outline-none text-sm" />
        </div>
        <div className="w-12 h-12 border-4 border-black bg-blue-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-black text-xl cursor-pointer hover:-translate-y-1 transition-transform">🔔</div>
        <div className="w-12 h-12 border-4 border-black bg-gray-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden cursor-pointer">
           <img src={profile?.avatar_url || "https://api.dicebear.com/7.x/bottts/svg"} alt="Admin" className="w-full h-full object-cover" />
        </div>
      </div>
    </header>
  );
}
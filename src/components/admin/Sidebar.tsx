import React from "react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, handleLogout }: SidebarProps) {
  const menus = [
    { id: "overview", label: "Overview", icon: "🍱" },
    { id: "products", label: "Products", icon: "📦" },
    { id: "orders", label: "Orders", icon: "🛒" },
    { id: "customers", label: "Customers", icon: "👥" },
    { id: "analytics", label: "Analytics", icon: "📊" },
  ];

  return (
    <aside className="w-64 bg-white border-r-4 border-black flex flex-col z-20 shrink-0">
      <div className="h-20 border-b-4 border-black flex flex-col justify-center px-6">
        <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">POPCIONARDES</h1>
        <p className="text-[10px] font-bold uppercase opacity-60 font-mono tracking-widest mt-1">ADMIN_V2.0</p>
      </div>

      <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
        {menus.map((item) => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 font-black uppercase text-sm border-2 transition-all
              ${activeTab === item.id 
                ? "bg-pink-200 text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5" 
                : "border-transparent text-gray-600 hover:bg-gray-100 hover:border-black"}
            `}
          >
            <span className="text-lg">{item.icon}</span> {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t-4 border-black">
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 bg-yellow-200 border-4 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}
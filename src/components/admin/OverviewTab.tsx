import React from "react";

interface OverviewTabProps {
  orders: any[];
  products: any[];
  setActiveTab: (tab: string) => void;
  formatRupiah: (angka: number) => string;
}

export default function OverviewTab({ orders, products, setActiveTab, formatRupiah }: OverviewTabProps) {
  const totalRevenue = orders.filter(o => o.status === 'paid' || o.status === 'shipped').reduce((sum, o) => sum + Number(o.total_amount), 0);
  const totalOrders = orders.length;
  const activeCustomers = new Set(orders.map(o => o.user_id)).size;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / orders.filter(o => o.status === 'paid' || o.status === 'shipped').length : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Statistik Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-cyan-200 border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          <p className="font-black text-xs uppercase opacity-80 mb-2">Total Revenue</p>
          <p className="text-4xl font-black">{formatRupiah(totalRevenue)}</p>
          <div className="absolute top-4 right-4 w-10 h-10 bg-white border-2 border-black flex items-center justify-center font-black text-xl">💵</div>
        </div>
        <div className="bg-yellow-200 border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          <p className="font-black text-xs uppercase opacity-80 mb-2">Total Orders</p>
          <p className="text-4xl font-black">{totalOrders}</p>
          <div className="absolute top-4 right-4 w-10 h-10 bg-white border-2 border-black flex items-center justify-center font-black text-xl">🚚</div>
        </div>
        <div className="bg-pink-200 border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          <p className="font-black text-xs uppercase opacity-80 mb-2">Avg Order Value</p>
          <p className="text-4xl font-black">{formatRupiah(avgOrderValue)}</p>
          <div className="absolute top-4 right-4 w-10 h-10 bg-white border-2 border-black flex items-center justify-center font-black text-xl">🧾</div>
        </div>
        <div className="bg-green-200 border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          <p className="font-black text-xs uppercase opacity-80 mb-2">Active Customers</p>
          <p className="text-4xl font-black">{activeCustomers}</p>
          <div className="absolute top-4 right-4 w-10 h-10 bg-white border-2 border-black flex items-center justify-center font-black text-xl">👥</div>
        </div>
      </div>

      {/* Charts & Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
          <div className="bg-yellow-200 border-b-4 border-black p-4 flex justify-between items-center">
            <h3 className="font-black uppercase text-lg">Sales Performance</h3>
            <div className="flex gap-2">
              <button className="bg-white px-3 py-1 font-black text-xs border-2 border-black">1W</button>
              <button className="bg-black text-white px-3 py-1 font-black text-xs border-2 border-black">1M</button>
            </div>
          </div>
          <div className="flex-1 p-6 flex items-end justify-between gap-4 h-64 border-b-4 border-black px-10">
            {[40, 60, 30, 80, 50, 90, 100].map((h, i) => (
              <div key={i} className={`w-full border-4 border-black ${i%2===0?'bg-indigo-200':'bg-pink-200'} hover:bg-yellow-200 transition-colors cursor-pointer`} style={{height: `${h}%`}}></div>
            ))}
          </div>
          <div className="flex justify-between px-10 py-3 font-black text-xs uppercase opacity-60">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
          <div className="bg-indigo-200 border-b-4 border-black p-4">
            <h3 className="font-black uppercase text-lg">Top Products</h3>
          </div>
          <div className="flex-1 p-4 space-y-4">
            {products.slice(0,3).map(p => (
              <div key={p.id} className="flex items-center gap-4 border-b-2 border-dashed border-gray-300 pb-4 last:border-0 last:pb-0">
                <div className={`w-16 h-16 border-2 border-black flex items-center justify-center p-1 shrink-0 ${p.bg_color}`}>
                  <img src={p.image_url} alt={p.name} className="max-w-full max-h-full object-contain mix-blend-darken" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-black text-sm uppercase truncate">{p.name}</p>
                  <p className="text-xs font-bold opacity-60">{p.category}</p>
                </div>
                <p className="font-black text-xl">{p.stock} <span className="text-[10px]">PCS</span></p>
              </div>
            ))}
          </div>
          <button onClick={() => setActiveTab('products')} className="w-full py-4 border-t-4 border-black font-black uppercase text-sm hover:bg-yellow-200 transition-colors flex items-center justify-center gap-2">
            View Inventory <span>→</span>
          </button>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="bg-pink-300 border-b-4 border-black p-4 flex justify-between items-center">
          <h3 className="font-black uppercase text-lg">Recent Orders</h3>
          <button onClick={() => setActiveTab('orders')} className="bg-black text-white px-4 py-1 text-xs font-black uppercase border-2 border-white hover:bg-white hover:text-black transition-colors">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black text-white uppercase text-xs font-black">
                <th className="p-4 w-32 border-r border-gray-700">Order ID</th>
                <th className="p-4 border-r border-gray-700">Customer</th>
                <th className="p-4 border-r border-gray-700">Status</th>
                <th className="p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0,4).map(o => (
                <tr key={o.id} className="border-b-2 border-black font-bold uppercase text-sm hover:bg-gray-100">
                  <td className="p-4 border-r-2 border-black">#{o.id.substring(0,8)}</td>
                  <td className="p-4 border-r-2 border-black">{o.customer_name}</td>
                  <td className="p-4 border-r-2 border-black">
                     <span className={`px-2 py-1 border-2 border-black text-[10px] ${o.status==='paid'?'bg-green-200':o.status==='shipped'?'bg-blue-200':o.status==='cancelled'?'bg-rose-200':'bg-yellow-200'}`}>
                       {o.status}
                     </span>
                  </td>
                  <td className="p-4 text-right font-black">{formatRupiah(o.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
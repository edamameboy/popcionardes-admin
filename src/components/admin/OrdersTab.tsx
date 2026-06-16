import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface OrdersTabProps {
  orders: any[];
  supabase: any;
  fetchAdminData: () => void;
  formatRupiah: (angka: number) => string;
}

export default function OrdersTab({ orders, supabase, fetchAdminData, formatRupiah }: OrdersTabProps) {
  const router = useRouter();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [trackingInputs, setTrackingInputs] = useState<{ [key: string]: string }>({});
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleUpdateTracking = async (orderId: string, currentStatus: string) => {
    const resi = trackingInputs[orderId];
    if (!resi && currentStatus === "paid") return alert("Masukkan resi!");
    setIsUpdating(orderId);
    try {
      const nextStatus = currentStatus === "paid" ? "shipped" : currentStatus;
      const updateData: any = { status: nextStatus };
      if (resi) updateData.biteship_tracking_id = resi;
      await supabase.from("orders").update(updateData).eq("id", orderId);
      fetchAdminData(); 
    } catch (error: any) { alert(`Error: ${error.message}`); } finally { setIsUpdating(null); }
  };

  const toggleOrderSelection = (id: string) => {
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(oId => oId !== id) : [...prev, id]);
  };
  const toggleAllOrders = () => {
    if (selectedOrders.length === orders.length) setSelectedOrders([]);
    else setSelectedOrders(orders.map(o => o.id));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Order Management</h2>
          <p className="font-bold text-sm opacity-60">Manage and process incoming orders.</p>
        </div>
        <button className="bg-white border-4 border-black px-6 py-3 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">= Filter</button>
      </div>

      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-20">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-black text-white uppercase text-xs font-black">
                <th className="p-4 w-12 text-center border-r border-gray-700"><input type="checkbox" checked={selectedOrders.length === orders.length && orders.length > 0} onChange={toggleAllOrders} className="w-4 h-4 cursor-pointer accent-pink-300" /></th>
                <th className="p-4 border-r border-gray-700">Order ID</th><th className="p-4 border-r border-gray-700">Customer Name</th><th className="p-4 border-r border-gray-700">Date</th><th className="p-4 border-r border-gray-700">Amount</th><th className="p-4 border-r border-gray-700">Status</th><th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b-4 border-black font-bold text-sm hover:bg-yellow-50 transition-colors">
                  <td className="p-4 border-r-4 border-black text-center"><input type="checkbox" checked={selectedOrders.includes(o.id)} onChange={() => toggleOrderSelection(o.id)} className="w-5 h-5 border-2 border-black cursor-pointer accent-pink-300" /></td>
                  <td className="p-4 border-r-4 border-black uppercase font-mono text-xs">#{o.id.substring(0,8)}</td>
                  <td className="p-4 border-r-4 border-black uppercase">{o.customer_name}</td>
                  <td className="p-4 border-r-4 border-black opacity-70">{new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="p-4 border-r-4 border-black font-black">{formatRupiah(o.total_amount)}</td>
                  <td className="p-4 border-r-4 border-black"><span className={`px-3 py-1.5 border-2 border-black font-black text-[10px] uppercase ${o.status==='paid'?'bg-yellow-200':o.status==='shipped'?'bg-blue-200':o.status==='cancelled'?'bg-rose-200':'bg-gray-200'}`}>{o.status === "paid" ? "PROCESSING" : o.status === "shipped" ? "DELIVERED" : o.status}</span></td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      {o.status === 'paid' ? (
                        <div className="flex gap-1">
                          <input type="text" placeholder="Resi..." value={trackingInputs[o.id] || ""} onChange={(e) => setTrackingInputs({ ...trackingInputs, [o.id]: e.target.value })} className="w-24 px-2 border-2 border-black text-xs font-bold" />
                          <button onClick={() => handleUpdateTracking(o.id, "paid")} className="bg-green-200 border-2 border-black px-2 py-1 text-xs font-black uppercase">{isUpdating === o.id ? "..." : "Kirim"}</button>
                        </div>
                      ) : (
                        <button onClick={() => router.push(`/orders/${o.id}`)} className="bg-white border-2 border-black px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Details</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrders.length > 0 && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 ml-32 z-50 animate-in slide-in-from-bottom-10">
          <div className="bg-pink-300 border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center gap-6">
            <div className="font-black uppercase flex items-center gap-3"><span className="w-6 h-6 bg-white border-2 border-black flex items-center justify-center text-xs">✓</span>{selectedOrders.length} Selected</div>
            <div className="flex gap-3"><button className="bg-white border-4 border-black px-4 py-2 font-black text-xs uppercase">🚚 Mark Shipped</button><button className="bg-white border-4 border-black px-4 py-2 font-black text-xs uppercase">🖨️ Print Slips</button></div>
            <button onClick={() => setSelectedOrders([])} className="font-black text-xl ml-2">×</button>
          </div>
        </div>
      )}
    </div>
  );
}
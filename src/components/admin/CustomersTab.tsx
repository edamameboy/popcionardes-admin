import React, { useEffect, useState } from "react";

interface CustomersTabProps {
  orders: any[];
  supabase: any;
  formatRupiah: (angka: number) => string;
  showToast: (message: string, type: "success" | "error" | "warning") => void;
}

export default function CustomersTab({ orders, supabase, formatRupiah, showToast }: CustomersTabProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, [orders]); // Re-fetch jika ada order baru (untuk update LTV)

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      // 1. Ambil semua profil user (kecuali admin jika memungkinkan, tapi kita ambil semua dulu)
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 2. Gabungkan data profil dengan riwayat pesanan (Hitung LTV & Total Order)
      const customersWithStats = profiles.map((profile: any) => {
        const userOrders = orders.filter(o => o.user_id === profile.id && (o.status === 'paid' || o.status === 'shipped'));
        const totalSpent = userOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
        
        return {
          ...profile,
          total_orders: userOrders.length,
          total_spent: totalSpent,
          // Ambil order terakhir untuk tahu kapan terakhir dia belanja
          last_order_date: userOrders.length > 0 ? userOrders[0].created_at : null 
        };
      });

      // Urutkan berdasarkan yang paling banyak menghabiskan uang (Sultan di atas)
      const sortedCustomers = customersWithStats.sort((a: any, b: any) => b.total_spent - a.total_spent);
      
      setCustomers(sortedCustomers);
    } catch (error: any) {
      console.error("Gagal memuat data pelanggan:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = (username: string) => {
    showToast(`🚧 Fitur Banned untuk user "${username}" sedang dalam pengembangan. Nanti akan memblokir akses login mereka!`, "warning");
  };

  const handleGivePoints = (username: string) => {
    const points = prompt(`Berapa koin 🪙 yang ingin Anda berikan secara gratis kepada ${username}?`, "1000");
    if (points) {
      showToast(`✅ Berhasil mentransfer ${points} Koin ke dompet ${username}! (Simulasi)`, "success");
    }
  };

  // Filter Search
  const filteredCustomers = customers.filter(c => 
    c.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Kalkulasi Ringkasan CRM
  const totalRegisteredUsers = customers.length;
  const activeBuyers = customers.filter(c => c.total_orders > 0).length;
  const topSpender = customers.length > 0 ? customers[0] : null;

  if (isLoading) return <div className="p-10 font-black text-xl uppercase animate-pulse">Memindai Database Pelanggan... 🕵️‍♂️</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Customer Management</h2>
          <p className="font-bold text-sm opacity-60">Analisis loyalitas pelanggan dan riwayat transaksi mereka.</p>
        </div>
        <div className="flex items-center bg-white border-4 border-black w-full md:w-80 h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="pl-3 font-bold opacity-50">🔍</span>
          <input 
            type="text" 
            placeholder="Cari username..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full bg-transparent px-3 font-bold outline-none text-sm" 
          />
        </div>
      </div>

      {/* KARTU STATISTIK CRM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-cyan-200 border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
          <div>
            <p className="font-black text-xs uppercase opacity-80 mb-1">Total Member</p>
            <p className="text-4xl font-black">{totalRegisteredUsers}</p>
          </div>
          <div className="w-16 h-16 bg-white border-4 border-black flex items-center justify-center text-2xl">👥</div>
        </div>
        
        <div className="bg-pink-300 border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
          <div>
            <p className="font-black text-xs uppercase opacity-80 mb-1">Active Buyers</p>
            <p className="text-4xl font-black">{activeBuyers}</p>
          </div>
          <div className="w-16 h-16 bg-white border-4 border-black flex items-center justify-center text-2xl">🛒</div>
        </div>

        <div className="bg-yellow-300 border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10">
            <p className="font-black text-xs uppercase opacity-80 mb-1">Top Spender 👑</p>
            <p className="text-xl font-black uppercase truncate max-w-[150px]">{topSpender?.username || "Belum Ada"}</p>
            <p className="text-sm font-bold bg-white border-2 border-black px-1 mt-1 inline-block">
              {formatRupiah(topSpender?.total_spent || 0)}
            </p>
          </div>
          {topSpender?.avatar_url && (
             <img src={topSpender.avatar_url} alt="Top Spender" className="absolute -right-4 -bottom-4 w-24 h-24 opacity-50 grayscale mix-blend-multiply" />
          )}
        </div>
      </div>

      {/* TABEL DATABASE PELANGGAN */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-20">
        <div className="bg-black text-white p-4 flex justify-between items-center">
          <h3 className="font-black uppercase text-lg">Daftar Pelanggan VIP</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100 uppercase text-xs font-black border-b-4 border-black">
                <th className="p-4 border-r-4 border-black w-16 text-center">Rank</th>
                <th className="p-4 border-r-4 border-black">Profile</th>
                <th className="p-4 border-r-4 border-black text-center">Total Orders</th>
                <th className="p-4 border-r-4 border-black">Life-Time Value (LTV)</th>
                <th className="p-4 border-r-4 border-black text-center">Poin 🪙</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((user, index) => (
                <tr key={user.id} className="border-b-4 border-black font-bold text-sm hover:bg-yellow-50 transition-colors">
                  <td className="p-4 border-r-4 border-black text-center font-black text-xl text-gray-400">
                    {index + 1 === 1 ? "🥇" : index + 1 === 2 ? "🥈" : index + 1 === 3 ? "🥉" : `#${index + 1}`}
                  </td>
                  <td className="p-4 border-r-4 border-black">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 border-2 border-black overflow-hidden shrink-0">
                        <img src={user.avatar_url || "https://api.dicebear.com/7.x/bottts/svg"} alt={user.username} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-black uppercase text-base">{user.username || "USER_UNKNOWN"}</p>
                        <p className="text-[10px] font-mono opacity-50">ID: {user.id.substring(0,8)}</p>
                      </div>
                      {user.role === 'admin' && (
                        <span className="ml-2 px-2 py-0.5 bg-pink-500 text-white text-[10px] font-black uppercase border-2 border-black">ADMIN</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 border-r-4 border-black text-center text-lg font-black">
                    {user.total_orders}
                  </td>
                  <td className="p-4 border-r-4 border-black">
                    <span className="font-black text-lg">{formatRupiah(user.total_spent)}</span>
                    {user.last_order_date && (
                      <p className="text-[10px] opacity-60 mt-0.5">Last Order: {new Date(user.last_order_date).toLocaleDateString('id-ID')}</p>
                    )}
                  </td>
                  <td className="p-4 border-r-4 border-black text-center font-black text-lg">
                    {user.points || 0}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleGivePoints(user.username)} className="bg-yellow-300 border-2 border-black px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">🎁 Gift</button>
                      {user.role !== 'admin' && (
                        <button onClick={() => handleBanUser(user.username)} className="bg-rose-400 text-white border-2 border-black px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">🔨 Ban</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredCustomers.length === 0 && (
             <div className="p-10 text-center font-black uppercase text-xl opacity-50">Pelanggan tidak ditemukan.</div>
          )}
        </div>
      </div>
    </div>
  );
}
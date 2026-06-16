import React, { useMemo } from "react";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";

interface AnalyticsTabProps {
  orders: any[];
  formatRupiah: (angka: number) => string;
}

export default function AnalyticsTab({ orders, formatRupiah }: AnalyticsTabProps) {
  
  // 1. OLAH DATA UNTUK GRAFIK OMSET & PENGHASILAN BERSIH
  const salesData = useMemo(() => {
    const dataObj: any = {};
    
    orders.forEach(order => {
      if (order.status !== 'paid' && order.status !== 'shipped') return;
      
      const date = new Date(order.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
      
      if (!dataObj[date]) {
        dataObj[date] = { date, Kotor: 0, Bersih: 0, Pesanan: 0 };
      }

      const gross = Number(order.total_amount);
      
      // ⚠️ RUMUS ESTIMASI POTONGAN (Ubah sesuai dengan rate asli API Anda nantinya)
      // Contoh: Midtrans ambil 1.5%, Biteship ambil flat Rp 2.500 per order
      const midtransFee = gross * 0.015; 
      const biteshipFee = 2500; 
      const net = gross - midtransFee - biteshipFee;

      dataObj[date].Kotor += gross;
      dataObj[date].Bersih += net;
      dataObj[date].Pesanan += 1;
    });

    return Object.values(dataObj).reverse();
  }, [orders]);

  // 2. OLAH DATA UNTUK GRAFIK PIE (STATUS PESANAN)
  const statusData = useMemo(() => {
    const counts = { paid: 0, shipped: 0, cancelled: 0, pending: 0 };
    orders.forEach(order => {
      if (counts[order.status as keyof typeof counts] !== undefined) {
        counts[order.status as keyof typeof counts]++;
      }
    });

    return [
      { name: "Diproses (Paid)", value: counts.paid, color: "#fef08a" },
      { name: "Dikirim (Shipped)", value: counts.shipped, color: "#a5f3fc" },
      { name: "Dibatalkan", value: counts.cancelled, color: "#fecdd3" },
      { name: "Menunggu (Pending)", value: counts.pending, color: "#e5e7eb" }
    ].filter(item => item.value > 0);
  }, [orders]);

  // Kalkulasi Total Keseluruhan untuk Kartu Ringkasan
  const totalKotor = salesData.reduce((sum: number, day: any) => sum + day.Kotor, 0);
  const totalBersih = salesData.reduce((sum: number, day: any) => sum + day.Bersih, 0);
  const totalPotongan = totalKotor - totalBersih;

  // 3. KUSTOMISASI TOOLTIP GRAFIK
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black uppercase border-b-2 border-black pb-1 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            // Tentukan apakah formatnya Rupiah atau Angka biasa (untuk jumlah pesanan)
            const isCurrency = entry.name === 'Kotor' || entry.name === 'Bersih';
            return (
              <p key={index} className="font-bold text-sm" style={{ color: entry.color }}>
                {entry.name}: {isCurrency ? formatRupiah(entry.value) : entry.value}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER & KARTU RINGKASAN */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Business Analytics</h2>
            <p className="font-bold text-sm opacity-60">Hitung Gross vs Net Income berdasarkan estimasi API Gateway.</p>
          </div>
          <button className="bg-yellow-300 border-4 border-black px-6 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
            📅 30 Hari Terakhir
          </button>
        </div>

        {/* 3 KARTU KEUANGAN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-black text-xs uppercase opacity-60 mb-1">Total Omset Kotor</p>
            <p className="text-2xl font-black text-pink-600">{formatRupiah(totalKotor)}</p>
          </div>
          <div className="bg-red-100 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-black text-xs uppercase opacity-60 mb-1">Estimasi Potongan (Midtrans+Biteship)</p>
            <p className="text-2xl font-black text-red-600">-{formatRupiah(totalPotongan)}</p>
          </div>
          <div className="bg-green-200 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-black text-xs uppercase opacity-60 mb-1">Penghasilan Bersih (Net Income)</p>
            <p className="text-2xl font-black text-green-800">{formatRupiah(totalBersih)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CHART 1: GRAFIK GARIS KOTOR VS BERSIH (Lebar 2 Kolom) */}
        <div className="lg:col-span-2 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
          <div className="bg-indigo-300 border-b-4 border-black p-4 flex justify-between items-center">
            <h3 className="font-black uppercase text-lg">Gross vs Net Income Harian</h3>
            <span className="text-2xl">⚖️</span>
          </div>
          <div className="p-6 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#000" vertical={false} />
                <XAxis dataKey="date" tick={{ fontWeight: 'bold' }} stroke="#000" />
                <YAxis tickFormatter={(value) => `Rp${value / 1000}k`} tick={{ fontWeight: 'bold' }} stroke="#000" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontWeight: 'bold', paddingTop: '10px' }} />
                
                {/* Garis Omset Kotor */}
                <Line type="monotone" name="Kotor" dataKey="Kotor" stroke="#ec4899" strokeWidth={5} dot={{ r: 4, stroke: '#000', strokeWidth: 2, fill: '#fbcfe8' }} activeDot={{ r: 8 }} />
                
                {/* Garis Penghasilan Bersih */}
                <Line type="monotone" name="Bersih" dataKey="Bersih" stroke="#22c55e" strokeWidth={5} dot={{ r: 4, stroke: '#000', strokeWidth: 2, fill: '#bbf7d0' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: GRAFIK PIE DISTRIBUSI STATUS */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
          <div className="bg-pink-300 border-b-4 border-black p-4 flex justify-between items-center">
            <h3 className="font-black uppercase text-lg">Status Pesanan</h3>
            <span className="text-2xl">🍕</span>
          </div>
          <div className="p-6 h-80 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="#000" strokeWidth={3}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: GRAFIK BATANG VOLUME PESANAN */}
        <div className="lg:col-span-3 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col mb-20">
          <div className="bg-cyan-200 border-b-4 border-black p-4 flex justify-between items-center">
            <h3 className="font-black uppercase text-lg">Volume Pesanan Harian (Kardus Keluar)</h3>
            <span className="text-2xl">📦</span>
          </div>
          <div className="p-6 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#000" vertical={false} />
                <XAxis dataKey="date" tick={{ fontWeight: 'bold' }} stroke="#000" />
                <YAxis tick={{ fontWeight: 'bold' }} stroke="#000" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Pesanan" fill="#fef08a" stroke="#000" strokeWidth={4} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetchOrderDetail();
  }, [params.id]);

  const fetchOrderDetail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      // Validasi Admin Keamanan Lapis Baja
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") {
        alert("🚨 PENYUSUP TERDETEKSI: Anda bukan Admin!");
        return router.push("/login");
      }

      // Tarik Data Order
      const { data: orderData, error } = await supabase
        .from("orders")
        .select("*, voucher:user_vouchers(vouchers(*))")
        .eq("id", params.id)
        .single();

      if (error) throw error;
      setOrder(orderData);
    } catch (error: any) {
      console.error("Gagal memuat detail pesanan:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || isLoading) return <div className="min-h-screen flex justify-center items-center font-black text-2xl uppercase">Membongkar Arsip Transaksi... 🗄️</div>;
  if (!order) return <div className="min-h-screen flex justify-center items-center font-black text-2xl uppercase text-red-500">Arsip Tidak Ditemukan! ❌</div>;

  const subtotalBarang = order.items_data?.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) || 0;
  const nilaiDiskon = order.voucher?.vouchers?.discount_amount || 0;

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-8">
      
      <Link href="/" className="inline-block">
        <button className="px-4 py-2 font-black uppercase bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-sm">
          ⬅️ Kembali ke Dasbor Admin
        </button>
      </Link>

      <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-black uppercase bg-gray-200 border-2 border-black px-2 py-0.5">
            Nota Pesanan: #{order.id.substring(0, 8).toUpperCase()}
          </span>
          <p className="text-sm font-bold opacity-70 mt-1">
            Waktu Transaksi: {new Date(order.created_at).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className={`text-sm font-black uppercase tracking-wider px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
          ${order.status === "paid" && "bg-green-400"}
          ${order.status === "shipped" && "bg-blue-400 text-white"}
          ${order.status === "pending" && "bg-amber-300"}
          ${order.status === "cancelled" && "bg-red-400 text-white"}
        `}>
          {order.status === "shipped" ? "🚚 DIKIRIM" : order.status === "paid" ? "✅ LUNAS" : order.status === "pending" ? "⏳ MENUNGGU BAYAR" : "❌ BATAL"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase mb-4 bg-yellow-300 inline-block px-2 border-2 border-black">Item Belanjaan Pembeli</h2>
            <div className="space-y-4">
              {order.items_data && order.items_data.length > 0 ? (
                order.items_data.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 border-2 border-black p-3 font-bold">
                    <div>
                      <p className="uppercase leading-tight text-sm">{item.name}</p>
                      <p className="text-xs opacity-70">x{item.quantity} @ {formatRupiah(item.price)}</p>
                    </div>
                    <p className="bg-white px-2 border-2 border-black text-sm">{formatRupiah(item.price * item.quantity)}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs font-bold opacity-60 text-center">Data item tidak terekam pada transaksi lama.</p>
              )}
            </div>
          </div>

          <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-3 font-bold text-sm">
            <h2 className="text-xl font-black uppercase mb-2 bg-pink-300 inline-block px-2 border-2 border-black">Rincian Keuangan</h2>
            <div className="flex justify-between"><span>Subtotal Produk</span><span>{formatRupiah(subtotalBarang)}</span></div>
            <div className="flex justify-between"><span>Ongkos Kirim ({order.courier_name})</span><span>{formatRupiah(order.shipping_cost)}</span></div>
            {nilaiDiskon > 0 && <div className="flex justify-between text-red-600 font-black"><span>Diskon Voucher ({order.voucher?.vouchers?.name})</span><span>- {formatRupiah(nilaiDiskon)}</span></div>}
            <div className="flex justify-between items-end pt-3 border-t-2 border-dashed border-black">
              <span className="font-black text-base uppercase">Total Masuk</span>
              <span className="font-black text-xl bg-green-300 border-2 border-black px-2 transform -rotate-1">{formatRupiah(order.total_amount)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-lg font-black uppercase mb-3 bg-blue-300 inline-block px-2 border-2 border-black">Target Pengiriman</h2>
            <p className="font-black uppercase text-base">{order.customer_name}</p>
            <p className="text-xs font-bold text-gray-600 mt-0.5">{order.customer_phone}</p>
            <p className="text-xs font-bold opacity-80 mt-3 leading-relaxed border-t-2 border-black pt-2">📍 {order.customer_address}</p>
          </div>

          {order.status === "shipped" && order.biteship_tracking_id && (
            <div className="bg-blue-100 border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(59,130,246,1)] text-center space-y-3">
              <h2 className="text-lg font-black uppercase bg-white text-blue-600 inline-block px-2 border-2 border-black">Resi Terinput 🚚</h2>
              <div className="bg-white p-2 border-2 border-black font-mono font-black text-lg tracking-wider select-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {order.biteship_tracking_id}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
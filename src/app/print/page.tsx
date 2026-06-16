"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from ".././utils/supabase/client";
import Barcode from "react-barcode";

function PrintContent() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids");
  const supabase = createClient();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (idsParam) {
      fetchOrdersForPrint();
    } else {
      setIsLoading(false);
    }
  }, [idsParam]);

  const fetchOrdersForPrint = async () => {
    try {
      const idsArray = idsParam?.split(",") || [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("id", idsArray);

      if (error) throw error;
      setOrders(data || []);
      
      setTimeout(() => {
        window.print();
      }, 1500);

    } catch (error) {
      console.error("Gagal memuat data cetak:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="p-10 font-black uppercase text-2xl">Menyiapkan Label Thermal... 🖨️</div>;
  if (orders.length === 0) return <div className="p-10 font-black uppercase text-2xl text-red-500">Tidak ada pesanan!</div>;

  return (
    <div className="bg-gray-400 min-h-screen p-4 md:p-8 print:bg-white print:p-0 flex flex-col items-center">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
          }
        }
      `}} />

      <button onClick={() => window.print()} className="mb-8 bg-black text-white px-8 py-3 font-black text-lg uppercase border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] print:hidden hover:-translate-y-1 transition-transform">
        🖨️ CETAK LABEL THERMAL
      </button>

      <div className="space-y-8 print:space-y-0 w-full flex flex-col items-center">
        {orders.map((order, index) => (
          
          <div key={order.id} className="bg-white text-black p-4 w-full max-w-[100mm] min-h-[150mm] border-4 border-black mb-8 print:mb-0 print:border-none print:break-after-page flex flex-col relative overflow-hidden">
            
            {/* 1. KOP SURAT & KURIR */}
            <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter leading-none">POPCIONARDES</h1>
                <p className="text-[10px] font-bold uppercase mt-1">Jakarta, ID</p>
              </div>
              <div className="text-right">
                <div className="bg-black text-white px-2 py-1 font-black text-sm uppercase inline-block border-2 border-black">
                  {order.courier_name || "JNE - REG"}
                </div>
              </div>
            </div>

            {/* 2. AREA BARCODE */}
            <div className="flex flex-col items-center justify-center py-2 border-b-2 border-dashed border-black mb-3">
              {order.biteship_tracking_id ? (
                <Barcode 
                  value={order.biteship_tracking_id} 
                  width={1.8} 
                  height={50} 
                  fontSize={14} 
                  margin={0} 
                  displayValue={true}
                  background="#ffffff"
                  lineColor="#000000"
                />
              ) : (
                <div className="h-[60px] border-2 border-black w-full flex items-center justify-center bg-gray-100">
                  <span className="font-black text-xs uppercase opacity-50">RESI BELUM DI-GENERATE</span>
                </div>
              )}
            </div>

            {/* 3. AREA TENGAH: PENERIMA & ISI PAKET (Flex-1 akan mendorong info Pengirim ke paling bawah) */}
            <div className="flex-1 flex flex-col">
              
              {/* PENERIMA */}
              <div className="mb-3">
                <h2 className="text-[10px] font-black uppercase bg-black text-white inline-block px-1 mb-1">Penerima</h2>
                <p className="text-xl font-black uppercase leading-tight">{order.customer_name}</p>
                <p className="text-sm font-bold font-mono">{order.customer_phone}</p>
                <p className="text-[11px] font-bold mt-1 leading-snug">{order.customer_address}</p>
              </div>

              {/* GARIS PEMBATAS */}
              <div className="border-t-2 border-black my-2"></div>

              {/* ISI PAKET (Langsung di bawah garis pembatas) */}
              <div className="mt-1">
                <h2 className="text-[10px] font-black uppercase opacity-60 mb-2">Isi Paket (Order: #{order.id.substring(0,6)})</h2>
                <ul className="space-y-1">
                  {order.items_data?.map((item: any, idx: number) => (
                    <li key={idx} className="flex justify-between items-start text-[11px] font-bold">
                      <span className="uppercase pr-2 leading-tight">- {item.name}</span>
                      <span className="font-black whitespace-nowrap border border-black px-1">x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* 4. PENGIRIM (Otomatis terdorong ke ujung paling bawah kertas) */}
            <div className="mt-4 pt-2 border-t-2 border-black">
              <h2 className="text-[10px] font-black uppercase border border-black inline-block px-1 mb-1">Pengirim</h2>
              <p className="text-xs font-black uppercase">Popcionardes Pusat</p>
              <p className="text-[10px] font-bold">0812-3456-7890</p>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="p-10 font-black text-2xl">Loading...</div>}>
      <PrintContent />
    </Suspense>
  );
}
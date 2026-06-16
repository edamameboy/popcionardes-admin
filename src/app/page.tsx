"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "./utils/supabase/client";
import { useRouter } from "next/navigation";

// IMPOR KOMPONEN BARU KITA
import Sidebar from "../components/admin/Sidebar";
import Topbar from "../components/admin/Topbar";
import OverviewTab from "../components/admin/OverviewTab";
import ProductsTab from "../components/admin/ProductsTab";
import OrdersTab from "../components/admin/OrdersTab";
import OpnameTab from "../components/admin/OpnameTab";
import CustomersTab from "../components/admin/CustomersTab";
import AnalyticsTab from "../components/admin/AnalyticsTab";
import ExpensesTab from "../components/admin/ExpensesTab";
import VouchersTab from "../components/admin/VouchersTab";

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);
};

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Global State Data
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  // --------------------------------------------------
  // STATE & FUNGSI GLOBAL TOAST NOTIFICATION
  // --------------------------------------------------
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    setToast({ message, type });
    // Notifikasi otomatis hilang setelah 3.5 detik
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: userProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (userProfile?.role !== "admin") {
        showToast("🚨 Akses Ditolak! Anda bukan Admin.", "error");
        return router.push("/login");
      }
      setIsAdmin(true);
      setProfile(userProfile);

      const { data: allOrders } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      setOrders(allOrders || []);

      const { data: allProducts } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      setProducts(allProducts || []);

    } catch (error) { 
      console.error(error); 
      showToast("Gagal memuat data utama dari server", "error");
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!mounted || isLoading) return <div className="h-screen flex justify-center items-center font-black text-2xl uppercase bg-white">Membuka Sistem... ⚙️</div>;
  if (!isAdmin) return null;

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden text-black selection:bg-pink-200">
      
      <style dangerouslySetInnerHTML={{__html: `
        .bg-grid { background-size: 30px 30px; background-image: linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px); }
        
        /* TAMBAHAN ANIMASI UNTUK TOAST */
        @keyframes shrink-width {
          0% { width: 100%; }
          100% { width: 0%; }
        }
        .animate-shrink-width {
          animation: shrink-width 3500ms linear forwards;
        }
      `}} />

      {/* COMPONENT TOAST NEO BRUTALISM */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-top-10 duration-300 max-w-sm pointer-events-auto">
          <div className={`border-4 border-black p-4 min-w-[320px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black uppercase text-xs flex items-center gap-3 relative overflow-hidden
            ${toast.type === "success" ? "bg-green-300 text-black" : toast.type === "error" ? "bg-rose-300 text-black animate-bounce" : "bg-yellow-300 text-black"}
          `}>
            {/* Animasi loading bar waktu habis di bagian bawah toast */}
            <div className="absolute bottom-0 left-0 h-1 bg-black animate-shrink-width" style={{ animationDuration: '3500ms', animationTimingFunction: 'linear', animationFillMode: 'forwards' }} />
            
            <span className="text-xl">{toast.type === "success" ? "🎉" : toast.type === "error" ? "🚨" : "⚠️"}</span>
            <div className="flex-1 leading-tight tracking-tight">{toast.message}</div>
            <button onClick={() => setToast(null)} className="font-black text-lg hover:scale-125 ml-2 transition-transform cursor-pointer">×</button>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* TOPBAR */}
        <Topbar activeTab={activeTab} profile={profile} />

        {/* AREA KONTEN UTAMA DENGAN INJEKSI FUNGSI TOAST */}
        <main className="flex-1 overflow-y-auto bg-grid p-6 md:p-10 pb-24">
          {activeTab === "overview" && (
            <OverviewTab orders={orders} products={products} setActiveTab={setActiveTab} formatRupiah={formatRupiah} />
          )}
          {activeTab === "products" && (
            <ProductsTab products={products} supabase={supabase} fetchAdminData={fetchAdminData} formatRupiah={formatRupiah} showToast={showToast} />
          )}
          {activeTab === "opname" && (
            <OpnameTab products={products} supabase={supabase} fetchAdminData={fetchAdminData} showToast={showToast} />
          )}
          {activeTab === "orders" && (
            <OrdersTab orders={orders} supabase={supabase} fetchAdminData={fetchAdminData} formatRupiah={formatRupiah} showToast={showToast} />
          )}
          {activeTab === "expenses" && (
            <ExpensesTab supabase={supabase} formatRupiah={formatRupiah} showToast={showToast} />
          )}
          {activeTab === "customers" && (
            <CustomersTab orders={orders} supabase={supabase} formatRupiah={formatRupiah} showToast={showToast} />
          )}
          {activeTab === "analytics" && (
            <AnalyticsTab orders={orders} formatRupiah={formatRupiah} />
          )}
          {activeTab === "vouchers" && (
            <VouchersTab supabase={supabase} formatRupiah={formatRupiah} showToast={showToast} />
          )}
        </main>

      </div>
    </div>
  );
}
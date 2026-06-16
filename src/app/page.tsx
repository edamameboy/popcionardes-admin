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

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);
};

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Global State (Dibagi ke Tab-Tab)
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

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
        alert("🚨 Akses Ditolak!");
        return router.push("/login");
      }
      setIsAdmin(true);
      setProfile(userProfile);

      const { data: allOrders } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      setOrders(allOrders || []);

      const { data: allProducts } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      setProducts(allProducts || []);

    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!mounted || isLoading) return <div className="h-screen flex justify-center items-center font-black text-2xl uppercase bg-white">Membuka Sistem... ⚙️</div>;
  if (!isAdmin) return null;

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden text-black selection:bg-pink-200">
      
      {/* Background Grid CSS Injection */}
      <style dangerouslySetInnerHTML={{__html: `.bg-grid { background-size: 30px 30px; background-image: linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px); }`}} />

      {/* 1. SIDEBAR */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* 2. TOPBAR */}
        <Topbar activeTab={activeTab} profile={profile} />

        {/* 3. AREA KONTEN UTAMA */}
        <main className="flex-1 overflow-y-auto bg-grid p-6 md:p-10 pb-24">
          {activeTab === "overview" && (
            <OverviewTab orders={orders} products={products} setActiveTab={setActiveTab} formatRupiah={formatRupiah} />
          )}
          {activeTab === "products" && (
            <ProductsTab products={products} supabase={supabase} fetchAdminData={fetchAdminData} formatRupiah={formatRupiah} />
          )}
          {activeTab === "orders" && (
            <OrdersTab orders={orders} supabase={supabase} fetchAdminData={fetchAdminData} formatRupiah={formatRupiah} />
          )}
          {activeTab === "opname" && (
            <OpnameTab products={products} supabase={supabase} fetchAdminData={fetchAdminData} />
          )}
        </main>

      </div>
    </div>
  );
}
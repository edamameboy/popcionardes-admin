"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // State Navigasi Utama
  const [activeTab, setActiveTab] = useState("orders");

  // State Tab Pesanan
  const [orders, setOrders] = useState<any[]>([]);
  const [trackingInputs, setTrackingInputs] = useState<{ [key: string]: string }>({});
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // =====================================
  // STATE BARU: SKALA 8000+ SKU (FUNKO POP)
  // =====================================
  const [productMode, setProductMode] = useState("list"); // "list" atau "form"
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  // State Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10; // Tampilkan 10 barang per halaman agar rapi

  // State Form Produk
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const initialProductForm = { name: "", description: "", price: "", stock: "", bg_color: "bg-white", image_url: "", category: "Anime" };
  const [productForm, setProductForm] = useState<any>(initialProductForm);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    checkAdminAndLoadInitialData();
  }, []);

  // Saat halaman berubah atau search dilakukan, tarik ulang produk
  useEffect(() => {
    if (isAdmin && activeTab === "products") {
      fetchProducts(currentPage, searchQuery);
    }
  }, [currentPage, isAdmin, activeTab]);

  const checkAdminAndLoadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!profile || profile.role !== "admin") {
        alert("🚨 Akses Ditolak: Anda bukan Admin!");
        return router.push("/");
      }
      setIsAdmin(true);

      // Tarik Data Pesanan Global
      const { data: allOrders } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      setOrders(allOrders || []);

    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNGSI TARIK PRODUK (DENGAN PAGINASI & SEARCH) ---
  const fetchProducts = async (page: number, search: string) => {
    setIsLoadingProducts(true);
    try {
      let query = supabase.from("products").select("*", { count: "exact" });
      
      if (search) {
        query = query.ilike("name", `%${search}%`); // Mencari berdasarkan nama produk
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await query
        .range(from, to)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProducts(data || []);
      if (count !== null) {
        setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
      } else {
        setTotalPages(1);
      }
    } catch (error: any) {
      console.error("Gagal menarik produk:", error.message);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset ke halaman 1 setiap kali melakukan pencarian baru
    fetchProducts(1, searchQuery);
  };


  // --- FUNGSI UPDATE PESANAN (TETAP SAMA) ---
  const handleUpdateTracking = async (orderId: string, currentStatus: string) => {
    const resi = trackingInputs[orderId];
    if (!resi && currentStatus === "paid") return alert("Masukkan nomor resi kurir terlebih dahulu bos!");
    setIsUpdating(orderId);
    try {
      const nextStatus = currentStatus === "paid" ? "shipped" : currentStatus;
      const updateData: any = { status: nextStatus };
      if (resi) updateData.biteship_tracking_id = resi;
      await supabase.from("orders").update(updateData).eq("id", orderId);
      alert("🚀 Pesanan Berhasil Di-update!");
      checkAdminAndLoadInitialData(); 
    } catch (error: any) { alert(`Gagal update: ${error.message}`); } finally { setIsUpdating(null); }
  };

  // --- FUNGSI CRUD PRODUK ---
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProduct(true);
    try {
      let finalImageUrl = productForm.image_url;

      if (uploadFile) {
        const fileExt = uploadFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("products").upload(fileName, uploadFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("products").getPublicUrl(fileName);
        finalImageUrl = publicUrl;
      }

      const payload = {
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        quantity: Number(productForm.stock),
        bg_color: productForm.bg_color,
        category: productForm.category,
        image_url: finalImageUrl || "https://api.dicebear.com/7.x/shapes/svg?seed=box"
      };

      if (editingProductId) {
        await supabase.from("products").update(payload).eq("id", editingProductId);
        alert("✅ Produk berhasil di-update!");
      } else {
        await supabase.from("products").insert(payload);
        alert("🎉 Produk baru berhasil mendarat di toko!");
      }

      // Reset form dan kembali ke mode list
      setProductForm(initialProductForm);
      setUploadFile(null);
      setEditingProductId(null);
      setProductMode("list"); 
      fetchProducts(currentPage, searchQuery); // Refresh data
    } catch (error: any) { alert(`Error menyimpan produk: ${error.message}`); } finally { setIsSubmittingProduct(false); }
  };

  const handleEditProduct = (prod: any) => {
    setEditingProductId(prod.id);
    setProductForm({ name: prod.name, description: prod.description, price: prod.price, stock: prod.stock, bg_color: prod.bg_color, image_url: prod.image_url });
    setUploadFile(null);
    setProductMode("form"); // Pindah ke layar form
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Yakin mau menghapus mainan "${name}"? Data yang hilang tak akan kembali!`)) return;
    try {
      await supabase.from("products").delete().eq("id", id);
      alert("🗑️ Produk hangus terhapus!");
      fetchProducts(currentPage, searchQuery);
    } catch (error: any) { alert(`Gagal menghapus: ${error.message}`); }
  };


  if (!mounted || isLoading) return <div className="min-h-screen flex justify-center items-center font-black text-2xl uppercase">Membuka Brankas Toko... 🔐</div>;
  if (!isAdmin) return null;

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      {/* HEADER DASHBOARD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-4 border-black pb-6 gap-4">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Ruang Kendali Admin</h1>
        </div>
        <div className="bg-red-400 border-4 border-black px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white">
          ⚡ MODE CONTROL: ACTIVE
        </div>
      </div>

      {/* SISTEM TABS UTAMA */}
      <div className="flex gap-4 border-b-4 border-black pb-4 overflow-x-auto whitespace-nowrap">
        <button onClick={() => setActiveTab("orders")} className={`px-6 py-3 font-black uppercase border-4 border-black transition-all ${activeTab === "orders" ? "bg-black text-white shadow-none translate-x-1 translate-y-1" : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100"}`}>Arus Pesanan</button>
        <button onClick={() => { setActiveTab("products"); setProductMode("list"); }} className={`px-6 py-3 font-black uppercase border-4 border-black transition-all ${activeTab === "products" ? "bg-black text-white shadow-none translate-x-1 translate-y-1" : "bg-pink-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-pink-400"}`}>Gudang Mainan</button>
      </div>

      {/* ========================================== */}
      {/* KONTEN TAB 1: ARUS PESANAN (Disembunyikan untuk menyingkat pesan, isinya SAMA PERSIS dengan sebelumnya) */}
      {/* ========================================== */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-300 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-bold text-xs uppercase opacity-70">Total Pesanan</p><p className="text-3xl font-black">{orders.length}</p>
            </div>
            <div className="bg-green-400 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-bold text-xs uppercase opacity-70">Lunas / Dikirim</p><p className="text-3xl font-black">{orders.filter(o => o.status === 'paid' || o.status === 'shipped').length}</p>
            </div>
            <div className="bg-yellow-300 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-bold text-xs uppercase opacity-70">Omset Penjualan</p><p className="text-3xl font-black">{formatRupiah(orders.filter(o => o.status === 'paid' || o.status === 'shipped').reduce((sum, o) => sum + Number(o.total_amount), 0))}</p>
            </div>
          </div>

          {orders.map((order) => (
             <div key={order.id} className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col lg:flex-row gap-6 justify-between">
             <div className="space-y-2 flex-1">
               <div className="flex items-center gap-2 flex-wrap">
                 <span className="text-xs font-black bg-gray-200 border-2 border-black px-2 py-0.5">#{order.id.substring(0,8).toUpperCase()}</span>
                 <span className={`text-xs font-black px-2 py-0.5 border-2 border-black ${order.status === 'paid' && 'bg-green-400'} ${order.status === 'shipped' && 'bg-blue-400 text-white'} ${order.status === 'pending' && 'bg-amber-300'} ${order.status === 'cancelled' && 'bg-red-400 text-white'}`}>STATUS: {order.status.toUpperCase()}</span>
                 <Link href={`/orders/${order.id}`}>
                   <button className="text-[10px] font-black bg-cyan-300 border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all uppercase">🔍 Cek Struk</button>
                 </Link>
               </div>
               <p className="font-black text-xl uppercase leading-tight mt-2">{order.customer_name} ({order.customer_phone})</p>
               <p className="text-sm font-bold opacity-80 max-w-xl">📍 {order.customer_address}</p>
             </div>
             <div className="flex flex-col sm:flex-row lg:flex-col justify-between lg:justify-center items-start sm:items-center lg:items-end gap-4 bg-gray-50 p-4 border-2 border-black lg:min-w-62.5">
               <div><p className="text-[10px] font-black uppercase opacity-60">Ongkir: {formatRupiah(order.shipping_cost)}</p><p className="font-black text-xl bg-yellow-200 px-2 border-2 border-black inline-block">{formatRupiah(order.total_amount)}</p></div>
             </div>
             <div className="flex flex-col justify-center gap-2 lg:w-1/4 border-t-2 lg:border-t-0 lg:border-l-2 border-dashed border-black pt-4 lg:pt-0 lg:pl-6">
               {order.status === "paid" ? (
                 <><input type="text" placeholder="Resi Kirim" value={trackingInputs[order.id] || ""} onChange={(e) => setTrackingInputs({ ...trackingInputs, [order.id]: e.target.value })} className="p-2 border-2 border-black font-bold text-sm" /><button onClick={() => handleUpdateTracking(order.id, "paid")} disabled={isUpdating === order.id} className="w-full py-2 font-black bg-green-400 border-2 border-black text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all">{isUpdating === order.id ? "Memproses..." : "Kirim Barang 🚚"}</button></>
               ) : order.status === "shipped" ? ( <div className="text-center p-2 bg-blue-100 border-2 border-black"><p className="text-xs font-black uppercase text-blue-800">Sudah Di Jalan</p><p className="text-xs font-mono font-bold bg-white p-1 border border-black truncate">📦 {order.biteship_tracking_id || "Tanpa Resi"}</p></div>
               ) : order.status === "pending" ? ( <p className="text-xs font-black text-amber-700 bg-amber-100 border-2 border-black p-3 text-center uppercase">Menunggu Pembayaran</p>
               ) : ( <p className="text-xs font-black text-red-700 bg-red-100 border-2 border-black p-3 text-center uppercase">Batal ❌</p> )}
             </div>
           </div>
          ))}
        </div>
      )}

      {/* ========================================== */}
      {/* KONTEN TAB 2: GUDANG MAINAN (SKALA 8000+ SKU) */}
      {/* ========================================== */}
      {activeTab === "products" && (
        <div className="space-y-8">
          
          {/* HEADER NAVIGASI PRODUK */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-100 border-4 border-black p-4">
            <h2 className="text-2xl font-black uppercase">
              {productMode === "list" ? "Daftar Rak Gudang" : editingProductId ? "Edit Mainan 🛠️" : "Form Mainan Baru 🧸"}
            </h2>
            
            {productMode === "list" ? (
              <button 
                onClick={() => { setProductForm(initialProductForm); setEditingProductId(null); setProductMode("form"); }}
                className="px-6 py-2 font-black uppercase bg-green-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                + Tambah Mainan
              </button>
            ) : (
              <button 
                onClick={() => setProductMode("list")}
                className="px-6 py-2 font-black uppercase bg-red-400 text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                ✖ Batal / Kembali
              </button>
            )}
          </div>

          {/* ============================== */}
          {/* TAMPILAN: MODE FORM TAMBAH/EDIT */}
          {/* ============================== */}
          {productMode === "form" && (
            <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <form onSubmit={handleSaveProduct} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-1"><label className="font-bold text-sm uppercase">Nama / Lisensi Karakter</label><input required type="text" value={productForm.name} onChange={(e)=>setProductForm({...productForm, name: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none" placeholder="Cth: Funko Pop! Marvel - Iron Man #580" /></div>
                  
                  {/* --- KOTAK KATEGORI BARU --- */}
                  <div className="space-y-1">
                    <label className="font-bold text-sm uppercase">Kategori Funko POP!</label>
                    <select value={productForm.category} onChange={(e)=>setProductForm({...productForm, category: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none cursor-pointer">
                      <option value="Anime">Anime</option>
                      <option value="Marvel">Marvel</option>
                      <option value="DC">DC Comics</option>
                      <option value="Movies">Movies & TV</option>
                      <option value="Gaming">Gaming</option>
                      <option value="Disney">Disney</option>
                      <option value="Music">Music / Rocks</option>
                      <option value="Sports">Sports</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  {/* ----------------------------- */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="font-bold text-sm uppercase">Harga (Rp)</label><input required type="number" min="0" value={productForm.price} onChange={(e)=>setProductForm({...productForm, price: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none" /></div>
                    <div className="space-y-1"><label className="font-bold text-sm uppercase">Stok Tersedia</label><input required type="number" min="0" value={productForm.stock} onChange={(e)=>setProductForm({...productForm, stock: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none" /></div>
                  </div>
                  <div className="space-y-1"><label className="font-bold text-sm uppercase">Deskripsi / Kondisi Box</label><textarea required rows={3} value={productForm.description} onChange={(e)=>setProductForm({...productForm, description: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none resize-none" placeholder="Cth: Mint in Sealed Box (MISB). Protector include." /></div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-bold text-sm uppercase">Warna Etalase (*Neo Brutalism*)</label>
                    <select value={productForm.bg_color} onChange={(e)=>setProductForm({...productForm, bg_color: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:outline-none cursor-pointer">
                      <option value="bg-white">Putih Bersih (bg-white)</option>
                      <option value="bg-yellow-400">Kuning Ceria (bg-yellow-400)</option>
                      <option value="bg-pink-300">Pink Ngejreng (bg-pink-300)</option>
                      <option value="bg-blue-300">Biru Kalem (bg-blue-300)</option>
                      <option value="bg-green-400">Hijau Segar (bg-green-400)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-sm uppercase">Foto Produk (Opsional jika edit)</label>
                    <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="w-full p-2 border-4 border-black bg-gray-50 font-bold cursor-pointer" />
                    {productForm.image_url && !uploadFile && <p className="text-xs font-bold text-green-600 mt-1">✅ Menggunakan foto lama.</p>}
                  </div>
                  
                  <button type="submit" disabled={isSubmittingProduct} className="w-full py-4 text-xl font-black uppercase border-4 border-black bg-blue-400 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all mt-4">
                    {isSubmittingProduct ? "Menyimpan..." : editingProductId ? "Simpan Perubahan 💾" : "Lempar ke Gudang 🚀"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============================== */}
          {/* TAMPILAN: MODE DAFTAR (TABLE DATA) */}
          {/* ============================== */}
          {productMode === "list" && (
            <div className="space-y-6">
              
              {/* BARIS PENCARIAN SKU */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Cari berdasarkan nama produk atau karakter..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 p-4 border-4 border-black bg-white font-bold focus:bg-yellow-100 outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
                <button type="submit" className="px-8 py-4 font-black uppercase border-4 border-black bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                  Cari 🔍
                </button>
              </form>

              {/* TABEL DATA RAKSASA */}
              <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-x-auto">
                {isLoadingProducts ? (
                  <div className="p-12 text-center font-black uppercase text-xl animate-pulse">Menyortir Kardus... 📦</div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-200">
                    <thead>
                      <tr className="bg-pink-300 border-b-4 border-black uppercase text-sm font-black">
                        <th className="p-4 border-r-4 border-black w-24">Foto</th>
                        <th className="p-4 border-r-4 border-black">Nama Item</th>
                        <th className="p-4 border-r-4 border-black w-32 text-right">Harga</th>
                        <th className="p-4 border-r-4 border-black w-24 text-center">Stok</th>
                        <th className="p-4 w-40 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center font-bold">Produk tidak ditemukan!</td></tr>
                      ) : (
                        products.map((prod) => (
                          <tr key={prod.id} className="border-b-4 border-black hover:bg-gray-100 transition-colors">
                            <td className={`p-2 border-r-4 border-black ${prod.bg_color}`}>
                              <img 
                                src={prod.image_url} 
                                alt={prod.name} 
                                className="w-26 h-26 object-contain mx-auto drop-shadow-md" 
                              />
                            </td>
                            <td className="p-4 border-r-4 border-black font-black uppercase text-sm leading-tight">
                              {prod.name}
                            </td>
                            <td className="p-4 border-r-4 border-black font-black text-right">
                              {formatRupiah(prod.price)}
                            </td>
                            <td className="p-4 border-r-4 border-black font-black text-center text-lg">
                              <span className={`${prod.stock <= 0 ? 'text-red-500 bg-red-100 px-2 border-2 border-red-500' : ''}`}>
                                {prod.stock}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-2">
                                <button onClick={() => handleEditProduct(prod)} className="py-1.5 px-3 text-[10px] font-black uppercase bg-yellow-300 border-2 border-black hover:bg-black hover:text-white transition-colors text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">Edit</button>
                                <button onClick={() => handleDeleteProduct(prod.id, prod.name)} className="py-1.5 px-3 text-[10px] font-black uppercase bg-red-400 text-white border-2 border-black hover:bg-black transition-colors text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">Hapus</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* NAVIGASI PAGINASI BAWAH */}
              {!isLoadingProducts && totalPages > 1 && (
                <div className="flex justify-between items-center bg-gray-100 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 font-black uppercase border-2 border-black ${currentPage === 1 ? "opacity-50 cursor-not-allowed bg-gray-300" : "bg-white hover:bg-black hover:text-white"}`}
                  >
                    ⬅️ Prev
                  </button>
                  <span className="font-black uppercase">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 font-black uppercase border-2 border-black ${currentPage === totalPages ? "opacity-50 cursor-not-allowed bg-gray-300" : "bg-white hover:bg-black hover:text-white"}`}
                  >
                    Next ➡️
                  </button>
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}
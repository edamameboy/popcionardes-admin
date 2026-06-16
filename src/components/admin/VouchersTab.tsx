import React, { useState, useEffect } from "react";

interface VouchersTabProps {
  supabase: any;
  formatRupiah: (angka: number) => string;
  showToast: (message: string, type: "success" | "error" | "warning") => void;
}

export default function VouchersTab({ supabase, formatRupiah, showToast }: VouchersTabProps) {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State Form Voucher
  const initialForm = {
    code: "", type: "PERCENTAGE", discount_value: "", max_discount: "", 
    min_purchase: "", quota: "", valid_until: "", free_product_sku: "",
    min_qty: "", free_qty: "", points_required: ""
  };
  const [form, setForm] = useState<any>(initialForm);

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("vouchers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setVouchers(data || []);
    } catch (error: any) {
      showToast(`Gagal memuat voucher: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. Siapkan JSONB details berdasarkan tipe voucher
      const detailsObj: any = {};
      
      if (form.type === "FREE_ITEM") {
        if (!form.free_product_sku) throw new Error("SKU Produk Gratis wajib diisi!");
        detailsObj.free_product_sku = form.free_product_sku;
      } else if (form.type === "BUY_X_GET_Y") {
        detailsObj.min_qty_required = Number(form.min_qty) || 2;
        detailsObj.free_qty_given = Number(form.free_qty) || 1;
        detailsObj.calculation_strategy = "CHEAPEST_FREE";
      }

      // 2. Bersihkan kode dari spasi
      const safeCode = form.code.toUpperCase().replace(/\s/g, "");

      // 3. RAKIT PAYLOAD ANTI-ERROR
      const payload = {
        // --- DATA DUMMY UNTUK MEMUASKAN SISTEM LAMA ---
        name: `Promo: ${safeCode}`,
        points_required: Number(form.points_required) || 0,
        discount_amount: 0,   // 🔥 FIX UTAMA: Kirim angka 0 untuk sistem lama
        description: "-",      // Pencegahan jika description wajib isi
        bg_color: "#ffffff",   // Pencegahan jika bg_color wajib isi
        
        // --- DATA ASLI UNTUK SISTEM KODE PROMO BARU KITA ---
        code: safeCode,
        type: form.type,
        discount_value: Number(form.discount_value) || 0,
        max_discount: Number(form.max_discount) || 0,
        min_purchase: Number(form.min_purchase) || 0,
        quota: Number(form.quota) || 0,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        details: detailsObj
      };

      // 4. Tembakkan ke Supabase
      const { error } = await supabase.from("vouchers").insert(payload);
      if (error) throw error;

      showToast("🎫 Voucher Promo berhasil diterbitkan!", "success");
      setForm(initialForm);
      fetchVouchers();
    } catch (error: any) {
      if (error.code === '23505') showToast("❌ Kode Voucher sudah pernah dibuat!", "error");
      else showToast(`❌ Gagal: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleVoucherStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("vouchers").update({ is_active: !currentStatus }).eq("id", id);
      if (error) throw error;
      
      showToast(currentStatus ? "🛑 Voucher dinonaktifkan!" : "✅ Voucher diaktifkan kembali!", "success");
      setVouchers(prev => prev.map(v => v.id === id ? { ...v, is_active: !currentStatus } : v));
    } catch (error: any) {
      showToast("Gagal mengubah status!", "error");
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Hapus permanen voucher "${code}"?`)) return;
    try {
      await supabase.from("vouchers").delete().eq("id", id);
      showToast("🗑️ Voucher berhasil dihapus!", "success");
      setVouchers(prev => prev.filter(v => v.id !== id));
    } catch (error: any) {
      showToast("Gagal menghapus voucher!", "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Promo & Vouchers</h2>
          <p className="font-bold text-sm opacity-60">Mesin pembuat diskon, cashback, dan produk gratis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORM PEMBUATAN VOUCHER */}
        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-max">
          <div className="bg-cyan-300 border-b-4 border-black -mx-6 -mt-6 p-4 mb-6 flex items-center gap-2">
            <span className="text-xl">🎫</span>
            <h3 className="font-black uppercase">Buat Kode Promo</h3>
          </div>
          
          <form onSubmit={handleSaveVoucher} className="space-y-4">
            
            <div className="space-y-1">
              <label className="font-black text-xs uppercase">Kode Promo</label>
              <input required type="text" maxLength={15} value={form.code} onChange={(e)=>setForm({...form, code: e.target.value.toUpperCase()})} placeholder="Cth: GAJIAN20" className="w-full p-3 border-4 border-black bg-gray-50 font-black text-xl uppercase outline-none focus:bg-yellow-100 placeholder:opacity-50 tracking-widest" />
            </div>
            
            <div className="space-y-1">
              <label className="font-black text-xs uppercase">Jenis Diskon</label>
              <select value={form.type} onChange={(e)=>setForm({...form, type: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold outline-none cursor-pointer">
                <option value="PERCENTAGE">📉 Diskon Persen (%)</option>
                <option value="FIXED">💵 Potongan Harga (Rp)</option>
                <option value="FREE_ITEM">🎁 Gratis Produk Pilihan</option>
                <option value="BUY_X_GET_Y">🛒 Belanja X Gratis Y (Buy 1 Get 1, dll)</option>
              </select>
            </div>

            {/* DINAMIS BERDASARKAN JENIS VOUCHER */}
            {form.type === "PERCENTAGE" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-black text-xs uppercase">Diskon (%)</label>
                  <input required type="number" min="1" max="100" value={form.discount_value} onChange={(e)=>setForm({...form, discount_value: e.target.value})} placeholder="20" className="w-full p-3 border-4 border-black bg-gray-50 font-bold outline-none focus:bg-yellow-100" />
                </div>
                <div className="space-y-1">
                  <label className="font-black text-xs uppercase line-clamp-1">Maks. Potongan (Rp)</label>
                  <input type="number" min="0" value={form.max_discount} onChange={(e)=>setForm({...form, max_discount: e.target.value})} placeholder="Kosongi = Unlimited" className="w-full p-3 border-4 border-black bg-gray-50 font-bold outline-none focus:bg-yellow-100 text-xs" />
                </div>
              </div>
            )}

            {form.type === "FIXED" && (
              <div className="space-y-1">
                <label className="font-black text-xs uppercase">Nominal Potongan (Rp)</label>
                <input required type="number" min="1" value={form.discount_value} onChange={(e)=>setForm({...form, discount_value: e.target.value})} placeholder="50000" className="w-full p-3 border-4 border-black bg-gray-50 font-bold outline-none focus:bg-yellow-100" />
              </div>
            )}

            {form.type === "FREE_ITEM" && (
              <div className="space-y-1">
                <label className="font-black text-xs uppercase">SKU Produk Gratis</label>
                <input required type="text" value={form.free_product_sku} onChange={(e)=>setForm({...form, free_product_sku: e.target.value})} placeholder="Cth: SKU-MVL-001" className="w-full p-3 border-4 border-black bg-gray-50 font-bold outline-none focus:bg-pink-100 font-mono" />
                <p className="text-[10px] font-bold opacity-60">Pelanggan akan mendapat 1 pcs barang ini gratis.</p>
              </div>
            )}

            {form.type === "BUY_X_GET_Y" && (
                <div className="space-y-4 border-l-4 border-black pl-3 bg-gray-50 p-3">
                    <p className="text-xs font-black uppercase text-indigo-600">⚙️ Pengaturan Aturan Promo:</p>
                    <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="font-black text-xs uppercase">Total Beli Barang (X)</label>
                        <input required type="number" min="2" value={form.min_qty} onChange={(e)=>setForm({...form, min_qty: e.target.value})} placeholder="Misal: 3 (Untuk Buy 2 Get 1)" className="w-full p-2 border-2 border-black bg-white font-bold outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="font-black text-xs uppercase">Jumlah Gratis (Y)</label>
                        <input required type="number" min="1" value={form.free_qty || ""} onChange={(e)=>setForm({...form, free_qty: e.target.value})} placeholder="Misal: 1" className="w-full p-2 border-2 border-black bg-white font-bold outline-none" />
                    </div>
                    </div>
                    <p className="text-[10px] font-bold text-gray-500">
                    *Sistem otomatis mendeteksi {form.free_qty || 1} produk dengan harga paling murah di keranjang untuk digratiskan.
                    </p>
                </div>
                )}

            <div className="space-y-1 border-t-4 border-dashed border-gray-300 pt-4 mt-4">
              <label className="font-black text-xs uppercase">Syarat Min. Belanja (Rp)</label>
              <input type="number" min="0" value={form.min_purchase} onChange={(e)=>setForm({...form, min_purchase: e.target.value})} placeholder="Kosong = Tanpa Syarat" className="w-full p-3 border-4 border-black bg-gray-50 font-bold outline-none focus:bg-cyan-100" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t-4 border-dashed border-gray-300 pt-4 mt-4">
              <div className="flex flex-col justify-end space-y-1">
                <label className="font-black text-[10px] uppercase truncate">Harga Poin 🪙</label>
                <input type="number" min="0" value={form.points_required || ""} onChange={(e)=>setForm({...form, points_required: e.target.value})} placeholder="0 = Gratis" className="w-full h-11 px-3 border-4 border-black bg-gray-50 font-bold outline-none focus:bg-yellow-200" />
              </div>
              <div className="flex flex-col justify-end space-y-1">
                <label className="font-black text-[10px] uppercase truncate">Kuota</label>
                <input type="number" min="0" value={form.quota || ""} onChange={(e)=>setForm({...form, quota: e.target.value})} placeholder="0 = Unltd" className="w-full h-11 px-3 border-4 border-black bg-gray-50 font-bold outline-none focus:bg-cyan-100" />
              </div>
              <div className="flex flex-col justify-end space-y-1">
                <label className="font-black text-[10px] uppercase truncate">Kadaluarsa</label>
                <input type="date" value={form.valid_until || ""} onChange={(e)=>setForm({...form, valid_until: e.target.value})} className="w-full h-11 px-2 border-4 border-black bg-gray-50 font-bold outline-none focus:bg-cyan-100 text-[11px]" />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-4 mt-4 font-black uppercase text-white bg-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
              {isSubmitting ? "Menerbitkan..." : "🚀 Terbitkan Voucher"}
            </button>
          </form>
        </div>

        {/* TABEL DAFTAR VOUCHER */}
        <div className="lg:col-span-2">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-20">
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-black text-white uppercase text-xs font-black">
                    <th className="p-4 border-r border-gray-700">Kode & Tipe</th>
                    <th className="p-4 border-r border-gray-700">Aturan Promo</th>
                    <th className="p-4 border-r border-gray-700 text-center">Status / Kuota</th>
                    <th className="p-4 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center font-black uppercase opacity-50">Belum ada promo yang berjalan</td></tr>
                  ) : (
                    vouchers.map(v => {
                      const isExpired = v.valid_until && new Date(v.valid_until) < new Date();
                      const isFullyClaimed = v.quota > 0 && v.used_count >= v.quota;
                      const isUsable = v.is_active && !isExpired && !isFullyClaimed;

                      return (
                        <tr key={v.id} className={`border-b-4 border-black font-bold text-sm transition-colors ${!v.is_active ? 'bg-gray-100 opacity-60' : 'hover:bg-yellow-50'}`}>
                          
                          {/* KOLOM 1: KODE & TIPE (Dirapikan susunannya) */}
                          <td className="p-4 border-r-4 border-black align-middle">
                            <div className="inline-block bg-yellow-200 border-2 border-black px-3 py-1 mb-2 font-black text-lg uppercase tracking-widest">
                              {v.code}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] uppercase font-black px-2 py-0.5 border border-black bg-white">
                                {v.type === 'PERCENTAGE' ? '📉 PERSEN' : v.type === 'FIXED' ? '💵 NOMINAL' : v.type === 'BUY_X_GET_Y' ? '🛒 BUY X GET Y' : '🎁 FREE ITEM'}
                              </span>
                              {v.points_required > 0 && (
                                <span className="bg-yellow-300 border border-black px-2 py-0.5 text-[10px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                  🪙 BUTUH {v.points_required} POIN
                                </span>
                              )}
                            </div>
                          </td>

                          {/* KOLOM 2: ATURAN PROMO (Dibikin flex-col rata tengah) */}
                          <td className="p-4 border-r-4 border-black align-middle">
                            <div className="flex flex-col gap-1 text-xs justify-center">
                              {v.type === 'PERCENTAGE' && <p>Diskon: <b className="text-pink-600 text-sm">{v.discount_value}%</b> {v.max_discount > 0 && `(Maks. ${formatRupiah(v.max_discount)})`}</p>}
                              {v.type === 'FIXED' && <p>Potongan: <b className="text-pink-600 text-sm">{formatRupiah(v.discount_value)}</b></p>}
                              {v.type === 'FREE_ITEM' && <p>Gratis: <b className="text-pink-600 font-mono bg-pink-100 px-1 border border-black">{v.details?.free_product_sku}</b></p>}
                              {v.type === 'BUY_X_GET_Y' && <p>Beli <b className="text-pink-600">{v.details?.min_qty_required}</b> Gratis <b className="text-pink-600">{v.details?.free_qty_given}</b></p>}
                              
                              <p className="text-[10px] opacity-60 font-bold mt-1">
                                Min. Belanja: {v.min_purchase > 0 ? formatRupiah(v.min_purchase) : 'Tanpa Syarat'}
                              </p>
                            </div>
                          </td>

                          {/* KOLOM 3: STATUS / KUOTA */}
                          <td className="p-4 border-r-4 border-black align-middle text-center">
                            <div className="flex flex-col items-center justify-center gap-1">
                              {isUsable ? (
                                <span className="bg-green-300 border-2 border-black px-2 py-1 text-[10px] font-black uppercase inline-block animate-pulse">ACTIVE</span>
                              ) : (
                                <span className="bg-rose-300 border-2 border-black px-2 py-1 text-[10px] font-black uppercase inline-block">
                                  {!v.is_active ? "DISABLED" : isExpired ? "EXPIRED" : "SOLD OUT"}
                                </span>
                              )}
                              <p className="text-xs">Terpakai: <b className="text-lg">{v.used_count}</b>{v.quota > 0 ? `/${v.quota}` : ' (Unltd)'}</p>
                            </div>
                          </td>

                          {/* KOLOM 4: ACTIONS */}
                          <td className="p-4 align-middle text-center w-28">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <button onClick={() => toggleVoucherStatus(v.id, v.is_active)} className="w-full bg-white border-2 border-black px-2 py-1.5 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform">
                                {v.is_active ? 'Matikan' : 'Nyalakan'}
                              </button>
                              <button onClick={() => handleDelete(v.id, v.code)} className="w-full bg-rose-200 border-2 border-black px-2 py-1.5 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:bg-rose-400 hover:text-white transition-all">
                                Hapus
                              </button>
                            </div>
                          </td>
                          
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
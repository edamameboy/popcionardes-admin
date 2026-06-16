import React, { useState, useEffect, useRef } from "react";

interface OpnameTabProps {
  products: any[];
  supabase: any;
  fetchAdminData: () => void;
}

export default function OpnameTab({ products, supabase, fetchAdminData }: OpnameTabProps) {
  const [opnameData, setOpnameData] = useState<any[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [scanMessage, setScanMessage] = useState<{ text: string, type: "success" | "error" | "" }>({ text: "Siap memindai barcode...", type: "" });
  const [isSyncing, setIsSyncing] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Saat pertama kali buka tab, salin data produk & jadikan "physical_stock" sama dengan stok sistem
  useEffect(() => {
    setOpnameData(products.map(p => ({
      ...p,
      physical_stock: p.stock
    })));
    // Fokus otomatis ke input scanner
    scanInputRef.current?.focus();
  }, [products]);

  // FUNGSI BARCODE SCANNER: Deteksi saat tombol "Enter" ditekan
  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = scanInput.trim().toLowerCase();
      if (!query) return;

      const index = opnameData.findIndex(p => 
        (p.barcode && p.barcode.toLowerCase() === query) || 
        (p.sku && p.sku.toLowerCase() === query)
      );

      if (index !== -1) {
        // Jika ketemu, tambah fisik stok +1
        const newData = [...opnameData];
        newData[index].physical_stock = Number(newData[index].physical_stock) + 1;
        setOpnameData(newData);
        setScanMessage({ text: `✅ Berhasil (+1): ${newData[index].name}`, type: "success" });
      } else {
        setScanMessage({ text: `❌ Gagal: Barcode/SKU "${query}" tidak terdaftar!`, type: "error" });
      }
      setScanInput(""); // Kosongkan input untuk scan berikutnya
    }
  };

  // FUNGSI MANUAL EDIT (Jika scanner rusak)
  const handleManualEdit = (id: string, newStock: number) => {
    setOpnameData(prev => prev.map(p => p.id === id ? { ...p, physical_stock: newStock } : p));
  };

  // FUNGSI BLIND COUNT (Ubah semua fisik jadi 0 agar dihitung ulang dari awal)
  const handleResetToZero = () => {
    if(!confirm("Yakin ingin mereset semua hitungan fisik ke angka 0?")) return;
    setOpnameData(prev => prev.map(p => ({ ...p, physical_stock: 0 })));
    setScanMessage({ text: "🔄 Semua stok fisik telah direset ke 0. Mulai memindai!", type: "success" });
    scanInputRef.current?.focus();
  };

  // FUNGSI SINKRONISASI KE SUPABASE
  const handleSync = async () => {
    const changedItems = opnameData.filter(p => p.physical_stock !== p.stock);
    
    if (changedItems.length === 0) {
      alert("🎉 Sistem dan Fisik sudah 100% klop! Tidak ada yang perlu disinkronisasi.");
      return;
    }

    if (!confirm(`🚨 Terdapat selisih pada ${changedItems.length} produk. Yakin ingin menimpa stok sistem dengan stok fisik ini?`)) return;

    setIsSyncing(true);
    try {
      const updatePromises = changedItems.map(async (item) => {
        const { data, error } = await supabase
          .from("products")
          .update({
            stock: item.physical_stock,
            // Hapus atau comment baris 'quantity' jika kolom ini tidak ada di database Anda
            // quantity: item.physical_stock 
          })
          .eq("id", item.id)
          .select(); // <--- TRIK DEWA: Memaksa DB mengembalikan data yang sukses diubah

        // Jika ada error sintaks/kolom
        if (error) throw error;
        
        // Jika data kosong, berarti Update diblokir oleh Supabase (Penyusup / RLS Policy)
        if (!data || data.length === 0) {
           throw new Error(`Akses ditolak saat mengubah ${item.name}. Cek RLS Policy di Supabase!`);
        }
      });

      await Promise.all(updatePromises);
      
      alert(`✅ Sinkronisasi Selesai! ${changedItems.length} produk telah diperbarui.`);
      fetchAdminData(); // Tarik data terbaru dari DB
    } catch (error: any) {
      alert(`❌ Gagal Sinkronisasi: ${error.message}`);
      console.error("DETAIL ERROR:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Kalkulasi Ringkasan
  const totalSystem = opnameData.reduce((sum, p) => sum + p.stock, 0);
  const totalPhysical = opnameData.reduce((sum, p) => sum + p.physical_stock, 0);
  const discrepanciesCount = opnameData.filter(p => p.physical_stock !== p.stock).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER OPNAME */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Modul Stock Opname</h2>
          <p className="font-bold text-sm opacity-60">Audit gudang Anda dengan Barcode Scanner.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleResetToZero} className="bg-white border-4 border-black px-6 py-3 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
            🔄 Blind Count (Reset ke 0)
          </button>
        </div>
      </div>

      {/* INPUT SCANNER SUPER BESAR */}
      <div className="bg-yellow-300 border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row gap-6 items-center">
        <div className="w-16 h-16 bg-white border-4 border-black flex items-center justify-center text-3xl shrink-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          📟
        </div>
        <div className="flex-1 w-full space-y-2">
          <label className="font-black uppercase text-sm">Arahkan Scanner Ke Sini:</label>
          <input 
            ref={scanInputRef}
            type="text" 
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={handleScan}
            placeholder="Scan Barcode atau ketik SKU lalu Enter..." 
            className="w-full bg-white border-4 border-black px-4 py-4 font-mono font-black text-xl uppercase outline-none focus:bg-pink-100 transition-colors placeholder:text-gray-400 placeholder:text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
          <p className={`font-bold text-xs uppercase ${scanMessage.type === "success" ? "text-green-700" : scanMessage.type === "error" ? "text-red-600 animate-bounce" : ""}`}>
            {scanMessage.text}
          </p>
        </div>
      </div>

      {/* RINGKASAN AUDIT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><p className="text-xs font-black uppercase opacity-60">Total Stok Sistem</p><p className="text-3xl font-black">{totalSystem}</p></div>
        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><p className="text-xs font-black uppercase opacity-60">Total Fisik Dihitung</p><p className="text-3xl font-black">{totalPhysical}</p></div>
        <div className={`border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${discrepanciesCount > 0 ? 'bg-red-200' : 'bg-green-200'}`}>
          <p className="text-xs font-black uppercase opacity-60">Barang Berselisih</p>
          <p className="text-3xl font-black">{discrepanciesCount} Item</p>
        </div>
      </div>

      {/* TABEL KOMPARASI OPNAME */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-32">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-black text-white uppercase text-xs font-black">
                <th className="p-4 border-r border-gray-700 w-16 text-center">Pic</th>
                <th className="p-4 border-r border-gray-700">Product Info</th>
                <th className="p-4 border-r border-gray-700 text-center w-32">Sistem (DB)</th>
                <th className="p-4 border-r border-gray-700 text-center w-40 bg-pink-600">Fisik (Opname)</th>
                <th className="p-4 text-center w-32">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {opnameData.map((prod) => {
                const diff = prod.physical_stock - prod.stock;
                const isDiscrepancy = diff !== 0;

                return (
                  <tr key={prod.id} className={`border-b-4 border-black font-bold text-sm ${isDiscrepancy ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                    <td className={`p-2 border-r-4 border-black ${prod.bg_color || 'bg-white'}`}>
                      <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center mx-auto"><img src={prod.image_url} alt={prod.name} className="max-w-full max-h-full object-contain mix-blend-darken" /></div>
                    </td>
                    <td className="p-4 border-r-4 border-black">
                      <p className="font-black text-sm uppercase">{prod.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] bg-gray-200 border border-black px-1 font-mono">SKU: {prod.sku || "-"}</span>
                        {prod.barcode && <span className="text-[10px] bg-blue-100 border border-black px-1 font-mono">BC: {prod.barcode}</span>}
                      </div>
                    </td>
                    <td className="p-4 border-r-4 border-black text-center font-black text-lg opacity-60">
                      {prod.stock}
                    </td>
                    <td className="p-2 border-r-4 border-black focus-within:bg-pink-100 transition-colors">
                      {/* INPUT FISIK: BISA DI KETIK MANUAL JUGA */}
                      <input 
                        type="number" 
                        min="0"
                        value={prod.physical_stock} 
                        onChange={(e) => handleManualEdit(prod.id, Number(e.target.value))} 
                        className="w-full bg-white border-2 border-black focus:border-pink-500 outline-none font-black px-2 py-2 text-center text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                      />
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 font-black text-xs uppercase border-2 border-black
                        ${diff > 0 ? 'bg-blue-300' : diff < 0 ? 'bg-red-400 text-white animate-pulse' : 'bg-green-300'}
                      `}>
                        {diff > 0 ? `+${diff} (Lebih)` : diff < 0 ? `${diff} (Hilang)` : '0 (Pas)'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FLOATING ACTION BAR: TOMBOL SINKRONISASI */}
      {discrepanciesCount > 0 && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 ml-32 z-50 animate-in slide-in-from-bottom-10 w-max">
          <div className="bg-indigo-300 border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center gap-6">
            <div className="font-black uppercase flex items-center gap-3 text-sm">
              <span className="text-xl">⚠️</span> Ada {discrepanciesCount} Barang Berselisih!
            </div>
            <button onClick={handleSync} disabled={isSyncing} className="bg-black text-white border-4 border-black px-8 py-3 font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-pink-500 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50">
              {isSyncing ? "Menyinkronkan..." : "⚡ Sinkronisasi ke DB"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
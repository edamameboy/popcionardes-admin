import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";

interface ProductsTabProps {
  products: any[];
  supabase: any;
  fetchAdminData: () => void;
  formatRupiah: (angka: number) => string;
  showToast: (message: string, type: "success" | "error" | "warning") => void;
}

export default function ProductsTab({ products, supabase, fetchAdminData, formatRupiah, showToast }: ProductsTabProps) {
  const [productMode, setProductMode] = useState("list");
  const [productViewMode, setProductViewMode] = useState("table"); // Default ke Table agar langsung lihat mode Excel
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  // STATE BARU: TRACKING PERUBAHAN SPREADSHEET
  const [editedProducts, setEditedProducts] = useState<{ [key: string]: any }>({});
  const [bulkAction, setBulkAction] = useState("");
  
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const initialProductForm = { name: "", description: "", price: "", stock: "", bg_color: "bg-white", image_url: "", category: "Lainnya", sku: "", barcode: "" };
  const [productForm, setProductForm] = useState<any>(initialProductForm);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // FUNGSI SPREADSHEET (EDIT INLINE & BULK)
  // ==========================================
  
  // 1. Fungsi saat sel di tabel diketik
  const handleCellChange = (id: string, field: string, value: any) => {
    setEditedProducts(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  // 2. Fungsi Terapkan Aksi Massal (Ubah Kategori/Warna sekaligus)
  const handleApplyBulkAction = () => {
    if (!bulkAction || selectedProducts.length === 0) return;
    
    const newEdits = { ...editedProducts };
    selectedProducts.forEach(id => {
      if (!newEdits[id]) newEdits[id] = {};
      
      if (bulkAction.startsWith("cat_")) newEdits[id].category = bulkAction.replace("cat_", "");
      if (bulkAction.startsWith("bg_")) newEdits[id].bg_color = bulkAction.replace("bg_", "");
    });
    
    setEditedProducts(newEdits);
    setBulkAction(""); // Reset dropdown
    showToast(`Menerapkan perubahan ke ${selectedProducts.length} produk. Jangan lupa klik Simpan Semua!`, "warning");
  };

  // 3. Fungsi Simpan Semua Perubahan ke Database
  const handleSaveBulkEdits = async () => {
    setIsSubmittingProduct(true);
    try {
      const updates = Object.keys(editedProducts).map(id => ({
        id,
        ...editedProducts[id]
      }));

      await Promise.all(
        updates.map(update => supabase.from("products").update(update).eq("id", update.id))
      );

      // Ganti alert menjadi showToast
      showToast(`🎉 Boom! ${updates.length} produk berhasil di-update massal!`, "success");
      
      setEditedProducts({});
      setSelectedProducts([]);
      
      // Berikan jeda 300 milidetik agar Supabase selesai bernafas, baru tarik data terbaru
      setTimeout(() => {
        fetchAdminData();
      }, 300);
      
    } catch (error: any) {
      showToast(`❌ Gagal menyimpan massal: ${error.message}`, "error");
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleCancelEdits = () => {
    if(confirm("Yakin mau membatalkan semua ketikan Anda?")) {
      setEditedProducts({});
    }
  };

  // ==========================================
  // FUNGSI CRUD STANDAR & EXCEL IMPORT
  // ==========================================
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
        name: productForm.name, description: productForm.description, price: Number(productForm.price),
        stock: Number(productForm.stock), quantity: Number(productForm.stock), bg_color: productForm.bg_color, category: productForm.category,
        sku: productForm.sku || `SKU-${Date.now().toString().substring(5)}`, barcode: productForm.barcode || "", image_url: finalImageUrl || "https://api.dicebear.com/7.x/shapes/svg?seed=box"
      };

      if (editingProductId) { await supabase.from("products").update(payload).eq("id", editingProductId); } 
      else { await supabase.from("products").insert(payload); }

      setProductForm(initialProductForm); setUploadFile(null); setEditingProductId(null); setProductMode("list");
      fetchAdminData();
    } catch (error: any) { showToast(`Error: ${error.message}`, "error"); } finally { setIsSubmittingProduct(false); }
  };

  const handleEditProduct = (prod: any) => {
    setEditingProductId(prod.id);
    setProductForm({ 
      name: prod.name, description: prod.description, price: prod.price, stock: prod.stock, 
      bg_color: prod.bg_color || "bg-white", category: prod.category || "Lainnya", image_url: prod.image_url,
      sku: prod.sku || "", barcode: prod.barcode || ""
    });
    setUploadFile(null);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Hapus mainan "${name}"?`)) return;
    await supabase.from("products").delete().eq("id", id);
    fetchAdminData();
  };

  const handleBulkDeleteProducts = async () => {
    if (!confirm(`Hapus massal ${selectedProducts.length} produk secara permanen?`)) return;
    await supabase.from("products").delete().in("id", selectedProducts);
    setSelectedProducts([]);
    fetchAdminData();
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
  };
  const toggleAllProducts = () => {
    if (selectedProducts.length === products.length) setSelectedProducts([]);
    else setSelectedProducts(products.map(p => p.id));
  };

  const handleDownloadTemplateXLSX = () => {
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([["name", "category", "sku", "barcode", "price", "stock", "description", "bg_color", "image_url"], ["Contoh: Funko Pop Spider-Man", "Marvel", "SKU-MVL-001", "8991234567890", 250000, 50, "MISB Kondisi mulus", "bg-white", ""]]);
    XLSX.utils.book_append_sheet(wb, ws1, "Template Produk");
    const ws2 = XLSX.utils.aoa_to_sheet([["Pilihan Kategori Valid", "", "Pilihan Warna Valid"], ["Anime", "", "bg-white"], ["Marvel", "", "bg-yellow-200"], ["DC Comics", "", "bg-pink-200"], ["Movies", "", "bg-cyan-200"], ["Lainnya", "", ""]]);
    XLSX.utils.book_append_sheet(wb, ws2, "Daftar Panduan");
    XLSX.writeFile(wb, "Template_Import_Popcionardes.xlsx");
  };

  const handleImportXLSX = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
        const dataToImport = rawData.filter(item => !String(item.name).includes("Contoh:"));
        const formattedData = dataToImport.map(item => ({
          name: item.name ? String(item.name) : "Produk Tanpa Name", category: item.category ? String(item.category) : "Lainnya",
          sku: item.sku ? String(item.sku) : `SKU-${Date.now().toString().substring(5)}`, barcode: item.barcode ? String(item.barcode) : "",
          price: Number(item.price) || 0, stock: Number(item.stock) || 0, quantity: Number(item.stock) || 0,
          description: item.description ? String(item.description) : "-", bg_color: item.bg_color ? String(item.bg_color) : "bg-white",
          image_url: item.image_url ? String(item.image_url) : "https://api.dicebear.com/7.x/shapes/svg?seed=box"
        }));
        if (formattedData.length === 0) throw new Error("Tidak ada data produk yang valid untuk diimpor.");
        const { error } = await supabase.from("products").insert(formattedData);
        if (error) throw error;
        showToast(`🎉 Sukses! ${formattedData.length} Produk Excel Berhasil Diimpor!`, "success");
        fetchAdminData();
      } catch (error: any) { showToast(`Gagal Import: ${error.message}`, "error"); } finally {
        setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Products Inventory</h2>
          <p className="font-bold text-sm opacity-60">Kelola katalog menggunakan mode Excel Spreadsheet.</p>
        </div>
        
        {productMode === "list" ? (
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full xl:w-auto">
            <div className="flex bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <button onClick={() => setProductViewMode("grid")} className={`px-4 py-2 font-black uppercase text-sm border-r-4 border-black ${productViewMode === "grid" ? "bg-black text-white" : ""}`}>🔲 Grid</button>
              <button onClick={() => setProductViewMode("table")} className={`px-4 py-2 font-black uppercase text-sm ${productViewMode === "table" ? "bg-black text-white" : ""}`}>📄 Excel Mode</button>
            </div>
            
            <button onClick={handleDownloadTemplateXLSX} className="bg-cyan-200 border-4 border-black px-4 py-2 font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">📄 Template .xlsx</button>
            <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleImportXLSX} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="bg-green-200 border-4 border-black px-4 py-2 font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50">{isImporting ? "⏳ Membaca..." : "📥 Import Excel"}</button>
            <button onClick={() => { setProductForm(initialProductForm); setEditingProductId(null); setProductMode("form"); }} className="bg-indigo-200 border-4 border-black px-6 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">+ Add New</button>
          </div>
        ) : (
          <button onClick={() => setProductMode("list")} className="bg-rose-200 border-4 border-black px-6 py-3 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">✖ Cancel</button>
        )}
      </div>

      {/* FORM MODE */}
      {productMode === "form" && (
        <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-5xl">
          <form onSubmit={handleSaveProduct} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-1"><label className="font-bold text-sm uppercase">Nama Mainan</label><input required type="text" value={productForm.name} onChange={(e)=>setProductForm({...productForm, name: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="font-bold text-sm uppercase">SKU</label><input type="text" value={productForm.sku} onChange={(e)=>setProductForm({...productForm, sku: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none font-mono" /></div>
                <div className="space-y-1"><label className="font-bold text-sm uppercase">Barcode</label><input type="text" value={productForm.barcode} onChange={(e)=>setProductForm({...productForm, barcode: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none font-mono" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="font-bold text-sm uppercase">Harga</label><input required type="number" min="0" value={productForm.price} onChange={(e)=>setProductForm({...productForm, price: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none" /></div>
                <div className="space-y-1"><label className="font-bold text-sm uppercase">Stok</label><input required type="number" min="0" value={productForm.stock} onChange={(e)=>setProductForm({...productForm, stock: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none" /></div>
              </div>
              <div className="space-y-1"><label className="font-bold text-sm uppercase">Deskripsi</label><textarea required rows={3} value={productForm.description} onChange={(e)=>setProductForm({...productForm, description: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none resize-none" /></div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1"><label className="font-bold text-sm uppercase">Kategori</label><select value={productForm.category} onChange={(e)=>setProductForm({...productForm, category: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold outline-none"><option value="Anime">Anime</option><option value="Marvel">Marvel</option><option value="DC">DC Comics</option><option value="Movies">Movies & TV</option><option value="Lainnya">Lainnya</option></select></div>
              <div className="space-y-1"><label className="font-bold text-sm uppercase">Warna Etalase</label><select value={productForm.bg_color} onChange={(e)=>setProductForm({...productForm, bg_color: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold outline-none"><option value="bg-white">Putih Bersih</option><option value="bg-yellow-200">Kuning Lembut</option><option value="bg-pink-200">Pink Lembut</option><option value="bg-cyan-200">Cyan Lembut</option></select></div>
              <div className="space-y-1"><label className="font-bold text-sm uppercase">Foto Produk</label><input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="w-full p-2 border-4 border-black bg-gray-50 font-bold" /></div>
              <button type="submit" disabled={isSubmittingProduct} className="w-full py-4 text-xl font-black uppercase border-4 border-black bg-indigo-200 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all mt-4">{isSubmittingProduct ? "Menyimpan..." : "Simpan Produk 💾"}</button>
            </div>
          </form>
        </div>
      )}

      {/* GRID VIEW */}
      {productMode === "list" && productViewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-40">
          {products.map(prod => (
            <div key={prod.id} className="bg-white border-4 border-black flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group relative">
              <div className="absolute top-2 left-2 z-20"><input type="checkbox" checked={selectedProducts.includes(prod.id)} onChange={() => toggleProductSelection(prod.id)} className="w-6 h-6 border-4 border-black cursor-pointer accent-indigo-300" /></div>
              <div className="absolute top-2 right-2 z-10"><span className={`px-2 py-1 font-black text-[10px] uppercase border-2 border-black ${prod.stock > 10 ? 'bg-green-200' : prod.stock > 0 ? 'bg-yellow-200' : 'bg-rose-200'}`}>{prod.stock > 10 ? 'IN STOCK' : prod.stock > 0 ? 'LOW STOCK' : 'OUT OF STOCK'}</span></div>
              <div className={`h-48 border-b-4 border-black flex items-center justify-center p-4 relative ${prod.bg_color || 'bg-gray-100'}`}><img src={prod.image_url} alt={prod.name} className="w-32 h-32 object-contain drop-shadow-xl mix-blend-darken group-hover:scale-110 transition-transform duration-300" /></div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start gap-2 mb-2"><h3 className="font-black text-lg uppercase leading-tight line-clamp-2">{prod.name}</h3><p className="font-black text-xl shrink-0">{formatRupiah(prod.price)}</p></div>
                <p className="text-[10px] font-bold text-gray-500 font-mono uppercase mb-4 mt-auto">SKU: {prod.sku || "Belum Set"} <br/>{prod.barcode && `BC: ${prod.barcode}`}</p>
                <div className="flex gap-2 mt-auto border-t-2 border-dashed border-gray-300 pt-4">
                  <button onClick={() => { handleEditProduct(prod); setProductMode("form"); }} className="flex-1 bg-yellow-200 border-2 border-black py-2 font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">✏️ Edit</button>
                  <button onClick={() => handleDeleteProduct(prod.id, prod.name)} className="w-12 bg-rose-200 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SPREADSHEET / TABLE VIEW */}
      {productMode === "list" && productViewMode === "table" && (
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-40">
          <div className="bg-yellow-100 border-b-4 border-black p-3 text-xs font-bold flex gap-2 items-center">
            <span>💡 TIPS:</span><span>Klik pada Nama, Harga, Stok, atau Kategori di tabel bawah untuk langsung mengetik (Excel Mode).</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-black text-white uppercase text-xs font-black">
                  <th className="p-4 w-12 text-center border-r border-gray-700"><input type="checkbox" checked={selectedProducts.length === products.length && products.length > 0} onChange={toggleAllProducts} className="w-4 h-4 cursor-pointer accent-indigo-300" /></th>
                  <th className="p-4 border-r border-gray-700 w-16 text-center">Pic</th>
                  <th className="p-4 border-r border-gray-700">Product Name & SKU</th>
                  <th className="p-4 border-r border-gray-700 w-40">Category</th>
                  <th className="p-4 border-r border-gray-700 w-32">Price (Rp)</th>
                  <th className="p-4 border-r border-gray-700 w-24">Stock</th>
                </tr>
              </thead>
              <tbody>
                {products.map(prod => {
                  // Cek apakah ada data yang sedang diedit sementara di memori
                  const isEdited = !!editedProducts[prod.id];
                  const currentName = editedProducts[prod.id]?.name ?? prod.name;
                  const currentSku = editedProducts[prod.id]?.sku ?? prod.sku;
                  const currentCat = editedProducts[prod.id]?.category ?? prod.category;
                  const currentPrice = editedProducts[prod.id]?.price ?? prod.price;
                  const currentStock = editedProducts[prod.id]?.stock ?? prod.stock;
                  const currentBg = editedProducts[prod.id]?.bg_color ?? prod.bg_color;

                  return (
                    <tr key={prod.id} className={`border-b-4 border-black font-bold text-sm transition-colors ${isEdited ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                      <td className="p-4 border-r-4 border-black text-center"><input type="checkbox" checked={selectedProducts.includes(prod.id)} onChange={() => toggleProductSelection(prod.id)} className="w-5 h-5 border-2 border-black cursor-pointer accent-indigo-300" /></td>
                      <td className={`p-2 border-r-4 border-black ${currentBg || 'bg-white'}`}><div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center mx-auto"><img src={prod.image_url} alt={currentName} className="max-w-full max-h-full object-contain mix-blend-darken" /></div></td>
                      <td className="p-2 border-r-4 border-black focus-within:bg-yellow-200 transition-colors">
                        <input type="text" value={currentName} onChange={(e) => handleCellChange(prod.id, 'name', e.target.value)} className="w-full bg-transparent border-b-2 border-transparent focus:border-black outline-none font-black uppercase text-sm px-2 py-1" />
                        <input type="text" value={currentSku || ""} onChange={(e) => handleCellChange(prod.id, 'sku', e.target.value)} placeholder="Set SKU..." className="w-full bg-transparent border-none outline-none font-mono text-[10px] opacity-50 px-2 mt-1 focus:opacity-100" />
                      </td>
                      <td className="p-2 border-r-4 border-black focus-within:bg-yellow-200">
                        <select value={currentCat} onChange={(e) => handleCellChange(prod.id, 'category', e.target.value)} className="w-full bg-transparent outline-none cursor-pointer px-2 py-2 font-bold">
                          <option value="Anime">Anime</option><option value="Marvel">Marvel</option><option value="DC">DC Comics</option><option value="Movies">Movies & TV</option><option value="Lainnya">Lainnya</option>
                        </select>
                      </td>
                      <td className="p-2 border-r-4 border-black focus-within:bg-yellow-200">
                        <input type="number" value={currentPrice} onChange={(e) => handleCellChange(prod.id, 'price', Number(e.target.value))} className="w-full bg-transparent border-b-2 border-transparent focus:border-black outline-none font-black px-2 py-2" />
                      </td>
                      <td className="p-2 border-r-4 border-black focus-within:bg-yellow-200">
                        <input type="number" value={currentStock} onChange={(e) => handleCellChange(prod.id, 'stock', Number(e.target.value))} className="w-full bg-transparent border-b-2 border-transparent focus:border-black outline-none font-black px-2 py-2 text-center" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2 BUAH FLOATING ACTION BAR SUPER CANGGIH */}
      {/* ========================================== */}
      
      {/* FLOATING BAR 1: BULK ACTIONS (JIKA ADA PRODUK DI-CHECKLIST) */}
      {selectedProducts.length > 0 && productMode === "list" && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 ml-32 z-40 animate-in slide-in-from-bottom-10 w-max">
          <div className="bg-indigo-300 border-4 border-black p-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4">
            <div className="font-black uppercase flex items-center gap-2 text-sm"><span className="w-5 h-5 bg-white border-2 border-black flex items-center justify-center text-[10px]">✓</span>{selectedProducts.length} Terpilih</div>
            <div className="w-1 h-8 bg-black/20"></div>
            
            {/* OPSI EDIT MASSAL (Ubah Kategori/Warna ke state editedProducts) */}
            <div className="flex gap-2">
              <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="bg-white border-4 border-black px-3 py-1.5 font-bold text-xs outline-none cursor-pointer">
                <option value="">Aksi Massal...</option>
                <optgroup label="Ubah Kategori"><option value="cat_Anime">Semua ke Anime</option><option value="cat_Marvel">Semua ke Marvel</option><option value="cat_Movies">Semua ke Movies</option></optgroup>
                <optgroup label="Ubah Warna Latar"><option value="bg_bg-yellow-200">Latar Kuning</option><option value="bg_bg-cyan-200">Latar Cyan</option></optgroup>
              </select>
              <button onClick={handleApplyBulkAction} className="bg-black text-white border-4 border-black px-4 py-1.5 font-black text-xs uppercase hover:bg-gray-800 transition-colors">Terapkan ⚡</button>
            </div>
            
            <button onClick={handleBulkDeleteProducts} className="bg-rose-400 text-white border-4 border-black px-4 py-1.5 font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all">🗑️ Hapus</button>
            <button onClick={() => setSelectedProducts([])} className="font-black text-lg hover:scale-125 transition-transform ml-1">×</button>
          </div>
        </div>
      )}

      {/* FLOATING BAR 2: SAVE CHANGES (JIKA ADA PERUBAHAN SPREADSHEET YANG BELUM DISIMPAN) */}
      {Object.keys(editedProducts).length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 ml-32 z-50 animate-in slide-in-from-bottom-10 w-max">
          <div className="bg-yellow-300 border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center gap-6 border-dashed">
            <div className="font-black uppercase flex items-center gap-3 text-sm animate-pulse">
              ⚠️ Ada {Object.keys(editedProducts).length} Perubahan Belum Disimpan!
            </div>
            <div className="flex gap-3">
              <button onClick={handleCancelEdits} disabled={isSubmittingProduct} className="bg-white border-4 border-black px-6 py-2 font-black text-xs uppercase hover:bg-gray-100 transition-colors">
                Batal
              </button>
              <button onClick={handleSaveBulkEdits} disabled={isSubmittingProduct} className="bg-green-400 border-4 border-black px-8 py-2 font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                {isSubmittingProduct ? "Menyimpan..." : "💾 Simpan Semua"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
import React, { useState, useRef } from "react";
import * as XLSX from "xlsx"; // Import Library Excel Utama

interface ProductsTabProps {
  products: any[];
  supabase: any;
  fetchAdminData: () => void;
  formatRupiah: (angka: number) => string;
}

export default function ProductsTab({ products, supabase, fetchAdminData, formatRupiah }: ProductsTabProps) {
  const [productMode, setProductMode] = useState("list");
  const [productViewMode, setProductViewMode] = useState("grid");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const initialProductForm = { name: "", description: "", price: "", stock: "", bg_color: "bg-white", image_url: "", category: "Lainnya", sku: "", barcode: "" };
  const [productForm, setProductForm] = useState<any>(initialProductForm);
  
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  
  // STATE IMPORT EXCEL
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        sku: productForm.sku || `SKU-${Date.now().toString().substring(5)}`,
        barcode: productForm.barcode || "",
        image_url: finalImageUrl || "https://api.dicebear.com/7.x/shapes/svg?seed=box"
      };

      if (editingProductId) { await supabase.from("products").update(payload).eq("id", editingProductId); } 
      else { await supabase.from("products").insert(payload); }

      setProductForm(initialProductForm); setUploadFile(null); setEditingProductId(null); setProductMode("list");
      fetchAdminData();
    } catch (error: any) { alert(`Error: ${error.message}`); } finally { setIsSubmittingProduct(false); }
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
    if (!confirm(`Hapus massal ${selectedProducts.length} produk?`)) return;
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

  // ==========================================
  // FITUR: GENERATE & DOWNLOAD EXCEL (.XLSX) 2 SHEETS!
  // ==========================================
  const handleDownloadTemplateXLSX = () => {
    const wb = XLSX.utils.book_new(); // Membuat workbook baru

    // Sheet 1: Format Pengisian Data
    const sheet1Headers = [["name", "category", "sku", "barcode", "price", "stock", "description", "bg_color", "image_url"]];
    const sheet1Dummy = [
      ["Contoh: Funko Pop Spider-Man", "Marvel", "SKU-MVL-001", "8991234567890", 250000, 50, "MISB Kondisi mulus", "bg-white", ""]
    ];
    const ws1 = XLSX.utils.aoa_to_sheet([...sheet1Headers, ...sheet1Dummy]);
    XLSX.utils.book_append_sheet(wb, ws1, "Template Produk");

    // Sheet 2: Panduan Kategori & Kode Warna Valid
    const sheet2Data = [
      ["Pilihan Kategori Valid", "", "Pilihan Warna Etalase Valid"],
      ["Anime", "", "bg-white (Putih Bersih)"],
      ["Marvel", "", "bg-yellow-200 (Kuning Lembut)"],
      ["DC Comics", "", "bg-pink-200 (Pink Lembut)"],
      ["Movies", "", "bg-cyan-200 (Cyan Lembut)"],
      ["Lainnya", "", ""]
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    XLSX.utils.book_append_sheet(wb, ws2, "Daftar Panduan");

    // Cetak & Unduh File Excel .xlsx asli
    XLSX.writeFile(wb, "Template_Import_Popcionardes.xlsx");
  };

  // ==========================================
  // FITUR: BACA & IMPORT EXCEL (.XLSX) KE SUPABASE
  // ==========================================
  const handleImportXLSX = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        // Ambil Sheet Pertama ("Template Produk")
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Konversi Sheet Excel menjadi Array JSON objek
        const rawData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Filter/Buang baris pertama jika staf lupa menghapus baris "Contoh:"
        const dataToImport = rawData.filter(item => !String(item.name).includes("Contoh:"));

        const formattedData = dataToImport.map(item => ({
          name: item.name ? String(item.name) : "Produk Tanpa Name",
          category: item.category ? String(item.category) : "Lainnya",
          sku: item.sku ? String(item.sku) : `SKU-${Date.now().toString().substring(5)}-${Math.floor(Math.random() * 100)}`,
          barcode: item.barcode ? String(item.barcode) : "", // Dijamin terbaca teks string murni, anti format sains (E+11)
          price: Number(item.price) || 0,
          stock: Number(item.stock) || 0,
          quantity: Number(item.stock) || 0,
          description: item.description ? String(item.description) : "-",
          bg_color: item.bg_color ? String(item.bg_color) : "bg-white",
          image_url: item.image_url ? String(item.image_url) : "https://api.dicebear.com/7.x/shapes/svg?seed=box"
        }));

        if (formattedData.length === 0) throw new Error("Tidak ada data produk yang valid untuk diimpor.");

        // Bulk Insert Massal ke Supabase
        const { error } = await supabase.from("products").insert(formattedData);
        if (error) throw error;

        alert(`🎉 Sukses Besar! ${formattedData.length} Produk Excel Berhasil Dimasukkan ke Rak Gudang!`);
        fetchAdminData();
      } catch (error: any) {
        alert(`Gagal Import Excel: ${error.message}`);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Products Inventory</h2>
          <p className="font-bold text-sm opacity-60">Kelola katalog menggunakan file Excel asli (.xlsx).</p>
        </div>
        
        {productMode === "list" ? (
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full xl:w-auto">
            <div className="flex bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <button onClick={() => setProductViewMode("grid")} className={`px-4 py-2 font-black uppercase text-sm border-r-4 border-black ${productViewMode === "grid" ? "bg-black text-white" : ""}`}>🔲 Grid</button>
              <button onClick={() => setProductViewMode("table")} className={`px-4 py-2 font-black uppercase text-sm ${productViewMode === "table" ? "bg-black text-white" : ""}`}>📄 List</button>
            </div>
            
            {/* AMUNISI BUTTON EXCEL TERBARU */}
            <button onClick={handleDownloadTemplateXLSX} className="bg-cyan-200 border-4 border-black px-4 py-2 font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
              📄 Template Excel (.xlsx)
            </button>
            
            <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleImportXLSX} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="bg-green-200 border-4 border-black px-4 py-2 font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50">
              {isImporting ? "⏳ Membaca Excel..." : "📥 Import Excel"}
            </button>

            <button onClick={() => { setProductForm(initialProductForm); setEditingProductId(null); setProductMode("form"); }} className="bg-indigo-200 border-4 border-black px-6 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
              + Add New
            </button>
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
                <div className="space-y-1"><label className="font-bold text-sm uppercase">SKU</label><input type="text" value={productForm.sku} onChange={(e)=>setProductForm({...productForm, sku: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none font-mono" placeholder="SKU-..." /></div>
                <div className="space-y-1"><label className="font-bold text-sm uppercase">Barcode</label><input type="text" value={productForm.barcode} onChange={(e)=>setProductForm({...productForm, barcode: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none font-mono" placeholder="Scan Barcode..." /></div>
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
              <button type="submit" disabled={isSubmittingProduct} className="w-full py-4 text-xl font-black uppercase border-4 border-black bg-indigo-200 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all mt-4">{isSubmittingProduct ? "Menyimpan..." : "Simpan Produk 💾"}</button>
            </div>
          </form>
        </div>
      )}

      {/* GRID VIEW */}
      {productMode === "list" && productViewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
          {products.map(prod => (
            <div key={prod.id} className="bg-white border-4 border-black flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group relative">
              <div className="absolute top-2 left-2 z-20"><input type="checkbox" checked={selectedProducts.includes(prod.id)} onChange={() => toggleProductSelection(prod.id)} className="w-6 h-6 border-4 border-black cursor-pointer accent-indigo-300" /></div>
              <div className="absolute top-2 right-2 z-10"><span className={`px-2 py-1 font-black text-[10px] uppercase border-2 border-black ${prod.stock > 10 ? 'bg-green-200' : prod.stock > 0 ? 'bg-yellow-200' : 'bg-rose-200'}`}>{prod.stock > 10 ? 'IN STOCK' : prod.stock > 0 ? 'LOW STOCK' : 'OUT OF STOCK'}</span></div>
              <div className={`h-48 border-b-4 border-black flex items-center justify-center p-4 relative ${prod.bg_color || 'bg-gray-100'}`}><img src={prod.image_url} alt={prod.name} className="w-32 h-32 object-contain drop-shadow-xl mix-blend-darken group-hover:scale-110 transition-transform duration-300" /></div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start gap-2 mb-2"><h3 className="font-black text-lg uppercase leading-tight line-clamp-2">{prod.name}</h3><p className="font-black text-xl shrink-0">{formatRupiah(prod.price)}</p></div>
                <p className="text-[10px] font-bold text-gray-500 font-mono uppercase mb-4 mt-auto">
                  SKU: {prod.sku || "Belum Set"} <br/>
                  {prod.barcode && `BC: ${prod.barcode}`}
                </p>
                <div className="flex gap-2 mt-auto border-t-2 border-dashed border-gray-300 pt-4">
                  <button onClick={() => { handleEditProduct(prod); setProductMode("form"); }} className="flex-1 bg-yellow-200 border-2 border-black py-2 font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">✏️ Edit</button>
                  <button onClick={() => handleDeleteProduct(prod.id, prod.name)} className="w-12 bg-rose-200 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TABLE VIEW */}
      {productMode === "list" && productViewMode === "table" && (
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-24">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-black text-white uppercase text-xs font-black">
                  <th className="p-4 w-12 text-center border-r border-gray-700"><input type="checkbox" checked={selectedProducts.length === products.length && products.length > 0} onChange={toggleAllProducts} className="w-4 h-4 cursor-pointer accent-indigo-300" /></th>
                  <th className="p-4 border-r border-gray-700 w-20 text-center">Image</th>
                  <th className="p-4 border-r border-gray-700">Product Info</th>
                  <th className="p-4 border-r border-gray-700">Price</th>
                  <th className="p-4 border-r border-gray-700">Stock</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(prod => (
                  <tr key={prod.id} className="border-b-4 border-black hover:bg-yellow-50 font-bold text-sm transition-colors">
                    <td className="p-4 border-r-4 border-black text-center"><input type="checkbox" checked={selectedProducts.includes(prod.id)} onChange={() => toggleProductSelection(prod.id)} className="w-5 h-5 border-2 border-black cursor-pointer accent-indigo-300" /></td>
                    <td className={`p-2 border-r-4 border-black ${prod.bg_color || 'bg-white'}`}><div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center mx-auto"><img src={prod.image_url} alt={prod.name} className="max-w-full max-h-full object-contain mix-blend-darken" /></div></td>
                    <td className="p-4 border-r-4 border-black">
                      <p className="font-black text-sm uppercase">{prod.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] bg-gray-200 border border-black px-1 font-mono">SKU: {prod.sku || "Belum Set"}</span>
                        {prod.barcode && <span className="text-[10px] bg-blue-100 border border-black px-1 font-mono">BC: {prod.barcode}</span>}
                      </div>
                    </td>
                    <td className="p-4 border-r-4 border-black font-black">{formatRupiah(prod.price)}</td>
                    <td className="p-4 border-r-4 border-black text-center"><span className={`px-2 py-1 border-2 border-black text-[10px] uppercase ${prod.stock > 10 ? 'bg-green-200' : prod.stock > 0 ? 'bg-yellow-200' : 'bg-rose-200'}`}>{prod.stock} PCS</span></td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { handleEditProduct(prod); setProductMode("form"); }} className="bg-yellow-200 border-2 border-black px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Edit</button>
                        <button onClick={() => handleDeleteProduct(prod.id, prod.name)} className="bg-rose-200 border-2 border-black px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedProducts.length > 0 && productMode === "list" && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 ml-32 z-50 animate-in slide-in-from-bottom-10">
          <div className="bg-indigo-300 border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center gap-6">
            <div className="font-black uppercase flex items-center gap-3"><span className="w-6 h-6 bg-white border-2 border-black flex items-center justify-center text-xs">✓</span>{selectedProducts.length} Selected</div>
            <button onClick={handleBulkDeleteProducts} className="bg-rose-400 text-white border-4 border-black px-6 py-2 font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">🗑️ Hapus Massal</button>
            <button onClick={() => setSelectedProducts([])} className="font-black text-xl hover:scale-125 transition-transform ml-2 cursor-pointer">×</button>
          </div>
        </div>
      )}
    </div>
  );
}
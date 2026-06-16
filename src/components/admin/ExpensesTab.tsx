import React, { useState, useEffect } from "react";

interface ExpensesTabProps {
  supabase: any;
  formatRupiah: (angka: number) => string;
  showToast: (message: string, type: "success" | "error" | "warning") => void;
}

export default function ExpensesTab({ supabase, formatRupiah, showToast }: ExpensesTabProps) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Form
  const initialForm = { item_name: "", category: "Packaging", amount: "", notes: "" };
  const [form, setForm] = useState<any>(initialForm);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      console.error("Gagal memuat pengeluaran:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(false);
    try {
      const payload = {
        item_name: form.item_name,
        category: form.category,
        amount: Number(form.amount),
        notes: form.notes || "-"
      };

      const { error } = await supabase.from("expenses").insert(payload);
      if (error) throw error;

      // Ganti alert menjadi showToast
      showToast("💸 Pengeluaran berhasil dicatat ke Buku Kas!", "success");
      
      setForm(initialForm);
      fetchExpenses(); // Refresh tabel pengeluaran lokal
    } catch (error: any) {
      showToast(`❌ Gagal: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus catatan pengeluaran "${name}"?`)) return;
    try {
      await supabase.from("expenses").delete().eq("id", id);
      fetchExpenses();
    } catch (error: any) {
      alert("Gagal menghapus!");
    }
  };

  // Kalkulasi Total Pengeluaran Bulan Ini (Asumsi semua data yang di-fetch)
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const packagingTotal = expenses.filter(e => e.category === 'Packaging').reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Warehouse Expenses</h2>
          <p className="font-bold text-sm opacity-60">Buku Kas Operasional: Catat pembelian kardus, lakban, & bubble wrap.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORM TAMBAH PENGELUARAN */}
        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-max">
          <div className="bg-rose-300 border-b-4 border-black -mx-6 -mt-6 p-4 mb-6 flex items-center gap-2">
            <span className="text-xl">💸</span>
            <h3 className="font-black uppercase">Catat Pengeluaran Baru</h3>
          </div>
          
          <form onSubmit={handleSaveExpense} className="space-y-4">
            <div className="space-y-1">
              <label className="font-black text-xs uppercase">Beli Apa?</label>
              <input required type="text" value={form.item_name} onChange={(e)=>setForm({...form, item_name: e.target.value})} placeholder="Cth: Lakban Fragile 5 Roll" className="w-full p-3 border-4 border-black bg-gray-50 font-bold outline-none focus:bg-yellow-100" />
            </div>
            
            <div className="space-y-1">
              <label className="font-black text-xs uppercase">Kategori</label>
              <select value={form.category} onChange={(e)=>setForm({...form, category: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold outline-none">
                <option value="Packaging">📦 Packaging (Kardus, Lakban)</option>
                <option value="Gudang">🏢 Keperluan Gudang (Listrik, Rak)</option>
                <option value="Marketing">🚀 Marketing (Iklan, Banner)</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-black text-xs uppercase">Total Bayar (Rp)</label>
              <input required type="number" min="0" value={form.amount} onChange={(e)=>setForm({...form, amount: e.target.value})} placeholder="50000" className="w-full p-3 border-4 border-black bg-gray-50 font-black outline-none focus:bg-yellow-100 text-rose-600" />
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-4 mt-2 font-black uppercase text-white bg-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
              {isSubmitting ? "Mencatat..." : "➕ Simpan Pengeluaran"}
            </button>
          </form>
        </div>

        {/* TABEL HISTORI PENGELUARAN */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* RINGKASAN */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-rose-200 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-black text-xs uppercase opacity-60">Total Cost (Keseluruhan)</p>
              <p className="text-2xl font-black text-rose-800">{formatRupiah(totalExpenses)}</p>
            </div>
            <div className="bg-yellow-200 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-black text-xs uppercase opacity-60">Biaya Packaging</p>
              <p className="text-2xl font-black text-yellow-800">{formatRupiah(packagingTotal)}</p>
            </div>
          </div>

          {/* TABEL */}
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-20">
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-black text-white uppercase text-xs font-black">
                    <th className="p-4 border-r border-gray-700">Tanggal</th>
                    <th className="p-4 border-r border-gray-700">Nama Barang</th>
                    <th className="p-4 border-r border-gray-700 text-center">Kategori</th>
                    <th className="p-4 border-r border-gray-700 text-right">Biaya</th>
                    <th className="p-4 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center font-black uppercase opacity-50">Belum ada catatan pengeluaran</td></tr>
                  ) : (
                    expenses.map(e => (
                      <tr key={e.id} className="border-b-4 border-black font-bold text-sm hover:bg-gray-50">
                        <td className="p-4 border-r-4 border-black opacity-60">
                          {new Date(e.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4 border-r-4 border-black uppercase">{e.item_name}</td>
                        <td className="p-4 border-r-4 border-black text-center">
                          <span className="bg-gray-200 border border-black px-2 py-0.5 text-[10px] font-black uppercase">{e.category}</span>
                        </td>
                        <td className="p-4 border-r-4 border-black text-right font-black text-rose-600">
                          -{formatRupiah(e.amount)}
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleDelete(e.id, e.item_name)} className="bg-rose-200 border-2 border-black px-3 py-1 text-xs font-black uppercase hover:bg-rose-400 hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">🗑️</button>
                        </td>
                      </tr>
                    ))
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
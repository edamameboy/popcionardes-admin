"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from ".././utils/supabase/client";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      // 1. Proses Login Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error("Email atau password salah!");
      if (!data.user) throw new Error("Gagal masuk ke sistem.");

      // 2. PENJAGA PINTU UTAMA: Cek apakah user ini benar-benar Admin!
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role !== "admin") {
        // Jika bukan admin, paksa logout saat itu juga
        await supabase.auth.signOut();
        throw new Error("🚨 AKSES DITOLAK: Anda bukan Administrator!");
      }

      // 3. Lolos semua ujian, persilakan masuk ke Ruang Kendali
      router.push("/");
      
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 text-black selection:bg-pink-300 relative overflow-hidden">
      
      {/* Background Grid Pattern */}
      <style dangerouslySetInnerHTML={{__html: `
        .bg-grid { background-size: 30px 30px; background-image: linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px); }
      `}} />
      <div className="absolute inset-0 bg-grid pointer-events-none"></div>

      {/* Box Login Utama */}
      <div className="w-full max-w-md bg-white border-4 border-black p-8 md:p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative z-10 animate-in zoom-in-95 duration-500">
        
        {/* Header Label */}
        <div className="absolute -top-5 left-8 bg-yellow-300 border-4 border-black px-4 py-1 font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
          <span>🔒</span> RESTRICTED AREA
        </div>

        <div className="text-center mb-8 mt-4">
          <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">NEO_ADMIN</h1>
          <p className="font-bold text-xs uppercase opacity-60 font-mono tracking-widest">System Control v2.0</p>
        </div>

        {errorMsg && (
          <div className="bg-red-200 border-4 border-black p-3 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center animate-bounce">
            <p className="font-black text-xs uppercase text-red-800">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="font-black text-sm uppercase">Admin Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border-4 border-black p-3 font-bold focus:bg-cyan-100 outline-none transition-colors"
              placeholder="admin@popcionardes.com"
            />
          </div>

          <div className="space-y-2">
            <label className="font-black text-sm uppercase">Passkey</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border-4 border-black p-3 font-bold focus:bg-pink-100 outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 mt-4 bg-indigo-300 border-4 border-black font-black text-lg uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3"
          >
            {isLoading ? (
              <span className="animate-pulse">VERIFYING... ⚙️</span>
            ) : (
              <span>INITIATE LOGIN 🚀</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t-4 border-black pt-6 border-dashed">
          <p className="text-[10px] font-bold uppercase opacity-50 font-mono">
            Unauthorizied access is strictly prohibited. <br/> IP Activity is logged.
          </p>
        </div>
      </div>
    </div>
  );
}
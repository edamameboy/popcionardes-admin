import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Menggunakan getAll untuk mengambil semua cookies sekaligus
        getAll() {
          return cookieStore.getAll();
        },
        // Menggunakan setAll untuk mengatur banyak cookies secara efisien
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Error ini wajar terjadi jika dipanggil dari Server Component (seperti page.tsx).
            // Server Component di Next.js hanya bisa MEMBACA cookie, tidak bisa MENGUBAH cookie.
            // Kita abaikan error ini karena pembaruan sesi cookie biasanya ditangani oleh Middleware.
          }
        },
      },
    }
  );
}
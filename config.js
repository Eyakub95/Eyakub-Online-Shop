/* বাজার হিসাব — সেটিং ফাইল (শুধু এই ৩টা লেখা বদলাতে হবে)
   Supabase → Project Settings → API থেকে প্রথম দুটো পাবেন।
   anon key গোপন চাবি নয় — ডেটাবেসের নিরাপত্তা Row Level Security ও আপনার পাসওয়ার্ড দেয়।
   ★ কখনো "service_role" চাবি এখানে বসাবেন না! */
window.BAZAR_CONFIG = {
  supabaseUrl: "",       // যেমন: https://abcdxyz.supabase.co
  supabaseAnonKey: "",   // "anon public" key (লম্বা লেখা, eyJ… দিয়ে শুরু)
  adminEmail: "",        // আপনার ইমেইল (Supabase-এ যে ইমেইলে ইউজার বানিয়েছেন)
  autoLockMin: 30        // অ্যাপ এতক্ষণ বন্ধ থাকলে আবার পাসওয়ার্ড চাইবে (মিনিট)
};

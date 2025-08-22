"use client";

import { AuthProvider } from "@/components/utils/supabase/AuthProvider";
import HomepageComponent from "./(home)/homepage";

export default function Home() {
  return (
    <AuthProvider>
      <HomepageComponent />
    </AuthProvider>
  );
}

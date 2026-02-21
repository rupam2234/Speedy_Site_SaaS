"use client";

import { useSupabaseUser } from "@/components/utils/supabase/AuthProvider";

export default function Main() {
  const user = useSupabaseUser();

  return (
    <>
      <div className="p-5">Create a new ticket here</div>
    </>
  );
}

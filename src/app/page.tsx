import { Metadata } from "next";
import HomepageComponent from "./(home)/homepage";
import { AuthProvider } from "@/components/utils/supabase/AuthProvider";

export const metadata: Metadata = {
  title: "Speedy Site | Home",
  description:
    "The only tool you'll need to monitor your website performance and user experience",
};

export default function Home() {
  return (
    <AuthProvider>
      <HomepageComponent />
    </AuthProvider>
  );
}

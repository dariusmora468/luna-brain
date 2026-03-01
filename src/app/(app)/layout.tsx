import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "../components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = await verifySession();
  if (!isAuthenticated) redirect("/login");

  return (
    <div className="min-h-screen" style={{ background: "#F8F5F0" }}>
      <Sidebar />
      <main className="pl-16 lg:pl-60">
        {children}
      </main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";

export default async function Home() {
  const isAuthenticated = await verifySession();

  if (isAuthenticated) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}

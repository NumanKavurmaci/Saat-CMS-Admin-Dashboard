import { redirect } from "next/navigation";
import { getDashboardSession } from "@/lib/session";

export default async function Home() {
  redirect((await getDashboardSession()) ? "/dashboard" : "/login");
}

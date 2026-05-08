import { redirect } from "next/navigation";
import { auth } from "@/lib/server/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (session.user.role !== "admin") redirect("/home");
  return <>{children}</>;
}

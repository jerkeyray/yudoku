import { auth } from "@/auth";
import { redirect } from "next/navigation";
import HomeClient from "./HomeClient";
import { getCourseDashboardData } from "@/lib/data/course-summary";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const dashboardData = await getCourseDashboardData(session.user.id);

  return <HomeClient dashboardData={dashboardData} />;
}

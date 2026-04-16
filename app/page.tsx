import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { auth } from "@/auth";

const LandingPage = dynamic(() => import("@/components/LandingPage"), {
  loading: () => <div className="min-h-screen bg-black" />,
});

export default async function Home() {
  const session = await auth();
  return (
    <div className="light">
      <Navbar session={session} />
      <LandingPage session={session} />
    </div>
  );
}

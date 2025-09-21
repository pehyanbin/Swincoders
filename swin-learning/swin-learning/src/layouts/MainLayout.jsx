import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useProgress } from "../contexts/AuthContext";

export default function MainLayout() {

  const { user } = useProgress();

  console.log("User in MainLayout:", user);

  if (user && !user.hasOnboarded) {
    // Redirect first-time users to onboarding
    return <Navigate to="/onboarding" replace />;
  }
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

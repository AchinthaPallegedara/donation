"use client";

import { useAuth } from "@/contexts/auth-context";
import { LoginForm } from "@/components/login-form";
import { DonationForm } from "@/components/donation-form";
import { AdminDashboard } from "@/components/admin-dashboard";
import { Navigation } from "@/components/navigation";

export default function Home() {
  const { user, userData, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
        <div className="text-red-500 text-lg font-semibold">Connection Error</div>
        <p className="text-gray-600 max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!user || !userData) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main>
        {userData.role === "collector" && <DonationForm />}
        {userData.role === "admin" && <AdminDashboard />}
      </main>
    </div>
  );
}

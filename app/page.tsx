"use client";

import { useAuth } from "@/contexts/auth-context";
import { LoginForm } from "@/components/login-form";
import { DonationForm } from "@/components/donation-form";
import { AdminDashboard } from "@/components/admin-dashboard";
import { Navigation } from "@/components/navigation";

export default function Home() {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
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

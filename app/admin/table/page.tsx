"use client";

import { useAuth } from "@/contexts/auth-context";
import { AdminTable } from "@/components/admin-table";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminTablePage() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userData?.role !== "admin") {
      router.push("/");
    }
  }, [userData, loading, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (userData?.role !== "admin") {
    return null;
  }

  return <AdminTable />;
}

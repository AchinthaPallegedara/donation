"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Eye, Inbox, Maximize2, Minimize2, X } from "lucide-react";

interface Donation {
  id: string;
  name: string;
  amount: number;
  comment: string;
  timestamp: Timestamp | null;
  isRead: boolean;
  collectorId: string;
}

export function DonationViewPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const markingRef = useRef(false);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && userData?.role !== "admin") {
      router.push("/");
    }
  }, [authLoading, userData, router]);

  // Subscribe to unread donations (no orderBy to avoid composite index requirement)
  useEffect(() => {
    const unreadQuery = query(
      collection(db, "donations"),
      where("isRead", "==", false)
    );

    const unsubscribe = onSnapshot(unreadQuery, (snapshot) => {
      const donationsData = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Donation[];

      // Sort client-side by timestamp ascending (oldest first)
      donationsData.sort(
        (a, b) =>
          (a.timestamp?.toMillis() ?? 0) - (b.timestamp?.toMillis() ?? 0)
      );

      setDonations(donationsData);
      setLoading(false);

      // If onSnapshot fires after a mark-as-read, reset animation state
      if (markingRef.current) {
        markingRef.current = false;
        setAnimateOut(false);
        setMarking(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Always show the first donation — onSnapshot removes marked items automatically
  const currentDonation = donations.length > 0 ? donations[0] : null;

  const markAsReadAndNext = useCallback(async () => {
    if (marking || !currentDonation) return;

    setMarking(true);
    markingRef.current = true;
    setAnimateOut(true);

    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      await updateDoc(doc(db, "donations", currentDonation.id), {
        isRead: true,
      });
    } catch (error) {
      console.error("Error marking as read:", error);
      markingRef.current = false;
      setAnimateOut(false);
      setMarking(false);
    }
  }, [marking, currentDonation]);

  // Keyboard listener for Enter and Space (only in fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        markAsReadAndNext();
      }
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [markAsReadAndNext, isFullscreen]);

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return "Just now";
    return timestamp.toDate().toLocaleString();
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-800" />
                <p className="text-sm text-gray-500">Loading donations...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Access denied
  if (userData?.role !== "admin") {
    return null;
  }

  // No unread donations
  if (!currentDonation) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-6 w-6" />
                View Donations
              </CardTitle>
              <CardDescription>
                Review new donations one by one.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <h3 className="text-xl font-semibold text-gray-800">All Caught Up!</h3>
              <p className="text-gray-500 text-center max-w-sm">
                No new donations to review. New donations will appear here automatically.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="mt-2"
              >
                ← Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Fullscreen Overlay ─────────────────────────────────────── */}
      {isFullscreen && currentDonation && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white">
          {/* Fullscreen header */}
          <div className="flex items-center justify-between px-5 py-3 bg-black shrink-0">
            <span className="text-white text-sm font-semibold tracking-wide uppercase">
              New Donation
            </span>
            <div className="flex items-center gap-3">
              <span className="text-gray-300 text-sm">
                {formatDate(currentDonation.timestamp)}
              </span>
              <Badge variant="destructive" className="text-xs">
                {donations.length} left
              </Badge>
              <button
                onClick={() => setIsFullscreen(false)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close fullscreen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Fullscreen content */}
          <div
            className={`flex-1 flex flex-col items-center justify-center px-6 text-center gap-8 transition-all duration-300 ${
              animateOut ? "opacity-0 translate-y-6" : "opacity-100 translate-y-0"
            }`}
          >
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">
                Donor
              </p>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
                {currentDonation.name}
              </h1>
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">
                Amount
              </p>
              <p className="text-5xl md:text-7xl font-extrabold text-green-600">
                Rs.{currentDonation.amount.toFixed(2)}
              </p>
            </div>

            {currentDonation.comment && (
              <div className="max-w-2xl">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">
                  Comment
                </p>
                <p className="text-2xl md:text-3xl text-gray-600 leading-relaxed italic">
                  &ldquo;{currentDonation.comment}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Fullscreen action */}
          <div className="shrink-0 border-t border-gray-100 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <p className="hidden md:block text-sm text-gray-400">
              Press{" "}
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-600 font-mono text-xs">Enter</kbd>
              {" "}or{" "}
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-600 font-mono text-xs">Space</kbd>
              {" "}to mark as read &nbsp;·&nbsp; <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-600 font-mono text-xs">Esc</kbd> to exit
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-2"
              >
                <Minimize2 className="h-4 w-4" />
                Exit Fullscreen
              </Button>
              <Button
                onClick={markAsReadAndNext}
                disabled={marking}
                className="flex-1 sm:flex-none flex items-center gap-2"
              >
                {marking ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Mark as Read
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Normal Card View ───────────────────────────────────────── */}
      <div className="container mx-auto py-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            {/* Page Header */}
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Inbox className="h-6 w-6" />
                  <div>
                    <CardTitle>View Donations</CardTitle>
                    <CardDescription>
                      Review new donations one by one.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  {donations.length} Remaining
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div
                className={`transition-all duration-300 ${
                  animateOut
                    ? "opacity-0 translate-y-4"
                    : "opacity-100 translate-y-0"
                }`}
              >
                {/* Top black bar */}
                <div className="bg-black rounded-t-lg px-6 py-3 flex items-center justify-between">
                  <span className="text-white text-sm font-semibold tracking-wide uppercase">
                    New Donation
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-300 text-sm">
                      {formatDate(currentDonation.timestamp)}
                    </span>
                    <button
                      onClick={() => setIsFullscreen(true)}
                      className="text-gray-400 hover:text-white transition-colors"
                      aria-label="View fullscreen"
                      title="View fullscreen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Content area */}
                <div className="border border-t-0 border-gray-200 rounded-b-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                    <div className="px-8 py-10 text-center">
                      <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">
                        Donor
                      </p>
                      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                        {currentDonation.name}
                      </h2>
                    </div>
                    <div className="px-8 py-10 text-center">
                      <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">
                        Amount
                      </p>
                      <p className="text-3xl md:text-4xl font-extrabold text-green-600">
                        Rs.{currentDonation.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {currentDonation.comment && (
                    <div className="border-t border-gray-100 px-8 py-8 text-center bg-gray-50">
                      <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">
                        Comment
                      </p>
                      <p className="text-xl md:text-2xl text-gray-700 leading-relaxed italic max-w-2xl mx-auto">
                        &ldquo;{currentDonation.comment}&rdquo;
                      </p>
                    </div>
                  )}

                  <div className="border-t border-gray-100 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-b-lg">
                    <Button
                      variant="outline"
                      onClick={() => setIsFullscreen(true)}
                      className="w-full sm:w-auto flex items-center gap-2"
                    >
                      <Maximize2 className="h-4 w-4" />
                      Full Screen
                    </Button>
                    <Button
                      onClick={markAsReadAndNext}
                      disabled={marking}
                      className="w-full sm:w-auto"
                    >
                      {marking ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Marking...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Mark as Read
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

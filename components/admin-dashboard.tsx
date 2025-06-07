/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Donation {
  id: string;
  name: string;
  amount: number;
  comment: string;
  timestamp: any;
  isRead: boolean;
  collectorId: string;
}

export function AdminDashboard() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [allDonations, setAllDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Query for unread donations
    const unreadQuery = query(
      collection(db, "donations"),
      where("isRead", "==", false)
    );

    // Query for all donations to calculate totals
    const allQuery = query(collection(db, "donations"));

    // Subscribe to unread donations
    const unsubscribeUnread = onSnapshot(unreadQuery, (snapshot) => {
      const donationsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Donation[];

      setDonations(
        donationsData.sort(
          (a, b) => b.timestamp?.seconds - a.timestamp?.seconds
        )
      );
    });

    // Subscribe to all donations for statistics
    const unsubscribeAll = onSnapshot(allQuery, (snapshot) => {
      const allDonationsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Donation[];

      setAllDonations(allDonationsData);
      setLoading(false);
    });

    return () => {
      unsubscribeUnread();
      unsubscribeAll();
    };
  }, []);

  const markAsRead = async (donationId: string) => {
    try {
      await updateDoc(doc(db, "donations", donationId), {
        isRead: true,
      });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Just now";
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  // Calculate statistics
  const totalDonationAmount = allDonations.reduce(
    (sum, donation) => sum + donation.amount,
    0
  );
  const totalDonationCount = allDonations.length;
  const unreadDonationCount = donations.length;

  if (loading) {
    return <div className="flex justify-center p-8">Loading donations...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600">New donations appear here in real-time</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <Badge variant="outline">💰</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">
              Rs.{totalDonationAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">From all donations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Donations
            </CardTitle>
            <Badge variant="outline">📊</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDonationCount}</div>
            <p className="text-xs text-muted-foreground">All time donations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unread Donations
            </CardTitle>
            <Badge variant="destructive">{unreadDonationCount}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {unreadDonationCount}
            </div>
            <p className="text-xs text-muted-foreground">Pending review</p>
          </CardContent>
        </Card>
      </div>

      {donations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No new donations to review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {donations.map((donation) => (
            <Card key={donation.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{donation.name}</CardTitle>
                  <Badge variant="secondary">New</Badge>
                </div>
                <CardDescription>
                  {formatDate(donation.timestamp)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-600">
                    Rs.{donation.amount.toFixed(2)}
                  </div>
                  {donation.comment && (
                    <div className="text-sm text-gray-600">
                      <strong>Comment:</strong> {donation.comment}
                    </div>
                  )}
                  <Button
                    onClick={() => markAsRead(donation.id)}
                    className="w-full mt-4"
                    size="sm"
                  >
                    Mark as Read
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

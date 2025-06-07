"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface Donation {
  id: string;
  name: string;
  amount: number;
  comment: string;
  timestamp: { seconds: number; nanoseconds: number } | null;
  isRead: boolean;
  collectorId: string;
}

export function AdminTable() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [donationToDelete, setDonationToDelete] = useState<Donation | null>(
    null
  );
  const { userData } = useAuth();

  useEffect(() => {
    const q = query(collection(db, "donations"), orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const donationsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Donation[];

      setDonations(donationsData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleDeleteConfirm = async () => {
    if (!userData || !donationToDelete) {
      return;
    }

    setDeleting(donationToDelete.id);

    try {
      // Get the user's ID token
      const user = (await import("firebase/auth")).getAuth().currentUser;
      if (!user) {
        throw new Error("Not authenticated");
      }

      const token = await user.getIdToken();

      const response = await fetch("/api/admin/delete-donation", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ donationId: donationToDelete.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete donation");
      }

      setDonationToDelete(null);
      // Success feedback could be added here if needed
    } catch (error) {
      console.error("Error deleting donation:", error);
      alert("Failed to delete donation. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (
    timestamp: { seconds: number; nanoseconds: number } | null
  ) => {
    if (!timestamp) return "Just now";
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  const exportToExcel = () => {
    // Prepare data for export (excluding Status and Actions)
    const exportData = donations.map((donation) => ({
      "Donor Name": donation.name,
      Amount: `$${donation.amount.toFixed(2)}`,
      Comment: donation.comment || "-",
      Date: formatDate(donation.timestamp),
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Donations");

    // Generate filename with current date
    const currentDate = new Date().toISOString().split("T")[0];
    const filename = `donations-export-${currentDate}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">Loading all donations...</div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">All Donations</h1>
          <p className="text-gray-600">Complete history of all donations</p>
        </div>
        <Button
          onClick={exportToExcel}
          className="flex items-center gap-2"
          variant="outline"
        >
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Donor Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {donations.map((donation) => (
              <TableRow key={donation.id}>
                <TableCell className="font-medium">{donation.name}</TableCell>
                <TableCell className="text-green-600 font-semibold">
                  ${donation.amount.toFixed(2)}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {donation.comment || "-"}
                </TableCell>
                <TableCell>{formatDate(donation.timestamp)}</TableCell>
                <TableCell>
                  <Badge variant={donation.isRead ? "secondary" : "default"}>
                    {donation.isRead ? "Read" : "New"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deleting === donation.id}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete donation"
                        onClick={() => setDonationToDelete(donation)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Donation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this donation from{" "}
                          <span className="font-medium">{donation.name}</span>{" "}
                          for{" "}
                          <span className="font-medium">
                            ${donation.amount.toFixed(2)}
                          </span>
                          ? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel
                          onClick={() => setDonationToDelete(null)}
                        >
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteConfirm}
                          disabled={deleting === donation.id}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {deleting === donation.id ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

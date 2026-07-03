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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Download, Filter } from "lucide-react";
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

interface CollectorUser {
  uid: string;
  name: string;
  email: string;
}

export function AdminTable() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [collectors, setCollectors] = useState<CollectorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [donationToDelete, setDonationToDelete] = useState<Donation | null>(null);

  // Filter state
  const [filterCollector, setFilterCollector] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { userData } = useAuth();

  // Fetch all users via admin API (bypasses Firestore security rules)
  useEffect(() => {
    const fetchCollectors = async () => {
      try {
        const { getAuth } = await import("firebase/auth");
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) return;

        const response = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) return;

        const data = await response.json();
        setCollectors(
          (data.users as CollectorUser[]).map((u) => ({
            uid: u.uid,
            name: u.name || "",
            email: u.email,
          }))
        );
      } catch (err) {
        console.error("Failed to fetch collectors:", err);
      }
    };
    fetchCollectors();
  }, [userData]); // re-run once auth has hydrated and userData is available

  // Real-time listener for donations
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

  // Helper: get collector display label from uid
  const getCollectorLabel = (uid: string) => {
    const found = collectors.find((c) => c.uid === uid);
    if (!found) return uid || "—";
    return found.name || found.email;
  };

  // Apply filters
  const filteredDonations = donations.filter((donation) => {
    const matchesCollector =
      filterCollector === "all" || donation.collectorId === filterCollector;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "new" && !donation.isRead) ||
      (filterStatus === "read" && donation.isRead);
    return matchesCollector && matchesStatus;
  });

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
    // Export filtered data including collector name
    const exportData = filteredDonations.map((donation) => ({
      "Donor Name": donation.name,
      "Collector": getCollectorLabel(donation.collectorId),
      Amount: `Rs.${donation.amount.toFixed(2)}`,
      Comment: donation.comment || "-",
      Date: formatDate(donation.timestamp),
      Status: donation.isRead ? "Read" : "New",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Donations");

    const currentDate = new Date().toISOString().split("T")[0];
    const filename = `donations-export-${currentDate}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  // Reset all filters
  const clearFilters = () => {
    setFilterCollector("all");
    setFilterStatus("all");
  };

  const isFiltered = filterCollector !== "all" || filterStatus !== "all";

  if (loading) {
    return (
      <div className="flex justify-center p-8">Loading all donations...</div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
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

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Filter className="h-4 w-4" />
          Filter by:
        </div>

        {/* Collector filter */}
        <Select value={filterCollector} onValueChange={setFilterCollector}>
          <SelectTrigger className="w-52 bg-white">
            <SelectValue placeholder="Collector Name" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Collectors</SelectItem>
            {collectors.map((collector) => (
              <SelectItem key={collector.uid} value={collector.uid}>
                {collector.name || collector.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters button */}
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 hover:text-gray-700">
            Clear filters
          </Button>
        )}

        {/* Results count */}
        <span className="ml-auto text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-800">{filteredDonations.length}</span> of {donations.length} records
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Donor Name</TableHead>
              <TableHead>Collector</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDonations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No donations match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredDonations.map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell className="font-medium">{donation.name}</TableCell>
                  <TableCell className="text-gray-700 text-sm">
                    <div className="font-medium">{getCollectorLabel(donation.collectorId)}</div>
                    <div className="text-xs text-gray-400">
                      {collectors.find((c) => c.uid === donation.collectorId)?.email || ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-green-600 font-semibold">
                    Rs.{donation.amount.toFixed(2)}
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
                              Rs.{donation.amount.toFixed(2)}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

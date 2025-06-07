import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess, getFirebaseFirestore } from "@/lib/firebase-admin";

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access using the centralized utility
    const authHeader = request.headers.get("authorization");
    const adminCheck = await verifyAdminAccess(authHeader);

    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.error?.includes("Unauthorized") ? 401 : 403 }
      );
    }

    // Get Firestore instance
    const db = getFirebaseFirestore();

    // Parse request body
    const { donationId } = await request.json();

    if (!donationId) {
      return NextResponse.json(
        { error: "Donation ID is required" },
        { status: 400 }
      );
    }

    // Check if donation exists
    const donationDoc = await db.collection("donations").doc(donationId).get();
    if (!donationDoc.exists) {
      return NextResponse.json(
        { error: "Donation not found" },
        { status: 404 }
      );
    }

    // Delete donation document from Firestore
    await db.collection("donations").doc(donationId).delete();

    return NextResponse.json({
      success: true,
      message: "Donation deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting donation:", error);
    return NextResponse.json(
      { error: "Failed to delete donation" },
      { status: 500 }
    );
  }
}

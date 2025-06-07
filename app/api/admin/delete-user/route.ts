import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminAccess,
  getFirebaseAuth,
  getFirebaseFirestore,
} from "@/lib/firebase-admin";

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

    // Get Firebase instances
    const auth = getFirebaseAuth();
    const db = getFirebaseFirestore();

    // Parse request body
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (uid === adminCheck.uid) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Delete user from Firebase Auth
    try {
      await auth.deleteUser(uid);
    } catch (error: unknown) {
      // If user doesn't exist in Auth, continue to delete from Firestore
      console.warn(
        "User not found in Auth, continuing with Firestore deletion:",
        error
      );
    }

    // Delete user document from Firestore
    await db.collection("users").doc(uid).delete();

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

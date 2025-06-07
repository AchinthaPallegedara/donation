import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminAccess,
  getFirebaseAuth,
  getFirebaseFirestore,
} from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
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

    // Fetch all users from Firestore
    const usersSnapshot = await db
      .collection("users")
      .orderBy("createdAt", "desc")
      .get();

    const users = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: data.uid,
        email: data.email,
        role: data.role,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
        emailVerified: false, // We'll get this from Auth if needed
      };
    });

    // Optionally, get email verification status from Firebase Auth for each user
    const usersWithAuthData = await Promise.all(
      users.map(async (user) => {
        try {
          const userRecord = await auth.getUser(user.uid);
          return {
            ...user,
            emailVerified: userRecord.emailVerified,
            disabled: userRecord.disabled,
            lastSignInTime: userRecord.metadata.lastSignInTime,
          };
        } catch {
          // If user doesn't exist in Auth anymore, mark as deleted
          return {
            ...user,
            emailVerified: false,
            disabled: true,
            authDeleted: true,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      users: usersWithAuthData,
    });
  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

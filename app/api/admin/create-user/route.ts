import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminAccess,
  getFirebaseAuth,
  getFirebaseFirestore,
} from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
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
    const { email, password, role } = await request.json();

    // Validate inputs
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    if (!["collector", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'collector' or 'admin'" },
        { status: 400 }
      );
    }

    // Create user with Firebase Admin SDK (this doesn't affect current user session)
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: false, // You can set this to true if needed
    });

    // Create user document in Firestore
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      role: role,
      createdAt: new Date().toISOString(),
      createdBy: adminCheck.uid,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully created ${role} user: ${email}`,
      user: {
        uid: userRecord.uid,
        email: email,
        role: role,
      },
    });
  } catch (error: unknown) {
    console.error("Error creating user:", error);

    // Handle specific Firebase Auth errors
    if (error && typeof error === "object" && "code" in error) {
      const firebaseError = error as { code: string };

      if (firebaseError.code === "auth/email-already-exists") {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        );
      }

      if (firebaseError.code === "auth/invalid-email") {
        return NextResponse.json(
          { error: "Invalid email address" },
          { status: 400 }
        );
      }

      if (firebaseError.code === "auth/weak-password") {
        return NextResponse.json(
          { error: "Password is too weak" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

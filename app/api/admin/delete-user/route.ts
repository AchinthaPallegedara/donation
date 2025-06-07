import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccountPath = path.join(
    process.cwd(),
    "scripts",
    "firebase-service-account-key.json"
  );
  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const auth = getAuth();
const db = getFirestore();

export async function DELETE(request: NextRequest) {
  try {
    // Verify that the request is from an authenticated admin
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing token" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Verify the ID token and check if user is admin
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    // Check if the user is an admin
    const adminUserDoc = await db
      .collection("users")
      .doc(decodedToken.uid)
      .get();
    if (!adminUserDoc.exists || adminUserDoc.data()?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (uid === decodedToken.uid) {
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

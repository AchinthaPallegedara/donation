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

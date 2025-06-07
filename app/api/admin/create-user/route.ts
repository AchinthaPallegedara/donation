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

export async function POST(request: NextRequest) {
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
      createdBy: decodedToken.uid,
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

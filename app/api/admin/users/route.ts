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

export async function GET(request: NextRequest) {
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

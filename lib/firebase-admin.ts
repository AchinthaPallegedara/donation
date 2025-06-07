import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Initialize Firebase Admin SDK with environment variables
 * This ensures secure credential handling without exposing sensitive files
 */
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    // Validate required environment variables
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing required Firebase Admin environment variables. Please check your .env file."
      );
    }

    try {
      // Initialize Firebase Admin with service account credentials
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"), // Handle escaped newlines
        }),
        projectId,
      });

      console.log("Firebase Admin initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Firebase Admin:", error);
      throw new Error("Firebase Admin initialization failed");
    }
  }

  return admin;
}

/**
 * Get Firebase Auth instance
 * Ensures Firebase Admin is initialized before returning auth instance
 */
export function getFirebaseAuth() {
  initializeFirebaseAdmin();
  return getAuth();
}

/**
 * Get Firestore instance
 * Ensures Firebase Admin is initialized before returning firestore instance
 */
export function getFirebaseFirestore() {
  initializeFirebaseAdmin();
  return getFirestore();
}

/**
 * Verify Firebase ID token and return decoded token
 * @param idToken - The Firebase ID token to verify
 * @returns Promise<admin.auth.DecodedIdToken>
 */
export async function verifyFirebaseToken(idToken: string) {
  const auth = getFirebaseAuth();
  return await auth.verifyIdToken(idToken);
}

/**
 * Check if user is an admin
 * @param uid - User ID to check
 * @returns Promise<boolean>
 */
export async function isUserAdmin(uid: string): Promise<boolean> {
  const db = getFirebaseFirestore();

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    return userDoc.exists && userDoc.data()?.role === "admin";
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Middleware function to verify admin access
 * @param authHeader - Authorization header from request
 * @returns Promise<{success: boolean, uid?: string, error?: string}>
 */
export async function verifyAdminAccess(authHeader: string | null) {
  try {
    // Check authorization header format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { success: false, error: "Unauthorized - Missing token" };
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Verify the ID token
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(idToken);
    } catch {
      return { success: false, error: "Unauthorized - Invalid token" };
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(decodedToken.uid);
    if (!isAdmin) {
      return { success: false, error: "Forbidden - Admin access required" };
    }

    return { success: true, uid: decodedToken.uid };
  } catch (error) {
    console.error("Error verifying admin access:", error);
    return { success: false, error: "Internal server error" };
  }
}

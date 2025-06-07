"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertCircle,
  UserPlus,
  Users,
  Trash2,
  Shield,
  User,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface UserData {
  uid: string;
  email: string;
  role: "collector" | "admin";
  createdAt: string;
  createdBy?: string;
  emailVerified: boolean;
  disabled?: boolean;
  lastSignInTime?: string;
  authDeleted?: boolean;
}

export default function UserManagementPage() {
  const { userData } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"collector" | "admin">("collector");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // User management states
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");

  // Fetch users when component mounts or tab changes
  useEffect(() => {
    if (activeTab === "manage" && userData?.role === "admin") {
      fetchUsers();
    }
  }, [activeTab, userData]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch users");
      }

      setUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to fetch users",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const deleteUser = async (uid: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user: ${email}?`)) {
      return;
    }

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      setMessage({
        type: "success",
        text: `Successfully deleted user: ${email}`,
      });

      // Refresh users list
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete user",
      });
    }
  };

  // Check if user is admin
  if (userData?.role !== "admin") {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don&apos;t have permission to access this page. Only
              administrators can manage users.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Validate inputs
      if (!email || !password || !role) {
        throw new Error("All fields are required");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      // Get the current user's ID token for authentication
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Authentication token not found");
      }

      // Call the API route to create user using Admin SDK
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setMessage({
        type: "success",
        text: data.message,
      });

      // Reset form
      setEmail("");
      setPassword("");
      setRole("collector");

      // Refresh users list if on manage tab
      if (activeTab === "manage") {
        fetchUsers();
      }
    } catch (error: unknown) {
      console.error("Error creating user:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create user";
      setMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              User Management
            </CardTitle>
            <CardDescription>
              Create new users and manage existing collectors and
              administrators.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => {
                  setActiveTab("create");
                  setMessage(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === "create"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <UserPlus className="h-4 w-4" />
                Create User
              </button>
              <button
                onClick={() => {
                  setActiveTab("manage");
                  setMessage(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === "manage"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Users className="h-4 w-4" />
                Manage Users
              </button>
            </div>

            {/* Create User Tab */}
            {activeTab === "create" && (
              <div className="max-w-md mx-auto">
                <form
                  onSubmit={handleCreateUser}
                  className="space-y-6"
                  autoComplete="off"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter user's email address"
                      required
                      autoComplete="new-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter user's password (min 6 characters)"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">User Role</Label>
                    <Select
                      value={role}
                      onValueChange={(value) =>
                        setRole(value as "collector" | "admin")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="collector">Collector</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {message && (
                    <Alert
                      className={
                        message.type === "error"
                          ? "border-red-200 bg-red-50"
                          : "border-green-200 bg-green-50"
                      }
                    >
                      {message.type === "success" ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription
                        className={
                          message.type === "error"
                            ? "text-red-800"
                            : "text-green-800"
                        }
                      >
                        {message.text}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Creating User..." : "Create User"}
                  </Button>
                </form>

                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">
                    User Role Information
                  </h3>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div>
                      <strong>Collector:</strong> Can view and collect
                      donations, update donation status
                    </div>
                    <div>
                      <strong>Administrator:</strong> Full access including user
                      management, donation oversight, and system configuration
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Manage Users Tab */}
            {activeTab === "manage" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">All Users</h3>
                  <Button
                    onClick={fetchUsers}
                    disabled={usersLoading}
                    variant="outline"
                    size="sm"
                  >
                    {usersLoading ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>

                {message && (
                  <Alert
                    className={`mb-4 ${
                      message.type === "error"
                        ? "border-red-200 bg-red-50"
                        : "border-green-200 bg-green-50"
                    }`}
                  >
                    {message.type === "success" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription
                      className={
                        message.type === "error"
                          ? "text-red-800"
                          : "text-green-800"
                      }
                    >
                      {message.text}
                    </AlertDescription>
                  </Alert>
                )}

                {usersLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-600">No users found</p>
                    <p className="text-sm text-gray-500">
                      Create your first user using the &quot;Create User&quot;
                      tab.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Last Sign In</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.uid}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {user.role === "admin" ? (
                                  <Shield className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <User className="h-4 w-4 text-gray-500" />
                                )}
                                <div>
                                  <div className="font-medium">
                                    {user.email}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {user.uid.substring(0, 8)}...
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.role === "admin"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge
                                  variant={
                                    user.emailVerified
                                      ? "default"
                                      : "destructive"
                                  }
                                  className="w-fit"
                                >
                                  {user.emailVerified
                                    ? "Verified"
                                    : "Unverified"}
                                </Badge>
                                {user.disabled && (
                                  <Badge
                                    variant="destructive"
                                    className="w-fit"
                                  >
                                    Disabled
                                  </Badge>
                                )}
                                {user.authDeleted && (
                                  <Badge
                                    variant="destructive"
                                    className="w-fit"
                                  >
                                    Deleted
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(user.createdAt).toLocaleTimeString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.lastSignInTime ? (
                                <div className="text-sm">
                                  <div>
                                    {new Date(
                                      user.lastSignInTime
                                    ).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(
                                      user.lastSignInTime
                                    ).toLocaleTimeString()}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-500 text-sm">
                                  Never
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {user.uid !== userData?.uid && (
                                <Button
                                  onClick={() =>
                                    deleteUser(user.uid, user.email)
                                  }
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

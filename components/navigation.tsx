"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Navigation() {
  const { userData, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="w-full px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent"
            >
              සුදුවැල්ල ශ්‍රී පුලිනතලාරාම රාජ මහා විහාරය
            </Link>

            {/* Desktop Navigation */}
            {userData?.role === "admin" && (
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/admin/table"
                  className="text-gray-700 hover:text-blue-600"
                >
                  All Donations
                </Link>
                <Link
                  href="/admin/users"
                  className="text-gray-700 hover:text-blue-600"
                >
                  User Management
                </Link>
              </div>
            )}
          </div>

          {/* Desktop User Info & Logout */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {userData?.email} ({userData?.role})
            </span>
            <Button onClick={logout} variant="outline" size="sm">
              Logout
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {userData?.role === "admin" && (
                <>
                  <Link
                    href="/admin/table"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    All Donations
                  </Link>
                  <Link
                    href="/admin/users"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    User Management
                  </Link>
                </>
              )}

              {/* Mobile user info and logout */}
              <div className="border-t border-gray-200 pt-4 pb-3">
                <div className="px-3">
                  <div className="text-sm text-gray-600 mb-3">
                    {userData?.email} ({userData?.role})
                  </div>
                  <Button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

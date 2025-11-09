"use client"

import { Link } from "react-router-dom"
import { PageLayout } from "@/components/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, Shield } from "lucide-react"
import { useAuth } from "@/context/auth-context"

export default function AdminDashboard() {
  const { user } = useAuth()

  return (
    <PageLayout>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <p className="text-lg text-gray-600">
            Welcome back, {user?.user_metadata?.firstName || "Admin"}. Manage your clinic system from here.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* User Account Management Card */}
          <Link to="/admin/user-management" className="block">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">User Account Management</CardTitle>
                    <CardDescription className="text-base mt-1">
                      Manage user accounts and permissions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    Create, update, and delete user accounts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    Manage Patients and Staff accounts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    Assign roles and permissions
                  </li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          {/* Clinic Configuration Card */}
          <Link to="/admin/clinic-config" className="block">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Calendar className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Clinic Configuration</CardTitle>
                    <CardDescription className="text-base mt-1">
                      Configure doctors and appointment schedules
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    Configure available doctors and schedules
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    Manage appointment time slots
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    Set time intervals and availability
                  </li>
                </ul>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Quick Actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link
                  to="/signup"
                  className="block w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">Create New User</div>
                  <div className="text-sm text-gray-500">Register a new patient or staff member</div>
                </Link>
                <Link
                  to="/admin/user-management"
                  className="block w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">View All Users</div>
                  <div className="text-sm text-gray-500">Browse and manage user accounts</div>
                </Link>
                <Link
                  to="/admin/clinic-config"
                  className="block w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">Configure Schedules</div>
                  <div className="text-sm text-gray-500">Set up doctor availability</div>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>System Information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium text-gray-900">System Administrator</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-gray-900">{user?.email || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Access Level:</span>
                  <span className="font-medium text-green-600">Full Access</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}


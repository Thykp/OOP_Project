"use client"

import { Link } from "react-router-dom"
import { PageLayout } from "@/components/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Clock, ArrowLeft, UserPlus } from "lucide-react"

export default function ClinicConfigMenu() {
  return (
    <PageLayout>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Clinic Configuration</h1>
          <p className="text-lg text-gray-600">
            Manage your clinic setup, operating hours, and doctor schedules.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Doctor Management Card */}
          <Link to="/admin/doctor-management" className="block">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <UserPlus className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Doctor Management</CardTitle>
                    <CardDescription className="text-base mt-1">
                      Add, edit, and manage doctors
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                    Add new doctors to clinics
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                    Edit doctor information
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                    Remove doctors from system
                  </li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          {/* Clinic Doctor Time Slot Card */}
          <Link to="/admin/doctor-time-slot" className="block">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Doctor Time Slot Management</CardTitle>
                    <CardDescription className="text-base mt-1">
                      Manage doctor availability and bookable times
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    Configure time slots and intervals
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    Assign doctors to clinics
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    Set booking rules or availability
                  </li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          {/* Clinic Operating Hours Card */}
          <Link to="/admin/clinic-operating-hours" className="block">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Clock className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Operating Hours Configuration</CardTitle>
                    <CardDescription className="text-base mt-1">
                      Set your clinic's opening and closing hours
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    Set general or per-day open/close times
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    Apply changes for each clinic branch
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    Save and update at any time
                  </li>
                </ul>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </PageLayout>
  )
}

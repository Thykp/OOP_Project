"use client"

import { Bell, Calendar as CalendarIcon, CheckCircle, Clock, History, User } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { PageLayout } from "@/components/page-layout"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import Loader from "@/components/Loader"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/auth-context"

interface Appointment {
  appointment_id: string
  booking_date: string
  clinic_id: string
  clinic_name: string
  clinic_type: string
  created_at: string
  doctor_id: string
  doctor_name: string
  end_time: string
  patient_id: string
  start_time: string
  status: string
  updated_at: string
}

// --- mock past history for the "Medical History" tab ---
const mockPastAppointments = [
  {
    id: 1,
    doctor: "Dr. Jennifer Wong",
    clinic: "SingHealth Specialist Centre",
    date: "2023-12-10",
    time: "11:00 AM",
    type: "Dermatology Consultation",
    summary: "Routine skin check. No issues found. Follow-up in 6 months.",
  },
  {
    id: 2,
    doctor: "Dr. Sarah Lim",
    clinic: "SingHealth Polyclinic - Bedok",
    date: "2023-11-28",
    time: "09:30 AM",
    type: "Annual Health Screening",
    summary: "Complete health screening. All results within normal range.",
  },
]

export default function PatientDashboard() {
  // check-in / queue
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [queueNumber, setQueueNumber] = useState(15)
  const [currentNumber] = useState(12)

  // data
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  // cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null)

  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  // --- helpers ---
  const isWithin24Hours = (appointment: Appointment): boolean => {
    const appointmentDateTime = new Date(`${appointment.booking_date}T${appointment.start_time}`)
    const now = new Date()
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    return appointmentDateTime < twentyFourHoursFromNow
  }

  const formatDate = (dateString: string | number | Date) => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const formatTime = (timeString: any) => {
    if (!timeString) return 'N/A'
    
    // Handle array format [hour, minute, second] from LocalTime
    if (Array.isArray(timeString)) {
      const [hours24, minutes] = timeString
      let hours = hours24
      const ampm = hours >= 12 ? "PM" : "AM"
      hours = hours % 12
      if (hours === 0) hours = 12
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`
    }
    
    // Handle string format "HH:MM" or "HH:MM:SS"
    if (typeof timeString === 'string') {
      const parts = timeString.split(":")
      if (parts.length < 2) return timeString
      const [hours24, minutes] = parts
      let hours = parseInt(hours24, 10)
      const ampm = hours >= 12 ? "PM" : "AM"
      hours = hours % 12
      if (hours === 0) hours = 12
      return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`
    }
    
    return 'N/A'
  }


  const API_BASE = import.meta.env.VITE_API_BASE_URL

  const fetchAppointments = () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`${API_BASE}/api/appointments/patient/${user.id}/upcoming`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)
        return response.json()
      })
      .then((data) => setAppointments(data))
      .catch((err) => {
        console.error("Error fetching appointments:", err)
        toast({
          variant: "destructive",
          title: "Unable to load appointments",
          description: "Please try again shortly.",
        })
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAppointments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // --- actions ---
  const handleRescheduleAppointment = (appointment: Appointment) => {
    navigate("/bookappointment", {
      state: { rescheduleMode: true, appointmentToReschedule: appointment },
    })
  }

  const handleAskCancel = (appointment: Appointment) => {
    setAppointmentToCancel(appointment)
    setCancelDialogOpen(true)
  }

  const confirmCancelAppointment = async () => {
    if (!appointmentToCancel) return
    try {
      const response = await fetch(`${API_BASE}/api/appointments/${appointmentToCancel.appointment_id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json()
          toast({
            variant: "destructive",
            title: "Unable to cancel",
            description: errorData?.message ?? "Please try again later.",
          })
          return
        }
        throw new Error("Failed to cancel appointment")
      }

      toast({
        variant: "success",
        title: "Appointment cancelled",
        description: `${appointmentToCancel.doctor_name} • ${formatDate(
          appointmentToCancel.booking_date
        )} ${formatTime(appointmentToCancel.start_time)}`,
      })
      setCancelDialogOpen(false)
      setAppointmentToCancel(null)
      fetchAppointments()
    } catch (err) {
      console.error("Error cancelling appointment:", err)
      toast({
        variant: "destructive",
        title: "Error cancelling appointment",
        description: "Something went wrong. Please try again.",
      })
    }
  }

  const handleCheckIn = () => {
    setIsCheckedIn(true)
    setQueueNumber(Math.floor(Math.random() * 20) + 10)
    toast({
      variant: "success",
      title: "Checked in",
      description: "You’ve joined the queue. We’ll notify you as you get closer.",
    })
  }

  if (loading) {
    return (
      <PageLayout variant="dashboard">
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
          <Loader />
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout variant="dashboard">
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You can only cancel or reschedule at least 24 hours in advance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep appointment</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelAppointment}>Cancel appointment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Dashboard</h1>
            <p className="text-gray-600">Welcome back! Manage your appointments and track your queue status.</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-blue-200 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <CalendarIcon className="h-5 w-5" />
                  Book Appointment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">Schedule your next visit</p>
                <Link to="/bookappointment">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">New Appointment</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-green-200 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  Check In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">Join the queue for your appointment</p>
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleCheckIn} disabled={isCheckedIn}>
                  {isCheckedIn ? "Checked In" : "Check In Now"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-purple-200 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <History className="h-5 w-5" />
                  Medical History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">View past appointments</p>
                <Button variant="outline" className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 bg-transparent">
                  View History
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Queue Status Alert */}
          {isCheckedIn && (
            <Alert className="mb-8 border-blue-200 bg-blue-50">
              <Bell className="h-4 w-4" />
              <AlertDescription>
                <strong>Queue Status:</strong> You are number #{queueNumber}. Current serving: #{currentNumber}.{" "}
                {queueNumber - currentNumber <= 3 && (
                  <span className="text-blue-700 font-semibold">Your turn is coming up soon!</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Main Content Tabs */}
          <Tabs defaultValue="appointments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="queue">Queue Status</TabsTrigger>
              <TabsTrigger value="history">Medical History</TabsTrigger>
            </TabsList>

            {/* Upcoming Appointments */}
            <TabsContent value="appointments">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <CardDescription>Your scheduled appointments</CardDescription>
                </CardHeader>

                <CardContent>
                  {appointments.length === 0 ? (
                    <div className="text-sm text-gray-600">No upcoming appointments.</div>
                  ) : (
                    <div className="space-y-4">
                      {appointments.map((appointment) => (
                        <div key={appointment.appointment_id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{appointment.doctor_name}</h3>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-600">{appointment.clinic_name}</p>
                                <Badge
                                  variant="secondary"
                                  className={
                                    appointment.clinic_type === "General Practice"
                                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                                      : "bg-purple-100 text-purple-800 hover:bg-purple-100"
                                  }
                                >
                                  {appointment.clinic_type}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-semibold">{formatDate(appointment.booking_date)}</p>
                            <p className="text-sm text-gray-600">{formatTime(appointment.start_time)}</p>

                            <div className="flex gap-2 mt-2">
                              {/* Reschedule */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={() => handleRescheduleAppointment(appointment)}
                                        disabled={isWithin24Hours(appointment)}
                                      >
                                        Reschedule
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {isWithin24Hours(appointment) && (
                                    <TooltipContent>
                                      <p>Appointments can only be rescheduled at least 24 hours in advance</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>

                              {/* Cancel */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 border-red-200 bg-transparent hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={() => handleAskCancel(appointment)}
                                        disabled={isWithin24Hours(appointment)}
                                      >
                                        Cancel
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {isWithin24Hours(appointment) && (
                                    <TooltipContent>
                                      <p>Appointments can only be cancelled at least 24 hours in advance</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Queue Status */}
            <TabsContent value="queue">
              <Card>
                <CardHeader>
                  <CardTitle>Queue Management</CardTitle>
                  <CardDescription>Track your position and get real-time updates</CardDescription>
                </CardHeader>
                <CardContent>
                  {!isCheckedIn ? (
                    <div className="text-center py-8">
                      <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Not Checked In</h3>
                      <p className="text-gray-600 mb-4">Check in when you arrive at the clinic to join the queue</p>
                      <Button onClick={handleCheckIn} className="bg-green-600 hover:bg-green-700">
                        Check In Now
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="bg-blue-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl font-bold text-blue-600">#{queueNumber}</span>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Your Queue Number</h3>
                        <p className="text-gray-600">Currently serving: #{currentNumber}</p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Queue Progress</span>
                          <span className="text-sm font-medium">{Math.max(0, queueNumber - currentNumber)} people ahead</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (currentNumber / queueNumber) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                          <Bell className="h-5 w-5 text-yellow-600" />
                          <span className="text-sm">You'll be notified when you're 3 numbers away</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm">SMS and email notifications enabled</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Medical History */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Medical History</CardTitle>
                  <CardDescription>Your past appointments and treatment summaries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockPastAppointments.map((appointment) => (
                      <div key={appointment.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{appointment.doctor}</h3>
                            <p className="text-sm text-gray-600">{appointment.clinic}</p>
                            <Badge variant="secondary" className="mt-1">
                              {appointment.type}
                            </Badge>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p>{appointment.date}</p>
                            <p>{appointment.time}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-sm">
                            <strong>Summary:</strong> {appointment.summary}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageLayout>
  )
}

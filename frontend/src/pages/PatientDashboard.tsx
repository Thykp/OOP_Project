"use client"

import { Bell, Calendar as CalendarIcon, CheckCircle, Clock, History, User } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { PageLayout } from "@/components/page-layout"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  clinic_address?: string
  created_at: string
  doctor_id: string
  doctor_name: string
  end_time: string
  patient_id: string
  start_time: string
  status: string
  updated_at: string
}

interface PastAppointment extends Appointment {
  treatmentNote?: {
    id: number
    notes: string
    noteType: string
    createdAt: string
    createdByName?: string
  } | null
}

export default function PatientDashboard() {
  // check-in / queue
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [queueNumber, setQueueNumber] = useState(15)
  const [currentNumber] = useState(12)

  // data
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [pastAppointments, setPastAppointments] = useState<PastAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // filters (shadcn calendar + dropdown)
  const [upcomingClinic, setUpcomingClinic] = useState<string>("all")
  const [upcomingDate, setUpcomingDate] = useState<Date | undefined>(undefined)
  const [completedClinic, setCompletedClinic] = useState<string>("all")
  const [completedDate, setCompletedDate] = useState<Date | undefined>(undefined)

  // cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null)

  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  //this is a fake test date to test my function
  const currentNow = () => new Date(2025, 11, 11, 8, 0, 0)
  // const currentNow = () => new Date()

  // --- normalization helpers ---
  const toDateString = (booking_date: any): string => {
    if (Array.isArray(booking_date)) {
      const [y, m, d] = booking_date
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    }
    return booking_date
  }

  const toTimeString = (time: any): string => {
    if (Array.isArray(time)) {
      const [h, mi, s = 0] = time
      return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    }
    if (typeof time === "string") {
      const parts = time.split(":")
      if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`
      return time
    }
    return "00:00:00"
  }

  const toDateTime = (booking_date: any, start_time: any): Date => {
    return new Date(`${toDateString(booking_date)}T${toTimeString(start_time)}`)
  }

  // --- helpers ---
  const isWithin24Hours = (appointment: Appointment): boolean => {
    const appointmentDateTime = toDateTime(appointment.booking_date as any, appointment.start_time as any)
    const now = currentNow()
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    return appointmentDateTime < twentyFourHoursFromNow
  }

  const isEligibleForCheckIn = (appointment: Appointment): boolean => {
    const now = currentNow()
    const appointmentDateTime = toDateTime(appointment.booking_date as any, appointment.start_time as any)
    // Use LOCAL date for "today" comparison to avoid UTC shift
    const todayDateLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    const appointmentDate = toDateString(appointment.booking_date as any)
    if (todayDateLocal !== appointmentDate) return false
    const twoHoursBeforeAppointment = new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000)
    return now >= twoHoursBeforeAppointment && now <= appointmentDateTime
  }

  // Find the most upcoming appointment that is eligible for check-in
  const getEligibleAppointmentForCheckIn = (): Appointment | null => {
    if (appointments.length === 0) return null
    
    // Filter for eligible appointments
    const eligibleAppointments = appointments.filter(isEligibleForCheckIn)
    
    if (eligibleAppointments.length === 0) return null
    
    // Sort by date and time (earliest first)
    const sorted = eligibleAppointments.sort((a, b) => {
      const dateTimeA = toDateTime(a.booking_date as any, a.start_time as any)
      const dateTimeB = toDateTime(b.booking_date as any, b.start_time as any)
      return dateTimeA.getTime() - dateTimeB.getTime()
    })
    
    // Return the earliest eligible appointment
    return sorted[0]
  }

  // Memoize eligible appointment so UI stays consistent across renders
  const eligibleAppointmentForCheckIn = useMemo(() => getEligibleAppointmentForCheckIn(), [appointments])

  // Unique clinic lists for dropdowns
  const upcomingClinics = useMemo(() => {
    return Array.from(new Set(appointments.map(a => a.clinic_name).filter(Boolean))) as string[]
  }, [appointments])

  const completedClinics = useMemo(() => {
    return Array.from(new Set(pastAppointments.map(a => a.clinic_name).filter(Boolean))) as string[]
  }, [pastAppointments])

  
  const dateToYMD = (d?: Date) => {
    if (!d) return undefined
    const yr = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, "0")
    const da = String(d.getDate()).padStart(2, "0")
    return `${yr}-${mo}-${da}`
  }
  const formatSelectedDate = (d?: Date) => (d ? new Date(d).toLocaleDateString() : "Pick a date")

  // Derived filtered lists
  const filteredUpcoming = useMemo(() => {
    const targetDate = dateToYMD(upcomingDate)
    const result = appointments.filter((apt) => {
      const byClinic = upcomingClinic === "all" || (apt.clinic_name || "") === upcomingClinic
      const byDate = !targetDate || toDateString(apt.booking_date as any) === targetDate
      return byClinic && byDate
    })
    if (targetDate) {
      console.debug("[Upcoming Filter] targetDate=", targetDate, "matchedCount=", result.length,
        "appointmentsDates=", appointments.map(a => toDateString(a.booking_date as any)))
    }
    return result
  }, [appointments, upcomingClinic, upcomingDate])

  const filteredCompleted = useMemo(() => {
    const targetDate = dateToYMD(completedDate)
    const result = pastAppointments.filter((apt) => {
      const byClinic = completedClinic === "all" || (apt.clinic_name || "") === completedClinic
      const byDate = !targetDate || toDateString(apt.booking_date as any) === targetDate
      return byClinic && byDate
    })
    if (targetDate) {
      console.debug("[Completed Filter] targetDate=", targetDate, "matchedCount=", result.length,
        "appointmentsDates=", pastAppointments.map(a => toDateString(a.booking_date as any)))
    }
    return result
  }, [pastAppointments, completedClinic, completedDate])

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

  const fetchAppointments = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/appointments/patient/${user.id}/upcoming`)
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)
      const data = await response.json()
      
      // Fetch all GP and Specialist clinics once
      const [gpClinicsRes, specialistClinicsRes] = await Promise.all([
        fetch(`${API_BASE}/api/clinics/gp?limit=100`),
        fetch(`${API_BASE}/api/clinics/specialist?limit=100`)
      ])
      
      const gpClinics = gpClinicsRes.ok ? await gpClinicsRes.json() : []
      const specialistClinics = specialistClinicsRes.ok ? await specialistClinicsRes.json() : []
      
      // Enrich appointments with clinic addresses
      const enrichedAppointments = data.map((apt: Appointment) => {
        // Try to find in GP clinics first
        let clinic = gpClinics.find((c: any) => c.clinicId === apt.clinic_id)
        
        // If not found in GP, try Specialist clinics
        if (!clinic) {
          clinic = specialistClinics.find((c: any) => c.ihpClinicId === apt.clinic_id)
        }
        
        return { 
          ...apt, 
          clinic_address: clinic?.address || 'Address not available' 
        }
      })
      
      setAppointments(enrichedAppointments)
    } catch (err) {
      console.error("Error fetching appointments:", err)
      toast({
        variant: "destructive",
        title: "Unable to load appointments",
        description: "Please try again shortly.",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPastAppointments = async () => {
    if (!user?.id) {
      setLoadingHistory(false)
      return
    }
    setLoadingHistory(true)
    try {
      // Fetch all appointments for the patient
      const response = await fetch(`${API_BASE}/api/appointments/patient/${user.id}`)
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)
      const allAppointments = await response.json()
      
      // Filter for completed appointments (past appointments)
      const completed = allAppointments.filter((apt: Appointment) => 
        apt.status === 'COMPLETED' || apt.status === 'NO_SHOW'
      )
      
      // Sort by date (most recent first)
      completed.sort((a: Appointment, b: Appointment) => {
        const dateA = new Date(`${a.booking_date}T${a.start_time}`).getTime()
        const dateB = new Date(`${b.booking_date}T${b.start_time}`).getTime()
        return dateB - dateA
      })
      
      // Fetch treatment notes for each completed appointment
      const appointmentsWithNotes = await Promise.all(
        completed.map(async (appt: Appointment) => {
          try {
            const notesResponse = await fetch(`${API_BASE}/api/treatment-notes/appointment/${appt.appointment_id}/latest`)
            if (notesResponse.ok) {
              const latestNote = await notesResponse.json()
              return { ...appt, treatmentNote: latestNote }
            }
          } catch (error) {
            // If fetching notes fails, just continue without notes
          }
          return { ...appt, treatmentNote: null }
        })
      )
      
      setPastAppointments(appointmentsWithNotes)
    } catch (err) {
      console.error("Error fetching past appointments:", err)
      toast({
        variant: "destructive",
        title: "Unable to load medical history",
        description: "Please try again shortly.",
      })
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
    fetchPastAppointments()
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

            {(() => {
              const eligibleAppointment = eligibleAppointmentForCheckIn
              if (!eligibleAppointment) return null
              
              return (
                <Card className="border-green-200 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      Check In
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>{eligibleAppointment.doctor_name}</strong>
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      {formatTime(eligibleAppointment.start_time)} • {eligibleAppointment.clinic_name}
                    </p>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      onClick={handleCheckIn} 
                      disabled={isCheckedIn}
                    >
                      {isCheckedIn ? "Checked In" : "Check In Now"}
                    </Button>
                  </CardContent>
                </Card>
              )
            })()}
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
          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="queue">Queue Status</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            {/* Upcoming Appointments */}
            <TabsContent value="upcoming">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <CardDescription>Your scheduled appointments</CardDescription>
                </CardHeader>

                <CardContent>
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
                    <div className="flex flex-col gap-2">
                      <Label>Filter by clinic</Label>
                      <Select value={upcomingClinic} onValueChange={setUpcomingClinic}>
                        <SelectTrigger>
                          <SelectValue placeholder="All clinics" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All clinics</SelectItem>
                          {upcomingClinics.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Filter by date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start">
                            {formatSelectedDate(upcomingDate)}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={upcomingDate} onSelect={setUpcomingDate} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => { setUpcomingClinic("all"); setUpcomingDate(undefined); }}>Clear filters</Button>
                    </div>
                  </div>

                  {filteredUpcoming.length === 0 ? (
                    <div className="text-sm text-gray-600">No upcoming appointments.</div>
                  ) : (
                    <div className="space-y-4">
                      {filteredUpcoming.map((appointment) => (
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
                              {appointment.clinic_address && (
                                <p className="text-xs text-gray-500 mt-1">{appointment.clinic_address}</p>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-semibold">{formatDate(appointment.booking_date)}</p>
                            <p className="text-sm text-gray-600">
                              {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                            </p>

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
                  <CardDescription>Check in now to track queue and get real-time updates</CardDescription>
                </CardHeader>
                <CardContent>
                  {!isCheckedIn ? (
                    <div className="text-center py-8">
                      {eligibleAppointmentForCheckIn ? (
                        <>
                          <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Ready to Check In</h3>
                          <div className="bg-blue-50 rounded-lg p-4 mb-4 max-w-md mx-auto">
                            <p className="text-sm font-semibold text-blue-900 mb-1">
                              {eligibleAppointmentForCheckIn.doctor_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {eligibleAppointmentForCheckIn.clinic_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDate(eligibleAppointmentForCheckIn.booking_date)} • {formatTime(eligibleAppointmentForCheckIn.start_time)}
                            </p>
                          </div>
                          <p className="text-gray-600 mb-4">Check in when you arrive at the clinic to join the queue</p>
                          <Button onClick={handleCheckIn} className="bg-green-600 hover:bg-green-700">
                            Check In Now
                          </Button>
                        </>
                      ) : (
                        <>
                          <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Appointment Available for Check-In</h3>
                          <p className="text-gray-600 mb-4">
                            Check-in is only available for appointments today, within 2 hours before the start time
                          </p>
                        </>
                      )}
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
            <TabsContent value="completed">
              <Card>
                <CardHeader>
                  <CardTitle>Completed Appointments</CardTitle>
                  <CardDescription>Your past appointments and treatment summaries</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
                    <div className="flex flex-col gap-2">
                      <Label>Filter by clinic</Label>
                      <Select value={completedClinic} onValueChange={setCompletedClinic}>
                        <SelectTrigger>
                          <SelectValue placeholder="All clinics" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All clinics</SelectItem>
                          {completedClinics.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Filter by date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start">
                            {formatSelectedDate(completedDate)}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={completedDate} onSelect={setCompletedDate} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => { setCompletedClinic("all"); setCompletedDate(undefined); }}>Clear filters</Button>
                    </div>
                  </div>

                  {loadingHistory ? (
                    <div className="text-center py-8 text-gray-500">Loading medical history...</div>
                  ) : filteredCompleted.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <History className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">No Past Appointments</p>
                      <p>Your completed appointments and treatment notes will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredCompleted.map((appointment) => (
                        <div key={appointment.appointment_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{appointment.doctor_name || "Unknown Doctor"}</h3>
                              <p className="text-sm text-gray-600">{appointment.clinic_name || "Unknown Clinic"}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge 
                                  variant="secondary"
                                  className={
                                    appointment.clinic_type === "General Practice"
                                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                                      : "bg-purple-100 text-purple-800 hover:bg-purple-100"
                                  }
                                >
                                  {appointment.clinic_type || "N/A"}
                                </Badge>
                                <Badge variant="outline" className={
                                  appointment.status === "COMPLETED" 
                                    ? "bg-green-50 text-green-700 border-green-200" 
                                    : "bg-red-50 text-red-700 border-red-200"
                                }>
                                  {appointment.status === "COMPLETED" ? "Completed" : "No Show"}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right text-sm text-gray-500 ml-4">
                              <p className="font-medium">{formatDate(appointment.booking_date)}</p>
                              <p>{formatTime(appointment.start_time)}</p>
                            </div>
                          </div>
                          
                          {appointment.treatmentNote ? (
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-blue-900">Treatment Summary</p>
                                {appointment.treatmentNote.createdByName && (
                                  <p className="text-xs text-gray-500">
                                    {new Date(appointment.treatmentNote.createdAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {appointment.treatmentNote.notes}
                              </p>
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-3 mt-3">
                              <p className="text-sm text-gray-500 italic">
                                No treatment notes available for this appointment.
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageLayout>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, User, Bell, History, CheckCircle } from "lucide-react"
import { PageLayout } from "../components/page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Link } from "react-router-dom"


interface Appointment {
  appointment_id: string
  booking_date: string
  clinic_id: string
  clinic_name: string
  created_at: string
  doctor_id: string
  doctor_name: string
  end_time: string
  patient_id: string
  start_time: string
  status: string
  updated_at: string
}

// Mock data
const mockDoctors = [
  { id: 1, name: "Dr. Sarah Lim", specialty: "General Practitioner", clinic: "SingHealth Polyclinic - Bedok" },
  { id: 2, name: "Dr. Michael Tan", specialty: "Cardiologist", clinic: "Singapore General Hospital" },
  { id: 3, name: "Dr. Jennifer Wong", specialty: "Dermatologist", clinic: "SingHealth Specialist Centre" },
  { id: 4, name: "Dr. David Chen", specialty: "Orthopedic Surgeon", clinic: "Changi General Hospital" },
]

const mockClinics = [
  { id: 1, name: "SingHealth Polyclinic - Bedok", type: "General Practice" },
  { id: 2, name: "Singapore General Hospital", type: "Specialist" },
  { id: 3, name: "SingHealth Specialist Centre", type: "Specialist" },
  { id: 4, name: "Changi General Hospital", type: "Hospital" },
]

const mockTimeSlots = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
]

// const mockUpcomingAppointments = [
//   {
//     id: 1,
//     doctor: "Dr. Sarah Lim",
//     clinic: "SingHealth Polyclinic - Bedok",
//     date: "2024-01-15",
//     time: "10:00 AM",
//     type: "General Consultation",
//   },
//   {
//     id: 2,
//     doctor: "Dr. Michael Tan",
//     clinic: "Singapore General Hospital",
//     date: "2024-01-22",
//     time: "02:30 PM",
//     type: "Cardiology Follow-up",
//   },
// ]

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
  const [selectedDoctor, setSelectedDoctor] = useState("")
  const [selectedClinic, setSelectedClinic] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [queueNumber, setQueueNumber] = useState(15)
  const [currentNumber] = useState(12)

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)


  // Getting the userId from Localstorage
  let userId: string | null = null

try {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const value = localStorage.getItem(key)
      if (value) {
        const jsonValue = JSON.parse(value)
        // Only assign if user.id exists
        if (jsonValue?.user?.id) {
          userId = jsonValue.user.id
          break
        }
      }
    }
  }
} catch (err) {
  console.error("Error parsing localStorage:", err)
}


  useEffect(() => {
    fetch("http://localhost:8080/api/appointments/patient/"+ userId +"/upcoming")
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        return response.json()
      })
      .then(data => {
        setAppointments(data)
      })
      .catch(err => {
        console.error("Error fetching appointments:", err)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>

  const handleBookAppointment = () => {
    if (selectedDoctor && selectedClinic && selectedDate && selectedTime) {
      alert("Appointment booked successfully!")
      // Reset form
      setSelectedDoctor("")
      setSelectedClinic("")
      setSelectedDate("")
      setSelectedTime("")
    }
  }

  // Helper function to format date as dd/mm/yyyy
  const formatDate = (dateString: string | number | Date) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper function to format time as hh:mm AM/PM
  const formatTime = (timeString: string) => {
    // If timeString is just "HH:MM:SS" format
    const [hours24, minutes] = timeString.split(':');
    let hours = parseInt(hours24);
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12

    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };


  const handleCheckIn = () => {
    setIsCheckedIn(true)
    setQueueNumber(Math.floor(Math.random() * 20) + 10)
  }

  return (
    <PageLayout variant="dashboard">
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
                  <Calendar className="h-5 w-5" />
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
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleCheckIn}
                  disabled={isCheckedIn}
                >
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
                <Button
                  variant="outline"
                  className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 bg-transparent"
                >
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
                <strong>Queue Status:</strong> You are number #{queueNumber}. Current serving: #{currentNumber}.
                {queueNumber - currentNumber <= 3 && (
                  <span className="text-blue-700 font-semibold"> Your turn is coming up soon!</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Main Content Tabs */}
          <Tabs defaultValue="appointments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="booking">Book New</TabsTrigger>
              <TabsTrigger value="queue">Queue Status</TabsTrigger>
              <TabsTrigger value="history">Medical History</TabsTrigger>
            </TabsList>

            {/* Upcoming Appointments */}
            <TabsContent value="appointments">
              <Card>
                <CardHeader className="flex items-center justify-between">
                  {/* Title and description on the left */}
                  <div>
                    <CardTitle>Upcoming Appointments</CardTitle>
                    <CardDescription>Your scheduled appointments</CardDescription>
                  </div>
                  {/* Button on the right */}
                  {/* <Link to="/ViewAppointment">
                    <Button size="sm" className="bg-blue-600 text-white">
                      View All Appointments
                    </Button>
                  </Link> */}
                </CardHeader>
                <CardContent>

                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div key={appointment.appointment_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{appointment.doctor_name}</h3>
                            <p className="text-sm text-gray-600">{appointment.clinic_name}</p>
                            {/* <p className="text-sm text-gray-500">{appointment.type}</p> */}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatDate(appointment.booking_date)}</p>
                          <p className="text-sm text-gray-600">{formatTime(appointment.start_time)}</p>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline">
                              Reschedule
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 bg-transparent">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Book New Appointment */}
            <TabsContent value="booking">
              <Card>
                <CardHeader>
                  <CardTitle>Book New Appointment</CardTitle>
                  <CardDescription>Schedule your next visit with our healthcare professionals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="doctor">Select Doctor</Label>
                      <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockDoctors.map((doctor) => (
                            <SelectItem key={doctor.id} value={doctor.name}>
                              <div>
                                <div className="font-medium">{doctor.name}</div>
                                <div className="text-sm text-gray-500">{doctor.specialty}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clinic">Select Clinic</Label>
                      <Select value={selectedClinic} onValueChange={setSelectedClinic}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a clinic" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockClinics.map((clinic) => (
                            <SelectItem key={clinic.id} value={clinic.name}>
                              <div>
                                <div className="font-medium">{clinic.name}</div>
                                <div className="text-sm text-gray-500">{clinic.type}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">Select Date</Label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="time">Select Time</Label>
                      <Select value={selectedTime} onValueChange={setSelectedTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose time slot" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockTimeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleBookAppointment}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={!selectedDoctor || !selectedClinic || !selectedDate || !selectedTime}
                  >
                    Book Appointment
                  </Button>
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
                          <span className="text-sm font-medium">
                            {Math.max(0, queueNumber - currentNumber)} people ahead
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (currentNumber / queueNumber) * 100)}%` }}
                          ></div>
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

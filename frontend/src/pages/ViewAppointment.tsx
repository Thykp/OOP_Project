import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, ArrowRight } from "lucide-react"
import { PageLayout } from "@/components/page-layout"

interface Appointment {
  id: number
  patient: string
  doctor: string
  date: string
  time: string
  location: string
  notes?: string
}

const appointments: Appointment[] = [
  {
    id: 1,
    patient: "John Tan",
    doctor: "Dr. Lim",
    date: "2025-09-29",
    time: "09:00",
    location: "SingHealth Clinic, Room 204",
    notes: "Bring previous reports"
  },
  {
    id: 2,
    patient: "Sarah Lee",
    doctor: "Dr. Cheng",
    date: "2025-09-30",
    time: "15:30",
    location: "SingHealth Clinic, Room 210"
  }
]

export default function UpcomingAppointmentPage() {
  return (
    <PageLayout>
      {/* Hero */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          {/* <Badge className="mb-6 bg-green-50 text-green-700 border-green-200">Your Upcoming Visits</Badge> */}
          <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-balance">
            Your Appointments
          </h3>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto text-pretty">
            View, update, or cancel your upcoming appointments—all in one place. Stay organized and minimize your waiting time at the clinic.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/book">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8">
                Book New Appointment
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
            >
              View Queue Status
            </Button>
          </div>
        </div>
      </section>

      {/* Upcoming Appointments Section */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-green-50 text-green-700 border-green-200">Your Upcoming Appointments</Badge>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Next Visits at SingHealth Clinic
            </h2>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">
              Always arrive on time and bring all relevant documents for a smooth experience.
            </p>
          </div>
          <div className="grid gap-8">
            {appointments.length === 0 ? (
              <div className="text-center text-gray-700">No upcoming appointments found.</div>
            ) : (
            appointments.map(appt => (
              <div key={appt.id} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-10 h-10 text-green-600" />
                  <div>
                    <div className="font-semibold text-gray-900 text-lg">{appt.date}, {appt.time}</div>
                    <div className="text-gray-600 text-sm">{appt.location}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-700" />
                  <div className="text-gray-900 font-medium">{appt.doctor}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-green-600 text-green-700 hover:bg-green-50">
                    Update
                  </Button>
                  <Button size="sm" className="bg-red-100 text-red-800 hover:bg-red-200">
                    Cancel
                  </Button>
                </div>
                {appt.notes && (
                  <div className="w-full text-gray-600 text-xs mt-3 md:mt-0 italic">Note: {appt.notes}</div>
                )}
              </div>
            )))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-300">
        <div className="container mx-auto max-w-4xl text-center">
          <Calendar className="w-8 h-8 mx-auto mb-4 text-white" />
          <div className="font-semibold text-white mb-2">SingHealth Clinic</div>
          <p className="text-gray-400">Efficient appointments, seamless care.</p>
          <div className="border-t border-gray-800 mt-8 pt-8">
            <p className="text-gray-400">© 2025 SingHealth Clinic. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </PageLayout>
  )
}

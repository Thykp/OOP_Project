import { Button } from "@/components/ui/button"
import { Calendar, User } from "lucide-react"
import { PageLayout } from "@/components/page-layout"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"


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
  patient_name: string
  start_time: string
  status: string
  updated_at: string
}

export default function ViewAppointmentsPage() {
  const { user } = useAuth()

  const [appointments, setAppointments] = useState<Appointment[]>([])

  const [loading, setLoading] = useState(true)
  const baseURL = import.meta.env.VITE_API_BASE_URL;

  const fetchAppointments = () => {
    setLoading(true);
    fetch(`${baseURL}/api/appointments/upcoming`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setAppointments(data);
      })
      .catch(err => {
        console.error("Error fetching appointments:", err);
      })
      .finally(() => setLoading(false));
  };

  type DoctorOption = { value: string; label: string; };

  // Holds list of options for dropdown
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);

  // Holds selected filter value
  const [filterDoctor, setFilterDoctor] = useState("");

  const fetchDoctors = () => {
    fetch(`${baseURL}/api/doctors`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        const doctorOptions = data.map((doc: { doctorId: string; doctorName: string }) => ({
          value: doc.doctorId,    // for uniqueness and backend reference
          label: doc.doctorName,  // for displaying in dropdown
        }));
        setDoctorOptions(doctorOptions);   // doctorOptions: { value, label }[]
      })
      .catch(err => {
        console.error("Error fetching doctors:", err);
      });
  }

  type ClinicOption = { value: string; label: string; };

  // Holds list of options for dropdown
  const [clinicOptions, setClinicOptions] = useState<ClinicOption[]>([]);

  // Holds selected filter value
  const [filterClinic, setFilterClinic] = useState<string>(user?.user_metadata.clinicName);

  const fetchClinics = async () => {
    try {
      const gpRes = await fetch(`${baseURL}/api/clinics/gp?limit=100`);
      const gpData = await gpRes.json();
      const gpOptions = gpData.map((clinic: { clinicName: any }) => ({
        value: clinic.clinicName,   // or clinic.name or whatever your property is
        label: clinic.clinicName,
      }));
      const spRes = await fetch(`${baseURL}/api/clinics/specialist?limit=100`);
      const spData = await spRes.json();

      const spOptions = spData.map((clinic: { clinicName: any }) => ({
        value: clinic.clinicName,
        label: clinic.clinicName,
      }));
      // Combine and sort alphabetically by label
      const combinedOptions = [...gpOptions, ...spOptions].sort((a, b) =>
        a.label.localeCompare(b.label)
      );

      setClinicOptions(combinedOptions);
    } catch (err) {
      console.error("error fetching clinics: ", err);
    }
  }

  // Filter Date
  const [filterDate, setFilterDate] = useState(""); // Empty string means no filter

  // Filter Function
  const filteredAppointments = appointments.filter(
    (appt) =>
      (!filterClinic || appt.clinic_name === filterClinic || filterClinic === "All") &&
      (!filterDoctor || appt.doctor_name === filterDoctor || filterDoctor === "All") &&
      (!filterDate || appt.booking_date === filterDate)
  );

  // Update Status
  const updateApptStatus = async (apptId: String, status: String) => {
    const response = await fetch(`${baseURL}/api/appointments/${apptId}/updateStatus/${status}`, {
      method: "PATCH"
    })
    if (!response.ok) throw new Error("Failed to update status");
    fetchAppointments()
  }

  // Clear Filter
  const clearFilters = () => {
    setFilterDoctor("All")
    setFilterClinic("All");
    setFilterDate("");
  }

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
    fetchClinics();
  }, [])

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

  return (
    <PageLayout>
      {/* Heading */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
            Upcoming Appointments
          </h3>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            View all upcoming appointments, sorted or filtered by doctor, date, or clinic. Stay organized and never miss a visit.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="flex flex-col md:flex-row items-center gap-6 max-w-4xl mx-auto px-4 py-2 mb-8">
        {/* Doctor Filter */}
        <div className="flex-1 min-w-[180px]">
          <Label htmlFor="doctor" className="text-sm font-medium text-gray-700">Filter by Doctor</Label>
          <Select
            value={filterDoctor}
            onValueChange={selected => setFilterDoctor(selected)}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="All Doctors" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              <SelectItem value="All">All Doctors</SelectItem>
              {doctorOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Clinic Filter */}
        <div className="flex-1 min-w-[180px]">
          <Label htmlFor="clinic" className="text-sm font-medium text-gray-700">Filter by Clinic</Label>
          <Select
            value={filterClinic}
            onValueChange={selected => setFilterClinic(selected)}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="All Clinics" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              <SelectItem value="All">All Clinics</SelectItem>
              {clinicOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>
        {/* Date Filter */}
        <div className="flex-1 min-w-[180px]">
          <Label htmlFor="date" className="text-sm font-medium text-gray-700">Filter by Date</Label>
          <input
            id="date"
            name="date"
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="h-11 w-full px-3 border border-gray-200 rounded-md text-gray-900 bg-white focus:ring-green-600 focus:border-green-600"
            placeholder="Select date"
          />
        </div>
        {/* Clear Filters Button */}
        <div className="flex-1 min-w-[180px]">
          <Button variant="outline" className="h-11 px-5 whitespace-nowrap" style={{ marginTop: "18px" }} onClick={clearFilters}>Clear Filters</Button>
        </div>
      </section>

      {/* Appointments List */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl grid gap-8">
          {/* Appointment Card - repeat as needed */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <CardDescription>Monitor all scheduled appointments at a glance</CardDescription>
                </div>
                {/* refresh button here for staff */}
                <Button variant="outline" size="sm" onClick={fetchAppointments} disabled={loading}>
                  {loading ? "Refreshing..." : "Refresh"}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredAppointments.map(appointment => (
                    <div key={appointment.appointment_id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-gray-50">
                      {/* Left: Appointment Info */}
                      <div className="flex items-center gap-4">
                        {/* Patient Avatar/Icon */}
                        <div className="bg-green-100 p-2 rounded-full">
                          <User className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{appointment.patient_name}</h3>
                          <p className="text-xs text-gray-700">Doctor: <span className="font-medium">{appointment.doctor_name}</span></p>
                          <p className="text-xs text-gray-700">Clinic: <span className="font-medium">{appointment.clinic_name}</span></p>
                        </div>
                      </div>
                      {/* Right: Date/Time & Actions */}
                      <div className="flex flex-col text-right gap-2 md:items-end md:justify-end mt-2 md:mt-0">
                        <div>
                          <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded mb-1">
                            {formatDate(appointment.booking_date)}
                          </span>
                          <span className="inline-block bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded ml-2 mb-1">
                            {formatTime(appointment.start_time)}
                          </span>
                        </div>
                        {/* Status badge */}
                        <span className={`inline-block text-xs px-2 py-1 rounded
                ${appointment.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                            appointment.status === "SCHEDULED" ? "bg-yellow-100 text-yellow-700" : appointment.status === "CHECKED IN"
                              ? "bg-blue-100 text-blue-700" :
                              "bg-red-100 text-red-700"}`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                        {/* Status Update buttons */}
                        <div className="flex gap-2 mt-2">
                          {appointment.status === "SCHEDULED" && (
                            <>
                              <Button id="apptCheckIn" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => updateApptStatus(appointment.appointment_id, "CHECKED IN")}>Check In</Button>
                              <Button id="apptNoShow" className="bg-red-100 text-red-600 border-red-200 hover:bg-red-200" onClick={() => updateApptStatus(appointment.appointment_id, "NO SHOW")}>No Show</Button>
                            </>
                          )}
                          {appointment.status === "CHECKED IN" && (
                            <>
                              <Button id="apptCompleted" className="bg-green-600 text-white hover:bg-green-700" onClick={() => updateApptStatus(appointment.appointment_id, "COMPLETED")}>Completed</Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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

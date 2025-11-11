import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/auth-context"
import { connectSocket, disconnectSocket, subscribeToSlots } from "@/lib/socket"
import { cn } from "@/lib/utils"
import { Calendar as CalendarIcon, CheckCircle2, Clock, FileText, User, UserPlus } from "lucide-react"
import { useEffect, useState } from "react"


interface Appointment {
  appointment_id: string
  booking_date: string
  clinic_id: string
  clinic_name: string
  clinic_type?: string
  created_at: string
  doctor_id: string
  doctor_name: string
  end_time: string
  patient_id: string
  patient_name: string
  start_time: string
  status: string
  updated_at: string
  treatmentNote?: {
    id: number
    notes: string
    noteType: string
    createdAt: string
    createdByName?: string
  } | null
}

interface QueueItem extends Appointment {
  queueNumber: number;
  isFastTrack: boolean;
}

export default function StaffDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([])
  const [queueAppointments, setQueueAppointments] = useState<QueueItem[]>([])
  const [currentQueueNumber, setCurrentQueueNumber] = useState<number | null>(null)
  const [isQueuePaused, setIsQueuePaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showWalkInDialog, setShowWalkInDialog] = useState(false)
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState(false)
  
  // Notes dialog state
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [notes, setNotes] = useState("")
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [existingNoteId, setExistingNoteId] = useState<number | null>(null) // Track existing note ID for updates
  
  // Walk-in form data
  const [walkInData, setWalkInData] = useState({
    patientName: "",
    patientPhone: "",
    patientEmail: "",
    date: new Date().toISOString().split('T')[0],
    timeSlot: "",
  })

  // Walk-in specific state
  const [walkInSelectedDate, setWalkInSelectedDate] = useState<Date>()
  const [walkInAvailableDates, setWalkInAvailableDates] = useState<any[]>([])
  const [walkInHighlightedDates, setWalkInHighlightedDates] = useState<Date[]>([])
  const [walkInUnavailableDates, setWalkInUnavailableDates] = useState<Date[]>([])
  type WalkInSlot = { time: string; doctorId: string; doctorName: string; clinicId?: string }
  const [walkInSelectedSlot, setWalkInSelectedSlot] = useState<WalkInSlot | null>(null)

  const baseURL = import.meta.env.VITE_API_BASE_URL;


  // Get staff's clinic from user metadata
  const staffClinicId = user?.user_metadata?.clinicId
  console.log(staffClinicId)

  
  const staffClinicName = user?.user_metadata?.clinicName

  // Fetch appointments for staff's clinic only
  const fetchAppointments = () => {
    setLoading(true);
    const endpoint = staffClinicId 
      ? `${baseURL}/api/appointments/upcoming?clinicId=${staffClinicId}`
      : `${baseURL}/api/appointments/upcoming`;
      
    fetch(endpoint)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        const filteredData = staffClinicName 
          ? data.filter((appt: Appointment) => appt.clinic_name === staffClinicName)
          : data;
        setAppointments(filteredData);
      })
      .catch(err => {
        console.error("Error fetching appointments:", err);
      })
      .finally(() => setLoading(false));
  };

  // Fetch completed appointments with treatment notes
  const fetchCompletedAppointments = async () => {
    try {
      const endpoint = `${baseURL}/api/appointments`;
      const response = await fetch(endpoint);
      const data = await response.json();
      
      // Filter by status and clinic (use clinicId if available, otherwise clinicName)
      const filtered = data.filter((appt: Appointment) => {
        const statusMatch = appt.status === 'COMPLETED' || appt.status === 'NO_SHOW';
        
        // If staffClinicId is available, use it for filtering (more reliable)
        if (staffClinicId) {
          return statusMatch && appt.clinic_id === staffClinicId;
        }
        
        // Otherwise, use clinicName (case-insensitive comparison)
        if (staffClinicName) {
          return statusMatch && 
            appt.clinic_name && 
            appt.clinic_name.toLowerCase().trim() === staffClinicName.toLowerCase().trim();
        }
        
        // If no clinic filter, show all completed appointments
        return statusMatch;
      });
      
      console.log('Completed appointments filtered:', filtered.length, 'out of', data.length);
      console.log('Staff clinic ID:', staffClinicId, 'Staff clinic Name:', staffClinicName);
      
      // Fetch treatment notes for each completed appointment
      const appointmentsWithNotes = await Promise.all(
        filtered.map(async (appt: Appointment) => {
          try {
            const notesResponse = await fetch(`${baseURL}/api/treatment-notes/appointment/${appt.appointment_id}/latest`);
            if (notesResponse.ok) {
              const latestNote = await notesResponse.json();
              return { ...appt, treatmentNote: latestNote };
            }
          } catch (error) {
            // If fetching notes fails, just continue without notes
          }
          return { ...appt, treatmentNote: null };
        })
      );
      
      setCompletedAppointments(appointmentsWithNotes);
    } catch (err) {
      console.error("Error fetching completed appointments:", err);
    }
  };

  // Open treatment notes dialog
  const handleAddNotes = async (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    
    // Try to fetch existing treatment notes for this appointment
    try {
      const response = await fetch(`${baseURL}/api/treatment-notes/appointment/${appointment.appointment_id}/latest`);
      if (response.ok) {
        const latestNote = await response.json();
        setNotes(latestNote.notes || "");
        setExistingNoteId(latestNote.id); // Store the note ID for updates
      } else {
        setNotes("");
        setExistingNoteId(null); // No existing note
      }
    } catch (error) {
      setNotes("");
      setExistingNoteId(null);
    }
    
    setShowNotesDialog(true);
  };

  // Save treatment notes (create new or update existing)
  const handleSaveNotes = async () => {
    if (!selectedAppointment) return;
    
    if (!notes || notes.trim() === "") {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter treatment notes",
      });
      return;
    }
    
    setIsSavingNotes(true);
    try {
      // If existing note exists, update it; otherwise create new one
      const url = existingNoteId 
        ? `${baseURL}/api/treatment-notes/${existingNoteId}`
        : `${baseURL}/api/treatment-notes`;
      
      const method = existingNoteId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          ...(method === 'POST' && { 'X-User-Id': user?.id || '' }) // Only needed for POST
        },
        body: JSON.stringify({
          ...(method === 'POST' && { appointmentId: selectedAppointment.appointment_id }),
          noteType: "TREATMENT_SUMMARY",
          notes: notes.trim()
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `Failed to ${existingNoteId ? 'update' : 'save'} treatment notes`);
      }

      toast({
        title: "Success",
        description: `Treatment notes ${existingNoteId ? 'updated' : 'saved'} successfully`,
      });

      fetchAppointments();
      fetchCompletedAppointments();
      setShowNotesDialog(false);
      setNotes("");
      setExistingNoteId(null);
      setSelectedAppointment(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save treatment notes",
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  type DoctorOption = { value: string; label: string; };

  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [filterDoctor, setFilterDoctor] = useState("All");
  const [filterDate, setFilterDate] = useState("");
  const [filterPatientName, setFilterPatientName] = useState("");

  // Fetch doctors from staff's clinic only
  const fetchDoctors = () => {
    fetch(`${baseURL}/api/doctors`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        const clinicDoctors = staffClinicId 
          ? data.filter((doc: any) => doc.clinicId === staffClinicId)
          : staffClinicName
          ? data.filter((doc: any) => doc.clinicName === staffClinicName)
          : data;
          
        const doctorOptions = clinicDoctors.map((doc: { doctorId: string; doctorName: string }) => ({
          value: doc.doctorId,
          label: doc.doctorName,
        }));
        setDoctorOptions(doctorOptions);
      })
      .catch(err => {
        console.error("Error fetching doctors:", err);
      });
  }

  // Filter Function
  const filteredAppointments = appointments.filter(
    (appt) =>
      (filterDoctor === "All" || appt.doctor_id === filterDoctor) &&
      (!filterDate || appt.booking_date === filterDate) &&
      (!filterPatientName || appt.patient_name.toLowerCase().includes(filterPatientName.toLowerCase()))
  );

  // Update Status
  const updateApptStatus = async (apptId: String, status: String) => {
    const response = await fetch(`${baseURL}/api/appointments/${apptId}/updateStatus/${status}`, {
      method: "PATCH"
    })
    if (!response.ok) throw new Error("Failed to update status");
    fetchAppointments()
    fetchCompletedAppointments()
  }

  // Clear Filter
  const clearFilters = () => {
    setFilterDoctor("All")
    setFilterDate("");
    setFilterPatientName("");
  }

  // Fetch available dates and slots for walk-in (aggregate across all doctors at this clinic)
  useEffect(() => {
    if (!showWalkInDialog) return;

    const ensureDoctorsAndFetch = async () => {
      try {
        // Load doctors if not present
        if (doctorOptions.length === 0) {
          await fetchDoctors();
        }

        const params = new URLSearchParams({});
        if (staffClinicId) params.set("clinicId", staffClinicId);
        // Append all doctorIds so backend returns per-doctor date slots
        (doctorOptions.length ? doctorOptions : []).forEach((opt) => params.append("doctorId", opt.value));

        const res = await fetch(`${baseURL}/api/timeslots/available/dateslots?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch available slots");
        const data = await res.json();

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        function parseTimeToMinutes(timeStr: string): number {
          const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (!match) return 0;
          let [_, h, m, period] = match;
          let hours = parseInt(h);
          const minutes = parseInt(m);
          if (period?.toUpperCase() === "PM" && hours < 12) hours += 12;
          if (period?.toUpperCase() === "AM" && hours === 12) hours = 0;
          return hours * 60 + minutes;
        }

        // Keep dates; for today, keep only future slots
        const filtered = (data || []).map((entry: any) => {
          const dateObj = new Date(entry.date);
          let timeSlots = entry.timeSlots || [];
          if (dateObj.toDateString() === now.toDateString()) {
            timeSlots = timeSlots.filter((slot: any) => {
              const start = (slot.startTime || slot.start_time || '').substring(0,5);
              return parseTimeToMinutes(start) > currentMinutes;
            });
          }
          return { ...entry, timeSlots };
        }).filter((e: any) => e.timeSlots && e.timeSlots.length > 0);

        setWalkInAvailableDates(filtered);
        setWalkInHighlightedDates(filtered.map((d: any) => new Date(d.date)));

        // Build unavailable list for styling only (not disabling)
        const today = new Date();
        today.setHours(0,0,0,0);
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + 7 * 8);
        const allDates: Date[] = [];
        for (let d = new Date(today); d <= maxDate; d.setDate(d.getDate() + 1)) {
          allDates.push(new Date(d));
        }
        const highlightedStrings = new Set(filtered.map((d: any) => new Date(d.date).toDateString()));
        const unavailable = allDates.filter((d) => !highlightedStrings.has(d.toDateString()));
        setWalkInUnavailableDates(unavailable);
      } catch (err) {
        console.error("Error fetching walk-in slots:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch available slots. Please try again.",
        });
      }
    };

    ensureDoctorsAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWalkInDialog, staffClinicId, doctorOptions.length]);

  // WebSocket for real-time slot updates
  useEffect(() => {
    if (!showWalkInDialog) return;

    connectSocket();
    
    const { unsubscribe } = subscribeToSlots((update: any) => {
      if (!update) return;
      const dateStr = update.date || update.booking_date;
      const startStr = update.start_time || update.timeSlot?.split?.("-")?.[0];
      const action = update.action || 'REMOVE';
      if (!dateStr || !startStr || action !== 'REMOVE') return;

      const normalizedStart = (startStr as string).substring(0,5);

      setWalkInAvailableDates((prev) => {
        return prev
          .map((entry: any) => {
            if (entry.date !== dateStr) return entry;
            const newSlots = (entry.timeSlots || []).filter((slot: any) => {
              const s = (slot.startTime || slot.start_time || '').substring(0,5);
              return s !== normalizedStart;
            });
            return { ...entry, timeSlots: newSlots };
          })
          .filter((e: any) => e.timeSlots && e.timeSlots.length > 0);
      });
    });

    return () => {
      unsubscribe();
      disconnectSocket();
    };
  }, [showWalkInDialog]);

  // Generate unique walk-in patient ID
  const generateWalkInPatientId = (): string => {
    return `WALKIN_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  // Handle Walk-in Appointment
  const handleWalkInSubmit = async () => {
    if (!walkInData.patientName || !walkInSelectedDate || !walkInSelectedSlot) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields.",
      });
      return;
    }

    setIsSubmittingWalkIn(true);

    try {
  const [start_time, end_time] = walkInSelectedSlot.time.split("-").map((t) => t.trim());
      const formattedStart = start_time.length > 5 ? start_time.substring(0, 5) : start_time;
      const formattedEnd = end_time.length > 5 ? end_time.substring(0, 5) : end_time;

      const walkInPatientId = generateWalkInPatientId();

      const appointmentRequest = {
        patient_id: walkInPatientId,
        patient_name: walkInData.patientName,
        patient_phone: walkInData.patientPhone || null,
        patient_email: walkInData.patientEmail || null,
        doctor_id: walkInSelectedSlot.doctorId,
        clinic_id: staffClinicId,
        booking_date: walkInSelectedDate.toLocaleDateString("en-CA"),
        start_time: formattedStart,
        end_time: formattedEnd,
      };

      const res = await fetch(`${baseURL}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentRequest),
      });

      if (!res.ok) {
        let message = "Failed to create walk-in appointment";
        try {
          const errJson = await res.json();
          if (errJson?.message) message = errJson.message;
        } catch {}
        toast({
          variant: "destructive",
          title: "Booking failed",
          description: message,
        });
        return;
      }

      toast({
        title: "Walk-in Appointment Created",
        description: `Appointment for ${walkInData.patientName} has been scheduled.`,
      });

      // Reset form
      setWalkInData({
        patientName: "",
        patientPhone: "",
        patientEmail: "",
        date: new Date().toISOString().split('T')[0],
        timeSlot: "",
      });
      setWalkInSelectedDate(undefined);
      setWalkInSelectedSlot(null);
      setWalkInAvailableDates([]);
      setShowWalkInDialog(false);
      fetchAppointments();
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmittingWalkIn(false);
    }
  };

  // Add to queue
  const addToQueue = (appointment: Appointment) => {
    const queueItem: QueueItem = {
      ...appointment,
      queueNumber: queueAppointments.length + 1,
      isFastTrack: false
    };
    setQueueAppointments(prev => [...prev, queueItem]);
    updateApptStatus(appointment.appointment_id, "CHECKED_IN");
    toast({
      title: "Added to Queue",
      description: `Queue number ${queueItem.queueNumber} assigned to ${appointment.patient_name}`,
    });
  };

  useEffect(() => {
    fetchAppointments();
    fetchCompletedAppointments();
    fetchDoctors();
  }, [])

  // Global WebSocket subscription for slot/appointment changes (so no manual refresh needed)
  useEffect(() => {
    // Connect once on dashboard mount
  connectSocket();
    const { unsubscribe } = subscribeToSlots((update: any) => {
      if (!update) return;
      // Any slot removal or change can imply a new appointment booked or rescheduled
      // We simply refetch to keep lists in sync.
      fetchAppointments();
      fetchCompletedAppointments();
    });
    // Fallback: periodic refresh (covers status changes made by other staff users that don't emit websocket events)
    const interval = setInterval(() => {
      fetchAppointments();
      fetchCompletedAppointments();
    }, 15000); // 15s gentle poll
    return () => {
      clearInterval(interval);
      unsubscribe();
      // We intentionally do NOT disconnect socket here to allow other pages to reuse it; disconnect when leaving app entirely.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper function to format date as dd/mm/yyyy
  const formatDate = (dateString: string | number | Date) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  // Helper function to format time as hh:mm AM/PM
  const formatTime = (timeString: any) => {
    if (!timeString) return 'N/A';
    
    // Handle array format [hour, minute, second] from LocalTime
    if (Array.isArray(timeString)) {
      const [hours24, minutes] = timeString;
      let hours = hours24;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
    }
    
    // Handle string format "HH:MM" or "HH:MM:SS"
    if (typeof timeString === 'string') {
      const parts = timeString.split(':');
      if (parts.length < 2) return timeString;
      const [hours24, minutes] = parts;
      let hours = parseInt(hours24);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
    
    return 'N/A';
  };

  return (
    <PageLayout>
      <div className="min-h-[calc(100vh-8rem)] pb-8">
        {/* Heading */}
        <section className="py-6 px-4 bg-gradient-to-r from-green-50 to-blue-50 border-b">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                  Staff Dashboard
                </h3>
                <p className="text-sm text-gray-600">
                  {staffClinicName || "Clinic"} • Manage appointments and patient care
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content with Tabs */}
        <section className="py-6 px-4">
          <div className="container mx-auto max-w-7xl">
            {/* Queue Management Section - Always visible at top */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Queue Control Panel */}
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-lg">Queue Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {currentQueueNumber || '-'}
                      </div>
                      <div className="text-sm text-gray-600">Current Number</div>
                    </div>
                    
                    <div className="space-y-2">
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          if (queueAppointments.length > 0) {
                            const nextQueue = queueAppointments[0];
                            setCurrentQueueNumber(nextQueue.queueNumber);
                            setQueueAppointments(prev => prev.slice(1));
                            toast({
                              title: "Next Patient Called",
                              description: `Now serving number ${nextQueue.queueNumber}`,
                            });
                          }
                        }}
                        disabled={queueAppointments.length === 0 || isQueuePaused}
                      >
                        Call Next
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setIsQueuePaused(!isQueuePaused)}
                      >
                        {isQueuePaused ? "Resume Queue" : "Pause Queue"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Queue Display */}
                <Card className="md:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Waiting List</CardTitle>
                    <span className="text-sm text-gray-500">
                      {queueAppointments.length} waiting
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {queueAppointments.map((appt, index) => (
                        <div
                          key={appt.appointment_id}
                          className={cn(
                            "p-3 rounded-lg border flex items-center justify-between",
                            appt.isFastTrack ? "bg-yellow-50 border-yellow-200" : "bg-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                              appt.isFastTrack ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {appt.queueNumber}
                            </div>
                            <div>
                              <h4 className="font-medium">{appt.patient_name}</h4>
                              <p className="text-sm text-gray-500">{appt.doctor_name}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!appt.isFastTrack && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                                onClick={() => {
                                  const updatedQueue = [...queueAppointments];
                                  const item = updatedQueue.splice(index, 1)[0];
                                  item.isFastTrack = true;
                                  updatedQueue.unshift(item);
                                  setQueueAppointments(updatedQueue);
                                  toast({
                                    title: "Fast-tracked",
                                    description: `${item.patient_name} has been moved to priority queue`,
                                  });
                                }}
                              >
                                Fast-track
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => {
                                setQueueAppointments(prev => 
                                  prev.filter(q => q.appointment_id !== appt.appointment_id)
                                );
                                updateApptStatus(appt.appointment_id, "NO_SHOW");
                              }}
                            >
                              No-show
                            </Button>
                          </div>
                        </div>
                      ))}
                      {queueAppointments.length === 0 && (
                        <div className="text-center py-6 text-gray-500">
                          No patients in queue
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
              {/* Common Filter Card - For Upcoming and Completed Tabs */}
              <Card className="mb-4">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg"></CardTitle>
                  <Button 
                    onClick={() => setShowWalkInDialog(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Walk-in
                  </Button>
                </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm">Patient Name</Label>
                        <Input
                          type="text"
                          placeholder="Search by name..."
                          value={filterPatientName}
                          onChange={e => setFilterPatientName(e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm">Doctor</Label>
                        <Select value={filterDoctor} onValueChange={setFilterDoctor}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="All Doctors" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All">All Doctors</SelectItem>
                            {doctorOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm">Date</Label>
                        <Input
                          type="date"
                          value={filterDate}
                          onChange={e => setFilterDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <Button variant="outline" className="w-full" onClick={clearFilters}>
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              {/* Tabs Switch Panel - After Filter */}
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="upcoming">
                  <Clock className="w-4 h-4 mr-2" />
                  Upcoming
                </TabsTrigger>
                <TabsTrigger value="completed">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Completed
                </TabsTrigger>
              </TabsList>

              {/* Upcoming Tab Content */}
              <TabsContent value="upcoming" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Scheduled Appointments ({filteredAppointments.length})</h3>
                </div>

                {/* Appointments */}
                {loading ? (
                  <Card><CardContent className="py-8 text-center text-gray-500">Loading...</CardContent></Card>
                ) : filteredAppointments.length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-gray-500">No appointments found</CardContent></Card>
                ) : (
                  <div className="space-y-3">
                    {filteredAppointments.map(appt => (
                      <Card key={appt.appointment_id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="bg-green-100 p-2 rounded-full mt-1">
                                <User className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="space-y-1 min-w-0 flex-1">
                                <h4 className="font-semibold text-gray-900">{appt.patient_name}</h4>
                                <p className="text-sm text-gray-600"> {appt.doctor_name}</p>
                                <p className="text-xs text-gray-500">{appt.clinic_name}</p>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">
                                    <CalendarIcon className="w-3 h-3" />
                                    {formatDate(appt.booking_date)}
                                  </span>
                                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(appt.start_time)} - {formatTime(appt.end_time)}
                                  </span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                    appt.status === "SCHEDULED" ? "bg-yellow-100 text-yellow-700" : 
                                    appt.status === "CHECKED_IN" || appt.status === "CHECKED IN" ? "bg-blue-100 text-blue-700" : 
                                    "bg-gray-100 text-gray-700"
                                  }`}>
                                    {appt.status.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                              {appt.status === "SCHEDULED" && (
                                <>
                                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => addToQueue(appt)}>
                                    Add to Queue
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => updateApptStatus(appt.appointment_id, "NO_SHOW")}>
                                    No Show
                                  </Button>
                                </>
                              )}
                              {(appt.status === "CHECKED_IN" || appt.status === "CHECKED IN") && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateApptStatus(appt.appointment_id, "COMPLETED")}>
                                  Complete
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Completed Appointments Tab */}
              <TabsContent value="completed" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Completed & Closed ({completedAppointments.length})</h3>
                </div>

                {completedAppointments.length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-gray-500">No completed appointments</CardContent></Card>
                ) : (
                  <div className="space-y-3">
                    {completedAppointments.map(appt => (
                      <Card key={appt.appointment_id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="bg-gray-100 p-2 rounded-full mt-1">
                                <User className="h-5 w-5 text-gray-600" />
                              </div>
                              <div className="space-y-1 flex-1">
                                <h4 className="font-semibold text-gray-900">{appt.patient_name}</h4>
                                <p className="text-sm text-gray-600"> {appt.doctor_name}</p>
                                <p className="text-xs text-gray-500">{appt.clinic_name}</p>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-700 text-xs px-2 py-0.5 rounded">
                                    <CalendarIcon className="w-3 h-3" />
                                    {formatDate(appt.booking_date)}
                                  </span>
                                  <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-700 text-xs px-2 py-0.5 rounded">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(appt.start_time)} - {formatTime(appt.end_time)}
                                  </span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                    appt.status === "COMPLETED" ? "bg-green-100 text-green-700" : 
                                    appt.status === "NO_SHOW" ? "bg-red-100 text-red-700" : 
                                    "bg-gray-100 text-gray-700"
                                  }`}>
                                    {appt.status.replace('_', ' ')}
                                  </span>
                                </div>
                                {appt.treatmentNote && (
                                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs border border-blue-200">
                                    <p className="font-medium text-blue-900 mb-1">Treatment Summary:</p>
                                    <p className="text-gray-700 whitespace-pre-wrap">{appt.treatmentNote.notes}</p>
                                    {appt.treatmentNote.createdByName && (
                                      <p className="text-gray-500 mt-1 text-xs">
                                        Added by {appt.treatmentNote.createdByName} on {new Date(appt.treatmentNote.createdAt).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="gap-1.5" 
                              onClick={() => handleAddNotes(appt)}
                            >
                              <FileText className="w-4 h-4" />
                              {appt.treatmentNote ? "Edit Treatment Notes" : "Add Treatment Notes"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>

      {/* Treatment Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Treatment Summary / Doctor Notes</DialogTitle>
            <DialogDescription>
              Add treatment summary and notes for {selectedAppointment?.patient_name}'s completed appointment with {selectedAppointment?.doctor_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="notes">Treatment Notes *</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Enter treatment summary, diagnosis, prescribed medications, follow-up instructions, or other relevant notes..."
              className="mt-2 min-h-[200px]"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNotesDialog(false);
              setNotes("");
              setExistingNoteId(null);
              setSelectedAppointment(null);
            }} disabled={isSavingNotes}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} disabled={isSavingNotes || !notes.trim()}>
              {isSavingNotes ? "Saving..." : "Save Treatment Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Walk-in Appointment Sheet */}
      <Sheet open={showWalkInDialog} onOpenChange={(open) => {
        setShowWalkInDialog(open);
        if (!open) {
          // Reset all walk-in state when dialog closes
          setWalkInData({
            patientName: "",
            patientPhone: "",
            patientEmail: "",
            date: new Date().toISOString().split('T')[0],
            timeSlot: "",
          });
          setWalkInSelectedDate(undefined);
          setWalkInSelectedSlot(null);
          setWalkInAvailableDates([]);
          setWalkInHighlightedDates([]);
          setWalkInUnavailableDates([]);
        }
      }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-2xl">Add Walk-in Appointment</SheetTitle>
            <SheetDescription className="text-base">
              Create a walk-in appointment for a patient at {staffClinicName}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-2">
            {/* Patient Information */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-4 w-4" />
                Patient Information
              </h3>
              
              <div>
                <Label htmlFor="patientName" className="text-sm font-medium">
                  Patient Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="patientName"
                  value={walkInData.patientName}
                  onChange={(e) => setWalkInData({ ...walkInData, patientName: e.target.value })}
                  placeholder="Enter patient name"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="patientPhone" className="text-sm font-medium">
                 ne Number (Optional)
                </Label>
                <Input
                  id="patientPhone"
                  type="tel"
                  value={walkInData.patientPhone}
                  onChange={(e) => setWalkInData({ ...walkInData, patientPhone: e.target.value })}
                  placeholder="Enter phone number"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="patientEmail" className="text-sm font-medium">
                  Email (Optional)
                </Label>
                <Input
                  id="patientEmail"
                  type="email"
                  value={walkInData.patientEmail}
                  onChange={(e) => setWalkInData({ ...walkInData, patientEmail: e.target.value })}
                  placeholder="Enter email address"
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* No doctor selection for walk-in; show all available slots for this clinic */}

            {/* Date Selection */}
            {
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Select Date <span className="text-red-500">*</span>
                </Label>
                <Card className="p-4">
                  <Calendar
                    mode="single"
                    selected={walkInSelectedDate}
                    onSelect={(date) => {
                      setWalkInSelectedDate(date);
                      setWalkInSelectedSlot(null); // Reset time slot when date changes
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const maxDate = new Date();
                      maxDate.setDate(today.getDate() + 7 * 8);
                      // Do not disable unavailable dates; just style them red so users can still click and see "No slots"
                      return date < today || date > maxDate;
                    }}
                    modifiers={{
                      available: walkInHighlightedDates,
                      unavailable: walkInUnavailableDates,
                    }}
                    modifiersStyles={{
                      available: { border: "1px solid green", borderRadius: "20px" },
                      unavailable: { border: "1px solid red", borderRadius: "20px" },
                    }}
                    className="rounded-md"
                  />
                </Card>
              </div>
            }

            {/* Time Slot Selection */}
            {walkInSelectedDate && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Select Time Slot <span className="text-red-500">*</span>
                </Label>
                <Card className="p-4">
                  {(() => {
                    const dayEntries = walkInAvailableDates.filter((d: any) => {
                      const dayMatch = new Date(d.date);
                      return walkInSelectedDate && dayMatch.toDateString() === walkInSelectedDate.toDateString();
                    });

                    if (dayEntries.length === 0) {
                      return (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No available slots for this date
                        </p>
                      );
                    }

                    const slots: WalkInSlot[] = dayEntries.flatMap((entry: any) => {
                      const docId = entry.doctorId;
                      const docName = entry.doctorName || "Doctor";
                      const clinicId = entry.clinicId;
                      return (entry.timeSlots || []).map((slot: any) => {
                        const start = (slot.startTime || slot.start_time || "").substring(0,5);
                        const end = (slot.endTime || slot.end_time || "").substring(0,5);
                        return { time: `${start}-${end}`, doctorId: docId, doctorName: docName, clinicId } as WalkInSlot;
                      });
                    });

                    return (
                      <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                        {slots.map((slot, idx: number) => {
                          const isSelected = walkInSelectedSlot?.time === slot.time && walkInSelectedSlot?.doctorId === slot.doctorId;
                          
                          return (
                            <Button
                              key={idx}
                              variant={isSelected ? "default" : "outline"}
                              className={cn(
                                "justify-center h-12 transition-all duration-300 border-green-500 px-3 py-2 text-sm",
                                isSelected && "bg-green-600 hover:bg-green-700 text-white shadow"
                              )}
                              onClick={() => setWalkInSelectedSlot(slot)}
                            >
                              <div className="flex flex-col items-center leading-tight">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span className="font-semibold">{slot.time}</span>
                                </div>
                                <span className="text-[11px] opacity-90">{slot.doctorName}</span>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </Card>
              </div>
            )}
          </div>

          <SheetFooter className="pt-6 gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowWalkInDialog(false);
                setWalkInData({
                  patientName: "",
                  patientPhone: "",
                  patientEmail: "",
                  date: new Date().toISOString().split('T')[0],
                  timeSlot: "",
                });
                setWalkInSelectedDate(undefined);
                setWalkInSelectedSlot(null);
              }} 
              disabled={isSubmittingWalkIn}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleWalkInSubmit} 
              disabled={isSubmittingWalkIn}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isSubmittingWalkIn ? "Creating..." : "Create Appointment"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageLayout>
  )
}

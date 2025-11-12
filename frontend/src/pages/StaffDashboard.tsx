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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { connectSocket, disconnectSocket, subscribeToAppointmentStatus, subscribeToSlots, subscribeToTreatmentNotes, fetchQueueState, subscribeToQueueState } from "@/lib/socket"
import { cn } from "@/lib/utils"
import { AlertTriangle, Calendar as CalendarIcon, CheckCircle, CheckCircle2, Clock, FileText, User, UserPlus } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"


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

interface Appointment {
    appointment_id: string
    booking_date: string | number[]
    clinic_id: string
    clinic_name: string | null
    clinic_type?: string | null
    created_at: string | number[]
    doctor_id: string
    doctor_name: string | null
    end_time: string | number[] | null
    patient_id: string
    patient_name: string | null
    start_time: string | number[] | null
    status: string
    updated_at: string | number[]
    treatmentNote?: {
        id: number
        notes: string
        noteType: string
        createdAt: string
        createdByName?: string
    } | null
}

interface QueueItem extends Appointment {
    queueNumber: number
    isFastTrack: boolean
    position?: number
}

// Helper function to convert queue state response to QueueItem format
const convertQueueStateToItems = (state: { clinicId: string; queueItems: Array<{ appointmentId: string; patientId: string; patientName: string; email: string; phone: string; position: number; queueNumber: number; doctorId: string; doctorName: string; doctorSpeciality: string; createdAt: string }> }): QueueItem[] => {
    return state.queueItems.map((item) => ({
        appointment_id: item.appointmentId,
        patient_id: item.patientId,
        patient_name: item.patientName,
        email: item.email,
        phone: item.phone,
        doctor_id: item.doctorId,
        doctor_name: item.doctorName,
        doctor_speciality: item.doctorSpeciality,
        clinic_id: state.clinicId,
        clinic_name: null,
        booking_date: "",
        start_time: null,
        end_time: null,
        status: "CHECKED-IN",
        created_at: item.createdAt,
        updated_at: item.createdAt,
        queueNumber: item.queueNumber,
        position: item.position,
        // isFastTrack: position 1 with other items in queue suggests fast-track, but we'll reset it on updates
        // Since fast-track moves to position 1, we can infer it's fast-tracked if position is 1 and queue has multiple items
        isFastTrack: item.position === 1 && state.queueItems.length > 1,
    }))
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
    const [showWalkInConfirmDialog, setShowWalkInConfirmDialog] = useState(false)

    // Notes dialog state
    const [showNotesDialog, setShowNotesDialog] = useState(false)
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
    const [notes, setNotes] = useState("")
    const [isSavingNotes, setIsSavingNotes] = useState(false)
    const [existingNoteId, setExistingNoteId] = useState<number | null>(null)

    // Walk-in form data
    const [walkInEmail, setWalkInEmail] = useState("")
    const [emailSuggestions, setEmailSuggestions] = useState<any[]>([])
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
    const [isSearchingEmail, setIsSearchingEmail] = useState(false)

    // Walk-in specific state
    const [walkInSelectedDate, setWalkInSelectedDate] = useState<Date>()
    const [walkInAvailableDates, setWalkInAvailableDates] = useState<any[]>([])
    const [walkInHighlightedDates, setWalkInHighlightedDates] = useState<Date[]>([])
    const [walkInUnavailableDates, setWalkInUnavailableDates] = useState<Date[]>([])
    type WalkInSlot = { time: string; doctorId: string; doctorName: string; clinicId?: string }
    const [walkInSelectedSlot, setWalkInSelectedSlot] = useState<WalkInSlot | null>(null)

    // cancel dialog state
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
    const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null)

    const baseURL = import.meta.env.VITE_API_BASE_URL

    // Resolve staff clinic info: prefer backend value over metadata
    const [staffClinicId, setStaffClinicId] = useState<string | undefined>(user?.user_metadata?.clinicId)
    const [staffClinicName, setStaffClinicName] = useState<string | undefined>(user?.user_metadata?.clinicName)
    const staffPosition = user?.user_metadata.position

    const navigate = useNavigate()


    console.log(staffPosition)
    useEffect(() => {
        const supabaseId = user?.id
        if (!supabaseId) return
        const controller = new AbortController()
        fetch(`${baseURL}/api/users/staff/${supabaseId}`, { signal: controller.signal })
            .then(r => (r.ok ? r.json() : null))
            .then(data => {
                if (!data) return
                if (data.clinic_id) setStaffClinicId(data.clinic_id)
                if (data.clinic_name) setStaffClinicName(data.clinic_name)
            })
            .catch(() => { })
        return () => controller.abort()
    }, [user?.id, baseURL])

    // Fetch appointments for staff's clinic only
    const fetchAppointments = () => {
        setLoading(true)
        const endpoint = staffClinicId
            ? `${baseURL}/api/appointments/clinic/${staffClinicId}`
            : `${baseURL}/api/appointments/upcoming`
        console.log(endpoint)
        fetch(endpoint)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`)
                }
                return response.json()
            })
            .then((data: Appointment[]) => {
                const normalized = data.map(appt => ({
                    ...appt,
                    clinic_id: typeof appt.clinic_id === "string" ? appt.clinic_id.trim() : appt.clinic_id,
                    clinic_name:
                        typeof appt.clinic_name === "string" ? appt.clinic_name.trim() : appt.clinic_name,
                    status: normalizeStatus(appt.status),
                }))

                const filteredData = normalized.filter(appt => {
                    if (staffClinicId) {
                        return appt.clinic_id === staffClinicId
                    }
                    if (staffClinicName) {
                        return (
                            appt.clinic_name &&
                            appt.clinic_name.toLowerCase() === staffClinicName.toLowerCase()
                        )
                    }
                    return true
                })

                console.log("appointments raw:", normalized.length, "filtered:", filteredData.length, {
                    staffClinicId,
                    staffClinicName,
                })

                // Sort by booking date and start time ascending (earliest first)
                const sorted = [...filteredData].sort((a, b) => getApptSortKey(a) - getApptSortKey(b))
                setAppointments(sorted)
            })
            .catch(err => {
                console.error("Error fetching appointments:", err)
            })
            .finally(() => setLoading(false))
    }

    // Fetch completed appointments with treatment notes
    const fetchCompletedAppointments = async () => {
        try {
            const endpoint = `${baseURL}/api/appointments`
            const response = await fetch(endpoint)
            const data: Appointment[] = await response.json()

            const filtered = data.filter(appt => {
                const statusMatch = appt.status === "COMPLETED" || appt.status === "NO_SHOW"

                if (staffClinicId) {
                    return statusMatch && appt.clinic_id === staffClinicId
                }

                if (staffClinicName) {
                    return (
                        statusMatch &&
                        appt.clinic_name &&
                        appt.clinic_name.toLowerCase().trim() === staffClinicName.toLowerCase().trim()
                    )
                }

                return statusMatch
            })

            console.log("Completed appointments filtered:", filtered.length, "out of", data.length)
            console.log("Staff clinic ID:", staffClinicId, "Staff clinic Name:", staffClinicName)

            const appointmentsWithNotes = await Promise.all(
                filtered.map(async (appt: Appointment) => {
                    try {
                        const notesResponse = await fetch(
                            `${baseURL}/api/treatment-notes/appointment/${appt.appointment_id}/latest`
                        )
                        if (notesResponse.ok) {
                            const latestNote = await notesResponse.json()
                            return { ...appt, treatmentNote: latestNote }
                        }
                    } catch (error) {
                        // ignore
                    }
                    return { ...appt, treatmentNote: null }
                })
            )

            setCompletedAppointments(appointmentsWithNotes)
        } catch (err) {
            console.error("Error fetching completed appointments:", err)
        }
    }

    // Open treatment notes dialog
    const handleAddNotes = async (appointment: Appointment) => {
        setSelectedAppointment(appointment)

        try {
            const response = await fetch(
                `${baseURL}/api/treatment-notes/appointment/${appointment.appointment_id}/latest`
            )
            if (response.ok) {
                const latestNote = await response.json()
                setNotes(latestNote.notes || "")
                setExistingNoteId(latestNote.id)
            } else {
                setNotes("")
                setExistingNoteId(null)
            }
        } catch (error) {
            setNotes("")
            setExistingNoteId(null)
        }

        setShowNotesDialog(true)
    }

    // Save treatment notes (create new or update existing)
    const handleSaveNotes = async () => {
        if (!selectedAppointment) return

        if (!notes || notes.trim() === "") {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please enter treatment notes",
            })
            return
        }

        setIsSavingNotes(true)
        try {
            const url = existingNoteId
                ? `${baseURL}/api/treatment-notes/${existingNoteId}`
                : `${baseURL}/api/treatment-notes`

            const method = existingNoteId ? "PUT" : "POST"

            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    ...(method === "POST" && { "X-User-Id": user?.id || "" }),
                },
                body: JSON.stringify({
                    ...(method === "POST" && { appointmentId: selectedAppointment.appointment_id }),
                    noteType: "TREATMENT_SUMMARY",
                    notes: notes.trim(),
                }),
            })

            if (!response.ok) {
                const error = await response.text()
                throw new Error(error || `Failed to ${existingNoteId ? "update" : "save"} treatment notes`)
            }

            toast({
                title: "Success",
                description: `Treatment notes ${existingNoteId ? "updated" : "saved"} successfully`,
            })

            fetchAppointments()
            fetchCompletedAppointments()
            setShowNotesDialog(false)
            setNotes("")
            setExistingNoteId(null)
            setSelectedAppointment(null)
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to save treatment notes",
            })
        } finally {
            setIsSavingNotes(false)
        }
    }

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
            const response = await fetch(`${baseURL}/api/appointments/staff/${appointmentToCancel.appointment_id}`, {
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


    type DoctorOption = { value: string; label: string }

    const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([])
    const [filterDoctor, setFilterDoctor] = useState("All")
    const [filterDate, setFilterDate] = useState<Date | undefined>(undefined)
    const [filterPatientName, setFilterPatientName] = useState("")

    // Fetch doctors from staff's clinic only
    const fetchDoctors = () => {
        fetch(`${baseURL}/api/doctors`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`)
                }
                return response.json()
            })
            .then(data => {
                const clinicDoctors = staffClinicId
                    ? data.filter((doc: any) => doc.clinicId === staffClinicId)
                    : staffClinicName
                        ? data.filter((doc: any) => doc.clinicName === staffClinicName)
                        : data

                const doctorOptions = clinicDoctors.map((doc: { doctorId: string; doctorName: string }) => ({
                    value: doc.doctorId,
                    label: doc.doctorName,
                }))
                setDoctorOptions(doctorOptions)
            })
            .catch(err => {
                console.error("Error fetching doctors:", err)
            })
    }

    // Helper: normalize date to "YYYY-MM-DD" for filtering
    const toIsoDate = (value: string | number[] | Date) => {
        if (Array.isArray(value)) {
            const [year, month, day] = value
            return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        }
        const d = new Date(value)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, "0")
        const day = String(d.getDate()).padStart(2, "0")
        return `${y}-${m}-${day}`
    }

    const dateToYMD = (d?: Date) => {
        if (!d) return undefined
        const yr = d.getFullYear()
        const mo = String(d.getMonth() + 1).padStart(2, "0")
        const da = String(d.getDate()).padStart(2, "0")
        return `${yr}-${mo}-${da}`
    }
    const formatSelectedDate = (d?: Date) => (d ? new Date(d).toLocaleDateString() : "Pick a date")

    // Using real current time for check-in eligibility

    const isEligibleForCheckIn = (appt: Appointment): boolean => {
        if (!appt || !appt.booking_date) return false

        let y: number, m: number, d: number
        if (Array.isArray(appt.booking_date)) {
            ;[y, m, d] = appt.booking_date as number[]
        } else if (typeof appt.booking_date === "string") {
            const match = appt.booking_date.match(/^(\d{4})-(\d{2})-(\d{2})/)
            if (match) {
                y = parseInt(match[1], 10)
                m = parseInt(match[2], 10)
                d = parseInt(match[3], 10)
            } else {
                const dt = new Date(appt.booking_date)
                if (isNaN(dt.getTime())) return false
                y = dt.getFullYear(); m = dt.getMonth() + 1; d = dt.getDate()
            }
        } else {
            const dt = new Date(appt.booking_date as any)
            if (isNaN(dt.getTime())) return false
            y = dt.getFullYear(); m = dt.getMonth() + 1; d = dt.getDate()
        }

        const now = new Date()
        return (
            now.getFullYear() === y &&
            now.getMonth() + 1 === m &&
            now.getDate() === d
        )
    }

    const canAccessNoShow = (appt: Appointment): boolean => {
        if (!appt) return false;

        // Get the appt start datetime using previous logic
        let y: number, m: number, d: number;
        if (Array.isArray(appt.booking_date)) {
            [y, m, d] = appt.booking_date as number[];
        } else if (typeof appt.booking_date === "string") {
            const match = appt.booking_date.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                y = parseInt(match[1], 10);
                m = parseInt(match[2], 10);
                d = parseInt(match[3], 10);
            } else {
                const dt = new Date(appt.booking_date);
                if (isNaN(dt.getTime())) return false;
                y = dt.getFullYear(); m = dt.getMonth() + 1; d = dt.getDate();
            }
        } else {
            const dt = new Date(appt.booking_date as any);
            if (isNaN(dt.getTime())) return false;
            y = dt.getFullYear(); m = dt.getMonth() + 1; d = dt.getDate();
        }

        // Parse start time
        let hh = 0, mm = 0;
        if (Array.isArray(appt.start_time)) {
            const arr = appt.start_time as number[];
            hh = Number(arr[0]) || 0;
            mm = Number(arr[1]) || 0;
        } else if (typeof appt.start_time === "string") {
            const t = appt.start_time.substring(0, 5);
            const [hStr, mStr] = t.split(":");
            hh = parseInt(hStr || "0", 10);
            mm = parseInt(mStr || "0", 10);
        } else {
            return false;
        }

        const start = new Date(y, m - 1, d, hh, mm, 0, 0);
        const now = new Date();

        // Allow access to "No Show" if current time >= appt start time
        return now >= start;
    };



    // Filter Function
    const filteredAppointments = appointments.filter(appt => {
        // Restrict upcoming to SCHEDULED and CHECKED-IN only
        const norm = normalizeStatus(appt.status)
        const statusMatch = norm === "SCHEDULED" || norm === "CHECKED-IN"
        const doctorMatch = filterDoctor === "All" || appt.doctor_id === filterDoctor
        const targetDate = dateToYMD(filterDate)
        const dateMatch = !targetDate || toIsoDate(appt.booking_date) === targetDate
        const nameMatch =
            !filterPatientName ||
            (appt.patient_name || "")
                .toLowerCase()
                .includes(filterPatientName.toLowerCase())

        return statusMatch && doctorMatch && dateMatch && nameMatch
    })

    // Sort filtered list to ensure display is ordered even after in-memory mutations
    filteredAppointments.sort((a, b) => getApptSortKey(a) - getApptSortKey(b))

    // Apply the same filters to completed appointments
    const filteredCompletedAppointments = completedAppointments.filter(appt => {
        const doctorMatch = filterDoctor === "All" || appt.doctor_id === filterDoctor
        const targetDate = dateToYMD(filterDate)
        const dateMatch = !targetDate || toIsoDate(appt.booking_date) === targetDate
        const nameMatch =
            !filterPatientName ||
            (appt.patient_name || "").toLowerCase().includes(filterPatientName.toLowerCase())
        return doctorMatch && dateMatch && nameMatch
    })
    // Optional: keep completed sorted by date/time descending (most recent first)
    filteredCompletedAppointments.sort((a, b) => getApptSortKey(b) - getApptSortKey(a))

    // Normalize status strings to a canonical form used in UI/logic (use function declaration for hoisting)
    function normalizeStatus(s?: string) {
        const u = String(s || "").toUpperCase().replace(/\s+/g, "-").replace(/_/g, "-")
        if (u === "CHECKED-IN") return "CHECKED-IN"
        if (u === "COMPLETED") return "COMPLETED"
        if (u === "NO-SHOW") return "NO_SHOW"
        return u
    }

    // Update Status
    const updateApptStatus = async (apptId: String, status: String) => {
        const response = await fetch(
            `${baseURL}/api/appointments/${apptId}/updateStatus/${status}`,
            {
                method: "PATCH",
            }
        )
        if (!response.ok) throw new Error("Failed to update status")
        fetchAppointments()
        fetchCompletedAppointments()
    }

    // Backend-driven call next
    const handleCallNext = async () => {
        if (!staffClinicId) {
            toast({
                variant: "destructive",
                title: "Missing clinic",
                description: "Cannot call next without clinic context",
            })
            return
        }

        if (queueAppointments.length === 0) {
            toast({
                variant: "default",
                title: "Queue is empty",
                description: "No patients waiting in queue",
            })
            return
        }

        console.log('[StaffDashboard] Calling next for clinicId:', staffClinicId)
        try {
            const res = await fetch(`${baseURL}/api/queue/call-next`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clinicId: staffClinicId,
                    doctorId: null, // Optional: can be set if needed
                }),
            })

            if (!res.ok) {
                let msg = `Call next failed (${res.status})`
                try {
                    const j = await res.json()
                    if (j?.message) msg = j.message
                } catch { }
                throw new Error(msg)
            }

            const data = await res.json()

            // Check if queue is empty
            if (data.message === "Queue is empty") {
                toast({
                    variant: "default",
                    title: "Queue is empty",
                    description: "No more patients in queue",
                })
                // Queue state will be updated via SSE
                return
            }

            // Success - queue state will be updated automatically via SSE
            toast({
                title: "Next Patient Called",
                description: `Now serving number ${data.nowServing}`,
            })
        } catch (err: any) {
            console.error("Call next error:", err)
            toast({
                variant: "destructive",
                title: "Call next failed",
                description: err?.message || "Unable to call next patient",
            })
        }
    }

    // Backend-driven fast-track
    const handleFastTrack = async (appointmentId: string, patientName: string) => {
        if (!staffClinicId) {
            toast({
                variant: "destructive",
                title: "Missing clinic",
                description: "Cannot fast-track without clinic context",
            })
            return
        }

        try {
            const res = await fetch(`${baseURL}/api/queue/fast-forward`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appointmentId: appointmentId,
                }),
            })

            if (!res.ok) {
                let msg = `Fast-track failed (${res.status})`
                try {
                    const j = await res.json()
                    if (j?.message) msg = j.message
                } catch { }
                throw new Error(msg)
            }

            await res.json() // Response handled, queue state will be updated via SSE

            // Success - queue state will be updated automatically via SSE
            toast({
                title: "Fast-tracked",
                description: `${patientName || "Patient"} has been moved to priority queue`,
            })
        } catch (err: any) {
            console.error("Fast-track error:", err)
            toast({
                variant: "destructive",
                title: "Fast-track failed",
                description: err?.message || "Unable to fast-track patient",
            })
        }
    }

    // Backend-driven remove from queue (no-show)
    const handleRemoveFromQueue = async (appointmentId: string, patientName: string) => {
        if (!staffClinicId) {
            toast({
                variant: "destructive",
                title: "Missing clinic",
                description: "Cannot remove from queue without clinic context",
            })
            return
        }

        try {
            const res = await fetch(`${baseURL}/api/queue/remove`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appointmentId: appointmentId,
                }),
            })

            if (!res.ok) {
                let msg = `Remove failed (${res.status})`
                try {
                    const j = await res.json()
                    if (j?.message) msg = j.message
                } catch { }
                throw new Error(msg)
            }

            await res.json() // Response handled, queue state will be updated via SSE

            // Success - queue state will be updated automatically via SSE
            toast({
                title: "Patient Removed",
                description: `${patientName || "Patient"} has been removed from queue and marked as NO_SHOW`,
            })
        } catch (err: any) {
            console.error("Remove from queue error:", err)
            toast({
                variant: "destructive",
                title: "Remove failed",
                description: err?.message || "Unable to remove patient from queue",
            })
        }
    }

    // Clear Filter
    const clearFilters = () => {
        setFilterDoctor("All")
        setFilterDate(undefined)
        setFilterPatientName("")
    }

    // Fetch available dates and slots for walk-in (aggregate across all doctors at this clinic)
    useEffect(() => {
        if (!showWalkInDialog) return

        const ensureDoctorsAndFetch = async () => {
            try {
                if (doctorOptions.length === 0) {
                    await fetchDoctors()
                }

                const params = new URLSearchParams({})
                if (staffClinicId) params.set("clinicId", staffClinicId)
                    ; (doctorOptions.length ? doctorOptions : []).forEach(opt =>
                        params.append("doctorId", opt.value)
                    )

                const res = await fetch(
                    `${baseURL}/api/timeslots/available/dateslots?${params.toString()}`
                )
                if (!res.ok) throw new Error("Failed to fetch available slots")
                const data = await res.json()

                const now = new Date()
                const currentMinutes = now.getHours() * 60 + now.getMinutes()
                function parseTimeToMinutes(timeStr: string): number {
                    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i)
                    if (!match) return 0
                    let [, h, m, period] = match
                    let hours = parseInt(h)
                    const minutes = parseInt(m)
                    if (period?.toUpperCase() === "PM" && hours < 12) hours += 12
                    if (period?.toUpperCase() === "AM" && hours === 12) hours = 0
                    return hours * 60 + minutes
                }

                const filtered = (data || [])
                    .map((entry: any) => {
                        const dateObj = new Date(entry.date)
                        let timeSlots = entry.timeSlots || []
                        if (dateObj.toDateString() === now.toDateString()) {
                            timeSlots = timeSlots.filter((slot: any) => {
                                const start = (slot.startTime || slot.start_time || "").substring(0, 5)
                                return parseTimeToMinutes(start) > currentMinutes
                            })
                        }
                        return { ...entry, timeSlots }
                    })
                    .filter((e: any) => e.timeSlots && e.timeSlots.length > 0)

                setWalkInAvailableDates(filtered)
                setWalkInHighlightedDates(filtered.map((d: any) => new Date(d.date)))

                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const maxDate = new Date()
                maxDate.setDate(today.getDate() + 7 * 8)
                const allDates: Date[] = []
                for (let d = new Date(today); d <= maxDate; d.setDate(d.getDate() + 1)) {
                    allDates.push(new Date(d))
                }
                const highlightedStrings = new Set(
                    filtered.map((d: any) => new Date(d.date).toDateString())
                )
                const unavailable = allDates.filter(d => !highlightedStrings.has(d.toDateString()))
                setWalkInUnavailableDates(unavailable)
            } catch (err) {
                console.error("Error fetching walk-in slots:", err)
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to fetch available slots. Please try again.",
                })
            }
        }

        ensureDoctorsAndFetch()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showWalkInDialog, staffClinicId, doctorOptions.length])

    // WebSocket for real-time slot updates
    useEffect(() => {
        if (!showWalkInDialog) return

        connectSocket()

        const { unsubscribe } = subscribeToSlots((update: any) => {
            if (!update) return


            const dateStr = update.date || update.booking_date
            const startStr = update.start_time || update.timeSlot?.split?.("-")?.[0]
            const action = update.action || "REMOVE"

            console.log("[StaffDashboard] 📋 Parsed update:", {
                dateStr,
                startStr,
                action,
            })

            if (!dateStr || !startStr || action !== "REMOVE") {
                console.log(
                    "[StaffDashboard] ⏭️ Ignoring update (missing data or non-REMOVE action)"
                )
                return
            }

            const normalizedStart = (startStr as string).substring(0, 5)

            setWalkInAvailableDates(prev => {
                console.log("[StaffDashboard] 📊 Current walkInAvailableDates:", prev)

                if (!prev || prev.length === 0) {
                    console.log("[StaffDashboard] ⚠️ No available dates to filter")
                    return prev
                }

                let removedCount = 0
                const next = prev
                    .map((entry: any) => {
                        let entryDateStr = ""
                        if (Array.isArray(entry.date)) {
                            const [year, month, day] = entry.date
                            entryDateStr = `${year}-${String(month).padStart(2, "0")}-${String(
                                day
                            ).padStart(2, "0")}`
                        } else if (typeof entry.date === "string") {
                            entryDateStr = entry.date
                        } else {
                            entryDateStr = String(entry.date)
                        }

                        console.log("[StaffDashboard] 🔍 Checking entry:", {
                            entryDate: entry.date,
                            entryDateNormalized: entryDateStr,
                            slotCount: entry.timeSlots?.length,
                        })

                        if (entryDateStr !== dateStr) {
                            console.log(
                                `[StaffDashboard] ❌ Date mismatch: ${entryDateStr} !== ${dateStr}`
                            )
                            return entry
                        }

                        console.log("[StaffDashboard] ✅ Entry matches date, filtering slots...")

                        const newSlots = (entry.timeSlots || []).filter((slot: any) => {
                            const s = (slot.startTime || slot.start_time || "").substring(0, 5)
                            const keep = s !== normalizedStart

                            if (!keep) {
                                removedCount++
                                console.log(
                                    `[StaffDashboard] 🗑️ REMOVING slot: ${s} (matches ${normalizedStart})`
                                )
                            } else {
                                console.log(`[StaffDashboard] ✓ Keeping slot: ${s}`)
                            }

                            return keep
                        })

                        return { ...entry, timeSlots: newSlots }
                    })
                    .filter((e: any) => e.timeSlots && e.timeSlots.length > 0)

                if (removedCount > 0) {
                    console.log(
                        `[StaffDashboard] ✅ Successfully removed ${removedCount} slot(s)`
                    )
                } else {
                    console.warn(
                        "[StaffDashboard] ⚠️ No matching slot found to remove for",
                        {
                            dateStr,
                            normalizedStart,
                            availableEntriesCount: prev.length,
                        }
                    )
                }

                console.log("[StaffDashboard] 📊 Updated walkInAvailableDates:", next)
                return next
            })
        })

        return () => {
            unsubscribe()
            disconnectSocket()
        }
    }, [showWalkInDialog])

    // Handle Walk-in Appointment
    const handleWalkInSubmit = async () => {
        if (!walkInEmail || !walkInSelectedDate || !walkInSelectedSlot) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please fill in email, date and time slot.",
            })
            return
        }

        if (!selectedPatient) {
            toast({
                variant: "destructive",
                title: "Unregistered Email",
                description: "Patient is not registered. Create account before booking.",
            })
            return
        }

        setIsSubmittingWalkIn(true)

        try {
            const [start_time, end_time] = walkInSelectedSlot.time
                .split("-")
                .map(t => t.trim())
            const formattedStart = start_time.length > 5 ? start_time.substring(0, 5) : start_time
            const formattedEnd = end_time.length > 5 ? end_time.substring(0, 5) : end_time

            const walkInPatientId = selectedPatient?.supabase_user_id
            if (!walkInPatientId) throw new Error("Missing patient ID")

            const appointmentRequest = {
                patient_id: walkInPatientId,
                doctor_id: walkInSelectedSlot.doctorId,
                clinic_id: staffClinicId,
                booking_date: walkInSelectedDate.toLocaleDateString("en-CA"),
                start_time: formattedStart,
                end_time: formattedEnd,
                type: "WALK_IN",
            }

            const res = await fetch(`${baseURL}/api/appointments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(appointmentRequest),
            })

            if (!res.ok) {
                let message = "Failed to create walk-in appointment"
                try {
                    const errJson = await res.json()
                    if (errJson?.message) message = errJson.message
                } catch { }
                toast({
                    variant: "destructive",
                    title: "Booking failed",
                    description: message,
                })
                return
            }

            toast({
                title: "Walk-in Appointment Created",
                description: `Appointment for ${selectedPatient.first_name} ${selectedPatient.last_name} has been scheduled.`,
            })

            setWalkInEmail("")
            setEmailSuggestions([])
            setSelectedPatient(null)
            setWalkInSelectedDate(undefined)
            setWalkInSelectedSlot(null)
            setWalkInAvailableDates([])
            setShowWalkInDialog(false)
            fetchAppointments()
        } catch (err) {
            console.error(err)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Something went wrong. Please try again.",
            })
        } finally {
            setIsSubmittingWalkIn(false)
        }
    }

    // Validate walk-in form before confirmation
    const validateWalkIn = (): string | null => {
        if (!walkInEmail) return "Please enter patient email."
        if (!selectedPatient) return "Patient is not registered. Create account before booking."
        if (!walkInSelectedDate) return "Please select a date."
        if (!walkInSelectedSlot) return "Please select a time slot."
        if (!staffClinicId) return "Missing clinic context for staff user."
        return null
    }

    const handleWalkInConfirmClick = () => {
        const err = validateWalkIn()
        if (err) {
            toast({ variant: "destructive", title: "Missing Information", description: err })
            return
        }
        setShowWalkInConfirmDialog(true)
    }

    // Backend-driven check-in
    const handleCheckIn = async (appointment: Appointment) => {
        if (!staffClinicId) {
            toast({
                variant: "destructive",
                title: "Missing clinic",
                description: "Cannot check in without clinic context",
            })
            return
        }
        try {
            const res = await fetch(`${baseURL}/api/queue/checkin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clinicId: staffClinicId,
                    appointmentId: appointment.appointment_id,
                    patientId: appointment.patient_id,
                    doctorId: appointment.doctor_id || null,
                }),
            })
            if (!res.ok) {
                let msg = `Check-in failed (${res.status})`
                try {
                    const j = await res.json()
                    if (j?.message) msg = j.message
                } catch { }
                throw new Error(msg)
            }
            const data = await res.json()
            const queueNumber = data.queueNumber
            const position = data.position
            // Queue state will be updated automatically via SSE
            toast({
                title: "Checked In",
                description: `${appointment.patient_name || "Patient"} queued (ticket ${queueNumber}, position ${position})`,
            })
            fetchAppointments()
            fetchCompletedAppointments()
        } catch (err: any) {
            console.error("Check-in error:", err)
            toast({
                variant: "destructive",
                title: "Check-in failed",
                description: err?.message || "Unable to check in appointment",
            })
        }
    }

    useEffect(() => {
        fetchAppointments()
        fetchCompletedAppointments()
        fetchDoctors()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Refetch when clinic context resolves/changes to avoid stale initial data
    useEffect(() => {
        if (staffClinicId || staffClinicName) {
            fetchAppointments()
            fetchCompletedAppointments()
            fetchDoctors()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [staffClinicId, staffClinicName])

    // Global WebSocket subscription for slot/appointment changes
    useEffect(() => {
        connectSocket()
        const statusSub = subscribeToAppointmentStatus((update: any) => {
            // Handle appointment status events without full refetch when possible
            try {
                const apptId: string | undefined = update?.appointmentId || update?.appointment_id || update?.id
                const rawStatus: string | undefined = update?.status
                const updateClinicId: string | undefined = update?.clinicId || update?.clinic_id
                if (!apptId || !rawStatus) return

                // Ignore events from other clinics when clinic context is known
                if (staffClinicId && updateClinicId && updateClinicId !== staffClinicId) return

                const status = normalizeStatus(rawStatus)

                // On CHECKED-IN, just update the item in-memory for a snappier nurse UI
                if (status === "CHECKED-IN") {
                    const exists = appointments.some(a => a.appointment_id === apptId)
                    if (exists) {
                        setAppointments(prev => prev.map(a => (a.appointment_id === apptId ? { ...a, status: "CHECKED-IN" } : a)))
                        return
                    }
                    // If we don't have it locally (rare), fall back to a single refetch
                    fetchAppointments()
                    return
                }

                // For terminal states (COMPLETED/NO_SHOW), keep refetch to ensure both lists are consistent
                if (status === "COMPLETED" || status === "NO_SHOW") {
                    fetchAppointments()
                    fetchCompletedAppointments()
                    return
                }

                // Unknown status: default to safe refetch
                fetchAppointments()
                fetchCompletedAppointments()
            } catch {
                fetchAppointments()
            }
        })

        return () => {
            if (statusSub) statusSub.unsubscribe()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [staffClinicId, appointments])

    // Load initial queue state and subscribe to SSE updates
    useEffect(() => {
        if (!staffClinicId) {
            // Clear queue if no clinic context
            setQueueAppointments([])
            setCurrentQueueNumber(null)
            return
        }

        // Load initial queue state on startup
        const loadInitialQueueState = async () => {
            try {
                const state = await fetchQueueState(staffClinicId)
                const queueItems = convertQueueStateToItems(state)
                setQueueAppointments(queueItems)
                setCurrentQueueNumber(state.nowServing)
                console.log('[StaffDashboard] Initial queue state loaded:', {
                    clinicId: staffClinicId,
                    queueLength: queueItems.length,
                    nowServing: state.nowServing
                })
            } catch (err) {
                console.error('[StaffDashboard] Failed to fetch initial queue state:', err)
                toast({
                    variant: "destructive",
                    title: "Failed to load queue",
                    description: "Unable to load queue state. Please refresh the page.",
                })
            }
        }

        loadInitialQueueState()

        // Subscribe to queue state updates via SSE
        const { close } = subscribeToQueueState(
            staffClinicId,
            (update) => {
                console.log('[StaffDashboard] Queue state update received:', update)
                const queueItems = convertQueueStateToItems(update)
                setQueueAppointments(queueItems)
                setCurrentQueueNumber(update.nowServing)
            },
            (error) => {
                console.error('[StaffDashboard] Queue SSE error:', error)
            }
        )

        return () => {
            close()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [staffClinicId])

    // Listen for treatment note updates to refresh or patch completed items in receptionist view
    useEffect(() => {
        const notesSub = subscribeToTreatmentNotes((payload: any) => {
            try {
                const apptId: string | undefined = payload?.appointmentId || payload?.appointment_id
                if (!apptId) return

                // If receptionist has this appointment in completed list, patch note; else fetch once
                const idx = completedAppointments.findIndex(a => a.appointment_id === apptId)
                if (idx >= 0) {
                    const latest = {
                        id: payload.noteId,
                        notes: payload.notes,
                        noteType: payload.noteType || 'TREATMENT_SUMMARY',
                        createdAt: payload.createdAt || payload.updatedAt || new Date().toISOString(),
                        createdByName: payload.createdByName,
                    }
                    setCompletedAppointments(prev => prev.map((a, i) => i === idx ? { ...a, treatmentNote: latest } : a))
                } else {
                    // Fallback: refresh completed list once
                    fetchCompletedAppointments()
                }
            } catch {
                fetchCompletedAppointments()
            }
        })

        // Ensure cleanup doesn't throw if subs are not available
        return () => {
            try { notesSub && notesSub.unsubscribe && notesSub.unsubscribe() } catch { }
            // keep socket globally if other pages reuse it
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [completedAppointments])

    // Helper function to format date as dd/mm/yyyy
    const formatDate = (value: string | number[] | Date) => {
        let date: Date

        if (Array.isArray(value)) {
            const [year, month, day] = value
            date = new Date(year, month - 1, day)
        } else {
            date = new Date(value)
        }

        if (isNaN(date.getTime())) return "N/A"

        const day = String(date.getDate()).padStart(2, "0")
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
    }

    // Helper function to format time as hh:mm AM/PM
    const formatTime = (timeString: string | number[] | null | undefined) => {
        if (!timeString) return "N/A"

        if (Array.isArray(timeString)) {
            const [hours24, minutes] = timeString
            let hours = hours24 as number
            const ampm = hours >= 12 ? "PM" : "AM"
            hours = hours % 12 || 12
            return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`
        }

        const parts = timeString.split(":")
        if (parts.length < 2) return timeString
        const [hours24Str, minutes] = parts
        let hours = parseInt(hours24Str, 10)
        const ampm = hours >= 12 ? "PM" : "AM"
        hours = hours % 12 || 12
        return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`
    }

    // Compute a numeric sort key for an appointment using booking_date + start_time
    function getApptSortKey(appt: Appointment): number {
        const iso = toIsoDate(appt.booking_date)
        let hh = 0, mm = 0
        if (Array.isArray(appt.start_time)) {
            const [h, m] = appt.start_time as number[]
            hh = Number(h) || 0
            mm = Number(m) || 0
        } else if (typeof appt.start_time === "string" && appt.start_time) {
            const [h, m] = appt.start_time.substring(0, 5).split(":")
            hh = Number(h) || 0
            mm = Number(m) || 0
        }
        // Build Date using local time
        const [y, mo, d] = iso.split("-").map(n => Number(n))
        const dt = new Date(y, (mo || 1) - 1, d || 1, hh, mm, 0, 0)
        return dt.getTime()
    }

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
                        {/* Queue Management Section */}
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
                                                {currentQueueNumber || "-"}
                                            </div>
                                            <div className="text-sm text-gray-600">Current Number</div>
                                        </div>

                                        <div className="space-y-2">
                                            <Button
                                                className="w-full bg-blue-600 hover:bg-blue-700"
                                                onClick={handleCallNext}
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
                                                        appt.isFastTrack
                                                            ? "bg-yellow-50 border-yellow-200"
                                                            : "bg-white"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                                                                appt.isFastTrack
                                                                    ? "bg-yellow-100 text-yellow-700"
                                                                    : "bg-blue-100 text-blue-700"
                                                            )}
                                                        >
                                                            {appt.queueNumber}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium">
                                                                {appt.patient_name || "Unknown patient"}
                                                            </h4>
                                                            <p className="text-sm text-gray-500">
                                                                {appt.doctor_name || appt.doctor_id || "Unknown doctor"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {!appt.isFastTrack && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                                                                onClick={() => {
                                                                    handleFastTrack(appt.appointment_id, appt.patient_name || "Patient")
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
                                                                handleRemoveFromQueue(appt.appointment_id, appt.patient_name || "Patient")
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
                            {/* Filter Card */}
                            <Card className="mb-4">
                                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg"></CardTitle>
                                    {staffPosition === "receptionist" && (
                                        <Button
                                            onClick={() => setShowWalkInDialog(true)}
                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md"
                                        >
                                            <UserPlus className="h-4 w-4" />
                                            Add Walk-in
                                        </Button>
                                    )}
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
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label className="text-sm">Date</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-start mt-1">
                                                        {formatSelectedDate(filterDate)}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={filterDate} onSelect={setFilterDate} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        <div className="flex items-end">
                                            <Button variant="outline" className="w-full" onClick={clearFilters}>
                                                Clear Filters
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Tabs Header */}
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

                            {/* Upcoming Tab */}
                            <TabsContent value="upcoming" className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">
                                        Scheduled Appointments ({filteredAppointments.length})
                                    </h3>
                                </div>

                                {loading ? (
                                    <Card>
                                        <CardContent className="py-8 text-center text-gray-500">
                                            Loading...
                                        </CardContent>
                                    </Card>
                                ) : filteredAppointments.length === 0 ? (
                                    <Card>
                                        <CardContent className="py-8 text-center text-gray-500">
                                            No appointments found
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredAppointments.map(appt => (
                                            <Card
                                                key={appt.appointment_id}
                                                className="hover:shadow-md transition-shadow"
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                        <div className="flex items-start gap-3 flex-1">
                                                            <div className="bg-green-100 p-2 rounded-full mt-1">
                                                                <User className="h-5 w-5 text-green-600" />
                                                            </div>
                                                            <div className="space-y-1 min-w-0 flex-1">
                                                                <h4 className="font-semibold text-gray-900">
                                                                    {appt.patient_name || "Unknown patient"}
                                                                </h4>
                                                                <p className="text-sm text-gray-600">
                                                                    {appt.doctor_name || appt.doctor_id || "Unknown doctor"}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {appt.clinic_name || appt.clinic_id || "Unknown clinic"}
                                                                </p>
                                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">
                                                                        <CalendarIcon className="w-3 h-3" />
                                                                        {formatDate(appt.booking_date)}
                                                                    </span>
                                                                    <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded">
                                                                        <Clock className="w-3 h-3" />
                                                                        {formatTime(appt.start_time)} -{" "}
                                                                        {formatTime(appt.end_time)}
                                                                    </span>
                                                                    <span
                                                                        className={`text-xs font-medium px-2 py-0.5 rounded ${appt.status === "SCHEDULED"
                                                                            ? "bg-yellow-100 text-yellow-700"
                                                                            : appt.status === "CHECKED_IN" ||
                                                                                appt.status === "CHECKED-IN" ||
                                                                                appt.status === "CHECKED IN"
                                                                                ? "bg-blue-100 text-blue-700"
                                                                                : "bg-gray-100 text-gray-700"
                                                                            }`}
                                                                    >
                                                                        {appt.status.replace("_", " ")}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                                                            {appt.status === "SCHEDULED" && staffPosition === "receptionist" && (
                                                                <>
                                                                    {isEligibleForCheckIn(appt) && (
                                                                        <Button
                                                                            size="sm"
                                                                            className="bg-blue-600 hover:bg-blue-700"
                                                                            onClick={() => handleCheckIn(appt)}
                                                                        >
                                                                            Check In
                                                                        </Button>
                                                                    )}
                                                                    {canAccessNoShow(appt) && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="text-red-600 hover:bg-red-50"
                                                                            onClick={() =>
                                                                                updateApptStatus(appt.appointment_id, "NO_SHOW")
                                                                            }
                                                                        >
                                                                            No Show
                                                                        </Button>
                                                                    )}
                                                                    {!canAccessNoShow(appt) && (
                                                                        <>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                                                                onClick={() => handleRescheduleAppointment(appt)}
                                                                            >
                                                                                Reschedule
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="text-red-600 hover:bg-red-50"
                                                                                onClick={() => handleAskCancel(appt)}
                                                                            >
                                                                                Cancel
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                            {(appt.status === "CHECKED_IN" ||
                                                                appt.status === "CHECKED IN" ||
                                                                appt.status === "CHECKED-IN") &&
                                                                staffPosition === "nurse" && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="bg-green-600 hover:bg-green-700"
                                                                        onClick={() =>
                                                                            updateApptStatus(appt.appointment_id, "COMPLETED")
                                                                        }
                                                                    >
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

                            {/* Completed Tab */}
                            <TabsContent value="completed" className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">
                                        Completed & Closed ({filteredCompletedAppointments.length})
                                    </h3>
                                </div>

                                {filteredCompletedAppointments.length === 0 ? (
                                    <Card>
                                        <CardContent className="py-8 text-center text-gray-500">
                                            No completed appointments
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredCompletedAppointments.map(appt => (
                                            <Card
                                                key={appt.appointment_id}
                                                className="hover:shadow-md transition-shadow"
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                                                        <div className="flex items-start gap-3 flex-1">
                                                            <div className="bg-gray-100 p-2 rounded-full mt-1">
                                                                <User className="h-5 w-5 text-gray-600" />
                                                            </div>
                                                            <div className="space-y-1 flex-1">
                                                                <h4 className="font-semibold text-gray-900">
                                                                    {appt.patient_name || "Unknown patient"}
                                                                </h4>
                                                                <p className="text-sm text-gray-600">
                                                                    {appt.doctor_name || appt.doctor_id || "Unknown doctor"}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {appt.clinic_name || appt.clinic_id || "Unknown clinic"}
                                                                </p>
                                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                    <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-700 text-xs px-2 py-0.5 rounded">
                                                                        <CalendarIcon className="w-3 h-3" />
                                                                        {formatDate(appt.booking_date)}
                                                                    </span>
                                                                    <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-700 text-xs px-2 py-0.5 rounded">
                                                                        <Clock className="w-3 h-3" />
                                                                        {formatTime(appt.start_time)} -{" "}
                                                                        {formatTime(appt.end_time)}
                                                                    </span>
                                                                    <span
                                                                        className={`text-xs font-medium px-2 py-0.5 rounded ${appt.status === "COMPLETED"
                                                                            ? "bg-green-100 text-green-700"
                                                                            : appt.status === "NO_SHOW"
                                                                                ? "bg-red-100 text-red-700"
                                                                                : "bg-gray-100 text-gray-700"
                                                                            }`}
                                                                    >
                                                                        {appt.status.replace("_", " ")}
                                                                    </span>
                                                                </div>
                                                                {appt.treatmentNote && (
                                                                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs border border-blue-200">
                                                                        <p className="font-medium text-blue-900 mb-1">
                                                                            Treatment Summary:
                                                                        </p>
                                                                        <p className="text-gray-700 whitespace-pre-wrap">
                                                                            {appt.treatmentNote.notes}
                                                                        </p>
                                                                        {appt.treatmentNote.createdByName && (
                                                                            <p className="text-gray-500 mt-1 text-xs">
                                                                                Added by {appt.treatmentNote.createdByName} on{" "}
                                                                                {new Date(
                                                                                    appt.treatmentNote.createdAt
                                                                                ).toLocaleDateString()}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {staffPosition === "nurse" && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="gap-1.5"
                                                                onClick={() => handleAddNotes(appt)}
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                                {appt.treatmentNote
                                                                    ? "Edit Treatment Notes"
                                                                    : "Add Treatment Notes"}
                                                            </Button>
                                                        )}
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
                            Add treatment summary and notes for{" "}
                            {selectedAppointment?.patient_name || "this patient"}'s completed
                            appointment with{" "}
                            {selectedAppointment?.doctor_name || selectedAppointment?.doctor_id}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Label htmlFor="notes">Treatment Notes *</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                setNotes(e.target.value)
                            }
                            placeholder="Enter treatment summary, diagnosis, prescribed medications, follow-up instructions, or other relevant notes..."
                            className="mt-2 min-h-[200px]"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowNotesDialog(false)
                                setNotes("")
                                setExistingNoteId(null)
                                setSelectedAppointment(null)
                            }}
                            disabled={isSavingNotes}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSaveNotes} disabled={isSavingNotes || !notes.trim()}>
                            {isSavingNotes ? "Saving..." : "Save Treatment Notes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Walk-in Appointment Sheet */}
            <Sheet
                open={showWalkInDialog}
                onOpenChange={open => {
                    setShowWalkInDialog(open)
                    if (!open) {
                        setWalkInEmail("")
                        setEmailSuggestions([])
                        setSelectedPatient(null)
                        setWalkInSelectedDate(undefined)
                        setWalkInSelectedSlot(null)
                        setWalkInAvailableDates([])
                        setWalkInHighlightedDates([])
                        setWalkInUnavailableDates([])
                    }
                }}
            >
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    <SheetHeader className="pb-6">
                        <SheetTitle className="text-2xl">Add Walk-in Appointment</SheetTitle>
                        <SheetDescription className="text-base">
                            Create a walk-in appointment for a patient at {staffClinicName}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6 py-2">
                        {/* Patient Email Only */}
                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Patient Email
                            </h3>
                            <div>
                                <Label htmlFor="patientEmail" className="text-sm font-medium">
                                    Email <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="patientEmail"
                                    type="email"
                                    value={walkInEmail}
                                    onChange={e => {
                                        const val = e.target.value
                                        setWalkInEmail(val)
                                        setSelectedPatient(null)
                                        if (val && val.length >= 2) {
                                            setIsSearchingEmail(true)
                                            const controller = new AbortController()
                                            fetch(
                                                `${baseURL}/api/users/patients/search?q=${encodeURIComponent(val)}`,
                                                { signal: controller.signal }
                                            )
                                                .then(r => (r.ok ? r.json() : []))
                                                .then(arr =>
                                                    setEmailSuggestions(Array.isArray(arr) ? arr.slice(0, 8) : [])
                                                )
                                                .catch(() => setEmailSuggestions([]))
                                                .finally(() => setIsSearchingEmail(false))
                                        } else {
                                            setEmailSuggestions([])
                                        }
                                    }}
                                    placeholder="Enter patient email"
                                    className="mt-1.5"
                                />
                                {/* Suggestions */}
                                {walkInEmail && emailSuggestions.length > 0 && (
                                    <div className="mt-2 border rounded-md bg-white max-h-40 overflow-y-auto">
                                        {emailSuggestions.map((sug, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                                onClick={() => {
                                                    setSelectedPatient(sug)
                                                    setWalkInEmail(sug.email)
                                                    setEmailSuggestions([])
                                                }}
                                            >
                                                <div className="text-sm font-medium">
                                                    {sug.first_name} {sug.last_name}
                                                </div>
                                                <div className="text-xs text-gray-600">{sug.email}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {walkInEmail &&
                                    !selectedPatient &&
                                    emailSuggestions.length === 0 &&
                                    !isSearchingEmail && (
                                        <div className="mt-2 p-3 rounded border border-red-300 bg-red-50 text-red-700 text-xs flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 mt-0.5" />
                                            <span>
                                                Patient is not registered with SingHealth, please create account
                                                for patient before creating walk in appointment
                                            </span>
                                        </div>
                                    )}
                                {selectedPatient &&
                                    walkInEmail &&
                                    selectedPatient.email &&
                                    walkInEmail.toLowerCase() === selectedPatient.email.toLowerCase() && (
                                        <div className="mt-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                                            Existing patient selected: {selectedPatient.first_name}{" "}
                                            {selectedPatient.last_name} ({selectedPatient.email})
                                        </div>
                                    )}
                            </div>
                        </div>

                        {/* Date Selection */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                Select Date <span className="text-red-500">*</span>
                            </Label>
                            <Card className="p-4">
                                <Calendar
                                    mode="single"
                                    selected={walkInSelectedDate}
                                    onSelect={date => {
                                        setWalkInSelectedDate(date)
                                        setWalkInSelectedSlot(null)
                                    }}
                                    disabled={date => {
                                        const today = new Date()
                                        today.setHours(0, 0, 0, 0)
                                        const maxDate = new Date()
                                        maxDate.setDate(today.getDate() + 7 * 8)
                                        return date < today || date > maxDate
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

                        {/* Time Slot Selection */}
                        {walkInSelectedDate && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    Select Time Slot <span className="text-red-500">*</span>
                                </Label>
                                <Card className="p-4">
                                    {(() => {
                                        const dayEntries = walkInAvailableDates.filter((d: any) => {
                                            const dayMatch = new Date(d.date)
                                            return (
                                                walkInSelectedDate &&
                                                dayMatch.toDateString() === walkInSelectedDate.toDateString()
                                            )
                                        })

                                        if (dayEntries.length === 0) {
                                            return (
                                                <p className="text-sm text-gray-500 text-center py-4">
                                                    No available slots for this date
                                                </p>
                                            )
                                        }

                                        const slots: WalkInSlot[] = dayEntries.flatMap((entry: any) => {
                                            const docId = entry.doctorId
                                            const docName = entry.doctorName || "Doctor"
                                            const clinicId = entry.clinicId
                                            return (entry.timeSlots || []).map((slot: any) => {
                                                const start = (slot.startTime || slot.start_time || "").substring(0, 5)
                                                const end = (slot.endTime || slot.end_time || "").substring(0, 5)
                                                return {
                                                    time: `${start}-${end}`,
                                                    doctorId: docId,
                                                    doctorName: docName,
                                                    clinicId,
                                                } as WalkInSlot
                                            })
                                        })

                                        return (
                                            <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                                                {slots.map((slot, idx: number) => {
                                                    const isSelected =
                                                        walkInSelectedSlot?.time === slot.time &&
                                                        walkInSelectedSlot?.doctorId === slot.doctorId

                                                    return (
                                                        <Button
                                                            key={idx}
                                                            variant={isSelected ? "default" : "outline"}
                                                            className={cn(
                                                                "justify-center h-12 transition-all duration-300 border-green-500 px-3 py-2 text-sm",
                                                                isSelected &&
                                                                "bg-green-600 hover:bg-green-700 text-white shadow"
                                                            )}
                                                            onClick={() => setWalkInSelectedSlot(slot)}
                                                        >
                                                            <div className="flex flex-col items-center leading-tight">
                                                                <div className="flex items-center gap-1">
                                                                    <Clock className="w-4 h-4" />
                                                                    <span className="font-semibold">{slot.time}</span>
                                                                </div>
                                                                <span className="text-[11px] opacity-90">
                                                                    {slot.doctorName}
                                                                </span>
                                                            </div>
                                                        </Button>
                                                    )
                                                })}
                                            </div>
                                        )
                                    })()}
                                </Card>
                            </div>
                        )}
                    </div>

                    <SheetFooter className="pt-6 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowWalkInDialog(false)
                                setWalkInEmail("")
                                setEmailSuggestions([])
                                setSelectedPatient(null)
                                setWalkInSelectedDate(undefined)
                                setWalkInSelectedSlot(null)
                            }}
                            disabled={isSubmittingWalkIn}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleWalkInConfirmClick}
                            disabled={isSubmittingWalkIn || !selectedPatient}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            {isSubmittingWalkIn ? "Creating..." : "Create Appointment"}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Walk-in Confirmation Dialog */}
            <Dialog
                open={showWalkInConfirmDialog}
                onOpenChange={setShowWalkInConfirmDialog}
            >
                <DialogContent className="sm:max-w-xl">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
                    <DialogHeader>
                        <DialogTitle className="text-center text-2xl">Confirm Walk-in</DialogTitle>
                        <DialogDescription />
                    </DialogHeader>

                    <div className="space-y-3">
                        <p className="text-center font-semibold text-lg">
                            Please confirm the appointment details:
                        </p>
                        <div className="bg-muted p-5 rounded-lg space-y-3">
                            <p className="text-base">
                                <span className="font-semibold">Patient:</span>{" "}
                                {selectedPatient
                                    ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
                                    : "-"}
                            </p>
                            <p className="text-base">
                                <span className="font-semibold">Email:</span> {walkInEmail || "-"}
                            </p>
                            <p className="text-base">
                                <span className="font-semibold">Clinic:</span>{" "}
                                {staffClinicName || staffClinicId || "-"}
                            </p>
                            <p className="text-base">
                                <span className="font-semibold">Doctor:</span>{" "}
                                {walkInSelectedSlot?.doctorName || "-"}
                            </p>
                            <p className="text-base">
                                <span className="font-semibold">Date:</span>{" "}
                                {walkInSelectedDate
                                    ? walkInSelectedDate.toLocaleDateString("en-SG")
                                    : "-"}
                            </p>
                            <p className="text-base">
                                <span className="font-semibold">Time:</span>{" "}
                                {walkInSelectedSlot?.time || "-"}
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="flex gap-3 sm:justify-center">
                        <Button
                            variant="outline"
                            onClick={() => setShowWalkInConfirmDialog(false)}
                            disabled={isSubmittingWalkIn}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                await handleWalkInSubmit()
                                setShowWalkInConfirmDialog(false)
                            }}
                            disabled={isSubmittingWalkIn}
                        >
                            {isSubmittingWalkIn ? "Processing..." : "Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep appointment</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmCancelAppointment}>Cancel appointment</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageLayout>
    )
}

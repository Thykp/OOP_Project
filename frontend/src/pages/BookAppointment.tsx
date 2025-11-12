import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/auth-context";
import { connectSocket, disconnectSocket, subscribeToSlots } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { Building2, Calendar as CalendarIcon, CheckCircle, CheckCircle2, Clock, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageLayout } from "../components/page-layout";

const clinicTypes = ["General Practice", "Specialist Clinic"];

export default function AppointmentBooking() {
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [selectedClinicType, setSelectedClinicType] = useState<string>("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");
  const [selectedClinicId, setSelectedClinicId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("");
  const [specialistTypes, setSpecialistTypes] = useState<string[]>([]);
  const [gpClinics, setGpClinics] = useState<any[]>([]);
  const [specialistClinics, setSpecialistClinics] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [availableDatesWithSlots, setAvailableDatesWithSlots] = useState<any[]>([]);
  const [highlightedDates, setHighlightedDates] = useState<Date[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const userRole = user?.user_metadata.role
  // Reschedule mode state
  const rescheduleMode = location.state?.rescheduleMode || false;
  const appointmentToReschedule = location.state?.appointmentToReschedule || null;

  function formatClinicDisplayName(clinic: any) {
    if (!clinic?.clinicName || !clinic?.address) return "";
    const trimmedAddress = clinic.address.split("#")[0].trim();
    return `${clinic.clinicName}, ${trimmedAddress}`;
  }

  const getSelectedClinicDetails = () => {
    if (!selectedClinicId) return null;

    if (selectedClinicType === "General Practice") {
      return gpClinics.find(c => c.clinicId === selectedClinicId);
    } else {
      return specialistClinics.find(c => c.ihpClinicId === selectedClinicId);
    }
  };

  useEffect(() => {
    // fetch clinics and doctors on mount
    const fetchClinics = async () => {
      try {
        const gpRes = await fetch(`${API_BASE}/api/clinics/gp?limit=100`);
        const gpData = await gpRes.json();
        setGpClinics(gpData);

        const spRes = await fetch(`${API_BASE}/api/clinics/specialist?limit=100`);
        const spData = await spRes.json();
        setSpecialistClinics(spData);

        const uniqueSpecialties: string[] = [
          ...new Set(
            spData
              .map((clinic: any) => {
                let speciality = clinic.speciality || "";
                speciality = speciality.replace(/&amp;/gi, "&").replace(/&AMP;/gi, "&");
                speciality = speciality.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
                return speciality.toUpperCase();
              })
              .filter(Boolean) as string[]
          ),
        ].sort();
        setSpecialistTypes(uniqueSpecialties);

        const doctorRes = await fetch(`${API_BASE}/api/doctors`);
        const doctorData = await doctorRes.json();
        setDoctors(doctorData);
      } catch (err) {
        console.error("Error fetching clinics:", err);
        toast({
          variant: "destructive",
          title: "Couldn’t load clinics/doctors",
          description: "Please refresh or try again later.",
        });
      }
    };

    fetchClinics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill form when in reschedule mode
  useEffect(() => {
    if (rescheduleMode && appointmentToReschedule) {
      try {
        if (appointmentToReschedule.clinic_type) {
          setSelectedClinicType(appointmentToReschedule.clinic_type);
        }

        // Safely parse date
        if (appointmentToReschedule.booking_date) {
          try {
            const date = new Date(appointmentToReschedule.booking_date);
            if (!isNaN(date.getTime())) {
              setSelectedDate(date);
            } else {
              console.warn("Invalid date format:", appointmentToReschedule.booking_date);
            }
          } catch (dateError) {
            console.error("Error parsing date:", dateError);
          }
        }

        if (appointmentToReschedule.doctor_id) {
          setSelectedDoctorId(appointmentToReschedule.doctor_id);
        }

        if (appointmentToReschedule.clinic_id) {
          setSelectedClinicId(appointmentToReschedule.clinic_id);
        }

        // Safely construct time range
        if (appointmentToReschedule.start_time && appointmentToReschedule.end_time) {
          const startTime = appointmentToReschedule.start_time.length >= 5
            ? appointmentToReschedule.start_time.substring(0, 5)
            : appointmentToReschedule.start_time;
          const endTime = appointmentToReschedule.end_time.length >= 5
            ? appointmentToReschedule.end_time.substring(0, 5)
            : appointmentToReschedule.end_time;
          setSelectedTimeRange(`${startTime}-${endTime}`);
        }
      } catch (error) {
        console.error("Error pre-filling reschedule form:", error);
        // Don't show toast here as it might cause infinite loops - just log the error
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleMode, appointmentToReschedule]);

  // subscribe to server-side slot updates so UI can remove booked slots in real-time
  useEffect(() => {
    connectSocket();
    const sub = subscribeToSlots((update: any) => {
      if (!update) return;


      const bookingDate = update.booking_date;
      const doctorId = update.doctor_id;
      const clinicId = update.clinic_id;
      const startTime = (update.start_time || '').substring(0, 5);
      const action = update.action;



      if (action !== 'REMOVE') {
        return;
      }

      setAvailableDatesWithSlots((prev: any[]) => {

        if (!prev || prev.length === 0) {
          return prev;
        }

        let removedCount = 0;
        const next = prev
          .map((entry: any) => {
            // Normalize entry.date to string format (yyyy-MM-dd)
            let entryDateStr = '';
            if (Array.isArray(entry.date)) {
              // Handle array format [2025, 11, 12]
              const [year, month, day] = entry.date;
              entryDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            } else if (typeof entry.date === 'string') {
              entryDateStr = entry.date;
            } else {
              entryDateStr = String(entry.date);
            }

            console.log('[BookAppointment] 🔍 Checking entry:', {
              entryDate: entry.date,
              entryDateNormalized: entryDateStr,
              entryClinicId: entry.clinicId,
              entryDoctorId: entry.doctorId,
              slotCount: entry.timeSlots?.length
            });

            // Date comparison (normalized)
            if (entryDateStr !== bookingDate) {
              return entry;
            }

            // Clinic comparison
            if (clinicId && entry.clinicId !== clinicId) {
              return entry;
            }

            // Doctor comparison
            if (doctorId && entry.doctorId !== doctorId) {
              return entry;
            }


            const newSlots = (entry.timeSlots || []).filter((slot: any) => {
              if (!slot) return true;

              let slotStart = '';
              if (typeof slot === 'string') {
                slotStart = slot.split('-')[0].trim().substring(0, 5);
              } else {
                slotStart = (slot.startTime || slot.start_time || '').substring(0, 5);
              }

              const keep = slotStart !== startTime;

              if (!keep) {
                removedCount++;
                console.log(`[BookAppointment] 🗑️ REMOVING slot: ${slotStart} (matches ${startTime})`);
              } else {
                console.log(`[BookAppointment] ✓ Keeping slot: ${slotStart} (does not match ${startTime})`);
              }

              return keep;
            });

            return {
              ...entry,
              timeSlots: newSlots,
            };
          })
          .filter((e: any) => e.timeSlots && e.timeSlots.length > 0);

        if (removedCount > 0) {
          console.log(`[BookAppointment] ✅ Successfully removed ${removedCount} slot(s)`);
        } else {
          console.warn('[BookAppointment] ⚠️ No matching slot found to remove for', {
            bookingDate,
            doctorId,
            clinicId,
            startTime,
            availableEntriesCount: prev.length
          });
        }

        console.log('[BookAppointment] 📊 Updated availableDatesWithSlots:', next);
        return next;
      });
    });

    return () => {
      try { sub.unsubscribe(); } catch (e) { }
      disconnectSocket();
    };
    // we intentionally run once on mount
  }, []);

  // Fetch available dates and time slots once doctor or clinic is selected
  useEffect(() => {
    if (!selectedClinicType) return;
    if (selectedClinicType === "Specialist Clinic" && !selectedSpecialty) return;

    const speciality = selectedClinicType === "General Practice" ? "General Practice" : selectedSpecialty;

    const fetchAvailableDates = async () => {
      try {
        const params = new URLSearchParams({
          clinicId: selectedClinicId || "",
          speciality: speciality || "",
        });

        if (selectedDoctors && selectedDoctors.length > 0) {
          selectedDoctors.forEach((docId) => params.append("doctorId", docId));
        }

        const res = await fetch(`${API_BASE}/api/timeslots/available/dateslots?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch available dates and slots");

        const data = await res.json();
        setAvailableDatesWithSlots(data);

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

        const filteredAvailableDates = data.filter((d: any) => {
          const dateObj = new Date(d.date);
          if (dateObj.toDateString() !== today.toDateString()) return true;
          // today — keep only future slots
          return d.timeSlots.some((slot: any) => {
            const start = slot.startTime || slot.split?.("-")?.[0];
            return start && parseTimeToMinutes(start) > currentMinutes;
          });
        });

        setHighlightedDates(filteredAvailableDates.map((d: any) => new Date(d.date)));

        const allDates: Date[] = [];
        for (let d = new Date(today); d <= maxDate; d.setDate(d.getDate() + 1)) {
          allDates.push(new Date(d));
        }
        const highlightedStrings = filteredAvailableDates.map((d: any) => new Date(d.date).toDateString());
        const unavailable = allDates.filter((d) => !highlightedStrings.includes(d.toDateString()));

        if (
          !filteredAvailableDates.some((d: any) => new Date(d.date).toDateString() === now.toDateString())
        ) {
          unavailable.push(now);
        }

        setUnavailableDates(unavailable);
      } catch (err) {
        console.error("Error fetching available dates:", err);
        toast({
          variant: "destructive",
          title: "Couldn’t load availability",
          description: "Please adjust your filters or try again.",
        });
      }
    };

    fetchAvailableDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctors, selectedClinicId, selectedSpecialty, selectedClinicType]);

  const filteredSpecialistClinics =
    selectedSpecialty
      ? specialistClinics.filter(
        (clinic) =>
          clinic.speciality && clinic.speciality.trim().toUpperCase() === selectedSpecialty.toUpperCase()
      )
      : specialistClinics;

  const filteredDoctors = doctors.filter((doctor) => {
    if (!selectedClinicType) return false;

    let matches = false;

    if (selectedClinicType === "General Practice") {
      matches = doctor.speciality?.toUpperCase().includes("GENERAL PRACTICE");
    }

    if (selectedClinicType === "Specialist Clinic") {
      if (!selectedSpecialty) {
        matches = !doctor.speciality?.toUpperCase().includes("GENERAL PRACTICE");
      } else {
        matches = doctor.speciality?.toUpperCase() === selectedSpecialty.toUpperCase();
      }
    }

    if (selectedClinicId) {
      return matches && doctor.clinicId?.toString() === selectedClinicId;
    }

    return matches;
  });

  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 7 * 8); // up to 8 weeks ahead

  const selectedDaySlotsDetailed = availableDatesWithSlots.filter((d) => {
    const day = new Date(d.date);
    return selectedDate && day.toDateString() === selectedDate.toDateString();
  });

  const validateBooking = (): string | null => {
    if (!user && !rescheduleMode) {
      return "Please sign in to book an appointment.";
    }

    if (!selectedClinicType) {
      return "Please select a clinic type.";
    }

    if (selectedClinicType === "Specialist Clinic" && !selectedSpecialty) {
      return "Please select a specialist type.";
    }

    if (!selectedClinicId) {
      return "Please select a clinic name.";
    }

    if (!selectedDate) {
      return "Please select a date.";
    }

    if (!selectedTimeRange) {
      return "Please select a time slot.";
    }

    if (!(selectedSlot?.doctorId || selectedDoctorId) || !(selectedSlot?.clinicId || selectedClinicId)) {
      return "Please select a valid time slot with doctor and clinic information.";
    }

    return null;
  };

  const handleConfirmClick = () => {
    const validationError = validateBooking();
    if (validationError) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: validationError,
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleBooking = async () => {
    setIsSubmitting(true);
    setShowConfirmDialog(false);

    if (!user && !rescheduleMode) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Please sign in to book an appointment.",
      });
      setIsSubmitting(false);
      return;
    }

    if (!selectedDate || !selectedTimeRange || !(selectedSlot?.doctorId || selectedDoctorId) || !(selectedSlot?.clinicId || selectedClinicId)) {
      toast({
        variant: "destructive",
        title: "Missing selection",
        description: "Choose clinic, doctor, date, and time slot before confirming.",
      });
      setIsSubmitting(false);
      return;
    }

    const [start_time, end_time] = selectedTimeRange.split("-").map((t) => t.trim());
    const formattedStart = start_time.length > 5 ? start_time.substring(0, 5) : start_time;
    const formattedEnd = end_time.length > 5 ? end_time.substring(0, 5) : end_time;

    try {
      if (rescheduleMode && appointmentToReschedule) {
        const rescheduleData = {
          doctor_id: selectedSlot?.doctorId || selectedDoctorId,
          clinic_id: selectedSlot?.clinicId || selectedClinicId,
          booking_date: selectedDate.toLocaleDateString("en-CA"),
          start_time: formattedStart,
          end_time: formattedEnd,
        };
        let url = `${API_BASE}/api/appointments/${appointmentToReschedule.appointment_id}/reschedule`
        if(userRole=="ROLE_STAFF"){
          url = `${API_BASE}/api/appointments/${appointmentToReschedule.appointment_id}/reschedule/staff`
        }

        const res = await fetch(
          url,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rescheduleData),
          }
        );

        if (!res.ok) {
          if (res.status === 400 || res.status === 409) {
            const errorData = await res.json();
            toast({
              variant: "destructive",
              title: "Unable to reschedule",
              description: errorData?.message || "This slot may already be taken.",
            });
            return;
          }
          throw new Error("Failed to reschedule appointment");
        }

        const data = await res.json();
        console.log("Reschedule response:", data);

        setIsSubmitting(false);
        setBookingDetails({
          doctorName: selectedSlot?.doctorName || doctors.find(d => d.doctorId === selectedDoctorId)?.doctorName,
          date: selectedDate?.toLocaleDateString("en-SG"),
          time: selectedTimeRange,
          clinicType: selectedClinicType,
          specialty: selectedSpecialty,
        });
        setShowSuccessDialog(true);
      } else {
        if (!user) {
          toast({
            variant: "destructive",
            title: "Login required",
            description: "Please sign in to book an appointment.",
          });
          return;
        }

        const appointmentRequest = {
          patient_id: user.id,
          doctor_id: selectedSlot?.doctorId || selectedDoctorId,
          clinic_id: selectedSlot?.clinicId || selectedClinicId,
          booking_date: selectedDate.toLocaleDateString("en-CA"),
          start_time: formattedStart,
          end_time: formattedEnd,
        };

        const res = await fetch(`${API_BASE}/api/appointments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(appointmentRequest),
        });

        if (!res.ok) {
          let message = "Failed to create appointment";
          try {
            const errJson = await res.json();
            if (errJson?.message) message = errJson.message;
          } catch { }
          toast({
            variant: "destructive",
            title: "Booking failed",
            description: message,
          });
          return;
        }

        const data = await res.json();
        console.log("Booking response:", data);

        setIsSubmitting(false);
        setBookingDetails({
          doctorName: selectedSlot?.doctorName || doctors.find(d => d.doctorId === selectedDoctorId)?.doctorName,
          date: selectedDate?.toLocaleDateString("en-SG"),
          time: selectedTimeRange,
          clinicType: selectedClinicType,
          specialty: selectedSpecialty,
        });
        setShowSuccessDialog(true);
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        title: `Error ${rescheduleMode ? "rescheduling" : "booking"}`,
        description: "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <PageLayout variant="dashboard">
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-blue-50" />
        <div className="relative max-w-5xl mx-auto px-6 pt-12 pb-14 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            {rescheduleMode ? "Reschedule Your Appointment" : "Book Your Appointment"}
          </h1>
          <p className="mt-4 text-base md:text-lg text-gray-700 max-w-2xl mx-auto">
            {rescheduleMode
              ? "Select a new date and time slot below to move your existing booking."
              : "Choose your clinic, doctor and preferred time. Secure your slot instantly."}
          </p>
          {rescheduleMode && appointmentToReschedule && (
            <p className="mt-2 text-xs font-medium text-gray-600">
              Current: {appointmentToReschedule.doctor_name || "Unknown Doctor"} • {
                (() => {
                  if (!appointmentToReschedule.booking_date) return "N/A";
                  try {
                    const date = new Date(appointmentToReschedule.booking_date);
                    return isNaN(date.getTime())
                      ? appointmentToReschedule.booking_date
                      : date.toLocaleDateString();
                  } catch {
                    return appointmentToReschedule.booking_date || "N/A";
                  }
                })()
              } • {
                appointmentToReschedule.start_time
                  ? (appointmentToReschedule.start_time.length >= 5
                    ? appointmentToReschedule.start_time.substring(0, 5)
                    : appointmentToReschedule.start_time)
                  : "N/A"
              }
            </p>
          )}
        </div>
      </section>
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="max-w-5xl mx-auto space-y-10">

          {/* Clinic Selection */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <Label className="text-lg font-semibold">Select Clinic</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Clinic Type */}
              <div className="space-y-2">
                <Label className="text-md font-medium">
                  Clinic Type<span className="text-sm text-destructive ml-1">*</span>
                </Label>
                <Select
                  value={selectedClinicType}
                  onValueChange={(value) => {
                    setSelectedClinicType(value);
                    setSelectedSpecialty("");
                    setSelectedClinicId("");
                    setSelectedDoctors([]);
                    setSelectedDate(undefined);
                    setSelectedTimeRange("");
                    setSelectedSlot(null);
                  }}
                >
                  <SelectTrigger className="w-full h-12 bg-card">
                    <SelectValue placeholder="Clinic Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {clinicTypes.map((clinic) => (
                      <SelectItem key={clinic} value={clinic}>
                        {clinic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClinicType === "Specialist Clinic" && (
                <div className="space-y-2">
                  <Label className="text-md font-medium">
                    Clinic Specialty<span className="text-sm text-destructive ml-1">*</span>
                  </Label>
                  <Select
                    value={selectedSpecialty}
                    onValueChange={(v) => {
                      setSelectedSpecialty(v);
                      setSelectedClinicId("");
                      setSelectedDoctors([]);
                      setSelectedDate(undefined);
                      setSelectedTimeRange("");
                      setSelectedSlot(null);
                    }}
                  >
                    <SelectTrigger className="w-full h-12 bg-card">
                      <SelectValue placeholder="Specialty Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {specialistTypes.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Clinic Name */}
              <div className="space-y-2">
                <Label className="text-md font-medium">
                  Clinic Name<span className="text-sm text-destructive ml-1">*</span>
                </Label>
                <Select
                  value={selectedClinicId}
                  onValueChange={(value) => {
                    setSelectedClinicId((prev) => (prev === value ? "" : value));
                    setSelectedDoctors([]);
                    setSelectedDate(undefined);
                    setSelectedTimeRange("");
                    setSelectedSlot(null);
                  }}
                >
                  <SelectTrigger className="w-full h-12 bg-card">
                    <SelectValue placeholder="Clinic Name" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-60 overflow-y-auto">
                    {selectedClinicType === "General Practice" &&
                      gpClinics.map((clinic) => (
                        <SelectItem key={clinic.clinicId} value={clinic.clinicId}>
                          {formatClinicDisplayName(clinic)}
                        </SelectItem>
                      ))}

                    {selectedClinicType === "Specialist Clinic" &&
                      filteredSpecialistClinics.map((clinic) => (
                        <SelectItem key={clinic.ihpClinicId} value={clinic.ihpClinicId}>
                          {formatClinicDisplayName(clinic)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Doctor Selection */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <Label className="text-lg font-semibold">Choose Your Doctor</Label>
            </div>
            {!selectedClinicType ? (
              <Card className="p-6 bg-card">
                <p className="text-center text-muted-foreground">
                  Please select clinic type to see all doctors
                </p>
              </Card>
            ) : selectedClinicType === "Specialist Clinic" && !selectedSpecialty ? (
              <Card className="p-6 bg-card">
                <p className="text-center text-muted-foreground">
                  Please select specialist type to see all doctors
                </p>
              </Card>
            ) : !selectedClinicId ? (
              <Card className="p-6 bg-card">
                <p className="text-center text-muted-foreground">
                  Please select clinic name to see all doctors
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredDoctors.map((doctor) => (
                  <Card
                    key={doctor.doctorId}
                    className={cn(
                      "p-4 cursor-pointer transition-all duration-300 hover:shadow-[var(--shadow-card)] hover:-translate-y-1",
                      selectedDoctors.includes(doctor.doctorId)
                        ? "ring-2 ring-primary shadow-[var(--shadow-soft)] bg-gradient-to-br from-card to-secondary/30"
                        : "hover:border-primary/50"
                    )}
                    onClick={() =>
                      setSelectedDoctors((prev: string[]) =>
                        prev.includes(doctor.doctorId)
                          ? prev.filter((id) => id !== doctor.doctorId)
                          : [...prev, doctor.doctorId]
                      )
                    }
                  >
                    <div className="space-y-3 text-center">
                      <div>
                        <h3 className="font-semibold text-foreground">{doctor.doctorName}</h3>
                        <p className="text-[13px] font-semibold">{doctor.speciality}</p>
                        <p className="text-[10px] text-muted-foreground">{doctor.clinicName}</p>
                        <p className="text-[10px] text-muted-foreground">{doctor.clinicAddress}</p>
                      </div>

                      {selectedDoctors.includes(doctor.doctorId) && (
                        <CheckCircle2 className="w-5 h-5 text-primary mx-auto" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Date and Time Selection */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Date Picker */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">Select Date</Label>
                <span className="text-sm text-destructive">*</span>
              </div>
              {!selectedClinicType ? (
                <Card className="p-6 bg-card">
                  <p className="text-center text-muted-foreground">
                    Please select clinic type to view available dates
                  </p>
                </Card>
              ) : selectedClinicType === "Specialist Clinic" && !selectedSpecialty ? (
                <Card className="p-6 bg-card">
                  <p className="text-center text-muted-foreground">
                    Please select specialist type to view available dates
                  </p>
                </Card>
              ) : !selectedClinicId ? (
                <Card className="p-6 bg-card">
                  <p className="text-center text-muted-foreground">
                    Please select clinic name to view available dates
                  </p>
                </Card>
              ) : (
                <Card className="p-4 bg-card">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) =>
                      date.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0) || date > maxDate
                    }
                    modifiers={{
                      available: highlightedDates,
                      unavailable: unavailableDates,
                    }}
                    modifiersStyles={{
                      available: { border: "1px solid green", borderRadius: "20px" },
                      unavailable: { border: "1px solid red", borderRadius: "20px" },
                    }}
                    className={cn("pointer-events-auto rounded-md")}
                    initialFocus
                  />
                </Card>
              )}
            </section>

            {/* Time Slots */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">Choose Time Slot</Label>
                <span className="text-sm text-destructive">*</span>
              </div>
              {!selectedClinicType ? (
                <Card className="p-6 bg-card">
                  <p className="text-center text-muted-foreground">
                    Please select clinic type to view available time slots
                  </p>
                </Card>
              ) : selectedClinicType === "Specialist Clinic" && !selectedSpecialty ? (
                <Card className="p-6 bg-card">
                  <p className="text-center text-muted-foreground">
                    Please select specialist type to view available time slots
                  </p>
                </Card>
              ) : !selectedClinicId ? (
                <Card className="p-6 bg-card">
                  <p className="text-center text-muted-foreground">
                    Please select clinic name to view available time slots
                  </p>
                </Card>
              ) : !selectedDate ? (
                <Card className="p-6 bg-card">
                  <p className="text-center text-muted-foreground">
                    Please select a date to view available time slots
                  </p>
                </Card>
              ) : (
                <Card className="p-4 bg-card">
                  {(() => {
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

                    const visibleSlots = selectedDaySlotsDetailed.flatMap((entry: any) =>
                      entry.timeSlots
                        .filter((slot: any) => {
                          if (selectedDate && selectedDate.toDateString() === today.toDateString()) {
                            const startStr = slot.startTime;
                            if (!startStr) return false;
                            return parseTimeToMinutes(startStr) > currentMinutes;
                          }
                          return true;
                        })
                        .map((slot: any) => ({
                          doctorId: entry.doctorId,
                          doctorName: entry.doctorName,
                          clinicId: entry.clinicId,
                          time: `${slot.startTime.substring(0, 5)}-${slot.endTime.substring(0, 5)}`,
                        }))
                    );

                    return (
                      <div className="grid grid-cols-3 gap-5 max-h-160 overflow-y-auto">
                        {visibleSlots.length > 0 ? (
                          visibleSlots.map((slot) => (
                            <Button
                              key={`${slot.doctorId}-${slot.time}`}
                              variant={
                                selectedDoctorId === slot.doctorId && selectedTimeRange === slot.time
                                  ? "default"
                                  : "outline"
                              }
                              className={cn(
                                "transition-all duration-300 border-green-500 h-12",
                                selectedDoctorId === slot.doctorId &&
                                selectedTimeRange === slot.time &&
                                "bg-green-200 text-black shadow-[var(--shadow-soft)]"
                              )}
                              onClick={() => {
                                setSelectedDoctorId(slot.doctorId);
                                setSelectedTimeRange(slot.time);
                                setSelectedSlot(slot);
                              }}
                            >
                              <div className="flex flex-col items-center text-center">
                                <span className="font-semibold">{slot.time}</span>
                                <span className="text-[11px] text-muted-foreground">{slot.doctorName}</span>
                              </div>
                            </Button>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground col-span-3 text-center">
                            No available slots for this day
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </Card>
              )}
            </section>
          </div>

          {/* Book Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleConfirmClick}
              size="lg"
              disabled={isSubmitting}
              className="w-full md:w-96 h-14 text-lg font-semibold shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] transition-all duration-300"
            >
              {isSubmitting ? "Processing..." : rescheduleMode ? "Confirm Reschedule" : "Confirm Booking"}
            </Button>
          </div>

          {/* Confirmation Dialog */}
          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent className="sm:max-w-xl">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
              <DialogHeader>
                <DialogTitle className="text-center text-2xl">
                  {rescheduleMode ? "Confirm Reschedule" : "Confirm Booking"}
                </DialogTitle>
                <DialogDescription />
              </DialogHeader>

              {rescheduleMode ? (
                <div className="space-y-3">
                  <p className="text-center font-semibold text-lg">Are you sure you want to reschedule?</p>
                  <div className="bg-muted p-5 rounded-lg space-y-3">
                    <p className="text-base"><span className="font-semibold">Doctor:</span> {selectedSlot?.doctorName || doctors.find(d => d.doctorId === selectedDoctorId)?.doctorName}</p>
                    <p className="text-base"><span className="font-semibold">Clinic:</span> {getSelectedClinicDetails()?.clinicName}</p>
                    <p className="text-base"><span className="font-semibold">Clinic Type:</span> {selectedClinicType}</p>
                    {selectedSpecialty && <p className="text-base"><span className="font-semibold">Specialty:</span> {selectedSpecialty}</p>}
                    <p className="text-base"><span className="font-semibold">Address:</span> {getSelectedClinicDetails()?.address}</p>
                    <p className="text-base"><span className="font-semibold">Date:</span> {selectedDate?.toLocaleDateString("en-SG")}</p>
                    <p className="text-base"><span className="font-semibold">Time:</span> {selectedTimeRange}</p>

                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-center font-semibold text-lg">Please confirm your appointment details:</p>
                  <div className="bg-muted p-5 rounded-lg space-y-3">
                    <p className="text-base"><span className="font-semibold">Doctor:</span> {selectedSlot?.doctorName || doctors.find(d => d.doctorId === selectedDoctorId)?.doctorName}</p>
                    <p className="text-base"><span className="font-semibold">Clinic:</span> {getSelectedClinicDetails()?.clinicName}</p>
                    <p className="text-base"><span className="font-semibold">Clinic Type:</span> {selectedClinicType}</p>
                    {selectedSpecialty && <p className="text-base"><span className="font-semibold">Specialty:</span> {selectedSpecialty}</p>}
                    <p className="text-base"><span className="font-semibold">Address:</span> {getSelectedClinicDetails()?.address}</p>
                    <p className="text-base"><span className="font-semibold">Date:</span> {selectedDate?.toLocaleDateString("en-SG")}</p>
                    <p className="text-base"><span className="font-semibold">Time:</span> {selectedTimeRange}</p>

                  </div>
                </div>
              )}

              <DialogFooter className="flex gap-3 sm:justify-center">
                <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleBooking} disabled={isSubmitting}>
                  {isSubmitting ? "Processing..." : "Confirm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Success Dialog */}
          <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
            <DialogContent className="sm:max-w-xl">
              <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
              <DialogHeader>
                <DialogTitle className="text-center text-2xl">
                  {rescheduleMode ? "Appointment Rescheduled Successfully!" : "Appointment Booked Successfully!"}
                </DialogTitle>
                <DialogDescription />
              </DialogHeader>

              <div className="space-y-3">
                <p className="text-center text-lg">Your appointment has been confirmed:</p>
                <div className="bg-green-50 border border-green-200 p-5 rounded-lg space-y-3">
                  <p className="text-base"><span className="font-semibold">Doctor:</span> {bookingDetails?.doctorName}</p>
                  <p className="text-base"><span className="font-semibold">Date:</span> {bookingDetails?.date}</p>
                  <p className="text-base"><span className="font-semibold">Time:</span> {bookingDetails?.time}</p>
                  <p className="text-base"><span className="font-semibold">Clinic Type:</span> {bookingDetails?.clinicType}</p>
                  {bookingDetails?.specialty && <p className="text-base"><span className="font-semibold">Specialty:</span> {bookingDetails?.specialty}</p>}
                </div>
              </div>

              <DialogFooter className="flex sm:justify-center">
                <Button onClick={() => {
                  setShowSuccessDialog(false);
                  navigate("/dashboard");
                }} className="w-full sm:w-auto">
                  Go to Dashboard
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </PageLayout>
  );
}

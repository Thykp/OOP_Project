import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Building2, Calendar as CalendarIcon, CheckCircle2, Clock, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageLayout } from "../components/page-layout";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/use-toast";

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

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  // Reschedule mode state
  const rescheduleMode = location.state?.rescheduleMode || false;
  const appointmentToReschedule = location.state?.appointmentToReschedule || null;

  function formatClinicDisplayName(clinic: any) {
    if (!clinic?.clinicName || !clinic?.address) return "";
    const trimmedAddress = clinic.address.split("#")[0].trim();
    return `${clinic.clinicName}, ${trimmedAddress}`;
  }

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
      setSelectedClinicType(appointmentToReschedule.clinic_type || "");
      setSelectedDate(new Date(appointmentToReschedule.booking_date));
      setSelectedDoctorId(appointmentToReschedule.doctor_id);
      setSelectedClinicId(appointmentToReschedule.clinic_id);
      setSelectedTimeRange(`${appointmentToReschedule.start_time}-${appointmentToReschedule.end_time}`);
    }
  }, [rescheduleMode, appointmentToReschedule]);

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

  const handleBooking = async () => {
    if (!user && !rescheduleMode) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Please sign in to book an appointment.",
      });
      return;
    }

    if (!selectedDate || !selectedTimeRange || !(selectedSlot?.doctorId || selectedDoctorId) || !(selectedSlot?.clinicId || selectedClinicId)) {
      toast({
        variant: "destructive",
        title: "Missing selection",
        description: "Choose clinic, doctor, date, and time slot before confirming.",
      });
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

        const res = await fetch(
          `${API_BASE}/api/appointments/${appointmentToReschedule.appointment_id}/reschedule`,
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

        toast({
          variant: "success",
          title: "Appointment rescheduled",
          description: `${selectedDate.toLocaleDateString("en-SG")} • ${formattedStart}-${formattedEnd}`,
        });
        navigate("/dashboard");
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
          } catch {}
          toast({
            variant: "destructive",
            title: "Booking failed",
            description: message,
          });
          return;
        }

        const data = await res.json();
        console.log("Booking response:", data);

        toast({
          variant: "success",
          title: "Appointment booked",
          description: `${selectedDate.toLocaleDateString("en-SG")} • ${formattedStart}-${formattedEnd}`,
        });
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: `Error ${rescheduleMode ? "rescheduling" : "booking"}`,
        description: "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <PageLayout variant="dashboard">
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {rescheduleMode ? "Reschedule Your Appointment" : "Book Your Appointment"}
            </h1>
            {rescheduleMode && appointmentToReschedule && (
              <p className="text-sm text-gray-600">
                Rescheduling appointment with {appointmentToReschedule.doctor_name} on{" "}
                {new Date(appointmentToReschedule.booking_date).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Clinic Selection */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <Label className="text-lg font-semibold">Select Clinic</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Clinic Type */}
              <div className="space-y-2">
                <Label className="text-md font-medium">Clinic Type</Label>
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
                  <Label className="text-md font-medium">Clinic Specialty</Label>
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
                <Label className="text-md font-medium">Clinic Name</Label>
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
            </section>

            {/* Time Slots */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">Choose Time Slot</Label>
                <span className="text-sm text-destructive">*</span>
              </div>
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
            </section>
          </div>

          {/* Book Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleBooking}
              size="lg"
              className="w-full md:w-96 h-14 text-lg font-semibold shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] transition-all duration-300"
            >
              {rescheduleMode ? "Confirm Reschedule" : "Confirm Booking"}
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

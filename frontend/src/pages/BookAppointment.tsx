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
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/page-layout";
import { useAuth } from "@/context/auth-context";


const clinicTypes = [
    "General Practice",
    "Specialist Clinic",
];


export default function AppointmentBooking() {
    const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
    const [selectedClinicType, setSelectedClinicType] = useState<string>("");
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>("")
    const [selectedClinicId, setSelectedClinicId] = useState<string>("")
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

    // console.log(user?.id);

    function formatClinicDisplayName(clinic: any) {
        if (!clinic?.clinicName || !clinic?.address) return "";
        const trimmedAddress = clinic.address.split("#")[0].trim();
        return `${clinic.clinicName}, ${trimmedAddress}`;
    }

    useEffect(() => {

        // feteches clinic and doctors on mount
        const fetchClinics = async () => {
            try {
                const gpRes = await fetch("http://localhost:8080/api/clinics/gp?limit=100");
                const gpData = await gpRes.json();
                setGpClinics(gpData);

                const spRes = await fetch("http://localhost:8080/api/clinics/specialist?limit=100");
                const spData = await spRes.json();
                setSpecialistClinics(spData);

                const uniqueSpecialties: string[] = [
                    ...new Set(
                        spData
                            .map((clinic: any) => {
                                let speciality = clinic.speciality || "";
                                speciality = speciality
                                    .replace(/&amp;/gi, "&")
                                    .replace(/&AMP;/gi, "&");
                                speciality = speciality.replace(/\u00A0/g, " ");
                                speciality = speciality.replace(/\s+/g, " ").trim();
                                return speciality.toUpperCase();
                            })
                            .filter(Boolean) as string[]
                    ),
                ].sort();
                setSpecialistTypes(uniqueSpecialties);

                const doctorRes = await fetch('http://localhost:8080/api/doctors')
                const doctorData = await doctorRes.json();
                console.log(doctorData[0])

                setDoctors(doctorData);


            }
            catch (err) {
                console.error("Error fetching clinics:", err);

            };
        }

        fetchClinics();
    }, []

    );

    // Use effect to fetch available date and slots
    // Fetch available dates and time slots once doctor or clinic is selected
    useEffect(() => {
        // Don’t call API until we have at least a doctor OR a clinic selected
        if (!selectedClinicType) return;
        if (selectedClinicType === "Specialist Clinic" && !selectedSpecialty) return;

        let speciality = selectedClinicType === "General Practice"
            ? "General Practice"
            : selectedSpecialty;


        const fetchAvailableDates = async () => {
            try {

                const params = new URLSearchParams({
                    clinicId: selectedClinicId || "",
                    speciality: speciality || "",
                });

                // append multiple doctorId params if any doctors selected
                if (selectedDoctors && selectedDoctors.length > 0) {
                    selectedDoctors.forEach((docId) => params.append("doctorId", docId));
                }

                // console.log(selectedDoctors);
                // console.log(selectedClinicId);
                // console.log(speciality);

                const res = await fetch(
                    `http://localhost:8080/api/timeslots/available/dateslots?${params.toString()}`
                );

                if (!res.ok) throw new Error("Failed to fetch available dates and slots");

                const data = await res.json();

                //  backend format: [{ date: "2025-11-01", timeSlots: ["09:00-10:00", "10:00-11:00"] }]
                console.log(data);
                setAvailableDatesWithSlots(data);

                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes();

                // helper to parse "09:00 AM" etc.
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
                    if (dateObj.toDateString() !== now.toDateString()) return true; // future days always green

                    // today — only keep if there are future slots
                    return d.timeSlots.some((slot: any) => {
                        const start = slot.startTime || slot.split?.("-")?.[0]; // handle both string or object formats
                        return start && parseTimeToMinutes(start) > currentMinutes;
                    });

                });

                // green = valid days; red = others
                setHighlightedDates(filteredAvailableDates.map((d: any) => new Date(d.date)));

                // for unavailable (red border)
                const allDates: Date[] = [];
                for (let d = new Date(today); d <= maxDate; d.setDate(d.getDate() + 1)) {
                    allDates.push(new Date(d));
                }
                const highlightedStrings = filteredAvailableDates.map((d: any) =>
                    new Date(d.date).toDateString()
                );
                const unavailable = allDates.filter(
                    (d) => !highlightedStrings.includes(d.toDateString())
                );

                // optional: mark today red if all its slots expired
                if (
                    !filteredAvailableDates.some(
                        (d: any) => new Date(d.date).toDateString() === now.toDateString()
                    )
                ) {
                    unavailable.push(now);
                }

                setUnavailableDates(unavailable);



            } catch (err) {
                console.error("Error fetching available dates:", err);
            }
        };

        fetchAvailableDates();
    }, [selectedDoctors, selectedClinicId, selectedSpecialty]);


    // console.log(gpClinics)
    // console.log(specialistClinics)

    const filteredSpecialistClinics =

        selectedSpecialty
            ? specialistClinics.filter(
                (clinic) =>
                    clinic.speciality &&
                    clinic.speciality.trim().toUpperCase() === selectedSpecialty.toUpperCase()
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
    maxDate.setDate(today.getDate() + 7 * 8); // only show up to 8 weeks ahead

    const selectedDaySlotsDetailed =
        availableDatesWithSlots.filter((d) => {
            const day = new Date(d.date);
            return selectedDate && day.toDateString() === selectedDate.toDateString();
        });
    console.log(selectedDaySlotsDetailed)

    const handleBooking = async () => {
        if (!user) {
            alert("You must be logged in to book an appointment.");
            return;
        }

        if (!selectedDate || !selectedTimeRange) {
            alert("Please select clinic, date, and time slot before confirming.");
        }

        const [start_time, end_time] = selectedTimeRange
            .split("-")
            .map((t) => t.trim());

        const formattedStart = start_time.length > 5 ? start_time.substring(0, 5) : start_time;
        const formattedEnd = end_time.length > 5 ? end_time.substring(0, 5) : end_time;

        const appointmentRequest = {
            patient_id: user.id,
            doctor_id: selectedSlot?.doctorId || selectedDoctorId,
            clinic_id: selectedSlot?.clinicId || selectedClinicId,
            booking_date: selectedDate
  ? selectedDate.toLocaleDateString("en-CA") // YYYY-MM-DD in local timezone
  : null,
            start_time: formattedStart,
            end_time: formattedEnd,
        };


        console.log("Payload:", appointmentRequest);


        try {
            const res = await fetch("http://localhost:8080/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(appointmentRequest),
            });

            if (!res.ok) {
                throw new Error("Failed to create appointment");
            }

            const data = await res.json();
            alert("✅ Appointment booked successfully!");
            console.log("Response:", data);
            navigate("/dashboard");
        } catch (err) {
            console.error(err);
            alert("❌ Error booking appointment. Please try again.");
        }
    };





    return (
        <PageLayout variant="dashboard">

            <div className="min-h-screen bg-background py-8 px-4">
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-3">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            Book Your Appointment
                        </h1>

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
                                        setSelectedClinicType(value)
                                        setSelectedSpecialty("")
                                        setSelectedClinicId("")
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
                                    <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
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
                                        setSelectedClinicId((prev) => (prev === value ? "" : value))
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
                                        date.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0) ||
                                        date > maxDate
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

                                    // const now = new Date();
                                    // now.setHours(9);
                                    // now.setMinutes(0);
                                    // now.setSeconds(0);
                                    // const currentMinutes = now.getHours() * 60 + now.getMinutes();
                                    // console.log("DEBUG: Pretending current time is", now.toLocaleTimeString())

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
                                                // Only filter out past times on today - backend handles booking status
                                                if (selectedDate && selectedDate.toDateString() === today.toDateString()) {
                                                    const startStr = slot.startTime;
                                                    if (!startStr) return false;
                                                    return parseTimeToMinutes(startStr) > currentMinutes;
                                                }
                                                // For future dates, show all slots backend sends (already filtered)
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
                                                            selectedDoctorId === slot.doctorId && selectedTimeRange === slot.time &&
                                                            "bg-green-200 text-black shadow-[var(--shadow-soft)]"
                                                        )}
                                                        onClick={() => {
                                                            setSelectedDoctorId(slot.doctorId);
                                                            setSelectedTimeRange(slot.time); // e.g. "11:00-12:00"
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
                            Confirm
                        </Button>
                    </div>
                </div>
            </div>

        </PageLayout>

    );
}
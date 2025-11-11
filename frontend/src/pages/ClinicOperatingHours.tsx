import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { PageLayout } from "@/components/page-layout";
import { Clock, ArrowLeft } from "lucide-react"


interface Clinic {
    sn: number;
    clinicName: string;
    openingHours?: string;
    closingHours?: string;
    monToFriAm?: string,
    monToFriPm?: string,
    monToFriNight?: string,
    satAm?: string,
    satPm?: string,
    satNight?: string,
    sunAm?: string,
    sunPm?: string,
    sunNight?: string,
    publicHolidayAm?: string,
    publicHolidayPm?: string,
    publicHolidayNight?: string,
}

const groupedFieldDefs = [
    {
        groupLabel: "Mon–Fri",
        keys: [
            { key: "monToFriAm", label: "AM" },
            { key: "monToFriPm", label: "PM" },
            { key: "monToFriNight", label: "Night" }
        ]
    },
    {
        groupLabel: "Saturday",
        keys: [
            { key: "satAm", label: "AM" },
            { key: "satPm", label: "PM" },
            { key: "satNight", label: "Night" }
        ]
    },
    {
        groupLabel: "Sunday",
        keys: [
            { key: "sunAm", label: "AM" },
            { key: "sunPm", label: "PM" },
            { key: "sunNight", label: "Night" }
        ]
    },
    {
        groupLabel: "Public Holiday",
        keys: [
            { key: "publicHolidayAm", label: "AM" },
            { key: "publicHolidayPm", label: "PM" },
            { key: "publicHolidayNight", label: "Night" }
        ]
    }
];

function parseSlotTime(dbValue: string): { start: string, end: string, open: boolean } {
    if (!dbValue || dbValue === "CLOSED") {
        return { start: "", end: "", open: false };
    }
    const [startRaw, endRaw] = dbValue.split(" - ");
    return {
        start: toTimeValue(startRaw?.trim() || ""),
        end: toTimeValue(endRaw?.trim() || ""),
        open: true
    };
}
function toTimeValue(str: any) {
    // Handles "0900", "800", "11:00", etc
    str = str.trim();

    // Already in correct format
    if (/^\d{2}:\d{2}$/.test(str)) return str;

    // Convert "0900" → "09:00"
    if (/^\d{4}$/.test(str)) return str.slice(0, 2) + ':' + str.slice(2, 4);

    // Convert "800" → "08:00"
    if (/^\d{3}$/.test(str)) return '0' + str[0] + ':' + str.slice(1, 3);

    return str; // fallback
}




export default function ClinicOperatingHours() {
    const { toast } = useToast();
    const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [selectedClinic, setSelectedClinic] = useState<string>(""); // store sn as string!
    const [error, setError] = useState<string | null>(null);

    type SlotTime = { start: string, end: string, open: boolean };

    const [slotTimes, setSlotTimes] = useState<{ [key: string]: SlotTime }>({
        monToFriAm: { start: "", end: "", open: false },
        monToFriPm: { start: "", end: "", open: false },
        monToFriNight: { start: "", end: "", open: false },
        satAm: { start: "", end: "", open: false },
        satPm: { start: "", end: "", open: false },
        satNight: { start: "", end: "", open: false },
        sunAm: { start: "", end: "", open: false },
        sunPm: { start: "", end: "", open: false },
        sunNight: { start: "", end: "", open: false },
        publicHolidayAm: { start: "", end: "", open: false },
        publicHolidayPm: { start: "", end: "", open: false },
        publicHolidayNight: { start: "", end: "", open: false }
    });


    const [clinicType, setClinicType] = useState<string>("GP");
    const [fixedOpen, setFixedOpen] = useState("");
    const [fixedClose, setFixedClose] = useState("");



    useEffect(() => {
        if (!clinicType) {
            setClinics([]);
            setSelectedClinic("");
            return;
        }
        fetchClinics()
        setSelectedClinic("");

    }, [clinicType]);

    const fetchClinics = async () => {
        try {
            setError(null);
            let url = clinicType === "GP"
                ? `${baseURL}/api/clinics/gp?limit=100`
                : `${baseURL}/api/clinics/specialist?limit=100`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch Clinics");
            const data = await response.json() as Clinic[];
            const sorted = data.sort((a, b) => a.clinicName.localeCompare(b.clinicName));

            setClinics(sorted);

        } catch {
            setError("Failed to load clinics. Please try again later.");
            toast({ title: "Error", description: "Failed to load clinics", variant: "destructive" });
        }
    };

    const handleClinicSelect = async (snString: string) => {
        setSelectedClinic(snString);

        // Get the full clinic object by sn:
        const clinic = clinics.find(c => c.sn.toString() === snString);
        console.log(clinic);

        if (clinicType === "GP" && clinic) {
            // Set from DB values; default to "" if not present
            setFixedOpen(clinic.openingHours ?? "");
            setFixedClose(clinic.closingHours ?? "");
        } else if (clinicType === "Specialist" && clinic) {
            console.log(clinic.satPm)
            setSlotTimes({
                monToFriAm: parseSlotTime(clinic.monToFriAm ?? ""),
                monToFriPm: parseSlotTime(clinic.monToFriPm ?? ""),
                monToFriNight: parseSlotTime(clinic.monToFriNight ?? ""),
                satAm: parseSlotTime(clinic.satAm ?? ""),
                satPm: parseSlotTime(clinic.satPm ?? ""),
                satNight: parseSlotTime(clinic.satNight ?? ""),
                sunAm: parseSlotTime(clinic.sunAm ?? ""),
                sunPm: parseSlotTime(clinic.sunPm ?? ""),
                sunNight: parseSlotTime(clinic.sunNight ?? ""),
                publicHolidayAm: parseSlotTime(clinic.publicHolidayAm ?? ""),
                publicHolidayPm: parseSlotTime(clinic.publicHolidayPm ?? ""),
                publicHolidayNight: parseSlotTime(clinic.publicHolidayNight ?? ""),
            });
        }

    };

    const handleSaveClinicHours = async (id: number) => {
        try {
            // Choose the correct API endpoint for GP or Specialist
            let url =
                clinicType === "GP"
                    ? `${baseURL}/api/clinics/gp/${id}/operatingHour`
                    : `${baseURL}/api/clinics/specialist/${id}/operatingHour`;

            // Pick the correct body for GP (flat fields) vs Specialist (per-day fields)
            let body;
            if (clinicType === "GP") {
                body = JSON.stringify({
                    openingHours: fixedOpen,
                    closingHours: fixedClose
                });
            } else {
                const output: { [key: string]: string } = {};
                Object.keys(slotTimes).forEach(key => {
                    output[key] = slotTimes[key].open && slotTimes[key].start && slotTimes[key].end
                        ? `${slotTimes[key].start} - ${slotTimes[key].end}`
                        : "CLOSED";
                });
                console.log("Submitting", output);

                body = JSON.stringify(output);
            }

            const response = await fetch(url, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: body,
            });

            if (!response.ok) throw new Error();
            await fetchClinics();

            toast({ title: "Saved", description: "Clinic hours updated!" });
        } catch {
            toast({ title: "Error", description: "Could not save clinic hours", variant: "destructive" });
        }
    };

    return (
        <PageLayout>
            <div className="container mx-auto max-w-7xl px-4 py-8">
                <div className="mb-8">
                    <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-8 h-8 text-green-600" />
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Configure Clinic Operating Hours</h1>
                    </div>
                    <p className="text-lg text-gray-600">
                        Select a clinic and set its opening/closing hours.
                    </p>
                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-800">{error}</p>
                        </div>
                    )}
                </div>
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Step 1: Select Clinic Type</CardTitle>
                        <CardDescription>Choose whether you want to see GPs or specialists.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-w-md">
                            <Label htmlFor="type-filter">Select Clinic Type *</Label>
                            <Select value={clinicType} onValueChange={setClinicType}>
                                <SelectTrigger id="type-filter" className="mt-2">
                                    <SelectValue placeholder="Choose clinic type..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GP">General Practitioner</SelectItem>
                                    <SelectItem value="Specialist">Specialist</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {clinicType && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Step 2: Select Clinic</CardTitle>
                            <CardDescription>
                                {clinicType === "GP"
                                    ? "Choose a General Practitioner clinic."
                                    : "Choose a Specialist clinic."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Select value={selectedClinic} onValueChange={handleClinicSelect}>
                                <SelectTrigger id="clinic-filter" className="mt-2">
                                    <SelectValue placeholder="Choose a clinic..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clinics.length === 0 && (
                                        <SelectItem value="__no_clinic" disabled>No clinics available</SelectItem>
                                    )}
                                    {clinics.map(clinic => (
                                        <SelectItem key={clinic.sn} value={clinic.sn.toString()}>
                                            {clinic.clinicName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                        </CardContent>
                    </Card>
                )}

                {selectedClinic && (
                    <Card>
                        <CardContent>
                            <form
                                onSubmit={e => {
                                    e.preventDefault();
                                    handleSaveClinicHours(parseInt(selectedClinic));
                                }}
                            >
                                {clinicType === "GP" ? (
                                    <div className="flex items-center gap-4 my-1">
                                        <Label className="w-32">Operating Hours</Label>
                                        <Input
                                            type="time"
                                            value={fixedOpen}
                                            onChange={e => setFixedOpen(e.target.value)}
                                        />
                                        <span>to</span>
                                        <Input
                                            type="time"
                                            value={fixedClose}
                                            onChange={e => setFixedClose(e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    groupedFieldDefs.map(group => (
                                        <div key={group.groupLabel} className="mb-4">
                                            <div className="font-semibold mb-2">{group.groupLabel}</div>
                                            <div className="flex gap-6">
                                                {group.keys.map(fld => (
                                                    <div key={fld.key} className="flex flex-col items-start mr-4 mb-4" style={{ width: "265px" }}>
                                                        <div className="flex items-center mb-1">
                                                            <Label className="w-20 mr-1">{fld.label}</Label>
                                                            <label className="flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={slotTimes[fld.key].open}
                                                                    onChange={e => setSlotTimes(h => ({
                                                                        ...h,
                                                                        [fld.key]: { ...h[fld.key], open: e.target.checked }
                                                                    }))}
                                                                />
                                                                <span className="ml-1 text-sm">Open</span>
                                                            </label>
                                                        </div>
                                                        <div className="relative flex items-center" style={{ minHeight: "42px", width: "100%" }}>
                                                            {/* Always render both time inputs and placeholder */}
                                                            <Input
                                                                type="time"
                                                                className="w-28"
                                                                value={slotTimes[fld.key].start}
                                                                disabled={!slotTimes[fld.key].open}
                                                                style={{
                                                                    opacity: slotTimes[fld.key].open ? 1 : 0,
                                                                    pointerEvents: slotTimes[fld.key].open ? "auto" : "none",
                                                                    transition: "opacity 0.2s"
                                                                }}
                                                                onChange={e => setSlotTimes(h => ({
                                                                    ...h,
                                                                    [fld.key]: { ...h[fld.key], start: e.target.value }
                                                                }))}
                                                            />
                                                            <span
                                                                style={{
                                                                    opacity: slotTimes[fld.key].open ? 1 : 0,
                                                                    width: "30px",
                                                                    textAlign: "center",
                                                                    transition: "opacity 0.2s"
                                                                }}
                                                            >
                                                                to
                                                            </span>
                                                            <Input
                                                                type="time"
                                                                className="w-28"
                                                                value={slotTimes[fld.key].end}
                                                                disabled={!slotTimes[fld.key].open}
                                                                style={{
                                                                    opacity: slotTimes[fld.key].open ? 1 : 0,
                                                                    pointerEvents: slotTimes[fld.key].open ? "auto" : "none",
                                                                    transition: "opacity 0.2s"
                                                                }}
                                                                onChange={e => setSlotTimes(h => ({
                                                                    ...h,
                                                                    [fld.key]: { ...h[fld.key], end: e.target.value }
                                                                }))}
                                                            />
                                                            {/* Absolutely positioned Closed label: visible only if closed */}
                                                            {!slotTimes[fld.key].open && (
                                                                <span
                                                                    className="absolute text-gray-400"
                                                                    style={{
                                                                        left: 0,
                                                                        right: 0,
                                                                        textAlign: "center",
                                                                        pointerEvents: "none", // can't interact!
                                                                        width: "100%"
                                                                    }}
                                                                >
                                                                    Closed
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>


                                                ))}
                                            </div>
                                        </div>
                                    ))


                                )}

                                <Button type="submit" className="mt-3">Save Hours</Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

            </div>
        </PageLayout>
    );
}

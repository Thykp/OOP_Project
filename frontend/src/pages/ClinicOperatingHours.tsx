import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { PageLayout } from "@/components/page-layout";
import { Clock } from "lucide-react"


interface Clinic {
    sn: number;
    clinicName: string;
    openingHours: string;
    closingHours: string;
}

const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export default function ClinicOperatingHours() {
    const { toast } = useToast();
    const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [selectedClinic, setSelectedClinic] = useState<string>(""); // store sn as string!
    const [error, setError] = useState<string | null>(null);

    const [clinicHours, setClinicHours] = useState<{ [day: string]: { open: string, close: string } }>({});
    const [editingHours, setEditingHours] = useState<{ [day: string]: { open: string, close: string } }>({});
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

        if (clinicType === "GP" && clinic) {
            // Set from DB values; default to "" if not present
            setFixedOpen(clinic.openingHours ?? "");
            setFixedClose(clinic.closingHours ?? "");
        }

        // ...for Specialist, you would fetch/set per-day editingHours as needed
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
                body = JSON.stringify({
                    openingHours: editingHours // usually { MONDAY: {open,close}, ... }
                });
            }

            const response = await fetch(url, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: body,
            });

            if (!response.ok) throw new Error();
            toast({ title: "Saved", description: "Clinic hours updated!" });
            // Optionally update UI state:
            // setClinicHours( ... );
        } catch {
            toast({ title: "Error", description: "Could not save clinic hours", variant: "destructive" });
        }
    };

    return (
        <PageLayout>
            <div className="container mx-auto max-w-7xl px-4 py-8">
                <div className="mb-8">
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
                                    DAYS_OF_WEEK.map(day => (
                                        <div key={day} className="flex items-center gap-4 my-1">
                                            <Label className="w-32">{day.charAt(0) + day.slice(1).toLowerCase()}</Label>
                                            <Input
                                                type="time"
                                                value={editingHours[day]?.open || ""}
                                                onChange={e => setEditingHours(h => ({
                                                    ...h,
                                                    [day]: { ...h[day], open: e.target.value }
                                                }))}
                                            />
                                            <span>to</span>
                                            <Input
                                                type="time"
                                                value={editingHours[day]?.close || ""}
                                                onChange={e => setEditingHours(h => ({
                                                    ...h,
                                                    [day]: { ...h[day], close: e.target.value }
                                                }))}
                                            />
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

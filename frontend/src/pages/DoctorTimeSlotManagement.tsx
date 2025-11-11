"use client"

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Calendar, Clock, Users, ArrowLeft } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";



interface TimeSlot {
  id: number;
  doctorId: string;
  doctorName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  available?: boolean;
}

interface Doctor {
  doctorId: string;
  doctorName: string;
  clinicName: string;
  speciality: string;
}

const DAYS_OF_WEEK = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"
];

const SLOT_INTERVALS = [15, 30, 45, 60];

export default function AdminClinicConfig() {
  const { toast } = useToast();
  const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [filterDay] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);

  const [clinics, setClinics] = useState<string[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const [doctorsForClinic, setDoctorsForClinic] = useState<Doctor[]>([]);

  const [formData, setFormData] = useState({
    doctorId: "",
    doctorName: "",
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    slotInterval: 15,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<TimeSlot | null>(null);

  useEffect(() => {
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDoctor && selectedDoctor !== "ALL") {
      fetchTimeSlots(selectedDoctor);
    } else {
      setTimeSlots([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctor]);

  const fetchDoctors = async () => {
    try {
      setError(null);
      const response = await fetch(`${baseURL}/api/doctors`);
      if (!response.ok) throw new Error("Failed to fetch doctors");
      const data = await response.json() as Doctor[];
      setDoctors(data || []);
      setClinics([...new Set(data.map(d => d.clinicName))]);
    } catch {
      setError("Failed to load doctors. Please try again later.");
      toast({ title: "Error", description: "Failed to load doctors", variant: "destructive" });
    }
  };

  const fetchTimeSlots = async (doctorId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${baseURL}/api/timeslots/admin/doctor/${doctorId}`);
      if (!response.ok) throw new Error("Failed to fetch time slots");
      const data = await response.json();
      setTimeSlots(data || []);
    } catch {
      setError("Failed to load time slots. Please try again later.");
      toast({ title: "Error", description: "Failed to load time slots", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClinicSelect = (clinic: string) => {
    setSelectedClinic(clinic);
    setSelectedDoctor("");
    setDoctorsForClinic(doctors.filter(d => d.clinicName === clinic));
  };

  const handleDoctorSelect = (doctorId: string) => {
    setSelectedDoctor(doctorId)
    const doctor = doctors.find(d => d.doctorId === doctorId)
    if (doctor) {
      setFormData(prev => ({
        ...prev,
        doctorId: doctor.doctorId,
        doctorName: doctor.doctorName
      }))
    }
  };

  const handleCreateBulkSlots = async () => {
    if (!formData.doctorId || !formData.dayOfWeek || !formData.startTime || !formData.endTime) {
      toast({ title: "Validation Error", description: "Please fill in all required fields", variant: "destructive" });
      return
    }
    try {
      const response = await fetch(
        `${baseURL}/api/timeslots/admin/bulk?slotIntervalMinutes=${formData.slotInterval}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId: formData.doctorId,
            doctorName: formData.doctorName,
            dayOfWeek: formData.dayOfWeek,
            startTime: formData.startTime,
            endTime: formData.endTime
          })
        }
      );
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to create time slots");
      }
      const created = await response.json();
      toast({ title: "Success", description: `Created ${created.length} time slots successfully` });
      fetchTimeSlots(selectedDoctor);
      setFormData(prev => ({
        ...prev,
        dayOfWeek: "",
        startTime: "",
        endTime: ""
      }))
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create time slots", variant: "destructive" });
    }
  };

  const handleDeleteSlot = async () => {
    if (!slotToDelete) return
    try {
      const response = await fetch(`${baseURL}/api/timeslots/admin/${slotToDelete.id}`, { method: "DELETE" });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to delete time slot");
      }
      toast({ title: "Success", description: "Time slot deleted successfully" });
      fetchTimeSlots(selectedDoctor);
      setDeleteDialogOpen(false);
      setSlotToDelete(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete time slot", variant: "destructive" });
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "N/A"
    try {
      const parts = timeStr.split(":")
      if (parts.length < 2) return timeStr
      const hours = parseInt(parts[0], 10)
      const minutes = parts[1]
      if (isNaN(hours)) return timeStr
      const ampm = hours >= 12 ? "PM" : "AM"
      const displayHours = hours % 12 || 12
      return `${displayHours}:${minutes} ${ampm}`
    } catch {
      return timeStr
    }
  }

  const filteredSlots = (timeSlots || []).filter(
    slot => filterDay === "ALL" || (slot.dayOfWeek && slot.dayOfWeek === filterDay)
  );

  if (error && !loading) {
    return (
      <PageLayout>
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Page</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => { setError(null); fetchDoctors(); if (selectedDoctor) fetchTimeSlots(selectedDoctor); }}>
              Retry
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">

          <div>
            <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Clinic Doctor Time Slot Management</h1>
            </div>

            <p className="text-lg text-gray-600">
              Configure available doctors and their appointment schedules
            </p>
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Navigation button - position right/top in header */}
          <div className="mt-4 md:mt-0">
            <Link to="/admin/clinic-operating-hours">
              <Button variant="outline" size="sm">
                Configure Clinic Operating Hours
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Step 1: Select Clinic</CardTitle>
            <CardDescription>
              Choose a clinic to manage doctor schedules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label htmlFor="clinic-filter">Select Clinic *</Label>
              <Select value={selectedClinic} onValueChange={handleClinicSelect}>
                <SelectTrigger id="clinic-filter" className="mt-2">
                  <SelectValue placeholder="Choose a clinic..." />
                </SelectTrigger>
                <SelectContent>
                  {clinics.length === 0 && (
                    <SelectItem value="__no_clinic" disabled>
                      No clinics available
                    </SelectItem>
                  )}
                  {clinics.map(clinic => (
                    <SelectItem key={clinic} value={clinic}>{clinic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {selectedClinic && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Step 2: Select Doctor</CardTitle>
              <CardDescription>Manage timeslots for doctors in this clinic.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedDoctor} onValueChange={handleDoctorSelect}>
                <SelectTrigger id="doctor-filter" className="mt-2">
                  <SelectValue placeholder="Choose a doctor..." />
                </SelectTrigger>
                <SelectContent>
                  {doctorsForClinic.map(doctor => (
                    <SelectItem key={doctor.doctorId} value={doctor.doctorId}>
                      {doctor.doctorName} - {doctor.speciality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {selectedDoctor && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create Time Slot</CardTitle>
              <CardDescription>
                Configure doctor schedules and appointment time slots
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="day">Day of Week *</Label>
                  <Select
                    value={formData.dayOfWeek}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, dayOfWeek: value }))}
                  >
                    <SelectTrigger id="day">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day} value={day}>
                          {day.charAt(0) + day.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="interval">Slot Interval (minutes)</Label>
                  <Select
                    value={formData.slotInterval.toString()}
                    onValueChange={value => setFormData(prev => ({ ...prev, slotInterval: parseInt(value) }))}
                    disabled={false}
                  >
                    <SelectTrigger id="interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SLOT_INTERVALS.map(interval => (
                        <SelectItem key={interval} value={interval.toString()}>{interval} minutes</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="start-time">Start Time *</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">End Time *</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleCreateBulkSlots}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Create Multiple Slots ({formData.slotInterval} min intervals)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedDoctor && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: View Time Slots</CardTitle>
              <CardDescription>
                {filteredSlots.length} slot(s) found for selected doctor
                {filterDay !== "ALL" && ` on ${filterDay}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading time slots...</div>
              ) : filteredSlots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No time slots found for this doctor. Create your first time slot above.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSlots.map(slot => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{slot.doctorName || "Unknown Doctor"}</h3>
                          <p className="text-sm text-gray-600">
                            {slot.dayOfWeek ? (slot.dayOfWeek.charAt(0) + slot.dayOfWeek.slice(1).toLowerCase()) : "Unknown Day"}
                            {" • "}{formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline" size="sm"
                          onClick={() => { setSlotToDelete(slot); setDeleteDialogOpen(true); }}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Time Slot</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this time slot? This action cannot be undone.
                {slotToDelete && (
                  <div className="mt-2 p-2 bg-gray-100 rounded">
                    <strong>{slotToDelete.doctorName || "Unknown Doctor"}</strong><br />
                    {slotToDelete.dayOfWeek ? (slotToDelete.dayOfWeek.charAt(0) + slotToDelete.dayOfWeek.slice(1).toLowerCase()) : "Unknown Day"}
                    {" • "}{formatTime(slotToDelete.startTime || "")} - {formatTime(slotToDelete.endTime || "")}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSlot} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageLayout>
  );
}

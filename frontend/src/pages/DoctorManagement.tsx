"use client"

import { useEffect, useState } from "react"
import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Trash2, Edit, Plus, ArrowLeft, UserPlus, Search } from "lucide-react"
import { Link } from "react-router-dom"

interface Doctor {
  doctorId: string
  doctorName: string
  clinicName: string
  clinicId: string
  clinicAddress?: string
  speciality: string
}

export default function DoctorManagement() {
  const { toast } = useToast()
  const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [clinics, setClinics] = useState<string[]>([])
  const [selectedClinic, setSelectedClinic] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null)

  const [formData, setFormData] = useState({
    doctorId: "",
    doctorName: "",
    clinicId: "",
    clinicName: "",
    clinicAddress: "",
    speciality: "",
  })
  const [showCustomSpeciality, setShowCustomSpeciality] = useState(false)

  useEffect(() => {
    fetchDoctors()
  }, [])

  const fetchDoctors = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${baseURL}/api/doctors`)
      if (!response.ok) throw new Error("Failed to fetch doctors")
      const data = await response.json() as Doctor[]
      setDoctors(data || [])
      
      // Extract unique clinic names
      const uniqueClinics = [...new Set(data.map(d => d.clinicName).filter(Boolean))]
      setClinics(uniqueClinics)
    } catch (err) {
      setError("Failed to load doctors. Please try again later.")
      toast({
        title: "Error",
        description: "Failed to load doctors",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClinicSelect = (clinicName: string) => {
    setSelectedClinic(clinicName === "ALL" ? "" : clinicName)
  }

  // Extract unique specialities from doctors
  const uniqueSpecialities = [...new Set(doctors.map(d => d.speciality).filter(Boolean))].sort()

  const handleOpenDialog = (doctor?: Doctor) => {
    if (doctor) {
      setEditingDoctor(doctor)
      const isCustomSpeciality = !uniqueSpecialities.includes(doctor.speciality)
      setShowCustomSpeciality(isCustomSpeciality)
      setFormData({
        doctorId: doctor.doctorId,
        doctorName: doctor.doctorName,
        clinicId: doctor.clinicId,
        clinicName: doctor.clinicName,
        clinicAddress: doctor.clinicAddress || "",
        speciality: doctor.speciality,
      })
    } else {
      setEditingDoctor(null)
      setShowCustomSpeciality(false)
      setFormData({
        doctorId: "",
        doctorName: "",
        clinicId: "",
        clinicName: "",
        clinicAddress: "",
        speciality: "",
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingDoctor(null)
    setShowCustomSpeciality(false)
    setFormData({
      doctorId: "",
      doctorName: "",
      clinicId: "",
      clinicName: "",
      clinicAddress: "",
      speciality: "",
    })
  }

  const handleClinicNameChange = (clinicName: string) => {
    // Find clinic ID from existing doctors
    const clinic = doctors.find(d => d.clinicName === clinicName)
    setFormData(prev => ({
      ...prev,
      clinicName,
      clinicId: clinic?.clinicId || "",
      clinicAddress: clinic?.clinicAddress || "",
    }))
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.doctorId || !formData.doctorName || !formData.clinicName || !formData.speciality) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const url = editingDoctor
        ? `${baseURL}/api/doctors/${editingDoctor.doctorId}`
        : `${baseURL}/api/doctors`
      
      const method = editingDoctor ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || `Failed to ${editingDoctor ? "update" : "create"} doctor`)
      }

      toast({
        title: "Success",
        description: `Doctor ${editingDoctor ? "updated" : "created"} successfully`,
      })

      handleCloseDialog()
      fetchDoctors()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingDoctor ? "update" : "create"} doctor`,
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (doctor: Doctor) => {
    setDoctorToDelete(doctor)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!doctorToDelete) return

    try {
      const response = await fetch(`${baseURL}/api/doctors/${doctorToDelete.doctorId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || "Failed to delete doctor")
      }

      toast({
        title: "Success",
        description: "Doctor deleted successfully",
      })

      setDeleteDialogOpen(false)
      setDoctorToDelete(null)
      fetchDoctors()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete doctor",
        variant: "destructive",
      })
    }
  }

  const filteredDoctors = doctors.filter(doctor => {
    // Filter by clinic
    const clinicMatch = !selectedClinic || doctor.clinicName === selectedClinic
    
    // Filter by search query (searches name, ID, speciality, and clinic)
    const searchLower = searchQuery.toLowerCase().trim()
    const searchMatch = !searchLower || 
      doctor.doctorName.toLowerCase().includes(searchLower) ||
      doctor.doctorId.toLowerCase().includes(searchLower) ||
      doctor.speciality.toLowerCase().includes(searchLower) ||
      doctor.clinicName.toLowerCase().includes(searchLower) ||
      (doctor.clinicAddress && doctor.clinicAddress.toLowerCase().includes(searchLower))
    
    return clinicMatch && searchMatch
  })

  if (loading) {
    return (
      <PageLayout variant="dashboard">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading doctors...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout variant="dashboard">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <Link to="/admin/clinic-config" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Clinic Configuration
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <UserPlus className="w-8 h-8 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900">Doctor Management</h1>
            </div>
            <p className="text-lg text-gray-600">
              Add, edit, and manage doctors in your clinics
            </p>
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}
          </div>
          <div className="mt-4 md:mt-0">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Doctor
            </Button>
          </div>
        </div>

        {/* Filter by Clinic */}
        {clinics.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filter by Clinic</CardTitle>
              <CardDescription>View doctors from a specific clinic</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedClinic || "ALL"} onValueChange={handleClinicSelect}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="All Clinics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Clinics</SelectItem>
                  {clinics.map(clinic => (
                    <SelectItem key={clinic} value={clinic}>{clinic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Doctors List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Doctors ({filteredDoctors.length})
              {selectedClinic && ` - ${selectedClinic}`}
            </CardTitle>
            <CardDescription>
              Manage doctor information and assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search doctors by name, ID, speciality, clinic, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {filteredDoctors.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {selectedClinic
                  ? `No doctors found for ${selectedClinic}. Add your first doctor above.`
                  : "No doctors found. Add your first doctor above."}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDoctors.map(doctor => (
                  <div
                    key={doctor.doctorId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <UserPlus className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {doctor.doctorName}
                        </h3>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">ID:</span> {doctor.doctorId}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Speciality:</span> {doctor.speciality}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Clinic:</span> {doctor.clinicName}
                            {doctor.clinicAddress && ` • ${doctor.clinicAddress}`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(doctor)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteClick(doctor)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingDoctor ? "Edit Doctor" : "Add New Doctor"}
              </DialogTitle>
              <DialogDescription>
                {editingDoctor
                  ? "Update doctor information below."
                  : "Fill in the details to add a new doctor to your clinic."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="doctorId">Doctor ID *</Label>
                  <Input
                    id="doctorId"
                    value={formData.doctorId}
                    onChange={(e) => setFormData(prev => ({ ...prev, doctorId: e.target.value }))}
                    placeholder="e.g., DOC001"
                    disabled={!!editingDoctor}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="doctorName">Doctor Name *</Label>
                  <Input
                    id="doctorName"
                    value={formData.doctorName}
                    onChange={(e) => setFormData(prev => ({ ...prev, doctorName: e.target.value }))}
                    placeholder="e.g., Dr. John Smith"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="clinicName">Clinic Name *</Label>
                <Select
                  value={formData.clinicName}
                  onValueChange={handleClinicNameChange}
                >
                  <SelectTrigger id="clinicName" className="mt-2">
                    <SelectValue placeholder="Select a clinic" />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map(clinic => (
                      <SelectItem key={clinic} value={clinic}>{clinic}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="clinicAddress">Clinic Address</Label>
                <Input
                  id="clinicAddress"
                  value={formData.clinicAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, clinicAddress: e.target.value }))}
                  placeholder="e.g., 123 Main Street, Singapore"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="speciality">Speciality *</Label>
                {showCustomSpeciality ? (
                  <div className="mt-2">
                    <Input
                      id="speciality"
                      value={formData.speciality}
                      onChange={(e) => setFormData(prev => ({ ...prev, speciality: e.target.value }))}
                      placeholder="Enter custom speciality"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-sm"
                      onClick={() => {
                        setShowCustomSpeciality(false)
                        setFormData(prev => ({ ...prev, speciality: "" }))
                      }}
                    >
                      Or select from list
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={formData.speciality}
                    onValueChange={(value) => {
                      if (value === "__CUSTOM__") {
                        setShowCustomSpeciality(true)
                        setFormData(prev => ({ ...prev, speciality: "" }))
                      } else {
                        setFormData(prev => ({ ...prev, speciality: value }))
                      }
                    }}
                  >
                    <SelectTrigger id="speciality" className="mt-2">
                      <SelectValue placeholder="Select a speciality" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueSpecialities.map(speciality => (
                        <SelectItem key={speciality} value={speciality}>{speciality}</SelectItem>
                      ))}
                      <SelectItem value="__CUSTOM__">
                        <span className="italic">+ Add custom speciality</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingDoctor ? "Update Doctor" : "Create Doctor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Doctor</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this doctor? This action cannot be undone.
                {doctorToDelete && (
                  <div className="mt-2 p-2 bg-gray-100 rounded">
                    <strong>{doctorToDelete.doctorName}</strong><br />
                    ID: {doctorToDelete.doctorId}<br />
                    Clinic: {doctorToDelete.clinicName}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageLayout>
  )
}


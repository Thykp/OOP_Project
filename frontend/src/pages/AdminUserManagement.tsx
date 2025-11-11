"use client"

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2, Edit, Plus, Users, UserCheck, Search, ArrowLeft } from "lucide-react"
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

interface Patient {
  supabase_user_id: string
  email: string
  first_name: string
  last_name: string
  role: string
  phone: string
  date_of_birth: string
  gender: string
}

interface Staff {
  supabase_user_id: string
  email: string
  first_name: string
  last_name: string
  role: string
  clinic_name: string
  position: string
}

export default function AdminUserManagement() {
  const { toast } = useToast()
  const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"

  // State
  const [patients, setPatients] = useState<Patient[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("patients")

  // Edit form state
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; type: "patient" | "staff" } | null>(null)

  // Form data
  const [patientFormData, setPatientFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    gender: ""
  })

  const [staffFormData, setStaffFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    clinicName: "",
    position: ""
  })

  // Clinic options for staff
  const [clinicOptions, setClinicOptions] = useState<{ value: string; label: string }[]>([])

  // Fetch data
  useEffect(() => {
    fetchPatients()
    fetchStaff()
    fetchClinics()
  }, [])

  const fetchClinics = async () => {
    try {
      const gpRes = await fetch(`${baseURL}/api/clinics/gp?limit=100`)
      const gpData = await gpRes.json()
      const gpOptions = gpData.map((clinic: { clinicName: any }) => ({
        value: clinic.clinicName,
        label: clinic.clinicName,
      }))
      const spRes = await fetch(`${baseURL}/api/clinics/specialist?limit=100`)
      const spData = await spRes.json()
      const spOptions = spData.map((clinic: { clinicName: any }) => ({
        value: clinic.clinicName,
        label: clinic.clinicName,
      }))
      const combinedOptions = [...gpOptions, ...spOptions].sort((a, b) =>
        a.label.localeCompare(b.label)
      )
      setClinicOptions(combinedOptions)
    } catch (err) {
      console.error("Error fetching clinics:", err)
    }
  }

  const fetchPatients = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${baseURL}/api/users/patients`)
      if (!response.ok) throw new Error("Failed to fetch patients")
      const data = await response.json()
      setPatients(data)
    } catch (error) {
      console.error("Error fetching patients:", error)
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${baseURL}/api/users/staff`)
      if (!response.ok) throw new Error("Failed to fetch staff")
      const data = await response.json()
      setStaff(data)
    } catch (error) {
      console.error("Error fetching staff:", error)
      toast({
        title: "Error",
        description: "Failed to load staff",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient)
    setPatientFormData({
      email: patient.email,
      firstName: patient.first_name,
      lastName: patient.last_name,
      phone: patient.phone,
      dateOfBirth: patient.date_of_birth,
      gender: patient.gender
    })
  }

  const handleEditStaff = (staffMember: Staff) => {
    setEditingStaff(staffMember)
    setStaffFormData({
      email: staffMember.email,
      firstName: staffMember.first_name,
      lastName: staffMember.last_name,
      clinicName: staffMember.clinic_name,
      position: staffMember.position
    })
  }

  const handleUpdatePatient = async () => {
    if (!editingPatient) return

    try {
      const response = await fetch(`${baseURL}/api/users/patient/${editingPatient.supabase_user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: patientFormData.email,
          first_name: patientFormData.firstName,
          last_name: patientFormData.lastName,
          phone: patientFormData.phone,
          date_of_birth: patientFormData.dateOfBirth,
          gender: patientFormData.gender
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || "Failed to update patient")
      }

      toast({
        title: "Success",
        description: "Patient updated successfully"
      })

      fetchPatients()
      setEditingPatient(null)
      setPatientFormData({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        dateOfBirth: "",
        gender: ""
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update patient",
        variant: "destructive"
      })
    }
  }

  const handleUpdateStaff = async () => {
    if (!editingStaff) return

    try {
      const response = await fetch(`${baseURL}/api/users/staff/${editingStaff.supabase_user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: staffFormData.email,
          first_name: staffFormData.firstName,
          last_name: staffFormData.lastName,
          clinic_name: staffFormData.clinicName,
          position: staffFormData.position
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || "Failed to update staff")
      }

      toast({
        title: "Success",
        description: "Staff member updated successfully"
      })

      fetchStaff()
      setEditingStaff(null)
      setStaffFormData({
        email: "",
        firstName: "",
        lastName: "",
        clinicName: "",
        position: ""
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update staff",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      const response = await fetch(`${baseURL}/api/users/${userToDelete.id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || "Failed to delete user")
      }

      toast({
        title: "Success",
        description: "User deleted successfully"
      })

      if (userToDelete.type === "patient") {
        fetchPatients()
      } else {
        fetchStaff()
      }

      setDeleteDialogOpen(false)
      setUserToDelete(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      })
    }
  }

  const filteredPatients = patients.filter(
    p => {
      const query = searchQuery.toLowerCase()
      return (
        (p.first_name?.toLowerCase().includes(query) ?? false) ||
        (p.last_name?.toLowerCase().includes(query) ?? false) ||
        (p.email?.toLowerCase().includes(query) ?? false) ||
        (p.phone?.includes(searchQuery) ?? false)
      )
    }
  )

  const filteredStaff = staff.filter(
    s => {
      const query = searchQuery.toLowerCase()
      return (
        (s.first_name?.toLowerCase().includes(query) ?? false) ||
        (s.last_name?.toLowerCase().includes(query) ?? false) ||
        (s.email?.toLowerCase().includes(query) ?? false) ||
        (s.clinic_name?.toLowerCase().includes(query) ?? false) ||
        (s.position?.toLowerCase().includes(query) ?? false)
      )
    }
  )

  return (
    <PageLayout>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">User Account Management</h1>
              <p className="text-lg text-gray-600">
                Create, update, and delete user accounts. Manage Patients and Staff.
              </p>
            </div>
            <Link to="/signup">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create New User
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by name, email, phone, clinic, or position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Patients ({filteredPatients.length})
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Staff ({filteredStaff.length})
            </TabsTrigger>
          </TabsList>

          {/* Patients Tab */}
          <TabsContent value="patients">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : filteredPatients.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No patients found. {searchQuery && "Try adjusting your search."}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPatients.map((patient) => (
                  <Card key={patient.supabase_user_id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {patient.first_name || ""} {patient.last_name || ""}
                          </h3>
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Email:</span> {patient.email || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Phone:</span> {patient.phone || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Date of Birth:</span> {patient.date_of_birth || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Gender:</span> {patient.gender || "N/A"}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPatient(patient)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUserToDelete({
                                id: patient.supabase_user_id,
                                name: `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || patient.email || "Unknown",
                                type: "patient"
                              })
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : filteredStaff.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No staff found. {searchQuery && "Try adjusting your search."}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredStaff.map((staffMember) => (
                  <Card key={staffMember.supabase_user_id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {staffMember.first_name || ""} {staffMember.last_name || ""}
                          </h3>
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Email:</span> {staffMember.email || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Clinic:</span> {staffMember.clinic_name || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Position:</span> {staffMember.position || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Role:</span> {staffMember.role || "N/A"}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditStaff(staffMember)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUserToDelete({
                                id: staffMember.supabase_user_id,
                                name: `${staffMember.first_name || ""} ${staffMember.last_name || ""}`.trim() || staffMember.email || "Unknown",
                                type: "staff"
                              })
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Patient Dialog */}
        {editingPatient && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setEditingPatient(null)}
          >
            <Card 
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle>Edit Patient</CardTitle>
                <CardDescription>Update patient information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="p-email">Email</Label>
                  <Input
                    id="p-email"
                    value={patientFormData.email}
                    onChange={(e) => setPatientFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="p-phone">Phone</Label>
                  <Input
                    id="p-phone"
                    value={patientFormData.phone}
                    onChange={(e) => setPatientFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="p-firstname">First Name</Label>
                  <Input
                    id="p-firstname"
                    value={patientFormData.firstName}
                    onChange={(e) => setPatientFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="p-lastname">Last Name</Label>
                  <Input
                    id="p-lastname"
                    value={patientFormData.lastName}
                    onChange={(e) => setPatientFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="p-dob">Date of Birth</Label>
                  <Input
                    id="p-dob"
                    type="date"
                    value={patientFormData.dateOfBirth}
                    onChange={(e) => setPatientFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="p-gender">Gender</Label>
                  <Select
                    value={patientFormData.gender}
                    onValueChange={(value) => setPatientFormData(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger id="p-gender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleUpdatePatient}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setEditingPatient(null)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Staff Dialog */}
        {editingStaff && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setEditingStaff(null)}
          >
            <Card 
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle>Edit Staff Member</CardTitle>
                <CardDescription>Update staff information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="s-email">Email</Label>
                    <Input
                      id="s-email"
                      value={staffFormData.email}
                      onChange={(e) => setStaffFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="s-clinic">Clinic Name</Label>
                    <Select
                      value={staffFormData.clinicName}
                      onValueChange={(value) => setStaffFormData(prev => ({ ...prev, clinicName: value }))}
                    >
                      <SelectTrigger id="s-clinic">
                        <SelectValue placeholder="Select clinic" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64 overflow-y-auto">
                        {clinicOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="s-firstname">First Name</Label>
                    <Input
                      id="s-firstname"
                      value={staffFormData.firstName}
                      onChange={(e) => setStaffFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="s-lastname">Last Name</Label>
                    <Input
                      id="s-lastname"
                      value={staffFormData.lastName}
                      onChange={(e) => setStaffFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="s-position">Position</Label>
                    <Select
                      value={staffFormData.position}
                      onValueChange={(value) => setStaffFormData(prev => ({ ...prev, position: value }))}
                    >
                      <SelectTrigger id="s-position">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nurse">Nurse</SelectItem>
                        <SelectItem value="receptionist">Receptionist</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleUpdateStaff}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setEditingStaff(null)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageLayout>
  )
}


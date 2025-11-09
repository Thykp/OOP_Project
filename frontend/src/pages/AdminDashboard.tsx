import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PageLayout } from "@/components/page-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Shield } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/auth-context"
import { Modal } from "@/components/ui/Modal"

interface UserAccount {
    supabase_user_id: string
    first_name: string
    last_name: string
    email: string
    role: string
    permissions: string[]
    phone?: string
    date_of_birth?: string
    gender?: string
    position?: string
}

export default function AdminUserManagement() {
    const { user } = useAuth()
    const baseURL = import.meta.env.VITE_API_BASE_URL
    const [tabView, setTabView] = useState<"patients" | "staff">("patients")
    const [users, setUsers] = useState<UserAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [positionFilter, setPositionFilter] = useState("All")
    const [statusFilter, setStatusFilter] = useState("All")

    // Fetch users depending on selected tab
    const fetchUsers = () => {
        setLoading(true)
        fetch(`${baseURL}/api/users/${tabView}`)
            .then(res => res.json())
            .then(data => setUsers(data))
            .catch(err => console.error("Error fetching users:", err))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        fetchUsers()
    }, [tabView])

    // Filtering logic
    const filteredUsers = users.filter(u =>
        (!search || u.first_name.toLowerCase().includes(search.toLowerCase()) || u.last_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) &&
        (
            tabView !== "staff" ||                        // If not staff tab, ignore position filter
            positionFilter === "All" ||
            u.position === positionFilter
        )
    )

    const [modalOpen, setModalOpen] = useState(false)
    const [editUser, setEditUser] = useState<UserAccount | null>(null)
    const openUpdateModal = (user: UserAccount) => {
        setEditUser(user)
        setModalOpen(true)
    }

    // Modal close function
    const closeModal = () => {
        setEditUser(null)
        setModalOpen(false)
    }

    // Handle update (submit)
    const handleUpdateUser = () => {
        if (editUser) {
            console.log(editUser)
            fetch(`${baseURL}/api/users/${tabView === "patients" ? "patient" : "staff"}/${editUser.supabase_user_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editUser)
            })
                .then(fetchUsers)
                .finally(closeModal)
        }
    }

    const handleDeleteUser = (userId: string) => {
        if (!window.confirm("Delete this user?")) return
        fetch(`${baseURL}/api/users/${userId}`, {
            method: "DELETE"
        }).then(fetchUsers)
    }

    return (
        <PageLayout>
            <section className="py-12 px-4">
                <div className="container mx-auto max-w-5xl text-center">
                    <h3 className="text-4xl font-bold mb-2">User Account Management</h3>
                    <p className="text-gray-600 mb-8">
                        Manage Patients and Staff accounts. Update details, assign roles, and remove users safely.
                    </p>
                </div>
            </section>

            {/* Tabs for Patients/Staff */}
            <Tabs value={tabView}>
                <TabsList className="mb-8 mx-auto flex justify-center">
                    <TabsTrigger value="patients" onClick={() => setTabView("patients")}>
                        <User className="mr-2 h-4 w-4" /> Patients
                    </TabsTrigger>
                    <TabsTrigger value="staff" onClick={() => setTabView("staff")}>
                        <Shield className="mr-2 h-4 w-4" /> Staff
                    </TabsTrigger>
                </TabsList>

                {/* Filters & Search */}
                <section className="flex flex-col md:flex-row items-center gap-6 max-w-5xl mx-auto px-4 pb-6">
                    <div className="flex-1 min-w-[180px]">
                        <Label htmlFor="search" className="text-sm font-medium text-gray-700">Search</Label>
                        <Input id="search" placeholder="Name or Email" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    {tabView === "staff" && (
                        <div className="flex-1 min-w-[180px]">
                            <Label htmlFor="role" className="text-sm font-medium text-gray-700">Filter by Position</Label>
                            <Select value={positionFilter} onValueChange={setPositionFilter}>
                                <SelectTrigger><SelectValue placeholder="All Roles" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All</SelectItem>
                                    <SelectItem value="receptionist">Receptionist</SelectItem>
                                    <SelectItem value="nurse">Nurse</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="flex-1 min-w-[180px]">
                        <Label htmlFor="status" className="text-sm font-medium text-gray-700">Account Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Statuses</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="LOCKED">Locked</SelectItem>
                                <SelectItem value="DISABLED">Disabled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </section>

                {/* User List */}
                <section className="py-8 px-4 bg-gray-50">
                    <div className="container mx-auto max-w-5xl grid gap-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>{tabView === "patients" ? "Patients" : "Staff"} List</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {filteredUsers.length ? filteredUsers.map(u => (
                                        <div key={u.supabase_user_id} className="flex flex-col md:flex-row items-center justify-between border-b last:border-b-0 py-4">
                                            <div>
                                                <p className="font-semibold">{u.first_name} {u.last_name} <span className="ml-2 text-xs text-gray-500">{u.email}</span></p>
                                                <p className="text-xs text-gray-600">Permissions: {u.permissions && u.permissions.join(", ")}</p>
                                            </div>
                                            <div className="flex gap-2 mt-3 md:mt-0">
                                                <Button variant="outline" onClick={() => openUpdateModal(u)}>Update</Button>
                                                <Button variant="destructive" onClick={() => handleDeleteUser(u.supabase_user_id)}>Delete</Button>
                                            </div>
                                        </div>
                                    )) : (
                                        loading ? <div>Loading...</div> : <div>No users found.</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <Modal open={modalOpen} onClose={closeModal}>
                            <h2 className="text-xl font-bold mb-4">Update {tabView === "patients" ? "Patient" : "Staff"} Account</h2>
                            {editUser && (
                                <form
                                    onSubmit={e => {
                                        e.preventDefault()
                                        handleUpdateUser()
                                    }}
                                    className="space-y-4"
                                >
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <Label>First Name</Label>
                                            <Input
                                                value={editUser.first_name}
                                                onChange={e =>
                                                    setEditUser({ ...editUser, first_name: e.target.value })
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Label>Last Name</Label>
                                            <Input
                                                value={editUser.last_name}
                                                onChange={e =>
                                                    setEditUser({ ...editUser, last_name: e.target.value })
                                                }
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label>Email</Label>
                                        <Input
                                            type="email"
                                            value={editUser.email}
                                            onChange={e =>
                                                setEditUser({ ...editUser, email: e.target.value })
                                            }
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label>Role</Label>
                                        <Select
                                            value={editUser.role}
                                            onValueChange={role =>
                                                setEditUser({ ...editUser, role })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ROLE_PATIENT">Patient</SelectItem>
                                                <SelectItem value="ROLE_STAFF">Staff</SelectItem>
                                                <SelectItem value="ROLE_ADMIN">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>

                                    </div>
                                    {editUser?.role === "ROLE_PATIENT" && (
                                        <div>
                                            <Label>Phone Number</Label>
                                            <Input
                                                value={editUser.phone}
                                                onChange={e =>
                                                    setEditUser({ ...editUser, phone: e.target.value })
                                                }
                                                required
                                            />
                                            <Label>Date of Birth</Label>
                                            <Input
                                                type="date"
                                                value={editUser.date_of_birth || ""}
                                                onChange={e =>
                                                    setEditUser({ ...editUser, date_of_birth: e.target.value })
                                                }
                                                required
                                            />
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-2">
                                        <Button type="submit" className="bg-green-600 text-white" onClick={handleUpdateUser}>
                                            Save Changes
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={closeModal}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </Modal>

                    </div>
                </section>
            </Tabs>
        </PageLayout>
    )
}

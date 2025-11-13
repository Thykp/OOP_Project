"use client"

import { useEffect, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, ArrowLeft, RefreshCw, Download, Upload, Database } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"

interface SystemStats {
    totalAppointments: number
    booked: number
    cancelled: number
    completed: number
    checkedIn: number
    inConsultation: number
    noShow: number
    walkIn: number
    todayTotal: number
    todayScheduled: number
    todayCompleted: number
    statusCounts: Record<string, number>
    queueStatistics: {
        totalActiveQueues: number
        totalWaiting: number
        clinicQueues: Array<{
            clinicId: string
            clinicName?: string
            nowServing: number
            totalWaiting: number
        }>
    }
}

interface QueueState {
    clinicId: string
    clinicName?: string
    nowServing: number
    totalWaiting: number
    queueItems: Array<{
        appointmentId: string
        patientId: string
        patientName: string
        email: string
        phone: string
        position: number
        queueNumber: number
        doctorId: string
        doctorName: string
        doctorSpeciality: string
        createdAt: string
    }>
}

export default function SystemMonitoring() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [stats, setStats] = useState<SystemStats | null>(null)
    const [queueStates, setQueueStates] = useState<QueueState[]>([])
    const [activeTab, setActiveTab] = useState("stats")

    const fetchSystemStats = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE}/api/admin/system/stats`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText || `HTTP error! status: ${response.status}`)
            }

            const contentType = response.headers.get("content-type")
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Response is not JSON")
            }

            const data = await response.json()
            setStats(data)
        } catch (error: unknown) {
            console.error("Error fetching system stats:", error)
            const errorMessage = error instanceof Error ? error.message : "Failed to load system statistics"
            toast({
                variant: "destructive",
                title: "Error",
                description: errorMessage,
            })
        } finally {
            setLoading(false)
        }
    }, [toast])

    const fetchAllQueues = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE}/api/admin/system/queues`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText || `HTTP error! status: ${response.status}`)
            }

            const contentType = response.headers.get("content-type")
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Response is not JSON")
            }

            const data = await response.json()
            setQueueStates(data.queueStates || [])
        } catch (error: unknown) {
            console.error("Error fetching queue states:", error)
            const errorMessage = error instanceof Error ? error.message : "Failed to load queue states"
            toast({
                variant: "destructive",
                title: "Error",
                description: errorMessage,
            })
        } finally {
            setLoading(false)
        }
    }, [toast])

    useEffect(() => {
        // Use a small delay to avoid race conditions and ensure backend is ready
        const timer = setTimeout(() => {
            if (activeTab === "stats") {
                fetchSystemStats()
            } else if (activeTab === "queues") {
                fetchAllQueues()
            }
        }, 100)

        return () => clearTimeout(timer)
    }, [activeTab, fetchSystemStats, fetchAllQueues])

    const handleBackup = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE}/api/admin/system/backup`, {
                method: "POST",
            })
            if (!response.ok) throw new Error("Failed to create backup")
            const data = await response.json()

            // Download as JSON file
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `backup-${new Date().toISOString().split("T")[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            toast({
                title: "Success",
                description: "Backup created and downloaded successfully",
            })
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Failed to create backup"
            toast({
                variant: "destructive",
                title: "Error",
                description: errorMessage,
            })
        } finally {
            setLoading(false)
        }
    }

    const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            setLoading(true)
            const text = await file.text()
            const backupData = JSON.parse(text)

            const response = await fetch(`${API_BASE}/api/admin/system/restore`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(backupData),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || "Failed to restore backup")
            }

            const result = await response.json()
            toast({
                title: "Success",
                description: result.message || "Backup restored successfully",
            })
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Failed to restore backup"
            toast({
                variant: "destructive",
                title: "Error",
                description: errorMessage,
            })
        } finally {
            setLoading(false)
            // Reset file input
            event.target.value = ""
        }
    }

    return (
        <PageLayout>
            <div className="container mx-auto max-w-7xl px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <Link to="/admin">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-purple-600" />
                            <h1 className="text-4xl font-bold text-gray-900">System Monitoring</h1>
                        </div>
                    </div>
                    <p className="text-lg text-gray-600">
                        Monitor system usage, view queue statistics, and manage backups.
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="stats">Statistics</TabsTrigger>
                        <TabsTrigger value="queues">All Queues</TabsTrigger>
                        <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
                    </TabsList>

                    {/* Statistics Tab */}
                    <TabsContent value="stats" className="space-y-6">
                        <div className="flex justify-end">
                            <Button onClick={fetchSystemStats} disabled={loading} variant="outline">
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                Refresh
                            </Button>
                        </div>

                        {loading && !stats ? (
                            <div className="text-center py-8">Loading statistics...</div>
                        ) : stats ? (
                            <>
                                {/* Overview Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardDescription>Total Appointments</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold">{stats.totalAppointments}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardDescription>Booked</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-blue-600">{stats.booked}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardDescription>Cancelled</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-red-600">{stats.cancelled}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardDescription>Completed</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Status Breakdown */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Appointment Status Breakdown</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <div className="text-sm text-gray-600">Checked In</div>
                                                <div className="text-2xl font-bold">{stats.checkedIn}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-600">In Consultation</div>
                                                <div className="text-2xl font-bold">{stats.inConsultation}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-600">No Show</div>
                                                <div className="text-2xl font-bold">{stats.noShow}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-600">Walk-In</div>
                                                <div className="text-2xl font-bold">{stats.walkIn}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Today's Statistics */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Today's Statistics</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <div className="text-sm text-gray-600">Total Today</div>
                                                <div className="text-2xl font-bold">{stats.todayTotal}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-600">Scheduled</div>
                                                <div className="text-2xl font-bold text-blue-600">{stats.todayScheduled}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-600">Completed</div>
                                                <div className="text-2xl font-bold text-green-600">{stats.todayCompleted}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Queue Statistics */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Queue Statistics</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <div className="text-sm text-gray-600">Active Queues</div>
                                                <div className="text-2xl font-bold">{stats.queueStatistics.totalActiveQueues}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-600">Total Waiting</div>
                                                <div className="text-2xl font-bold text-orange-600">
                                                    {stats.queueStatistics.totalWaiting}
                                                </div>
                                            </div>
                                        </div>
                                        {stats.queueStatistics.clinicQueues.length > 0 && (
                                            <div className="mt-4">
                                                <div className="text-sm font-medium mb-2">Clinic Queues:</div>
                                                <div className="space-y-2">
                                                    {stats.queueStatistics.clinicQueues.map((clinic) => (
                                                        <div
                                                            key={clinic.clinicId}
                                                            className="flex justify-between items-center p-2 bg-gray-50 rounded"
                                                        >
                                                            <span className="font-medium">{clinic.clinicName || clinic.clinicId}</span>
                                                            <span className="text-sm text-gray-600">
                                                                Waiting: {clinic.totalWaiting} | Serving: {clinic.nowServing}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <div className="text-center py-8 text-gray-500">No statistics available</div>
                        )}
                    </TabsContent>

                    {/* All Queues Tab */}
                    <TabsContent value="queues" className="space-y-6">
                        <div className="flex justify-end">
                            <Button onClick={fetchAllQueues} disabled={loading} variant="outline">
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                Refresh
                            </Button>
                        </div>

                        {loading && queueStates.length === 0 ? (
                            <div className="text-center py-8">Loading queue states...</div>
                        ) : queueStates.length > 0 ? (
                            <div className="space-y-6">
                                {queueStates.map((queue) => (
                                    <Card key={queue.clinicId}>
                                        <CardHeader>
                                            <CardTitle>Clinic: {queue.clinicName || queue.clinicId}</CardTitle>
                                            <CardDescription>
                                                Now Serving: {queue.nowServing} | Total Waiting: {queue.totalWaiting}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {queue.queueItems.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Position</TableHead>
                                                                <TableHead>Queue #</TableHead>
                                                                <TableHead>Patient</TableHead>
                                                                <TableHead>Email</TableHead>
                                                                <TableHead>Phone</TableHead>
                                                                <TableHead>Doctor</TableHead>
                                                                <TableHead>Speciality</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {queue.queueItems.map((item) => (
                                                                <TableRow key={item.appointmentId}>
                                                                    <TableCell className="font-medium">{item.position}</TableCell>
                                                                    <TableCell>{item.queueNumber}</TableCell>
                                                                    <TableCell>{item.patientName}</TableCell>
                                                                    <TableCell>{item.email}</TableCell>
                                                                    <TableCell>{item.phone}</TableCell>
                                                                    <TableCell>{item.doctorName || "N/A"}</TableCell>
                                                                    <TableCell>{item.doctorSpeciality || "N/A"}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 text-gray-500">No patients in queue</div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">No active queues</div>
                        )}
                    </TabsContent>

                    {/* Backup & Restore Tab */}
                    <TabsContent value="backup" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Download className="h-5 w-5 text-blue-600" />
                                        <CardTitle>Create Backup</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Download a complete backup of system data including appointments and queue states.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button onClick={handleBackup} disabled={loading} className="w-full">
                                        <Database className="h-4 w-4 mr-2" />
                                        {loading ? "Creating Backup..." : "Create & Download Backup"}
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Upload className="h-5 w-5 text-green-600" />
                                        <CardTitle>Restore Backup</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Upload a backup file to restore system data. Please ensure the backup file is valid.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <label htmlFor="restore-file" className="cursor-pointer">
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            disabled={loading}
                                            type="button"
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            {loading ? "Restoring..." : "Select Backup File"}
                                        </Button>
                                    </label>
                                    <input
                                        id="restore-file"
                                        type="file"
                                        accept=".json"
                                        onChange={handleRestore}
                                        className="hidden"
                                        disabled={loading}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Backup Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p>
                                        <strong>Backup includes:</strong>
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 ml-4">
                                        <li>All appointment records</li>
                                        <li>Current queue states for all clinics</li>
                                        <li>Backup timestamp and date</li>
                                    </ul>
                                    <p className="mt-4">
                                        <strong>Note:</strong> Restore functionality requires additional implementation for
                                        full data restoration. The backup file is created successfully and can be used for
                                        data recovery purposes.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </PageLayout>
    )
}


import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/auth-context"
import { Calendar as CalendarIcon, Download, FileText, ArrowLeft, Clock, Users, XCircle, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

interface StaffReport {
  id: number
  clinic_id: string
  clinic_name: string
  report_date: string
  patients_seen: number
  average_waiting_time_minutes: number | null | undefined
  no_show_rate: number | null | undefined
  total_appointments: number
  no_show_count: number
  pdf_file_path: string | null
  generated_at: string
  generated_by: string
  generated_by_name?: string
}

export default function StaffReports() {
  const { user } = useAuth()
  const { toast } = useToast()
  const baseURL = import.meta.env.VITE_API_BASE_URL

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [currentReport, setCurrentReport] = useState<StaffReport | null>(null)
  const [pastReports, setPastReports] = useState<StaffReport[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [staffClinicId, setStaffClinicId] = useState<string | undefined>(user?.user_metadata?.clinicId)
  const [staffClinicName, setStaffClinicName] = useState<string | undefined>(user?.user_metadata?.clinicName)

  // Fetch staff clinic info
  useEffect(() => {
    const supabaseId = user?.id
    if (!supabaseId) return
    const controller = new AbortController()
    fetch(`${baseURL}/api/users/staff/${supabaseId}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return
        if (data.clinic_id) setStaffClinicId(data.clinic_id)
        if (data.clinic_name) setStaffClinicName(data.clinic_name)
      })
      .catch(() => { })
    return () => controller.abort()
  }, [user?.id, baseURL])

  // Fetch report when date changes
  useEffect(() => {
    if (!selectedDate || !staffClinicId) return
    fetchReportForDate(selectedDate)
  }, [selectedDate, staffClinicId])

  // Fetch past reports
  useEffect(() => {
    if (!staffClinicId) return
    fetchPastReports()
  }, [staffClinicId])

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null
    // Handle yyyy-MM-dd format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }
    // Try parsing as ISO string
    const parsed = new Date(dateStr)
    return isNaN(parsed.getTime()) ? null : parsed
  }

  const formatDateDisplay = (dateStr: string | null | undefined): string => {
    const date = parseDate(dateStr)
    if (!date) return "Invalid Date"
    return date.toLocaleDateString()
  }

  const formatDateTimeDisplay = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "Invalid Date"
    try {
      // Parse ISO date string - backend sends with timezone offset
      // Example: "2025-11-13T13:00:00+08:00" or "2025-11-13T05:00:00Z"
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        console.error("Invalid date string:", dateStr)
        return "Invalid Date"
      }
      
      // Format in Singapore timezone (GMT+8)
      // Intl.DateTimeFormat automatically converts the UTC date to the specified timezone
      const formatter = new Intl.DateTimeFormat("en-SG", {
        timeZone: "Asia/Singapore",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      })
      
      const formatted = formatter.format(date)
      console.log("Date conversion:", { original: dateStr, parsed: date.toISOString(), formatted })
      return formatted
    } catch (error) {
      console.error("Error formatting date:", error, dateStr)
      return "Invalid Date"
    }
  }

  const fetchReportForDate = async (date: Date) => {
    if (!staffClinicId) return
    setLoading(true)
    try {
      const dateStr = formatDate(date)
      const response = await fetch(`${baseURL}/api/staff/reports/${dateStr}?clinicId=${encodeURIComponent(staffClinicId)}`)
      if (response.ok) {
        const report = await response.json()
        console.log("Fetched report:", report)
        setCurrentReport(report)
      } else if (response.status === 400) {
        // Report doesn't exist yet
        setCurrentReport(null)
      } else {
        const errorText = await response.text()
        console.error("Failed to fetch report:", response.status, errorText)
        throw new Error("Failed to fetch report")
      }
    } catch (error) {
      console.error("Error fetching report:", error)
      setCurrentReport(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchPastReports = async () => {
    if (!staffClinicId) return
    try {
      const response = await fetch(`${baseURL}/api/staff/reports?clinicId=${encodeURIComponent(staffClinicId)}`)
      if (response.ok) {
        const reports = await response.json()
        console.log("Fetched past reports:", reports)
        setPastReports(reports)
      } else {
        console.error("Failed to fetch past reports:", response.status)
      }
    } catch (error) {
      console.error("Error fetching past reports:", error)
    }
  }

  const handleGenerateReport = async () => {
    if (!selectedDate || !staffClinicId || !user?.id) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a date and ensure you are logged in.",
      })
      return
    }

    setGenerating(true)
    try {
      const dateStr = formatDate(selectedDate)
      const response = await fetch(`${baseURL}/api/staff/reports/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
        },
        body: JSON.stringify({
          clinicId: staffClinicId,
          reportDate: dateStr,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || "Failed to generate report")
      }

      const report = await response.json()
      setCurrentReport(report)
      fetchPastReports() // Refresh past reports list

      toast({
        title: "Report Generated",
        description: `Daily report for ${dateStr} has been generated successfully.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate report. Please try again.",
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadPdf = async (reportId: number) => {
    try {
      const response = await fetch(`${baseURL}/api/staff/reports/${reportId}/download`)
      if (!response.ok) {
        throw new Error("Failed to download PDF")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `report_${reportId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Download Started",
        description: "PDF report is downloading.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to download PDF. Please try again.",
      })
    }
  }

  const handleDeleteReport = async (reportId: number, reportDate: string) => {
    if (!staffClinicId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Clinic ID is missing.",
      })
      return
    }

    if (!confirm(`Are you sure you want to delete the report for ${formatDateDisplay(reportDate)}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`${baseURL}/api/staff/reports/${reportId}?clinicId=${encodeURIComponent(staffClinicId)}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || "Failed to delete report")
      }

      toast({
        title: "Report Deleted",
        description: `Report for ${formatDateDisplay(reportDate)} has been deleted successfully.`,
      })

      // Refresh the reports
      if (selectedDate) {
        fetchReportForDate(selectedDate)
      }
      fetchPastReports()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete report. Please try again.",
      })
    }
  }

  return (
    <PageLayout variant="dashboard">
      <div className="min-h-[calc(100vh-8rem)] pb-8">
        {/* Heading */}
        <section className="py-6 px-4 bg-gradient-to-r from-green-50 to-blue-50 border-b">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                  Daily Reports
                </h3>
                <p className="text-sm text-gray-600">
                  {staffClinicName || "Clinic"} • Generate and view daily clinic reports
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-6 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="mb-6">
              <Link to="/staff/dashboard" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>

            {/* Date Selection and Generate Button */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Report Date</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                  <div className="flex-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? selectedDate.toLocaleDateString() : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button
                    onClick={handleGenerateReport}
                    disabled={!selectedDate || generating || loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {generating ? "Generating..." : "Generate Report"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Report Metrics */}
            {loading ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  Loading report...
                </CardContent>
              </Card>
            ) : currentReport ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Report for {formatDateDisplay(currentReport.report_date)}</CardTitle>
                      <div className="flex gap-2">
                        {currentReport.pdf_file_path && (
                          <Button
                            onClick={() => handleDownloadPdf(currentReport.id)}
                            variant="outline"
                            className="gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download PDF
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDeleteReport(currentReport.id, currentReport.report_date)}
                          variant="outline"
                          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Patients Seen Card */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-3 rounded-lg">
                              <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Patients Seen</p>
                              <p className="text-2xl font-bold text-gray-900">{currentReport.patients_seen}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Average Waiting Time Card */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-3 rounded-lg">
                              <Clock className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Avg Waiting Time</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {currentReport.average_waiting_time_minutes != null && typeof currentReport.average_waiting_time_minutes === 'number'
                                  ? `${Number(currentReport.average_waiting_time_minutes).toFixed(1)} min`
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* No-Show Rate Card */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <div className="bg-red-100 p-3 rounded-lg">
                              <XCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">No-Show Rate</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {currentReport.no_show_rate != null && typeof currentReport.no_show_rate === 'number'
                                  ? `${Number(currentReport.no_show_rate).toFixed(1)}%`
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Additional Details */}
                    <div className="mt-6 pt-6 border-t">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Total Appointments</p>
                          <p className="font-semibold">{currentReport.total_appointments}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">No-Show Count</p>
                          <p className="font-semibold">{currentReport.no_show_count}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Generated At</p>
                          <p className="font-semibold">
                            {formatDateTimeDisplay(currentReport.generated_at)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Generated By</p>
                          <p className="font-semibold">
                            {currentReport.generated_by_name || "Staff"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No report available for this date.</p>
                  <p className="text-sm mt-2">Click "Generate Report" to create one.</p>
                </CardContent>
              </Card>
            )}

            {/* Past Reports Section */}
            {pastReports.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Past Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pastReports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">
                            {formatDateDisplay(report.report_date)}
                          </p>
                          <div className="flex gap-4 mt-1 text-sm text-gray-600">
                            <span>Patients: {report.patients_seen}</span>
                            <span>
                              Waiting:{" "}
                              {report.average_waiting_time_minutes != null && typeof report.average_waiting_time_minutes === 'number'
                                ? `${Number(report.average_waiting_time_minutes).toFixed(1)} min`
                                : "N/A"}
                            </span>
                            <span>
                              No-Show:{" "}
                              {report.no_show_rate != null && typeof report.no_show_rate === 'number'
                                ? `${Number(report.no_show_rate).toFixed(1)}%`
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {report.pdf_file_path && (
                            <Button
                              onClick={() => handleDownloadPdf(report.id)}
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              <Download className="w-4 h-4" />
                              PDF
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDeleteReport(report.id, report.report_date)}
                            variant="outline"
                            size="sm"
                            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>
    </PageLayout>
  )
}


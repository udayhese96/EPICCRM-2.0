"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, ChevronDown } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const SOURCE_OPTIONS = {
  Google: ["Web", "Tele In", "GMB Tele In"],
  WhatsApp: ["Tele In", "Bulk Message"],
  CarDekho: ["CD B", "CD G"],
  CarWale: ["CWA", "CWB", "CWC", "CWG", "CWH", "CWK"],
  OEM: ["Dealer CMS", "TKM"],
  Meta: ["Web"],
  "Tele Out": ["Web"],
  Referral: [],
  Other: []
}

export default function UploadDataPage() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    details?: { total: number; success: number; failed: number; errors?: string[] }
  } | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [showFormat, setShowFormat] = useState(false)
  const [showOptional, setShowOptional] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[Upload] Initial auth check:', !!session?.access_token)
      setIsAuthenticated(!!session?.access_token)
    }
    checkAuth()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      setUploadResult({ success: false, message: "Invalid file type. Please upload a CSV or Excel file." })
      return
    }
    setSelectedFile(file)
    setUploadResult(null)
    parseFilePreview(file)
  }

  const parseFilePreview = async (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").slice(0, 6)
      const parsed = lines.map(line => line.split(",").map(v => v.trim().replace(/^"|"$/g, "")))
      setPreviewData(parsed)
    }
    reader.readAsText(file)
  }

  const handleUpload = async () => {
    console.log('[Upload] handleUpload called')
    console.log('[Upload] selectedFile:', selectedFile)
    
    if (!selectedFile) {
      console.log('[Upload] No file selected')
      setUploadResult({ success: false, message: "Please select a file to upload" })
      return
    }
    
    console.log('[Upload] Starting upload process...')
    setIsUploading(true)
    setUploadResult(null)
    
    try {
       const formData = new FormData()
       formData.append("file", selectedFile)
       console.log('[Upload] FormData created, file:', selectedFile.name)

      // Prefer cookie-based auth; let the browser send HttpOnly auth cookies
      console.log('[Upload] Making API request to /api/admin/leads/upload (cookie auth)')
      const response = await fetch("/api/admin/leads/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      
      console.log('[Upload] Response status:', response.status)
      const result = await response.json()
      console.log('[Upload] Response result:', result)
      
      if (response.ok) {
        setUploadResult({ success: true, message: `Successfully uploaded ${result.success} leads!`, details: result })
        setSelectedFile(null)
        setPreviewData([])
        setTimeout(() => router.push("/admin/assign-leads"), 3000)
      } else {
        setUploadResult({ success: false, message: result.error || "Upload failed", details: result })
      }
    } catch (error: any) {
      console.error('[Upload] Error:', error)
      setUploadResult({ success: false, message: error.message || "An error occurred during upload" })
    } finally {
      setIsUploading(false)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setPreviewData([])
    setUploadResult(null)
  }

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#fff7ef] via-[#fff2e4] to-[#ffe7d1]">
      {/* Soft orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-[-12vw] top-[-10vw] w-[42vw] h-[42vw] rounded-full bg-[rgba(251,176,92,0.12)] blur-2xl" />
        <div className="absolute right-[-14vw] bottom-[-8vw] w-[40vw] h-[40vw] rounded-full bg-[rgba(255,205,145,0.16)] blur-2xl" />
      </div>

      <DashboardLayout>
        <div className="relative z-10 mx-auto max-w-3xl px-4 md:px-0 py-10 space-y-10">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild className="rounded-xl bg-white/70 border-none shadow hover:bg-orange-50">
                <Link href="/admin/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="rounded-xl bg-white/70 border-none shadow hover:bg-blue-50">
                <Link href="/admin/assign-leads">
                  Go to Assign Leads
                </Link>
              </Button>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-orange-700">Bulk Upload</h1>
          </div>

          {/* HERO Upload Card (only essentials visible) */}
          <Card className="rounded-[2rem] bg-gradient-to-tr from-[#fff5ea] via-[#ffeacc] to-[#ffe1b3] shadow-2xl border border-orange-200">
            <CardHeader className="pb-0">
              <CardTitle className="text-2xl font-bold text-orange-800">Upload Leads</CardTitle>
              <CardDescription className="text-orange-700">
                Choose a CSV/Excel and optional defaults. That’s it.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              {/* Compact 2-column essentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="file" className="font-semibold text-orange-900">File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="rounded-xl border border-orange-200 shadow-sm text-orange-800 placeholder:text-orange-400 bg-white/90"
                  />
                  {selectedFile && (
                    <div className="flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2 border border-orange-100">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-orange-700" />
                        <span className="text-sm text-orange-900 font-medium truncate max-w-[180px]">{selectedFile.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-orange-600">{(selectedFile.size / 1024).toFixed(2)} KB</span>
                        <Button type="button" size="icon" variant="ghost" onClick={clearFile} title="Clear file">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                 <div className="space-y-2">
                   <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                     <p className="text-sm text-orange-800 font-medium">📋 Upload Process</p>
                     <p className="text-xs text-orange-700 mt-1">
                       Only customer name & mobile number are required. All other fields from your Excel will be imported as-is.
                     </p>
                   </div>
                 </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4">
                {selectedFile && !isUploading && (
                  <Button variant="outline" onClick={clearFile} className="rounded-xl shadow bg-white/80 border border-orange-200 text-orange-700">
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={() => {
                    console.log('[Upload] Button clicked!')
                    console.log('[Upload] selectedFile:', selectedFile)
                    console.log('[Upload] isUploading:', isUploading)
                    handleUpload()
                  }}
                  disabled={!selectedFile || isUploading}
                  className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-2 shadow-lg"
                >
                  {isUploading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>

               {/* Preview (only when file chosen) */}
               {previewData.length > 0 && (
                 <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <Label className="font-semibold text-orange-900">📊 What will go to Assign Leads (Preview)</Label>
                     <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                       {previewData.length - 1} leads ready
                     </div>
                   </div>
                   
                   <div className="border border-orange-100 rounded-2xl overflow-x-auto bg-white/90 shadow-sm">
                     <table className="w-full text-sm">
                       <thead className="bg-orange-50">
                         <tr>
                           <th className="px-3 py-2 text-left font-medium text-orange-800 border-b">Customer Name</th>
                           <th className="px-3 py-2 text-left font-medium text-orange-800 border-b">Mobile</th>
                           <th className="px-3 py-2 text-left font-medium text-orange-800 border-b">Source</th>
                           <th className="px-3 py-2 text-left font-medium text-orange-800 border-b">Location</th>
                           <th className="px-3 py-2 text-left font-medium text-orange-800 border-b">Model Interested</th>
                           <th className="px-3 py-2 text-left font-medium text-orange-800 border-b">Variant</th>
                           <th className="px-3 py-2 text-left font-medium text-orange-800 border-b">Campaign</th>
                           <th className="px-3 py-2 text-left font-medium text-orange-800 border-b">Status</th>
                         </tr>
                       </thead>
                       <tbody>
                         {previewData.slice(1).map((row: string[], rIdx: number) => {
                           const headers = previewData[0] || []
                           const nameIdx = headers.findIndex((h: string) => h.toLowerCase().includes('name'))
                           const mobileIdx = headers.findIndex((h: string) => h.toLowerCase().includes('mobile'))
                           const sourceIdx = headers.findIndex((h: string) => h.toLowerCase() === 'source')
                           const locationIdx = headers.findIndex((h: string) => h.toLowerCase().includes('location'))
                           const modelIdx = headers.findIndex((h: string) => h.toLowerCase().includes('model_interested'))
                           const variantIdx = headers.findIndex((h: string) => h.toLowerCase() === 'variant')
                           const campaignIdx = headers.findIndex((h: string) => h.toLowerCase() === 'campaign')
                           
                           return (
                             <tr key={rIdx} className="hover:bg-orange-50">
                               <td className="px-3 py-2 border-b text-orange-900 font-medium">
                                 {nameIdx >= 0 ? row[nameIdx] : 'N/A'}
                               </td>
                               <td className="px-3 py-2 border-b text-orange-900 font-mono text-xs">
                                 {mobileIdx >= 0 ? row[mobileIdx] : 'N/A'}
                               </td>
                               <td className="px-3 py-2 border-b text-orange-900">
                                 {sourceIdx >= 0 ? row[sourceIdx] : 'Not Set'}
                               </td>
                               <td className="px-3 py-2 border-b text-orange-900">
                                 {locationIdx >= 0 ? row[locationIdx] : 'Not Set'}
                               </td>
                               <td className="px-3 py-2 border-b text-orange-900 text-xs">
                                 {modelIdx >= 0 ? row[modelIdx] : 'Not Set'}
                               </td>
                               <td className="px-3 py-2 border-b text-orange-900 text-xs">
                                 {variantIdx >= 0 ? row[variantIdx] : 'Not Set'}
                               </td>
                               <td className="px-3 py-2 border-b text-orange-900 text-xs">
                                 {campaignIdx >= 0 ? row[campaignIdx] : 'Not Set'}
                               </td>
                               <td className="px-3 py-2 border-b">
                                 <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                   Pending
                                 </span>
                               </td>
                             </tr>
                           )
                         })}
                       </tbody>
                     </table>
                   </div>
                   
                   <div className="text-xs text-orange-700 bg-orange-50 p-3 rounded-lg border border-orange-200">
                     <p className="font-medium mb-1">✅ These leads will appear in Assign Leads with:</p>
                     <ul className="list-disc list-inside space-y-1">
                       <li><strong>Status:</strong> Pending (ready for assignment)</li>
                       <li><strong>Assigned:</strong> No (will show in unassigned section)</li>
                       <li><strong>Lead Status:</strong> Empty (fresh leads)</li>
                       <li><strong>All Excel data:</strong> Imported exactly as provided</li>
                     </ul>
                   </div>
                 </div>
               )}
            </CardContent>
          </Card>

          {/* Minimal secondary info row */}
          <div className="grid grid-cols-1 gap-6">
            {/* Format toggle */}
            <Card className="rounded-2xl bg-white/90 shadow border border-orange-100">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-orange-800">Format & Tips</CardTitle>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowFormat(v => !v)}>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFormat ? "rotate-180" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              {showFormat && (
                <CardContent className="pt-0 pb-4">
                  <div className="text-sm text-orange-900">
                    <div className="mb-2">
                      <b className="text-red-700">Required:</b>
                      <code className="mx-1 px-2 py-1 bg-red-100 rounded font-mono text-xs">customer_name</code>
                      <code className="mx-1 px-2 py-1 bg-red-100 rounded font-mono text-xs">customer_mobile_number</code>
                    </div>
                    <div className="mb-2">
                      <b className="text-blue-700">Recommended:</b>
                      <code className="mx-1 px-2 py-1 bg-blue-100 rounded font-mono text-xs">source</code>
                      <code className="mx-1 px-2 py-1 bg-blue-100 rounded font-mono text-xs">sub_source</code>
                      <code className="mx-1 px-2 py-1 bg-blue-100 rounded font-mono text-xs">customer_location</code>
                    </div>
                    <div className="rounded-xl bg-orange-50 border border-dashed border-orange-200 p-2">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
customer_name,customer_mobile_number,customer_location,source,sub_source,campaign,model_interested
John Doe,9876543210,T NAGAR,Meta,Web,Innova Campaign,Toyota Innova Crysta
                      </pre>
                    </div>
                    <Alert variant="default" className="rounded-lg bg-orange-100 border border-orange-200 mt-3">
                      <AlertCircle className="mr-2 h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-xs">
                        First row headers, case-insensitive names, 10-digit phones, defaults apply when columns missing, duplicates skipped.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Upload result toast-like card */}
            {uploadResult && (
              <Alert variant={uploadResult.success ? "default" : "destructive"} className="rounded-2xl shadow bg-white/95">
                {uploadResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <AlertTitle>{uploadResult.success ? "Success" : "Upload Failed"}</AlertTitle>
                  <AlertDescription className="text-sm">
                    {uploadResult.message}
                    {uploadResult.details && (
                      <div className="mt-2 space-y-1">
                        <p><strong>Total:</strong> {uploadResult.details.total}</p>
                        <p><strong>Uploaded:</strong> {uploadResult.details.success}</p>
                        <p><strong>Failed:</strong> {uploadResult.details.failed}</p>
                        {uploadResult.details.errors?.length > 0 && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-orange-700">Errors</summary>
                            <ul className="list-disc list-inside text-xs">
                              {uploadResult.details.errors.slice(0, 5).map((e: string, i: number) => <li key={i}>{e}</li>)}
                              {uploadResult.details.errors.length > 5 && (
                                <li>... {uploadResult.details.errors.length - 5} more</li>
                              )}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}
                    {uploadResult.success && (
                      <p className="mt-2 text-xs">Redirecting to Assign Leads...</p>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Template link */}
            <div className="flex justify-center">
              <Button variant="outline" asChild className="rounded-xl shadow bg-white/80 border border-orange-200 text-orange-700">
                <a href="/sample-leads-template.csv" download>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Download CSV Template
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </div>
  )
}

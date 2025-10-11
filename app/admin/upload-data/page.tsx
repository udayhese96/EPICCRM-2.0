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
    details?: { 
      total: number
      success: number
      failed: number
      duplicate_db_count?: number
      duplicate_file_count?: number
      duplicate_in_db?: string[]
      duplicate_in_file?: string[]
      errors?: string[]
    }
  } | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [showFormat, setShowFormat] = useState(false)
  const [showOptional, setShowOptional] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [duplicateNumbers, setDuplicateNumbers] = useState<Set<string>>(new Set())
  const [inFileDuplicates, setInFileDuplicates] = useState<Set<string>>(new Set())
  const [duplicateCheckFailed, setDuplicateCheckFailed] = useState(false)

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
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
    reader.onload = async (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").filter(line => line.trim()) // Remove empty lines
      const parsed = lines.map(line => line.split(",").map(v => v.trim().replace(/^"|"$/g, "")))
      setPreviewData(parsed)
      
      // Check for duplicates
      if (parsed.length > 1) {
        await checkForDuplicates(parsed)
      }
    }
    reader.readAsText(file)
  }

  const checkForDuplicates = async (parsedData: any[][]) => {
    try {
      const supabase = createClient()
      
      // Get the mobile number column index
      const headers = parsedData[0] || []
      const mobileIdx = headers.findIndex((h: string) => 
        h.toLowerCase().includes('mobile') && !h.toLowerCase().includes('alternate')
      )
      
      if (mobileIdx === -1) return
      
      // Extract all mobile numbers from the file
      const fileNumbers = parsedData.slice(1)
        .map(row => String(row[mobileIdx] || '').trim())
        .filter(num => num && num.length === 10 && /^\d+$/.test(num))
      
      // Check for duplicates within the file itself - FIXED LOGIC
      const numberCounts = new Map<string, number>()
      const fileDupes = new Set<string>()
      
      // Count occurrences of each number
      fileNumbers.forEach(num => {
        const count = (numberCounts.get(num) || 0) + 1
        numberCounts.set(num, count)
      })
      
      // Find numbers that appear more than once
      numberCounts.forEach((count, num) => {
        if (count > 1) {
          fileDupes.add(num)
        }
      })
      
      setInFileDuplicates(fileDupes)
      
      
      // Check against existing database records
      const uniqueNumbers = Array.from(new Set(fileNumbers))
      if (uniqueNumbers.length > 0) {
        
        try {
          // Try multiple query approaches
          const { data: existingLeads, error } = await supabase
            .from('lead_master')
            .select('customer_mobile_number')
            .in('customer_mobile_number', uniqueNumbers)
          
          
          if (error) {
            setDuplicateCheckFailed(true)
          } else if (existingLeads && existingLeads.length > 0) {
            const existingNumbers = new Set<string>(existingLeads.map((l: any) => String(l.customer_mobile_number)))
            setDuplicateNumbers(existingNumbers)
          }
        } catch (dbError) {
          setDuplicateCheckFailed(true)
        }
      }
    } catch (error) {
      setDuplicateCheckFailed(true)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadResult({ success: false, message: "Please select a file to upload" })
      return
    }
    
    setIsUploading(true)
    setUploadResult(null)
    
    try {
       const formData = new FormData()
       formData.append("file", selectedFile)

      const response = await fetch("/api/admin/leads/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setUploadResult({ success: true, message: `Upload completed! ${result.success} leads uploaded successfully.`, details: result })
        setSelectedFile(null)
        setPreviewData([])
        // Removed automatic redirect - user can manually go to assign leads
      } else {
        setUploadResult({ success: false, message: result.error || "Upload failed", details: result })
      }
    } catch (error: any) {
      setUploadResult({ success: false, message: error.message || "An error occurred during upload" })
    } finally {
      setIsUploading(false)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setPreviewData([])
    setUploadResult(null)
    setDuplicateNumbers(new Set())
    setInFileDuplicates(new Set())
    setDuplicateCheckFailed(false)
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
                  onClick={handleUpload}
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
                   <div className="flex items-center justify-between flex-wrap gap-2">
                     <Label className="font-semibold text-orange-900">📊 Complete Lead Preview</Label>
                     <div className="flex items-center gap-2 flex-wrap">
                       <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full font-medium">
                         ✓ {Math.max(0, previewData.length - 1 - duplicateNumbers.size - inFileDuplicates.size)} Valid
                       </div>
                       {duplicateNumbers.size > 0 && (
                         <div className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full font-medium">
                           ⚠ {duplicateNumbers.size} DB Duplicates
                         </div>
                       )}
                       {inFileDuplicates.size > 0 && (
                         <div className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded-full font-medium">
                           ⚠ {inFileDuplicates.size} File Duplicates
                         </div>
                       )}
                       <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full font-medium">
                         📋 Total: {previewData.length - 1}
                       </div>
                     </div>
                   </div>
                   
                   <div className="relative">
                     <div className="absolute top-2 right-4 z-20 bg-orange-600 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">
                       ← Scroll sideways to see all columns →
                     </div>
                     <div className="border border-orange-100 rounded-2xl overflow-hidden bg-white/90 shadow-sm max-h-[600px] overflow-x-auto overflow-y-auto">
                       <table className="min-w-full text-sm">
                         <thead className="bg-orange-50 sticky top-0 z-10 shadow-sm">
                           <tr>
                             <th className="px-3 py-2 text-left font-medium text-orange-800 border-b whitespace-nowrap min-w-[50px]">#</th>
                             <th className="px-3 py-2 text-left font-medium text-orange-800 border-b whitespace-nowrap min-w-[150px]">Customer Name</th>
                             <th className="px-3 py-2 text-left font-medium text-orange-800 border-b whitespace-nowrap min-w-[140px]">Mobile</th>
                             <th className="px-3 py-2 text-left font-medium text-orange-800 border-b whitespace-nowrap min-w-[100px]">Source</th>
                             <th className="px-3 py-2 text-left font-medium text-orange-800 border-b whitespace-nowrap min-w-[120px]">Location</th>
                             <th className="px-3 py-2 text-left font-medium text-orange-800 border-b whitespace-nowrap min-w-[150px]">Model Interested</th>
                             <th className="px-3 py-2 text-left font-medium text-orange-800 border-b whitespace-nowrap min-w-[120px]">Variant</th>
                             <th className="px-3 py-2 text-left font-medium text-orange-800 border-b whitespace-nowrap min-w-[120px]">Campaign</th>
                             <th className="px-3 py-2 text-left font-medium text-orange-800 border-b whitespace-nowrap min-w-[120px] sticky right-0 bg-orange-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">Status</th>
                           </tr>
                         </thead>
                       <tbody>
                         {previewData.slice(1).map((row: string[], rIdx: number) => {
                           const headers = previewData[0] || []
                           const nameIdx = headers.findIndex((h: string) => h.toLowerCase().includes('name'))
                           const mobileIdx = headers.findIndex((h: string) => h.toLowerCase().includes('mobile') && !h.toLowerCase().includes('alternate'))
                           const sourceIdx = headers.findIndex((h: string) => h.toLowerCase() === 'source')
                           const locationIdx = headers.findIndex((h: string) => h.toLowerCase().includes('location'))
                           const modelIdx = headers.findIndex((h: string) => h.toLowerCase().includes('model_interested'))
                           const variantIdx = headers.findIndex((h: string) => h.toLowerCase() === 'variant')
                           const campaignIdx = headers.findIndex((h: string) => h.toLowerCase() === 'campaign')
                           
                           const mobile = mobileIdx >= 0 ? String(row[mobileIdx] || '').trim() : ''
                           const isDuplicateInDB = duplicateNumbers.has(mobile)
                           const isDuplicateInFile = inFileDuplicates.has(mobile)
                           const isDuplicate = isDuplicateInDB || isDuplicateInFile
                           
                           return (
                             <tr 
                               key={rIdx} 
                               className={`
                                 ${isDuplicateInDB ? 'bg-red-50 hover:bg-red-100' : 
                                   isDuplicateInFile ? 'bg-orange-50 hover:bg-orange-100' : 
                                   'hover:bg-green-50'}
                               `}
                             >
                               <td className="px-3 py-2 border-b text-gray-600 text-xs font-medium whitespace-nowrap">
                                 {rIdx + 1}
                               </td>
                               <td className="px-3 py-2 border-b text-orange-900 font-medium whitespace-nowrap">
                                 {nameIdx >= 0 ? row[nameIdx] : 'N/A'}
                               </td>
                               <td className="px-3 py-2 border-b font-mono text-xs whitespace-nowrap">
                                 <div className="flex items-center gap-2">
                                   <span className={isDuplicate ? 'text-red-700 font-bold' : 'text-orange-900'}>
                                     {mobile || 'N/A'}
                                   </span>
                                   {isDuplicateInDB && (
                                     <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded font-bold" title="Already exists in database">
                                       DB DUP
                                     </span>
                                   )}
                                   {isDuplicateInFile && (
                                     <span className="text-xs bg-orange-600 text-white px-1.5 py-0.5 rounded font-bold" title="Duplicate within this file">
                                       FILE DUP
                                     </span>
                                   )}
                                 </div>
                               </td>
                               <td className="px-3 py-2 border-b text-orange-900 text-xs whitespace-nowrap">
                                 {sourceIdx >= 0 ? row[sourceIdx] : 'Not Set'}
                               </td>
                               <td className="px-3 py-2 border-b text-orange-900 text-xs whitespace-nowrap">
                                 {locationIdx >= 0 ? row[locationIdx] : 'Not Set'}
                               </td>
                               <td className="px-3 py-2 border-b text-orange-900 text-xs whitespace-nowrap">
                                 {modelIdx >= 0 ? row[modelIdx] : 'Not Set'}
                               </td>
                               <td className="px-3 py-2 border-b text-orange-900 text-xs whitespace-nowrap">
                                 {variantIdx >= 0 ? row[variantIdx] : 'Not Set'}
                               </td>
                               <td className="px-3 py-2 border-b text-orange-900 text-xs whitespace-nowrap">
                                 {campaignIdx >= 0 ? row[campaignIdx] : 'Not Set'}
                               </td>
                               <td className={`px-3 py-2 border-b whitespace-nowrap sticky right-0 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)] ${
                                 isDuplicateInDB ? 'bg-red-50' : 
                                 isDuplicateInFile ? 'bg-orange-50' : 
                                 'bg-white'
                               }`}>
                                 {isDuplicateInDB ? (
                                   <span className="px-2 py-1 bg-red-200 text-red-900 rounded-full text-xs font-bold">
                                     Will Skip
                                   </span>
                                 ) : isDuplicateInFile ? (
                                   <span className="px-2 py-1 bg-orange-200 text-orange-900 rounded-full text-xs font-bold">
                                     Duplicate
                                   </span>
                                 ) : (
                                   <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                     Will Upload
                                   </span>
                                 )}
                               </td>
                             </tr>
                           )
                         })}
                       </tbody>
                     </table>
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     <div className="text-xs text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                       <p className="font-bold mb-1">✅ Valid Leads ({Math.max(0, previewData.length - 1 - duplicateNumbers.size - inFileDuplicates.size)})</p>
                       <ul className="list-disc list-inside space-y-1">
                         <li><strong>Status:</strong> Pending (ready for assignment)</li>
                         <li><strong>Assigned:</strong> No (will show in unassigned section)</li>
                         <li><strong>All data:</strong> Imported exactly as provided</li>
                       </ul>
                     </div>
                     
                     {(duplicateNumbers.size > 0 || inFileDuplicates.size > 0) && (
                       <div className="text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                         <p className="font-bold mb-1">⚠️ Duplicates Found ({duplicateNumbers.size + inFileDuplicates.size})</p>
                         <ul className="list-disc list-inside space-y-1">
                           {duplicateNumbers.size > 0 && (
                             <li><strong>DB Duplicates:</strong> {duplicateNumbers.size} (already exist in database)</li>
                           )}
                           {inFileDuplicates.size > 0 && (
                             <li><strong>File Duplicates:</strong> {inFileDuplicates.size} (repeated in this file)</li>
                           )}
                           <li className="text-red-900 font-bold">These will be SKIPPED during upload</li>
                         </ul>
                       </div>
                     )}
                     
                     {/* Warning when duplicate check fails */}
                     {duplicateCheckFailed && (
                       <div className="text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                         <p className="font-bold mb-1">⚠️ Database Duplicate Check Failed</p>
                         <p>Cannot verify if numbers already exist in database due to authentication issues.</p>
                         <p className="font-medium mt-1">Backend will still check duplicates during upload.</p>
                       </div>
                     )}
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
                <div className="w-full">
                  <AlertTitle>{uploadResult.success ? "Upload Complete!" : "Upload Failed"}</AlertTitle>
                  <AlertDescription className="text-sm">
                    {uploadResult.message}
                    {uploadResult.details && (
                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="text-xs text-blue-600 font-medium">Total Rows</p>
                            <p className="text-lg font-bold text-blue-700">{uploadResult.details.total}</p>
                          </div>
                          <div className="bg-green-50 p-2 rounded">
                            <p className="text-xs text-green-600 font-medium">✓ Uploaded</p>
                            <p className="text-lg font-bold text-green-700">{uploadResult.details.success}</p>
                          </div>
                          {uploadResult.details.duplicate_db_count !== undefined && uploadResult.details.duplicate_db_count > 0 && (
                            <div className="bg-red-50 p-2 rounded">
                              <p className="text-xs text-red-600 font-medium">⚠ DB Duplicates</p>
                              <p className="text-lg font-bold text-red-700">{uploadResult.details.duplicate_db_count}</p>
                            </div>
                          )}
                          {uploadResult.details.duplicate_file_count !== undefined && uploadResult.details.duplicate_file_count > 0 && (
                            <div className="bg-orange-50 p-2 rounded">
                              <p className="text-xs text-orange-600 font-medium">⚠ File Duplicates</p>
                              <p className="text-lg font-bold text-orange-700">{uploadResult.details.duplicate_file_count}</p>
                            </div>
                          )}
                          {uploadResult.details.failed > 0 && (
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="text-xs text-gray-600 font-medium">✗ Failed</p>
                              <p className="text-lg font-bold text-gray-700">{uploadResult.details.failed}</p>
                            </div>
                          )}
                        </div>
                        
                        {uploadResult.details.duplicate_in_db && uploadResult.details.duplicate_in_db.length > 0 && (
                          <details className="mt-2 bg-red-50 p-2 rounded border border-red-200">
                            <summary className="cursor-pointer text-red-700 font-semibold text-xs">
                              📋 Database Duplicates ({uploadResult.details.duplicate_db_count})
                            </summary>
                            <ul className="list-disc list-inside text-xs mt-2 space-y-1 text-red-800">
                              {uploadResult.details.duplicate_in_db.map((e: string, i: number) => (
                                <li key={i}>{e}</li>
                              ))}
                              {uploadResult.details.duplicate_db_count! > uploadResult.details.duplicate_in_db.length && (
                                <li className="font-bold">... {uploadResult.details.duplicate_db_count! - uploadResult.details.duplicate_in_db.length} more</li>
                              )}
                            </ul>
                          </details>
                        )}
                        
                        {uploadResult.details.duplicate_in_file && uploadResult.details.duplicate_in_file.length > 0 && (
                          <details className="mt-2 bg-orange-50 p-2 rounded border border-orange-200">
                            <summary className="cursor-pointer text-orange-700 font-semibold text-xs">
                              📋 File Duplicates ({uploadResult.details.duplicate_file_count})
                            </summary>
                            <ul className="list-disc list-inside text-xs mt-2 space-y-1 text-orange-800">
                              {uploadResult.details.duplicate_in_file.map((e: string, i: number) => (
                                <li key={i}>{e}</li>
                              ))}
                              {uploadResult.details.duplicate_file_count! > uploadResult.details.duplicate_in_file.length && (
                                <li className="font-bold">... {uploadResult.details.duplicate_file_count! - uploadResult.details.duplicate_in_file.length} more</li>
                              )}
                            </ul>
                          </details>
                        )}
                        
                        {uploadResult.details?.errors && uploadResult.details.errors.length > 0 && (
                          <details className="mt-2 bg-gray-50 p-2 rounded border border-gray-200">
                            <summary className="cursor-pointer text-gray-700 font-semibold text-xs">
                              ⚠️ Other Errors
                            </summary>
                            <ul className="list-disc list-inside text-xs mt-2 space-y-1 text-gray-800">
                              {uploadResult.details.errors.slice(0, 5).map((e: string, i: number) => <li key={i}>{e}</li>)}
                              {uploadResult.details.errors.length > 5 && (
                                <li className="font-bold">... {uploadResult.details.errors.length - 5} more</li>
                              )}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}
                    {uploadResult.success && (
                      <div className="mt-3 flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200">
                        <p className="text-xs text-green-700 font-medium">✅ Upload completed! Review results above.</p>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white text-xs"
                          onClick={() => router.push("/admin/assign-leads")}
                        >
                          Go to Assign Leads
                        </Button>
                      </div>
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

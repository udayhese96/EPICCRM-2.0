"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Phone, Mail, Calendar, FileText, MessageSquare } from "lucide-react"

interface Activity {
  id: string
  activity_type: string
  title: string
  description: string | null
  scheduled_at: string | null
  completed_at: string | null
  created_at: string
  profiles: {
    first_name: string
    last_name: string
  }
}

interface LeadActivitiesProps {
  leadId: string
  activities: Activity[]
}

export function LeadActivities({ leadId, activities: initialActivities }: LeadActivitiesProps) {
  const [activities, setActivities] = useState(initialActivities)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    activityType: "note",
    title: "",
    description: "",
    scheduledAt: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data, error } = await supabase
        .from("lead_activities")
        .insert({
          lead_id: leadId,
          user_id: userData.user.id,
          activity_type: formData.activityType,
          title: formData.title,
          description: formData.description || null,
          scheduled_at: formData.scheduledAt || null,
        })
        .select(`
          *,
          profiles (
            first_name,
            last_name
          )
        `)
        .single()

      if (error) throw error

      setActivities([data, ...activities])
      setFormData({
        activityType: "note",
        title: "",
        description: "",
        scheduledAt: "",
      })
      setShowAddForm(false)
    } catch (error) {
      console.error("Error adding activity:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      case "meeting":
        return <Calendar className="h-4 w-4" />
      case "note":
        return <FileText className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "call":
        return "bg-blue-100 text-blue-800"
      case "email":
        return "bg-green-100 text-green-800"
      case "meeting":
        return "bg-purple-100 text-purple-800"
      case "note":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activities</CardTitle>
            <CardDescription>Track all interactions with this lead</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="activityType">Activity Type</Label>
                    <Select
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, activityType: value }))}
                      defaultValue="note"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduledAt">Scheduled Date/Time</Label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Activity title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Activity details..."
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button type="submit" size="sm" disabled={isLoading}>
                    {isLoading ? "Adding..." : "Add Activity"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex space-x-4 p-4 border rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  {getActivityIcon(activity.activity_type)}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{activity.title}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge className={getActivityColor(activity.activity_type)}>
                      {activity.activity_type.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-500">{new Date(activity.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {activity.description && <p className="text-gray-600 text-sm">{activity.description}</p>}
                {activity.scheduled_at && (
                  <p className="text-sm text-blue-600">Scheduled: {new Date(activity.scheduled_at).toLocaleString()}</p>
                )}
                <p className="text-xs text-gray-500">
                  by {activity.profiles.first_name} {activity.profiles.last_name}
                </p>
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No activities yet. Add the first activity to start tracking interactions.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

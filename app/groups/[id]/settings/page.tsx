'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Community, CommunityMember } from '@/lib/types'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Settings, Users, Trash2, Crown, UserPlus, Save, AlertTriangle, Share2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface CommunityMemberWithProfile extends CommunityMember {
  profiles: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
}

export default function GroupSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const [community, setCommunity] = useState<Community | null>(null)
  const [members, setMembers] = useState<CommunityMemberWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [isDeletingInvite, setIsDeletingInvite] = useState<string | null>(null)
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null)
  const [inviteLinks, setInviteLinks] = useState<Array<{
    id: string
    inviteUrl?: string
    invite_url?: string
    current_uses: number
    max_uses: number
    expires_at: string
  }>>([])

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    music_enabled: false
  })

  const loadCommunityData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get the current session to include the auth token
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('You must be logged in to view group settings')
        return
      }
      
      // First, get user's communities to find the community ID by numeric_id
      const communitiesResponse = await fetch('/api/communities', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      const communitiesData = await communitiesResponse.json()
      
      if (!communitiesResponse.ok || !communitiesData.success || !communitiesData.communities) {
        setError(communitiesData.error || 'Failed to load groups')
        return
      }
      
      const foundCommunity = communitiesData.communities.find(
        (c: { community_numeric_id: string }) => c.community_numeric_id === params['id']
      )
      
      if (!foundCommunity) {
        setError('Group not found')
        return
      }

      // Now get full community details
      const response = await fetch(`/api/communities/${foundCommunity.community_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok && data.success && data.community) {
        setCommunity(data.community)
        setFormData({
          name: data.community.name,
          description: data.community.description || '',
          music_enabled: data.community.music_enabled || false
        })
        setIsAdmin(data.userRole === 'admin')
        
        // Load community members
        await loadCommunityMembers(data.community.id, session.access_token)
        
        // Load invite links
        await loadInviteLinks(data.community.id, session.access_token)
      } else {
        setError(data.error || 'Failed to load group details')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [params['id']])

  const loadCommunityMembers = async (communityId: string, accessToken: string) => {
    try {
      const response = await fetch(`/api/communities/${communityId}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok && data.success && data.members) {
        setMembers(data.members)
      } else {
        console.error('Failed to load group members:', data.error)
        setMembers([])
      }
    } catch (error) {
      console.error('Failed to load group members:', error)
      setMembers([])
    }
  }

  const loadInviteLinks = async (communityId: string, accessToken: string) => {
    try {
      const response = await fetch(`/api/communities/${communityId}/invites`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok && data.success && data.invites) {
        setInviteLinks(data.invites)
      } else {
        console.error('Failed to load invite links:', data.error)
        setInviteLinks([])
      }
    } catch (error) {
      console.error('Failed to load invite links:', error)
      setInviteLinks([])
    }
  }

  useEffect(() => {
    loadCommunityData()
  }, [params['id'], loadCommunityData])

  const handleSaveSettings = async () => {
    if (!community || !isAdmin) return

    try {
      setIsSaving(true)
      
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('You must be logged in to update group settings')
        return
      }

      const response = await fetch(`/api/communities/${community.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setCommunity(data.community)
        // Show success message
        alert('Settings saved successfully!')
      } else {
        setError(data.error || 'Failed to save settings')
      }
      
    } catch {
      setError('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateInviteLink = async () => {
    if (!community) return

    try {
      setIsCreatingInvite(true)
      
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('You must be logged in to create invite links')
        return
      }

      const response = await fetch(`/api/communities/${community.id}/invites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Reload invite links
        await loadInviteLinks(community.id, session.access_token)
      } else {
        setError(data.error || 'Failed to create invite link')
      }
      
    } catch {
      setError('Failed to create invite link')
    } finally {
      setIsCreatingInvite(false)
    }
  }

  const copyInviteLink = async (inviteUrl: string, inviteId: string) => {
    try {
      // Check if clipboard API is available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteUrl)
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = inviteUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        textArea.remove()
      }
      
      // Show visual feedback
      setCopiedInviteId(inviteId)
      setTimeout(() => setCopiedInviteId(null), 2000) // Hide after 2 seconds
    } catch (error) {
      console.error('Failed to copy invite link:', error)
      // Fallback: try the old method
      try {
        const textArea = document.createElement('textarea')
        textArea.value = inviteUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        
        // Show visual feedback even for fallback
        setCopiedInviteId(inviteId)
        setTimeout(() => setCopiedInviteId(null), 2000)
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError)
      }
    }
  }

  const handleDeleteInviteLink = async (inviteId: string) => {
    if (!community) return

    try {
      setIsDeletingInvite(inviteId)
      
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('You must be logged in to delete invite links')
        return
      }

      const response = await fetch(`/api/communities/${community.id}/invites?inviteId=${inviteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Reload invite links
        await loadInviteLinks(community.id, session.access_token)
      } else {
        setError(data.error || 'Failed to delete invite link')
      }
      
    } catch {
      setError('Failed to delete invite link')
    } finally {
      setIsDeletingInvite(null)
    }
  }

  const handleDeleteCommunity = async () => {
    if (!community || !isAdmin) return

    try {
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('You must be logged in to delete group')
        return
      }

      const response = await fetch(`/api/communities/${community.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        router.push('/groups')
      } else {
        setError(data.error || 'Failed to delete group')
      }
      
    } catch {
      setError('Failed to delete group')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!isAdmin || !community) return

    try {
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('You must be logged in to remove members')
        return
      }

      const response = await fetch(`/api/communities/${community.id}/members?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Reload members list
        await loadCommunityMembers(community.id, session.access_token)
      } else {
        setError(data.error || 'Failed to remove member')
      }
      
    } catch {
      setError('Failed to remove member')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8" />
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-64 bg-gray-200 rounded" />
              <div className="h-64 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <Settings className="h-12 w-12 mx-auto mb-2" />
              <h2 className="text-xl font-semibold">Error Loading Settings</h2>
              <p className="text-gray-600">{error}</p>
            </div>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  if (!community) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Group Not Found</h2>
            <p className="text-gray-600 mb-6">
              The group you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Button onClick={() => router.push('/groups')} variant="outline">
              View All Groups
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You need admin privileges to access group settings.
            </p>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-8">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Settings className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" />
                <span>Group Settings</span>
              </div>
            </h1>
            <p className="text-gray-600 mt-2 break-words">
              Manage {community.name} settings and members
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Group Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Group Information</CardTitle>
            <CardDescription>
              Update basic group details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Group name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Group description (optional)"
              />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="music_enabled"
                  checked={formData.music_enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, music_enabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <label htmlFor="music_enabled" className="text-sm font-medium text-gray-500">
                    Enable Music Features
                  </label>
                  <p className="text-xs text-gray-400">
                    Allow group members to track new music releases from artists
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Group ID</label>
              <Input
                value={community.numeric_id}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                This ID is used to join the group and cannot be changed
              </p>
            </div>
            <Button 
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Member Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Members ({members.length})</span>
              </span>
              <Button 
                size="sm" 
                onClick={handleCreateInviteLink}
                disabled={isCreatingInvite}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isCreatingInvite ? 'Creating...' : 'Create Invite Link'}
              </Button>
            </CardTitle>
            <CardDescription>
              Manage group members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto">
              {members.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2" />
                  <p className="text-sm sm:text-base">No members found</p>
                  <p className="text-xs sm:text-sm">Invite members to get started</p>
                </div>
              ) : (
                members.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-medium">
                          {member.profiles?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{member.profiles?.name || 'Unknown'}</p>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{member.profiles?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                      {member.role === 'admin' && (
                        <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                      )}
                      <span className="text-xs sm:text-sm text-gray-500 capitalize">
                        {member.role}
                      </span>
                      {member.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="text-red-600 hover:text-red-700 p-1 sm:p-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Links Section */}
      {inviteLinks.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Share2 className="h-5 w-5" />
              <span>Invite Links</span>
            </CardTitle>
            <CardDescription>
              Share these links to invite people to join your group
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inviteLinks.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Invite Link</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {invite.current_uses}/{invite.max_uses} uses
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 font-mono break-all">
                      {invite.inviteUrl || invite.invite_url}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expires: {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyInviteLink(invite.inviteUrl || invite.invite_url || '', invite.id)}
                      className={copiedInviteId === invite.id ? 'bg-green-50 border-green-200 text-green-700' : ''}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      {copiedInviteId === invite.id ? 'Copied!' : 'Copy'}
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={isDeletingInvite === invite.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Invite Link</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete this invite link? This action cannot be undone.
                            Anyone with this link will no longer be able to join the group.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline">
                            Cancel
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={() => handleDeleteInviteLink(invite.id)}
                            disabled={isDeletingInvite === invite.id}
                          >
                            {isDeletingInvite === invite.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="mt-6 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h3 className="font-medium text-red-600">Delete Group</h3>
              <p className="text-sm text-gray-600">
                Permanently delete this group and all its data
              </p>
            </div>
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Group</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete &quot;{community.name}&quot;? This action cannot be undone.
                    All shows, RSVPs, and other data associated with this group will be permanently deleted.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteCommunity}>
                    Delete Group
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
      </div>
    </Layout>
  )
}

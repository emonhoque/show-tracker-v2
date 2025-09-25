'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { Avatar } from '@/components/Avatar'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Mail, Calendar, Save, X, Upload, Users, Settings, Crown, LogOut, Plus } from 'lucide-react'
import { BackButton } from '@/components/BackButton'
import { UserCommunity } from '@/lib/types'
import { LeaveCommunityDialog } from '@/components/LeaveCommunityDialog'

interface Profile {
  id: string
  email: string
  name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const { user, refreshProfile, profileData } = useAuth()
  const router = useRouter()
  const [isEditingName, setIsEditingName] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [communities, setCommunities] = useState<UserCommunity[]>([])
  const [loadingCommunities, setLoadingCommunities] = useState(true)
  const [leaveDialog, setLeaveDialog] = useState<{
    isOpen: boolean
    community: UserCommunity | null
  }>({ isOpen: false, community: null })

  useEffect(() => {
    if (profileData) {
      // Use profile data from auth context
      setProfile({
        id: profileData.id,
        email: profileData.email,
        name: profileData.name,
        avatar_url: profileData.avatar_url || null,
        created_at: '', // Not available in auth context
        updated_at: '' // Not available in auth context
      })
      setDisplayName(profileData.name)
      setLoadingProfile(false)
    } else if (user && !profileData) {
      // Only fetch if we have a user but no profile data from auth context
      const fetchProfile = async () => {
        try {
          const response = await fetch('/api/profile')
          if (response.ok) {
            const profileData = await response.json()
            setProfile(profileData)
            setDisplayName(profileData.name)
          } else {
            console.error('Failed to fetch profile')
          }
        } catch (error) {
          console.error('Error fetching profile:', error)
        } finally {
          setLoadingProfile(false)
        }
      }
      
      fetchProfile()
    } else if (!user) {
      setLoadingProfile(false)
    }
  }, [user, profileData])

  useEffect(() => {
    const fetchCommunities = async () => {
      if (!user) return
      
      try {
        setLoadingCommunities(true)
        
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          console.error('No session token available')
          return
        }
        
        const response = await fetch('/api/communities', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        const data = await response.json()
        
        if (response.ok && data.success && data.communities) {
          setCommunities(data.communities)
        } else {
          console.error('Failed to load communities:', data.error)
        }
      } catch (error) {
        console.error('Error fetching communities:', error)
      } finally {
        setLoadingCommunities(false)
      }
    }

    if (user) {
      fetchCommunities()
    } else {
      setLoadingCommunities(false)
    }
  }, [user])

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      setError('Display name is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: displayName.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update name')
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      setIsEditingName(false)
      
      if (refreshProfile) {
        await refreshProfile()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update name')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setDisplayName(profile?.name || user?.user_metadata?.['full_name'] || user?.email?.split('@')[0] || '')
    setError('')
    setIsEditingName(false)
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        setProfile(prev => prev ? { ...prev, avatar_url: result.url } : null)
        setError('')
        if (refreshProfile) {
          refreshProfile()
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to upload avatar')
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      setError('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }


  const handleCreateGroup = () => {
    router.push('/groups/create')
  }

  const handleGroupClick = (numericId: string) => {
    router.push(`/groups/${numericId}`)
  }

  const handleGroupSettings = (numericId: string) => {
    router.push(`/groups/${numericId}/settings`)
  }

  const handleLeaveGroup = (community: UserCommunity) => {
    setLeaveDialog({ isOpen: true, community })
  }

  const handleLeaveSuccess = () => {
    const fetchCommunities = async () => {
      if (!user) return
      
      try {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          console.error('No session token available')
          return
        }
        
        const response = await fetch('/api/communities', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        const data = await response.json()
        
        if (response.ok && data.success && data.communities) {
          setCommunities(data.communities)
        } else {
          console.error('Failed to reload communities:', data.error)
        }
      } catch (error) {
        console.error('Error reloading communities:', error)
      }
    }

    fetchCommunities()
  }

  if (loadingProfile || (user && !profileData && !profile)) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-4">
          <div className="space-y-6">
            {/* Back Button Skeleton */}
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            
            {/* Profile Card Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Display Name Section */}
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
                </div>
                
                {/* Email Section */}
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-80 animate-pulse"></div>
                </div>
                
                {/* Member Since Section */}
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4">
        <BackButton />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Settings
              </CardTitle>
              <CardDescription>
                Your account information from Google
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={profile?.avatar_url || profileData?.avatar_url}
                    alt="Profile"
                    size={64}
                    fallbackIcon={<User className="w-8 h-8 text-gray-400" />}
                    onError={() => {
                      console.error('Failed to load profile image');
                    }}
                  />
                  <div>
                    <p className="font-medium">{profile?.name || profileData?.name || user?.user_metadata?.['full_name'] || user?.email?.split('@')[0]}</p>
                    <p className="text-sm text-muted-foreground">{profile?.email || profileData?.email || user?.email}</p>
                  </div>
                </div>
                
                {/* Avatar Upload Controls */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      disabled={uploadingAvatar}
                      className="flex items-center gap-2"
                    >
                      <label
                        htmlFor="avatar-upload"
                        className="cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
                      </label>
                    </Button>
                    
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Upload a new profile picture to replace your current avatar.
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Email (read-only) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </label>
                  <Input
                    value={profile?.email || profileData?.email || user?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email address is managed by Google and cannot be changed here
                  </p>
                </div>

                {/* Display Name (editable) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Display Name
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={!isEditingName}
                      className={isEditingName ? '' : 'bg-gray-50'}
                    />
                    {!isEditingName ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingName(true)}
                      >
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveName}
                          disabled={isLoading}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={isLoading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {error && (
                    <p className="text-xs text-red-500">{error}</p>
                  )}
                  {!isEditingName && (
                    <p className="text-xs text-muted-foreground">
                      Click Edit to change your display name
                    </p>
                  )}
                </div>

                {/* Account Info */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Account Created
                  </label>
                  <Input
                    value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : (user?.created_at ? new Date(user.created_at).toLocaleDateString() : '')}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Groups Section */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    My Groups
                  </CardTitle>
                  <CardDescription>
                    Manage your group memberships and settings
                  </CardDescription>
                </div>
                <Button onClick={handleCreateGroup} className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Group</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCommunities ? (
                <div className="space-y-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ) : communities.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Groups Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    You&apos;re not a member of any groups. Create a new group or ask someone to invite you.
                  </p>
                  <Button onClick={handleCreateGroup} className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Create Your First Group</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {communities.map((community) => (
                    <div
                      key={community.community_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handleGroupClick(community.community_numeric_id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{community.community_name}</h4>
                              {community.user_role === 'admin' && (
                                <Crown className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {community.member_count} member{community.member_count !== 1 ? 's' : ''} • 
                              Role: {community.user_role}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleGroupSettings(community.community_numeric_id)
                          }}
                          title="Group Settings"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLeaveGroup(community)
                          }}
                          title="Leave Group"
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Leave Group Dialog */}
      {leaveDialog.community && (
        <LeaveCommunityDialog
          isOpen={leaveDialog.isOpen}
          onClose={() => setLeaveDialog({ isOpen: false, community: null })}
          communityId={leaveDialog.community.community_id}
          communityName={leaveDialog.community.community_name}
          userRole={leaveDialog.community.user_role as 'admin' | 'member'}
          onSuccess={handleLeaveSuccess}
        />
      )}
    </Layout>
  )
}

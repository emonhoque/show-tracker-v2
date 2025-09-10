'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PasswordGate } from '@/components/PasswordGate'
import { ShowCard } from '@/components/ShowCard'
import { ShowCardSkeleton } from '@/components/ShowCardSkeleton'
import { AddShowModal } from '@/components/AddShowModal'
import { EditShowModal } from '@/components/EditShowModal'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { PWAFeatures } from '@/components/PWAFeatures'
import { Show, RSVPSummary } from '@/lib/types'
import { formatNameForDisplay } from '@/lib/validation'
import { Plus, LogOut } from 'lucide-react'

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [upcomingShows, setUpcomingShows] = useState<Show[]>([])
  const [pastShows, setPastShows] = useState<Show[]>([])
  const [rsvpsData, setRsvpsData] = useState<Record<string, RSVPSummary>>({})
  const [pastShowsPagination, setPastShowsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingShow, setEditingShow] = useState<Show | null>(null)
  const [deletingShowId, setDeletingShowId] = useState<string | null>(null)
  const [deletingShowTitle, setDeletingShowTitle] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  // Check if component is mounted on client side
  useEffect(() => {
    setMounted(true)
    const storedName = localStorage.getItem('userName')
    if (storedName) {
      setUserName(storedName)
      setAuthenticated(true)
    }
  }, [])

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Check initial status
    setIsOffline(!navigator.onLine)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const fetchShows = useCallback(async (pastPage: number = 1) => {
    setLoading(true)
    try {
      // Fetch upcoming shows (now includes RSVPs)
      const upcomingResponse = await fetch('/api/shows/upcoming')
      if (upcomingResponse.ok) {
        const upcomingData = await upcomingResponse.json()
        if (Array.isArray(upcomingData)) {
          setUpcomingShows(upcomingData)
          
          // Extract RSVPs from shows
          const newRsvpsData: Record<string, RSVPSummary> = {}
          upcomingData.forEach((show: Show & { rsvps?: RSVPSummary }) => {
            if (show.rsvps) {
              newRsvpsData[show.id] = show.rsvps
            }
          })
          setRsvpsData(prev => ({ ...prev, ...newRsvpsData }))
        } else {
          console.error('Invalid upcoming shows data format:', upcomingData)
          setUpcomingShows([])
        }
      } else {
        console.error('Failed to fetch upcoming shows:', upcomingResponse.status)
        setUpcomingShows([])
      }

      // Fetch past shows with pagination
      const pastResponse = await fetch(`/api/shows/past?page=${pastPage}&limit=20`)
      if (pastResponse.ok) {
        const pastData = await pastResponse.json()
        if (pastData && Array.isArray(pastData.shows)) {
          setPastShows(pastData.shows)
          setPastShowsPagination(pastData.pagination)
          
          // Extract RSVPs from shows
          const newRsvpsData: Record<string, RSVPSummary> = {}
          pastData.shows.forEach((show: Show & { rsvps?: RSVPSummary }) => {
            if (show.rsvps) {
              newRsvpsData[show.id] = show.rsvps
            }
          })
          setRsvpsData(prev => ({ ...prev, ...newRsvpsData }))
        } else {
          console.error('Invalid past shows data format:', pastData)
          setPastShows([])
        }
      } else {
        console.error('Failed to fetch past shows:', pastResponse.status)
        setPastShows([])
      }
    } catch (error) {
      console.error('Error fetching shows:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch shows when authenticated
  useEffect(() => {
    if (authenticated) {
      fetchShows()
    }
  }, [authenticated, fetchShows])

  const handleAuthentication = (name: string) => {
    setUserName(name)
    setAuthenticated(true)
  }

  const handleShowAdded = () => {
    fetchShows(pastShowsPagination.page)
  }

  const handlePastShowsPageChange = (newPage: number) => {
    fetchShows(newPage)
  }

  const handleEditShow = (show: Show) => {
    setEditingShow(show)
    setShowEditModal(true)
  }

  const handleShowUpdated = () => {
    fetchShows(pastShowsPagination.page)
    setShowEditModal(false)
    setEditingShow(null)
  }

  const updateRSVPs = async (showId: string) => {
    try {
      const response = await fetch(`/api/rsvps/${showId}`)
      if (response.ok) {
        const data = await response.json()
        setRsvpsData(prev => ({ ...prev, [showId]: data }))
      }
    } catch (error) {
      console.error(`Error updating RSVPs for show ${showId}:`, error)
    }
  }

  const handleDeleteShow = (showId: string) => {
    const show = [...upcomingShows, ...pastShows].find(s => s.id === showId)
    if (show) {
      setDeletingShowId(showId)
      setDeletingShowTitle(show.title)
      setShowDeleteDialog(true)
    }
  }

  const confirmDeleteShow = async () => {
    if (!deletingShowId) return

    try {
      const response = await fetch(`/api/shows/${deletingShowId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to delete show')
        return
      }

      // Refresh shows
      await fetchShows(pastShowsPagination.page)
      setShowDeleteDialog(false)
      setDeletingShowId(null)
      setDeletingShowTitle('')
    } catch (error) {
      console.error('Error deleting show:', error)
      alert('Failed to delete show')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('userName')
    setAuthenticated(false)
    setUserName(null)
    setUpcomingShows([])
    setPastShows([])
  }

  // Show loading state until component is mounted
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return <PasswordGate onSuccess={handleAuthentication} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Show Tracker</h1>
            {userName && (
              <p className="text-sm text-gray-600">Welcome, {formatNameForDisplay(userName)}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddModal(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="sm:px-3 px-2">
              <LogOut className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
        {isOffline && (
          <div className="bg-yellow-100 border-t border-yellow-200 px-4 py-2">
            <p className="text-sm text-yellow-800 text-center">
              You&apos;re offline. Some features may not be available.
            </p>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="space-y-4">
            {loading ? (
              <>
                <ShowCardSkeleton />
                <ShowCardSkeleton />
                <ShowCardSkeleton />
              </>
            ) : upcomingShows.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No upcoming shows</p>
            ) : (
              upcomingShows.map((show) => (
                <ShowCard 
                  key={show.id} 
                  show={show} 
                  isPast={false} 
                  rsvps={rsvpsData[show.id] || { going: [], maybe: [], not_going: [] }}
                  onEdit={handleEditShow}
                  onDelete={handleDeleteShow}
                  onRSVPUpdate={() => updateRSVPs(show.id)}
                />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="past" className="space-y-4">
            {loading ? (
              <>
                <ShowCardSkeleton />
                <ShowCardSkeleton />
                <ShowCardSkeleton />
              </>
            ) : pastShows.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No past shows</p>
            ) : (
              <>
                {pastShows.map((show) => (
                  <ShowCard 
                    key={show.id} 
                    show={show} 
                    isPast={true} 
                    rsvps={rsvpsData[show.id] || { going: [], maybe: [], not_going: [] }}
                    onEdit={handleEditShow}
                    onDelete={handleDeleteShow}
                    onRSVPUpdate={() => updateRSVPs(show.id)}
                  />
                ))}
                
                {/* Pagination Controls */}
                {pastShowsPagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-6 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePastShowsPageChange(pastShowsPagination.page - 1)}
                      disabled={!pastShowsPagination.hasPrev || loading}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        Page {pastShowsPagination.page} of {pastShowsPagination.totalPages}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({pastShowsPagination.total} total shows)
                      </span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePastShowsPageChange(pastShowsPagination.page + 1)}
                      disabled={!pastShowsPagination.hasNext || loading}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Show Modal */}
      <AddShowModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onShowAdded={handleShowAdded}
      />

      {/* Edit Show Modal */}
      <EditShowModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        show={editingShow}
        onShowUpdated={handleShowUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        showTitle={deletingShowTitle}
        onConfirm={confirmDeleteShow}
      />

      {/* PWA Features */}
      <PWAFeatures onRefresh={fetchShows} />
    </div>
  )
}
import { notFound, redirect } from 'next/navigation'
import { getShowByPublicId } from '@/lib/shareable-urls'
import { ShowDetail } from '@/components/ShowDetail'
import { Layout } from '@/components/Layout'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface ShowPageProps {
  params: Promise<{
    communityId: string
    publicId: string
  }>
}

export default async function ShowPage({ params }: ShowPageProps) {
  const { communityId, publicId } = await params

  try {
    // Check authentication first
    const supabaseClient = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      // Redirect to access denied page for authentication
      const returnUrl = `/c/${communityId}/e/${publicId}`
      redirect(`/access-denied?reason=auth&returnUrl=${encodeURIComponent(returnUrl)}`)
    }

    // Get the show data
    const result = await getShowByPublicId(publicId, communityId)

    if (!result.success || !result.show) {
      notFound()
    }

    // Check if user is a member of the community
    if (result.show.community_id) {
      console.log('Checking membership for:', {
        community_id: result.show.community_id,
        user_id: user.id
      })
      
      const { data: membership, error: membershipError } = await supabaseClient
        .from('community_members')
        .select('community_id, user_id, role')
        .eq('community_id', result.show.community_id)
        .eq('user_id', user.id)
        .single()

      console.log('Membership check result:', {
        membership,
        membershipError: membershipError?.message,
        code: membershipError?.code
      })

      if (membershipError || !membership) {
        // User is not a member of this community
        // Get community name for better error message
        const { data: community, error: communityError } = await supabaseClient
          .from('communities')
          .select('name')
          .eq('id', result.show.community_id)
          .single()
        
        console.log('Community lookup result:', {
          community,
          communityError: communityError?.message
        })
        
        const communityName = community?.name || 'this community'
        redirect(`/access-denied?reason=membership&communityName=${encodeURIComponent(communityName)}`)
      }
    }

    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
        <ShowDetail 
          show={result.show} 
          rsvps={result.rsvps}
          communityId={communityId}
        />
        </div>
      </Layout>
    )
  } catch (error) {
    // Check if this is a Next.js redirect (which throws an error internally)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      // Re-throw redirect errors so they work properly
      throw error
    }
    
    console.error('Error loading show:', error)
    notFound()
  }
}

// Generate metadata for the page
export async function generateMetadata({ params }: ShowPageProps) {
  const { communityId, publicId } = await params

  try {
    // Check authentication for metadata generation
    const supabaseClient = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return {
        title: 'Sign In Required',
        description: 'You need to be signed in to view this content.'
      }
    }

    const result = await getShowByPublicId(publicId, communityId)

    if (!result.success || !result.show) {
      return {
        title: 'Show Not Found',
        description: 'The requested show could not be found.'
      }
    }

    // Check community membership for metadata
    if (result.show.community_id) {
      const { data: membership, error: membershipError } = await supabaseClient
        .from('community_members')
        .select('community_id, user_id, role')
        .eq('community_id', result.show.community_id)
        .eq('user_id', user.id)
        .single()

      if (membershipError || !membership) {
        // Get community name for better error message
        const { data: community } = await supabaseClient
          .from('communities')
          .select('name')
          .eq('id', result.show.community_id)
          .single()
        
        const communityName = community?.name || 'this community'
        return {
          title: 'Community Access Required',
          description: `You need to be a member of "${communityName}" to view this content.`
        }
      }
    }

    const { show } = result
    const date = new Date(show.date_time).toLocaleDateString()
    const time = show.time_local

    return {
      title: `${show.title} - ${show.venue}`,
      description: `${show.title} at ${show.venue} on ${date} at ${time}. ${show.notes || ''}`,
      openGraph: {
        title: `${show.title} - ${show.venue}`,
        description: `${show.title} at ${show.venue} on ${date} at ${time}`,
        type: 'website',
        images: show.poster_url ? [{ url: show.poster_url }] : undefined,
      },
    }
  } catch (error) {
    // Check if this is a Next.js redirect (which throws an error internally)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      // Re-throw redirect errors so they work properly
      throw error
    }
    
    return {
      title: 'Show Not Found',
      description: 'The requested show could not be found.'
    }
  }
}

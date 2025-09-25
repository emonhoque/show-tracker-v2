import { notFound, redirect } from 'next/navigation'
import { getShowByPublicId } from '@/lib/shareable-urls'
import { ShowDetail } from '@/components/ShowDetail'
import { ShareableLayout } from '@/components/ShareableLayout'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface ShowPageProps {
  params: Promise<{
    id: string
    publicId: string  
  }>
}

export default async function ShowPage({ params }: ShowPageProps) {
  const { id, publicId } = await params

  try {
    const supabaseClient = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      const returnUrl = `/groups/${id}/event/${publicId}`
      redirect(`/access-denied?reason=auth&returnUrl=${encodeURIComponent(returnUrl)}`)
    }

    const result = await getShowByPublicId(publicId, id)

    if (!result.success || !result.show) {
      notFound()
    }

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
        const { data: community, error: communityError } = await supabaseClient
          .from('communities')
          .select('name')
          .eq('id', result.show.community_id)
          .single()
        
        console.log('Community lookup result:', {
          community,
          communityError: communityError?.message
        })
        
        const communityName = community?.name || 'this group'
        redirect(`/access-denied?reason=membership&communityName=${encodeURIComponent(communityName)}`)
      }
    }

    return (
      <ShareableLayout>
        <div className="container mx-auto px-4 py-8">
          <ShowDetail 
            show={result.show} 
            rsvps={result.rsvps}
            communityId={id}
          />
        </div>
      </ShareableLayout>
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    
    console.error('Error loading show:', error)
    notFound()
  }
}

export async function generateMetadata({ params }: ShowPageProps) {
  const { id, publicId } = await params

  try {
    const supabaseClient = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return {
        title: 'Sign In Required',
        description: 'You need to be signed in to view this content.'
      }
    }

    const result = await getShowByPublicId(publicId, id)

    if (!result.success || !result.show) {
      return {
        title: 'Show Not Found',
        description: 'The requested show could not be found.'
      }
    }

    if (result.show.community_id) {
      const { data: membership, error: membershipError } = await supabaseClient
        .from('community_members')
        .select('community_id, user_id, role')
        .eq('community_id', result.show.community_id)
        .eq('user_id', user.id)
        .single()

      if (membershipError || !membership) {
        const { data: community } = await supabaseClient
          .from('communities')
          .select('name')
          .eq('id', result.show.community_id)
          .single()
        
        const communityName = community?.name || 'this group'
        return {
          title: 'Group Access Required',
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
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    
    return {
      title: 'Show Not Found',
      description: 'The requested show could not be found.'
    }
  }
}

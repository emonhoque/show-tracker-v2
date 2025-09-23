import { notFound } from 'next/navigation'
import { getShowByPublicId } from '@/lib/shareable-urls'
import { ShowDetail } from '@/components/ShowDetail'
import { Layout } from '@/components/Layout'

interface SharePageProps {
  params: Promise<{
    publicId: string
  }>
}

export default async function SharePage({ params }: SharePageProps) {
  const { publicId } = await params

  try {
    const result = await getShowByPublicId(publicId)

    if (!result.success || !result.show) {
      notFound()
    }

    // If the show has a community, redirect to the community-specific URL
    if (result.show.community_id) {
      // We need to get the community slug - for now, we'll show the show
      // but in a real implementation, you'd query the community table
      // For now, we'll just show the show without community context
    }

    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <ShowDetail 
            show={result.show} 
            rsvps={result.rsvps}
          />
        </div>
      </Layout>
    )
  } catch (error) {
    console.error('Error loading show:', error)
    notFound()
  }
}

// Generate metadata for the page
export async function generateMetadata({ params }: SharePageProps) {
  const { publicId } = await params

  try {
    const result = await getShowByPublicId(publicId)

    if (!result.success || !result.show) {
      return {
        title: 'Show Not Found',
        description: 'The requested show could not be found.'
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
  } catch {
    return {
      title: 'Show Not Found',
      description: 'The requested show could not be found.'
    }
  }
}

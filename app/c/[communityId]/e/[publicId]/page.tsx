import { notFound } from 'next/navigation'
import { getShowByPublicId } from '@/lib/shareable-urls'
import { ShowDetail } from '@/components/ShowDetail'

interface ShowPageProps {
  params: Promise<{
    communityId: string
    publicId: string
  }>
}

export default async function ShowPage({ params }: ShowPageProps) {
  const { communityId, publicId } = await params

  try {
    const result = await getShowByPublicId(publicId, communityId)

    if (!result.success || !result.show) {
      notFound()
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <ShowDetail 
          show={result.show} 
          rsvps={result.rsvps}
          communityId={communityId}
        />
      </div>
    )
  } catch (error) {
    console.error('Error loading show:', error)
    notFound()
  }
}

// Generate metadata for the page
export async function generateMetadata({ params }: ShowPageProps) {
  const { communityId, publicId } = await params

  try {
    const result = await getShowByPublicId(publicId, communityId)

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

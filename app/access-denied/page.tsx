import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Layout } from '@/components/Layout'
import { Shield, Users, LogIn, ArrowLeft } from 'lucide-react'

interface AccessDeniedPageProps {
  searchParams: Promise<{
    reason?: 'auth' | 'membership' | 'community'
    communityName?: string
    returnUrl?: string
  }>
}

export default async function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const { reason, communityName, returnUrl } = await searchParams

  const getContent = () => {
    switch (reason) {
      case 'auth':
        return {
          title: 'Sign In Required',
          description: 'You need to be signed in to view this content.',
          action: 'Sign In',
          actionHref: returnUrl ? `/signin?returnUrl=${encodeURIComponent(returnUrl)}` : '/signin',
          icon: LogIn
        }
      case 'membership':
        return {
          title: 'Community Access Required',
          description: communityName 
            ? `You need to be a member of "${communityName}" to view this content.`
            : 'You need to be a member of this community to view this content.',
          action: 'Join Community',
          actionHref: '/groups',
          icon: Users
        }
      case 'community':
        return {
          title: 'Community Not Found',
          description: 'This community either doesn\'t exist or you don\'t have access to it.',
          action: 'Browse Communities',
          actionHref: '/groups',
          icon: Shield
        }
      default:
        return {
          title: 'Access Denied',
          description: 'You do not have permission to view this content.',
          action: 'Go Home',
          actionHref: '/',
          icon: Shield
        }
    }
  }

  const content = getContent()
  const IconComponent = content.icon

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <IconComponent className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-xl">{content.title}</CardTitle>
              <CardDescription className="text-base">
                {content.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-3">
                <Button asChild className="w-full">
                  <Link href={content.actionHref}>
                    {content.action}
                  </Link>
                </Button>
                
                {reason === 'membership' && (
                  <div className="text-sm text-muted-foreground">
                    <p>Need an invite? Ask a community member to share an invite link with you.</p>
                  </div>
                )}
                
                {reason === 'auth' && (
                  <div className="text-sm text-muted-foreground">
                    <p>Already have an account? Sign in to access your communities.</p>
                  </div>
                )}

                <div className="pt-4">
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Home
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

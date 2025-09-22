import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createSupabaseAdmin()
    
    // Try to query communities table directly to see what columns exist
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('*')
      .limit(5)
    
    if (communitiesError) {
      return NextResponse.json({ 
        error: 'Failed to query communities table', 
        details: communitiesError,
        message: 'This suggests the table structure might be different than expected'
      }, { status: 500 })
    }
    
    // Try to test if numeric_id column exists by attempting to select it specifically
    const { error: numericIdError } = await supabase
      .from('communities')
      .select('numeric_id')
      .limit(1)
    
    return NextResponse.json({
      success: true,
      existingCommunities: communities,
      communitiesError: communitiesError,
      numericIdColumnExists: !numericIdError,
      numericIdError: numericIdError,
      sampleCommunity: communities?.[0] || null
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Debug failed', details: error }, { status: 500 })
  }
}

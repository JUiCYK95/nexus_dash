import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { WAHAClient } from '@/lib/waha-client'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Get user's organization
    const supabase = createServerSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Get user's organization ID
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership) {
      return NextResponse.json({
        success: false,
        error: 'No organization found'
      }, { status: 404 })
    }

    // Get organization's WAHA configuration
    const { data: org } = await supabase
      .from('organizations')
      .select('waha_api_url, waha_api_key')
      .eq('id', membership.organization_id)
      .single()

    if (!org?.waha_api_url) {
      return NextResponse.json({
        success: false,
        error: 'WAHA not configured'
      }, { status: 404 })
    }

    // Construct the full media URL
    const mediaPath = params.path.join('/')
    const mediaUrl = `${org.waha_api_url}/api/files/${mediaPath}`

    console.log('📥 Fetching media from WAHA:', mediaUrl)

    // Fetch the media with authentication
    const headers: Record<string, string> = {}
    if (org.waha_api_key) {
      headers['X-Api-Key'] = org.waha_api_key
    }

    const response = await fetch(mediaUrl, { headers })

    if (!response.ok) {
      console.error('Failed to fetch media from WAHA:', response.status, response.statusText)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch media'
      }, { status: response.status })
    }

    // Get the media content
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Get content type from response
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // Return the media with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error: any) {
    console.error('Error proxying media:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to proxy media',
      details: error.message
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get all URL parameters
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const type = searchParams.get('type')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    return NextResponse.json({
      success: true,
      url: request.url,
      params: {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        type,
        error,
        errorDescription
      },
      note: 'Check browser console for more details about the reset link'
    })
  } catch (error) {
    console.error('Debug reset link error:', error)
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const now = new Date().toISOString()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cron test endpoint working',
      timestamp: now,
      userAgent: request.headers.get('user-agent') || 'unknown',
      environment: process.env.NODE_ENV || 'development'
    })
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

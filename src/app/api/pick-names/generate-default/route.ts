import { NextRequest, NextResponse } from 'next/server'
import { PickNamesServiceServer } from '@/lib/pick-names-service-server'

export async function POST(request: NextRequest) {
  try {
    const { userId, count } = await request.json()

    if (!userId || !count || count <= 0) {
      return NextResponse.json(
        { error: 'Invalid parameters. userId and count are required.' },
        { status: 400 }
      )
    }

    const pickNamesService = new PickNamesServiceServer()
    const success = await pickNamesService.generateDefaultPickNames(userId, count)

    if (success) {
      return NextResponse.json({ 
        message: `Generated ${count} default pick names for user`,
        success: true 
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to generate pick names' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error generating default pick names:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

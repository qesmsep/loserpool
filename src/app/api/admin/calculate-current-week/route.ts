import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { calculateCurrentWeek, updateGlobalCurrentWeek } from '@/lib/current-week-calculator'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    
    console.log('🔍 Admin: Calculating current week...')
    const weekInfo = await calculateCurrentWeek()
    
    return NextResponse.json({
      success: true,
      calculated_week: weekInfo,
      message: 'Current week calculated successfully'
    })
  } catch (error) {
    console.error('Error calculating current week:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    
    console.log('🔍 Admin: Updating global current week...')
    const weekInfo = await updateGlobalCurrentWeek()
    
    return NextResponse.json({
      success: true,
      updated_week: weekInfo,
      message: 'Global current week updated successfully'
    })
  } catch (error) {
    console.error('Error updating current week:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { sendThursdayPickReminders } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a legitimate cron job
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN

    if (!expectedToken) {
      console.error('CRON_SECRET_TOKEN not configured')
      return NextResponse.json({ error: 'Cron token not configured' }, { status: 500 })
    }

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      console.error('Invalid cron authentication')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if it's Thursday (day 4 = Thursday, 0 = Sunday)
    const today = new Date()
    const isThursday = today.getDay() === 4

    if (!isThursday) {
      console.log('Not Thursday - skipping reminders')
      return NextResponse.json({ message: 'Not Thursday, reminders skipped' })
    }

    // Check if it's 9 AM (or close to it)
    const currentHour = today.getHours()
    if (currentHour < 8 || currentHour > 10) {
      console.log(`Not 9 AM (current hour: ${currentHour}) - skipping reminders`)
      return NextResponse.json({ message: 'Not 9 AM, reminders skipped' })
    }

    console.log('Sending Thursday morning pick reminders...')
    await sendThursdayPickReminders()

    return NextResponse.json({ 
      message: 'Thursday reminders sent successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in Thursday reminders cron job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing
export async function GET(request: NextRequest) {
  try {
    // For manual testing, we'll skip the Thursday/time checks
    console.log('Manual trigger of Thursday reminders...')
    await sendThursdayPickReminders()

    return NextResponse.json({ 
      message: 'Thursday reminders sent successfully (manual trigger)',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in manual Thursday reminders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
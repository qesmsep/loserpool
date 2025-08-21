import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isUserTester, updateUserTypeBasedOnPicks } from '@/lib/user-types'

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    await requireAdmin()
    
    const { userId, picksCount } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!picksCount || picksCount <= 0) {
      return NextResponse.json({ error: 'Valid picks count is required' }, { status: 400 })
    }

    console.log('Adding picks:', { userId, picksCount })

    const supabase = await createServerSupabaseClient()

    // Check if user is a tester to determine price
    const userIsTester = await isUserTester(userId)
    const amountPerPick = userIsTester ? 0 : 2100 // $0 for testers, $21 for others (in cents)
    const totalAmount = picksCount * amountPerPick

    console.log('User tester status:', { userId, userIsTester, amountPerPick, totalAmount })

    // Add purchase record
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        picks_count: picksCount,
        amount_paid: totalAmount,
        status: 'completed'
      })
      .select()

    if (purchaseError) {
      console.error('Error adding purchase:', purchaseError)
      return NextResponse.json({ error: purchaseError.message }, { status: 400 })
    }

    // Get existing picks to determine the next sequential number
    const { data: existingPicks } = await supabase
      .from('picks')
      .select('pick_name')
      .eq('user_id', userId)
      .not('pick_name', 'is', null)

    // Find the highest existing pick number
    let nextPickNumber = 1
    if (existingPicks && existingPicks.length > 0) {
      const pickNumbers = existingPicks
        .map(pick => {
          const match = pick.pick_name?.match(/^Pick (\d+)$/)
          return match ? parseInt(match[1]) : 0
        })
        .filter(num => num > 0)
      
      if (pickNumbers.length > 0) {
        nextPickNumber = Math.max(...pickNumbers) + 1
      }
    }

    // Create actual pick records in the picks table with sequential names
    const pickRecords = []
    for (let i = 0; i < picksCount; i++) {
      pickRecords.push({
        user_id: userId,
        picks_count: 1,
        status: 'pending',
        pick_name: `Pick ${nextPickNumber + i}`
      })
    }

    const { data: picksData, error: picksError } = await supabase
      .from('picks')
      .insert(pickRecords)
      .select()

    if (picksError) {
      console.error('Error creating pick records:', picksError)
      return NextResponse.json({ error: picksError.message }, { status: 400 })
    }

    // Update user type based on picks status
    try {
      await updateUserTypeBasedOnPicks(userId)
    } catch (error) {
      console.error('Error updating user type:', error)
      // Don't fail the request if user type update fails
    }

    const priceMessage = userIsTester ? 'free' : `$${(totalAmount / 100).toFixed(2)}`
    console.log('Picks added successfully:', { purchase: purchaseData[0], picks: picksData, priceMessage })
    return NextResponse.json({ 
      message: `${picksCount} picks added successfully for ${priceMessage}`,
      purchase: purchaseData[0],
      picks: picksData,
      userIsTester,
      totalAmount
    })
  } catch (error) {
    console.error('Add picks error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 
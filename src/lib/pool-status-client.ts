import { supabase } from '@/lib/supabase'

export interface PoolStatus {
  isLocked: boolean
  lockDate: string | null
  currentTime: Date
  timeUntilLock: number | null // milliseconds until lock
  canRegister: boolean
  canPurchase: boolean
}

export async function getPoolStatus(): Promise<PoolStatus> {
  // Get pool lock settings
  const { data: settings, error } = await supabase
    .from('global_settings')
    .select('key, value')
    .in('key', ['pool_lock_date', 'pool_locked'])

  if (error) {
    console.error('Error fetching pool settings:', error)
    return {
      isLocked: false,
      lockDate: null,
      currentTime: new Date(),
      timeUntilLock: null,
      canRegister: true,
      canPurchase: true
    }
  }

  const lockDateSetting = settings?.find(s => s.key === 'pool_lock_date')
  const lockedSetting = settings?.find(s => s.key === 'pool_locked')
  
  const lockDate = lockDateSetting ? new Date(lockDateSetting.value) : null
  const isLocked = lockedSetting ? lockedSetting.value === 'true' : false
  const currentTime = new Date()
  
  let timeUntilLock: number | null = null
  if (lockDate && currentTime < lockDate) {
    timeUntilLock = lockDate.getTime() - currentTime.getTime()
  }

  // Pool is locked if:
  // 1. Manual lock is enabled, OR
  // 2. Current time is past lock date
  const poolIsLocked = isLocked || (lockDate && currentTime >= lockDate)
  
  return {
    isLocked: !!poolIsLocked,
    lockDate: lockDate?.toISOString() || null,
    currentTime,
    timeUntilLock,
    canRegister: true, // Always allow registration
    canPurchase: !poolIsLocked // Only block purchases when locked
  }
}

export function formatTimeUntilLock(milliseconds: number): string {
  if (milliseconds <= 0) return 'Pool is locked'
  
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24))
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes > 1 ? 's' : ''}`
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }
}

export async function checkPoolLock(): Promise<{ allowed: boolean; message: string }> {
  const status = await getPoolStatus()
  
  if (status.isLocked) {
    return {
      allowed: true, // Always allow registration
      message: 'Pool is locked for purchases, but you can still register and sign in.'
    }
  }
  
  if (status.timeUntilLock && status.timeUntilLock < 24 * 60 * 60 * 1000) { // Less than 24 hours
    const timeLeft = formatTimeUntilLock(status.timeUntilLock)
    return {
      allowed: true,
      message: `Pool locks for purchases in ${timeLeft}. Register now!`
    }
  }
  
  return {
    allowed: true,
    message: 'Pool is open for registration and purchases.'
  }
} 

export async function checkPoolLockForPurchase(): Promise<{ allowed: boolean; message: string }> {
  const status = await getPoolStatus()
  
  if (status.isLocked) {
    return {
      allowed: false,
      message: 'The pool is now locked. No new pick purchases are allowed.'
    }
  }
  
  if (status.timeUntilLock && status.timeUntilLock < 24 * 60 * 60 * 1000) { // Less than 24 hours
    const timeLeft = formatTimeUntilLock(status.timeUntilLock)
    return {
      allowed: true,
      message: `Pool locks for purchases in ${timeLeft}. Purchase now!`
    }
  }
  
  return {
    allowed: true,
    message: 'Pool is open for purchases.'
  }
} 
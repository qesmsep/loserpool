# Pick Selection Popup Solution

## Overview
Instead of requiring users to pre-select a pick name, we'll use a more intuitive flow:
1. User clicks on a team they want to pick to lose
2. System shows a popup with available picks
3. User can select multiple picks to allocate to that team at once
4. User confirms the allocation

## User Flow

### Step 1: Team Selection
```
┌─────────────────────────────────────┐
│ Kansas City Chiefs                  │
│ [Pick This Team to Lose] [+1] [-1] │
│                                     │
│ Current Picks: 2                    │
│ • Pick 1 (1 pick)                   │
│ • Pick 3 (1 pick)                   │
└─────────────────────────────────────┘
```

### Step 2: Multi-Select Pick Popup
```
┌─────────────────────────────────────┐
│ Select Picks to Allocate            │
│                                     │
│ Allocate to: Kansas City Chiefs     │
│                                     │
│ 3 of 5 selected                     │
│ [Select All] [Select None]          │
│                                     │
│ ☑ Pick 1 - "Most confident pick"    │
│ ☑ Pick 2 - "Gut feeling"           │
│ ☑ Pick 3 - "Analytics say yes"      │
│ ☐ Pick 4 - "Hail Mary"              │
│ ☐ Pick 5 - "Default pick"           │
│                                     │
│ [Cancel] [Allocate 3 Picks]         │
└─────────────────────────────────────┘
```

### Step 3: Confirmation
```
┌─────────────────────────────────────┐
│ Picks Allocated!                    │
│                                     │
│ 3 picks allocated to Kansas City    │
│ Chiefs: Pick 1, Pick 2, Pick 3      │
│                                     │
│ [OK]                                │
└─────────────────────────────────────┘
```

## Database Structure

### Picks Table
```sql
CREATE TABLE picks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  matchup_id UUID REFERENCES matchups(id), -- Links to specific game
  team_picked TEXT, -- "Kansas City Chiefs"
  pick_name_id UUID REFERENCES pick_names(id), -- Which pick was used
  picks_count INTEGER DEFAULT 1, -- Always 1 for named picks
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Pick Names Table
```sql
CREATE TABLE pick_names (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT, -- "Pick 1", "Most confident", "Gut feeling"
  description TEXT, -- "My most confident pick this week"
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Implementation

### 1. API Endpoint for Available Picks
```typescript
// GET /api/picks/available
export async function GET() {
  const user = await requireAuth()
  const supabase = await createServerSupabaseClient()

  // Get user's available picks (not yet allocated)
  const { data: availablePicks, error } = await supabase
    .rpc('get_available_pick_names', { user_uuid: user.id })

  return NextResponse.json({ 
    availablePicks: availablePicks || [],
    success: true 
  })
}
```

### 2. API Endpoint for Multi-Pick Allocation
```typescript
// POST /api/picks/allocate
export async function POST(request: Request) {
  const { matchupId, teamName, pickNameIds } = await request.json()
  
  // Validate and verify all picks
  const pickIds = Array.isArray(pickNameIds) ? pickNameIds : [pickNameIds]
  
  // Create multiple pick records
  const picksToInsert = pickIds.map(pickNameId => ({
    user_id: user.id,
    matchup_id: matchupId,
    team_picked: teamName,
    pick_name_id: pickNameId,
    picks_count: 1,
    status: 'active',
    week: currentWeek
  }))

  const { data: newPicks, error: insertError } = await supabase
    .from('picks')
    .insert(picksToInsert)
    .select(`
      id,
      matchup_id,
      team_picked,
      pick_name_id,
      picks_count,
      status,
      pick_names (
        name,
        description
      )
    `)

  return NextResponse.json({
    success: true,
    picks: newPicks,
    message: `${pickCount} pick${pickCount !== 1 ? 's' : ''} allocated to ${teamName}`
  })
}
```

### 3. React Component for Multi-Select Popup
```typescript
interface PickSelectionPopupProps {
  isOpen: boolean
  onClose: () => void
  matchupId: string
  teamName: string
  onPicksAllocated: (picks: any[]) => void
}

const PickSelectionPopup: React.FC<PickSelectionPopupProps> = ({
  isOpen,
  onClose,
  matchupId,
  teamName,
  onPicksAllocated
}) => {
  const [selectedPickIds, setSelectedPickIds] = useState<string[]>([])
  
  const handlePickToggle = (pickId: string) => {
    setSelectedPickIds(prev => {
      if (prev.includes(pickId)) {
        return prev.filter(id => id !== pickId)
      } else {
        return [...prev, pickId]
      }
    })
  }

  const handleSelectAll = () => {
    setSelectedPickIds(availablePicks.map(pick => pick.id))
  }

  const handleSelectNone = () => {
    setSelectedPickIds([])
  }

  const handleAllocate = async () => {
    const response = await fetch('/api/picks/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchupId,
        teamName,
        pickNameIds: selectedPickIds
      })
    })
    
    if (response.ok) {
      onPicksAllocated(data.picks)
      onClose()
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
        <h3 className="text-lg font-semibold mb-4">
          Select Picks to Allocate
        </h3>
        
        <p className="text-gray-600 mb-4">
          Allocate to: <strong>{teamName}</strong>
        </p>
        
        {/* Selection Controls */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-600">
            {selectedPickIds.length} of {availablePicks.length} selected
          </span>
          <div className="space-x-2">
            <button onClick={handleSelectAll}>Select All</button>
            <button onClick={handleSelectNone}>Select None</button>
          </div>
        </div>
        
        {/* Picks List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {availablePicks.map((pick) => (
            <label key={pick.id} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedPickIds.includes(pick.id)}
                onChange={() => handlePickToggle(pick.id)}
                className="text-blue-600"
              />
              <div>
                <div className="font-medium">{pick.name}</div>
                {pick.description && (
                  <div className="text-sm text-gray-500">{pick.description}</div>
                )}
              </div>
            </label>
          ))}
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={handleAllocate}
            disabled={selectedPickIds.length === 0}
          >
            Allocate {selectedPickIds.length} Pick{selectedPickIds.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </Modal>
  )
}
```

### 4. Updated Team Button Component
```typescript
const TeamButton: React.FC<{
  matchupId: string
  teamName: string
  currentPicks: Pick[]
  onPicksAllocated: (picks: any[]) => void
}> = ({ matchupId, teamName, currentPicks, onPicksAllocated }) => {
  const [showPopup, setShowPopup] = useState(false)
  
  const handleTeamClick = () => {
    setShowPopup(true)
  }
  
  const handlePicksAllocated = (newPicks: any[]) => {
    onPicksAllocated(newPicks)
    setShowPopup(false)
  }
  
  const teamPicks = currentPicks.filter(pick => 
    pick.matchup_id === matchupId && pick.team_picked === teamName
  )
  
  return (
    <>
      <button
        onClick={handleTeamClick}
        className="flex-1 p-4 rounded-lg border-2 transition-all bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30"
      >
        <div className="text-center">
          <StyledTeamName teamName={teamName} size="md" className="mb-2" />
          {teamPicks.length > 0 && (
            <div className="text-sm text-blue-300">
              {teamPicks.length} pick{teamPicks.length !== 1 ? 's' : ''} allocated
            </div>
          )}
        </div>
      </button>
      
      <PickSelectionPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        matchupId={matchupId}
        teamName={teamName}
        onPicksAllocated={handlePicksAllocated}
      />
    </>
  )
}
```

## Benefits of Multi-Select Approach

### For Users
- ✅ **Efficient allocation**: Allocate multiple picks at once
- ✅ **Bulk operations**: Select all picks for a team in one click
- ✅ **Flexible selection**: Choose any combination of picks
- ✅ **Clear feedback**: See exactly how many picks are selected
- ✅ **Quick actions**: Select All/Select None buttons

### For System
- ✅ **Batch processing**: Single API call for multiple allocations
- ✅ **Better performance**: Fewer round trips to server
- ✅ **Atomic operations**: All picks allocated together or none
- ✅ **Cleaner data**: Consistent allocation timestamps

### For UX
- ✅ **Time saving**: No need to click 10 times for 10 picks
- ✅ **Visual clarity**: Clear indication of selection state
- ✅ **Error prevention**: Can't accidentally allocate wrong picks
- ✅ **Confirmation**: Clear feedback on allocation success

## Database Functions Needed

### Get Available Pick Names
```sql
CREATE OR REPLACE FUNCTION get_available_pick_names(user_uuid UUID)
RETURNS TABLE(id UUID, name TEXT, description TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT pn.id, pn.name, pn.description
  FROM public.pick_names pn
  WHERE pn.user_id = user_uuid 
  AND pn.is_active = TRUE
  AND pn.id NOT IN (
    SELECT p.pick_name_id 
    FROM public.picks p 
    WHERE p.user_id = user_uuid 
    AND p.pick_name_id IS NOT NULL
  )
  ORDER BY pn.name;
END;
$$ LANGUAGE plpgsql;
```

### Get User's Picks for Week
```sql
CREATE OR REPLACE FUNCTION get_user_picks_for_week(user_uuid UUID, target_week INTEGER)
RETURNS TABLE(
  id UUID,
  matchup_id UUID,
  team_picked TEXT,
  pick_name TEXT,
  pick_description TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.matchup_id,
    p.team_picked,
    pn.name as pick_name,
    pn.description as pick_description,
    p.status
  FROM public.picks p
  LEFT JOIN public.pick_names pn ON p.pick_name_id = pn.id
  JOIN public.matchups m ON p.matchup_id = m.id
  WHERE p.user_id = user_uuid 
  AND m.week = target_week
  ORDER BY m.game_time, pn.name;
END;
$$ LANGUAGE plpgsql;
```

## Implementation Steps

1. **Update database schema** to ensure proper relationships
2. **Create API endpoints** for multi-pick allocation and available picks
3. **Build multi-select popup component** with checkbox interface
4. **Update team buttons** to trigger popup instead of direct allocation
5. **Add visual indicators** showing allocated picks per team
6. **Test the flow** with various scenarios including bulk allocation

## Advanced Features

### Quick Allocation Options
- **"All Remaining Picks"**: Allocate all unallocated picks to one team
- **"Split Evenly"**: Distribute picks evenly across multiple teams
- **"Random Allocation"**: Let system randomly assign picks

### Visual Enhancements
- **Pick count badges**: Show number of picks allocated per team
- **Progress indicators**: Show allocation progress (e.g., "5 of 10 picks allocated")
- **Color coding**: Different colors for different pick types

This multi-select approach provides maximum efficiency for users while maintaining clear pick identification and a robust data structure.

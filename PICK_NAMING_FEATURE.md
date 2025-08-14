# Pick Naming Feature

## Overview
The pick naming feature allows users to assign individual names to each of their picks, making it easier to track and organize their selections. For example, a user who buys 10 picks can name them "Chad1", "Chad2", "Finance 1", "Sales 1", etc.

## Features

### 1. Individual Pick Naming
- Users can create custom names for each pick
- Names are unique per user
- Examples: "Chad1", "Chad2", "Finance 1", "Sales 1", "Team A", "Team B"

### 2. Automatic Default Names
- When users purchase picks, default names are automatically generated
- Default format: "Pick 1", "Pick 2", "Pick 3", etc.
- Users can rename these defaults anytime before use

### 3. Pick Name Management
- **Create**: Add new pick names with optional descriptions
- **Edit**: Modify names and descriptions before they're used
- **Delete**: Remove unused pick names
- **View**: See all pick names with usage status

### 4. Usage Tracking
- Shows which pick names have been used and in which week
- Used pick names are locked and cannot be modified
- Displays usage information: "Used (Week 1 - Dallas Cowboys)"

## Database Schema

### New Tables

#### `pick_names` Table
```sql
CREATE TABLE pick_names (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);
```

#### Updated `picks` Table
```sql
ALTER TABLE picks 
ADD COLUMN pick_name_id UUID REFERENCES pick_names(id) ON DELETE SET NULL,
ADD COLUMN notes TEXT;
```

### Database Functions

#### `generate_default_pick_names(user_uuid UUID, count INTEGER)`
- Generates default pick names for a user when they purchase picks
- Creates names in format: "Pick 1", "Pick 2", etc.

#### `get_available_pick_names(user_uuid UUID)`
- Returns pick names that haven't been used yet
- Used for displaying available names when making picks

## User Interface

### 1. Pick Names Management Page (`/pick-names`)
- Dedicated page for managing all pick names
- Shows both used and unused pick names
- Create, edit, and delete functionality
- Usage status display

### 2. Enhanced Picks Page (`/picks`)
- "Manage Pick Names" button in the header
- Pick name selector when making picks
- Shows selected pick name before assignment
- Displays pick names on existing picks

### 3. Dashboard Integration
- New "Pick Names" card in the dashboard
- Quick access to pick name management
- Visual indicator with tag icon

### 4. Results Page Enhancement
- Shows pick names on completed picks
- Displays "Named: [Pick Name]" under pick details

## User Workflow

### 1. Purchasing Picks
1. User purchases picks (e.g., 10 picks for $210)
2. System automatically generates default names: "Pick 1" through "Pick 10"
3. User can immediately rename these or use them as-is

### 2. Making Named Picks
1. User goes to the picks page
2. Optionally clicks "Manage Pick Names" to create/edit names
3. Selects a pick name from the available list
4. Clicks on a team to assign the named pick
5. The pick is created with the selected name

### 3. Managing Pick Names
1. User visits `/pick-names` or clicks "Manage Pick Names"
2. Creates new names: "Chad1", "Finance 1", etc.
3. Edits existing unused names
4. Views usage history of all names

## API Endpoints

### `POST /api/pick-names/generate-default`
- Generates default pick names for a user
- Called automatically when purchases are completed
- Parameters: `userId`, `count`

## Integration Points

### 1. Stripe Webhook
- Automatically generates default pick names when purchase is completed
- Ensures users have names available immediately after purchase

### 2. Pick Creation
- Enhanced to support pick name assignment
- Stores `pick_name_id` with each pick

### 3. Results Display
- Shows pick names in results and history
- Helps users track which named picks survived or were eliminated

## Benefits

### 1. Organization
- Users can track picks by purpose or person
- Easier to manage multiple picks
- Clear identification of pick ownership

### 2. Strategy
- Users can assign picks to different strategies
- Track performance by pick category
- Better decision-making for future picks

### 3. Accountability
- Clear tracking of which picks belong to whom
- Useful for office pools or group entries
- Prevents confusion with multiple picks

## Example Use Cases

### Office Pool
- User buys 10 picks for office pool
- Names: "Chad1", "Chad2", "Sarah1", "Sarah2", "Finance1", "Finance2", "Sales1", "Sales2", "Marketing1", "Marketing2"

### Personal Strategy
- User buys 5 picks for different strategies
- Names: "Conservative1", "Conservative2", "Aggressive1", "Aggressive2", "Wildcard1"

### Family Pool
- User manages picks for family members
- Names: "Dad1", "Mom1", "Sister1", "Brother1", "Cousin1"

## Technical Implementation

### Services
- `PickNamesService`: Client-side operations
- `PickNamesServiceServer`: Server-side operations
- Database functions for complex queries

### Components
- `PickNamesManager`: Main management interface
- Enhanced picks page with name selection
- Results page with name display

### Security
- Row Level Security (RLS) policies
- Users can only access their own pick names
- Admin access for support purposes

## Future Enhancements

### 1. Pick Name Templates
- Pre-defined templates for common use cases
- Quick setup for office pools

### 2. Pick Name Analytics
- Performance tracking by pick name
- Success rate analysis

### 3. Pick Name Sharing
- Share pick name configurations
- Import/export functionality

### 4. Advanced Filtering
- Filter results by pick name
- Search and sort functionality

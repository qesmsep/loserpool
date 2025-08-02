# The Loser Pool

A full-stack web application for managing a "Loser Pool" - a unique NFL betting game where participants pick teams they think will LOSE each week. The last person standing wins the pool!

## 🎯 Game Rules

- **Objective**: Pick teams that will LOSE each week
- **Elimination**: If your pick wins, you're eliminated
- **Survival**: If your pick loses, you survive to next week
- **Ties**: Safe - your pick carries over to next week
- **Winning**: Last person with active picks wins the pool

## 🚀 Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe Checkout
- **Deployment**: Vercel

## 📋 Features

### 🔒 Authentication
- Email/password authentication with Supabase
- User profile management
- Admin role system

### 💰 Payments
- Stripe Checkout integration
- $10 per pick pricing
- Purchase locking before season starts
- Webhook processing for payment confirmation

### 📅 Weekly Flow
- NFL schedule integration (manual entry for now)
- Thursday Night Football pick locking
- Automatic score updates (manual for now)
- Pick allocation system

### 🎯 Pick Management
- Allocate picks to specific matchups
- Edit picks before Thursday kickoff
- Random pick assignment for non-submitters
- Pick status tracking (active/eliminated/safe)

### 📊 Game Logic
- Wrong picks = eliminated
- Correct picks = survive
- Ties = safe
- Cross-week pick tracking

### 🏆 Dashboard
- Current week matchups
- Pick allocation interface
- TNF countdown timer
- Live pick statistics

### 🏁 Results & Leaderboard
- Weekly results summary
- Leaderboard with active picks
- Elimination tracking
- Historical data

### 🔗 Invitation System
- Unique invite codes per user
- Registration tracking
- Referral system

### 🛠 Admin Panel
- User management
- Matchup management
- Results updates
- Purchase history
- Pool settings

## 🛠 Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account

### 1. Clone and Install

```bash
git clone <repository-url>
cd loser-pool
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Cron Job Configuration
CRON_SECRET_TOKEN=your_cron_secret_token
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
POOL_START_DATE=2024-09-05
POOL_END_DATE=2025-02-01
```

### 3. Supabase Setup

1. Create a new Supabase project
2. Run the SQL schema from `database-schema.sql` in the Supabase SQL editor
3. Copy your project URL and anon key to `.env.local`
4. Enable Row Level Security (RLS) on all tables
5. Set up authentication providers (email/password)

### 4. Stripe Setup

1. Create a Stripe account
2. Get your publishable and secret keys
3. Create a webhook endpoint pointing to `/api/stripe/webhook`
4. Add the webhook secret to your environment variables

### 5. Development

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

### 6. Production Deployment

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## 📊 Database Schema

### Tables
- `users` - User profiles and authentication
- `purchases` - Stripe payment records
- `matchups` - Weekly NFL games
- `picks` - User picks for each matchup
- `weekly_results` - Weekly summary data
- `invitations` - User invitation system

### Key Relationships
- Users can have multiple purchases
- Users can have multiple picks per matchup
- Matchups belong to specific weeks
- Picks reference both users and matchups

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signout` - User logout

### Stripe
- `POST /api/stripe/create-checkout-session` - Create payment session
- `POST /api/stripe/webhook` - Process payment webhooks

## 🎨 UI Components

- **AuthProvider** - Authentication context
- **Dashboard** - Main user interface
- **Picks** - Pick allocation interface
- **Leaderboard** - Current standings
- **Admin Panel** - Administrative tools

## 🔒 Security Features

- Row Level Security (RLS) on all tables
- User-specific data access
- Admin role system
- Secure payment processing
- Input validation and sanitization

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically on push

### Environment Variables for Production
- All variables from `.env.local`
- Update `NEXT_PUBLIC_APP_URL` to your domain
- Ensure Stripe webhook points to production URL

## 📝 Development Notes

### Adding New Features
1. Create database migrations if needed
2. Add TypeScript types in `src/lib/supabase.ts`
3. Create API routes in `src/app/api/`
4. Build UI components in `src/components/`
5. Add pages in `src/app/`

### Testing
- Manual testing for authentication flow
- Stripe webhook testing with Stripe CLI
- Database query testing in Supabase dashboard

### Performance
- Database indexes on frequently queried columns
- Client-side caching for user data
- Optimized queries with proper joins

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues or questions:
1. Check the documentation
2. Review existing issues
3. Create a new issue with detailed information

---

**The Loser Pool** - Where picking losers is the winning strategy! 🏈
# loserpool

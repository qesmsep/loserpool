#!/bin/bash

# Deploy the email Edge Function to Supabase
# This script deploys the function without requiring database linking

echo "🚀 Deploying Supabase Email Edge Function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    exit 1
fi

# Check if we're logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run: supabase login"
    exit 1
fi

# Deploy the function
echo "📦 Deploying send-email function..."
supabase functions deploy send-email --project-ref yvgcrzmriygcnuhlyrcr

if [ $? -eq 0 ]; then
    echo "✅ Email function deployed successfully!"
    echo ""
    echo "🔧 Next steps:"
    echo "1. Go to https://supabase.com/dashboard/project/yvgcrzmriygcnuhlyrcr/settings/edge-functions"
    echo "2. Add environment variables:"
    echo "   - RESEND_API_KEY=re_your_resend_api_key_here"
    echo "   - OR SENDGRID_API_KEY=SG.your_sendgrid_api_key_here"
    echo "3. Update your .env.local: EMAIL_PROVIDER=supabase"
    echo "4. Restart your dev server and test!"
else
    echo "❌ Failed to deploy email function"
    exit 1
fi

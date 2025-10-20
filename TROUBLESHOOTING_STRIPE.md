# Stripe Integration Troubleshooting

## Common Issues and Solutions

### 1. "Neither apiKey nor config.authenticator provided" Error

**Problem**: Stripe client is being initialized on the client-side without proper API keys.

**Solution**: 
- Ensure server-side Stripe initialization is protected with `typeof window === 'undefined'`
- Use separate client-side utilities in `/lib/stripe-client.ts`
- Never import server-side Stripe utilities in client components

**Fixed in**: `/lib/stripe.ts` and `/lib/stripe-client.ts`

### 2. TenantContext Initialization Errors

**Problem**: Database queries failing due to missing tables or RLS policies.

**Solution**:
- Run the multi-tenancy migration: `supabase/migrations/20240101000000_add_multi_tenancy.sql`
- Ensure proper error handling in TenantContext
- Add fallback organization creation for new users

**Fixed in**: `/contexts/TenantContext.tsx`

### 3. API Middleware Organization ID Extraction

**Problem**: API routes can't find organization ID from requests.

**Solution**:
- Enhanced organization ID extraction from multiple sources
- Added fallback to user's default organization
- Improved error handling for edge cases

**Fixed in**: `/lib/api-middleware.ts`

## Environment Variables Required

```bash
# Stripe (use test keys for development)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_STARTER_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
STRIPE_BUSINESS_YEARLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Setup

1. **Run Migration**:
   ```sql
   -- Execute the migration file in your Supabase dashboard
   -- Or use Supabase CLI: supabase db push
   ```

2. **Verify Tables Created**:
   - `organizations`
   - `organization_members`
   - `organization_usage`
   - `subscription_plans`
   - `billing_events`
   - `audit_logs`
   - `organization_invitations`

3. **Check RLS Policies**:
   - Ensure Row Level Security is enabled
   - Verify users can only access their organization data

## Testing the Integration

1. **Login/Register**: User should automatically get an organization
2. **Navigate to Billing**: `/dashboard/billing` should load without errors
3. **View Plans**: All subscription plans should display correctly
4. **Test Upgrade Flow**: Should create checkout session (will fail with test keys but no errors)

## Development vs Production

### Development:
- Use Stripe test keys (`sk_test_...` and `pk_test_...`)
- Test webhooks with Stripe CLI or ngrok
- Price IDs can be placeholders

### Production:
- Replace with live Stripe keys (`sk_live_...` and `pk_live_...`)
- Configure real price IDs from Stripe Dashboard
- Set up proper webhook endpoints
- Enable proper error monitoring

## Common Debugging Steps

1. **Check Console**: Look for specific error messages
2. **Verify Environment Variables**: Ensure all required vars are set
3. **Database Logs**: Check Supabase logs for query errors
4. **Network Tab**: Verify API calls are working
5. **Stripe Dashboard**: Check webhook delivery logs

## Support

If issues persist:
1. Check the browser console for detailed error messages
2. Verify database tables exist in Supabase
3. Ensure environment variables are properly set
4. Test with a fresh browser session (clear localStorage)
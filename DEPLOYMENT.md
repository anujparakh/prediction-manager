# Deployment Guide - Financier

This guide will walk you through deploying your Financier app to Cloudflare using OpenNext.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Step 1: Setup Clerk Authentication](#step-1-setup-clerk-authentication)
- [Step 2: Get Stock Data API Key](#step-2-get-stock-data-api-key)
- [Step 3: Create Production D1 Database](#step-3-create-production-d1-database)
- [Step 4: Deploy to Cloudflare](#step-4-deploy-to-cloudflare)
- [Step 5: Configure Environment Variables](#step-5-configure-environment-variables)
- [Step 6: Verify Deployment](#step-6-verify-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Clerk account](https://clerk.com/) (free tier works)
- [Twelve Data API key](https://twelvedata.com/) (free tier: 800 calls/day)
- Your code pushed to a GitHub repository
- Wrangler CLI installed: `npm install -g wrangler`
- Node.js 20+ installed

## Local Development Setup

### Quick Start (Frontend Only)

For developing UI and frontend features:

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables (see .env.example)
cp .env.example .env.local
# Edit .env.local with your Clerk and Twelve Data API keys

# 3. Run development server
npm run dev
```

**Note:** Regular `npm run dev` won't have access to D1 database locally. For full testing with database, see "Full Local Testing" below.

### Full Local Testing with D1

To test with the actual D1 database locally:

```bash
# 1. Build the application
npm run build
npm run pages:build

# 2. Run with Wrangler (includes D1 bindings)
npm run preview
```

This runs your app with Wrangler which provides access to your local D1 database.

## Step 1: Setup Clerk Authentication

### 1.1 Create Production Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Click **"Create Application"**
3. Name it: `Financier - Production`
4. Choose authentication methods:
   - ✅ Email
   - ✅ Google (optional)
   - ✅ GitHub (optional)
5. Click **"Create Application"**

### 1.2 Get Clerk API Keys

1. In your Clerk application dashboard, go to **"API Keys"**
2. Copy these values:
   - **Publishable Key**: `pk_live_...`
   - **Secret Key**: `sk_live_...`
3. Save these for Step 5

### 1.3 Configure Clerk URLs

1. In Clerk dashboard, go to **"Paths"**
2. Set these paths:
   - Sign In URL: `/sign-in`
   - Sign Up URL: `/sign-up`
   - After Sign In URL: `/`
   - After Sign Up URL: `/`
3. Click **"Save"**

### 1.4 Add Production Domain (After Cloudflare Deployment)

1. After deploying to Cloudflare (Step 4), get your deployment URL
2. In Clerk dashboard, go to **"Domains"**
3. Add your Cloudflare Workers URL
4. Click **"Add Domain"**

## Step 2: Get Stock Data API Key

### 2.1 Sign Up for Twelve Data

1. Go to [Twelve Data](https://twelvedata.com/)
2. Click **"Get Started Free"**
3. Create account
4. Verify your email

### 2.2 Get API Key

1. Go to [API Console](https://twelvedata.com/account/api-keys)
2. Copy your **API Key**
3. Save this for Step 5

**Free Tier Limits:**
- 800 API calls per day
- Real-time data with 15-minute delay
- Perfect for daily rule evaluations

## Step 3: Create Production D1 Database

### 3.1 Login to Wrangler

```bash
wrangler login
```

This will open a browser window to authenticate with Cloudflare.

### 3.2 Create Production Database

```bash
wrangler d1 create financier-db-prod
```

**Output:**
```
✅ Successfully created DB 'financier-db-prod'!

[[d1_databases]]
binding = "DB"
database_name = "financier-db-prod"
database_id = "abc123-your-database-id-here"
```

**Important:** Copy the `database_id` - you'll need it!

### 3.3 Update wrangler.toml

Open `wrangler.toml` and update the production database ID:

```toml
name = "financier"
compatibility_date = "2024-01-01"
main = ".open-next/worker.js"

[[d1_databases]]
binding = "DB"
database_name = "financier-db"
database_id = "your-local-db-id"  # Keep your local one

# Production environment
[env.production]
[[env.production.d1_databases]]
binding = "DB"
database_name = "financier-db-prod"
database_id = "abc123-your-prod-id-here"  # Replace with production ID
```

### 3.4 Run Database Migrations

Run each migration in order against your **production** database:

```bash
# Migration 1: Initial schema (users, transactions)
wrangler d1 execute financier-db-prod --file=./lib/db/migrations/0001_initial.sql

# Migration 2: Rules table
wrangler d1 execute financier-db-prod --file=./lib/db/migrations/0002_add_rules.sql

# Migration 3: Recommendations table
wrangler d1 execute financier-db-prod --file=./lib/db/migrations/0003_add_recommendations.sql
```

**Verify migrations:**
```bash
wrangler d1 execute financier-db-prod --command="SELECT name FROM sqlite_master WHERE type='table';"
```

Expected output:
```
users
transactions
rules
recommendations
```

## Step 4: Deploy to Cloudflare

### 4.1 Build the Application

```bash
# Build Next.js app
npm run build

# Build for Cloudflare with OpenNext
npm run pages:build
```

This will create a `.open-next/` directory with your Cloudflare Workers deployment.

### 4.2 Deploy to Cloudflare

```bash
npm run pages:deploy
```

Or manually:

```bash
wrangler deploy
```

**First deployment will prompt you to:**
1. Confirm the worker name
2. Set up your workers.dev subdomain

Your app will be deployed to: `https://financier.your-subdomain.workers.dev`

### 4.3 Alternative: Deploy via GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: |
          npm run build
          npm run pages:build

      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

Add your `CLOUDFLARE_API_TOKEN` to GitHub Secrets.

## Step 5: Configure Environment Variables

### 5.1 Set Environment Variables in Cloudflare

```bash
# Set Clerk keys
wrangler secret put NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# Paste your pk_live_... key when prompted

wrangler secret put CLERK_SECRET_KEY
# Paste your sk_live_... key when prompted

# Set Twelve Data API key
wrangler secret put TWELVE_DATA_API_KEY
# Paste your API key when prompted

# Set other variables
wrangler secret put NEXT_PUBLIC_CLERK_SIGN_IN_URL
# Enter: /sign-in

wrangler secret put NEXT_PUBLIC_CLERK_SIGN_UP_URL
# Enter: /sign-up

wrangler secret put NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
# Enter: /

wrangler secret put NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
# Enter: /

wrangler secret put NEXT_PUBLIC_APP_URL
# Enter your worker URL: https://financier.your-subdomain.workers.dev
```

### 5.2 Alternative: Use wrangler.toml

You can also add non-secret variables to `wrangler.toml`:

```toml
[vars]
NEXT_PUBLIC_CLERK_SIGN_IN_URL = "/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL = "/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = "/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = "/"
NEXT_PUBLIC_APP_URL = "https://financier.your-subdomain.workers.dev"
```

**Never** put secret keys in wrangler.toml!

## Step 6: Verify Deployment

### 6.1 Check Deployment

Visit your worker URL: `https://financier.your-subdomain.workers.dev`

### 6.2 Test Core Features

1. **Sign Up / Sign In**
   - Create a new account
   - Verify email works
   - Sign in successfully

2. **Set Initial Cash Balance**
   - Go to Portfolio page
   - Click "Update Cash Balance"
   - Set starting cash (e.g., $10,000)
   - Verify it saves

3. **Create a Test Rule**
   - Go to Rules page
   - Click "New Rule"
   - Create a simple rule: `RSI(14) < 30`
   - Symbol: `AAPL`
   - Action: `BUY`
   - Quantity: `10`
   - Save and verify

4. **Evaluate Rules**
   - Go to Dashboard
   - Click "Evaluate Rules"
   - Wait for evaluation to complete
   - Check if recommendations appear

### 6.3 Monitor Logs

View real-time logs:

```bash
wrangler tail
```

## Troubleshooting

### Issue: "D1 database binding not found"

**Solution:**
1. Verify D1 binding is configured in wrangler.toml
2. Ensure you ran migrations on the production database
3. Redeploy after updating wrangler.toml

### Issue: "Module not found: @cloudflare/next-on-pages"

**Solution:**
This package was replaced with OpenNext. Run:
```bash
npm uninstall @cloudflare/next-on-pages
npm install --save-dev @opennextjs/cloudflare
npm run build
npm run pages:build
```

### Issue: "Clerk publishableKey is invalid"

**Solution:**
1. Verify you set the environment variable correctly:
   ```bash
   wrangler secret list
   ```
2. Ensure you're using production keys (`pk_live_...`), not test keys
3. Re-set the secret if needed:
   ```bash
   wrangler secret put NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   ```

### Issue: "Failed to fetch stock data"

**Solution:**
1. Verify `TWELVE_DATA_API_KEY` is set:
   ```bash
   wrangler secret list
   ```
2. Check API key is valid at [Twelve Data Console](https://twelvedata.com/account/api-keys)
3. Ensure you haven't exceeded free tier limit (800 calls/day)

### Issue: Build fails

**Solution:**
1. Clear build cache:
   ```bash
   rm -rf .next .open-next
   npm run build
   npm run pages:build
   ```
2. Check Node.js version: `node --version` (should be 20+)
3. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Issue: Database queries fail in production

**Solution:**
1. Verify migrations ran successfully:
   ```bash
   wrangler d1 execute financier-db-prod --command="SELECT COUNT(*) FROM users;"
   ```
2. Check database binding name is exactly `DB` in wrangler.toml
3. Redeploy after fixing configuration

## Development vs Production

| Aspect | Development (`npm run dev`) | Production (Cloudflare) |
|--------|---------------------------|------------------------|
| Database | Local D1 (via Wrangler) | Production D1 |
| Environment | `.env.local` | Wrangler secrets |
| Runtime | Next.js dev server | Cloudflare Workers |
| URL | `http://localhost:3000` | `https://your-app.workers.dev` |
| Build | Not required | `npm run build && npm run pages:build` |

## Post-Deployment Checklist

- [ ] App is accessible at your Worker URL
- [ ] Sign up / sign in works
- [ ] Database is connected and migrations ran
- [ ] Can add cash balance
- [ ] Can create transactions
- [ ] Can create rules
- [ ] Can evaluate rules and get recommendations
- [ ] Can mark recommendations as done
- [ ] Portfolio calculations are correct
- [ ] Stock data fetching works
- [ ] SSL certificate is active (https://)

## Custom Domain (Optional)

To use your own domain:

1. In Cloudflare Dashboard, go to Workers & Pages
2. Click your worker
3. Go to **Settings** → **Domains & Routes**
4. Click **Add** → **Custom Domain**
5. Enter your domain (must be on Cloudflare)
6. Update `NEXT_PUBLIC_APP_URL` secret
7. Add custom domain to Clerk dashboard

## Cost Estimates

**Free Tier Usage (1 user):**
- Cloudflare Workers: FREE (<100k requests/day)
- Cloudflare D1: FREE (<5M reads, <100k writes per day)
- Clerk: FREE (up to 10k MAU)
- Twelve Data: FREE (800 API calls/day)

**Total: $0/month** ✅

**Scaling to 100 Users:**
- Cloudflare: Still FREE (generous limits)
- Clerk: FREE (under 10k monthly active users)
- Twelve Data: May need paid plan ($79/month) if >800 API calls/day

## Continuous Deployment

### Option 1: GitHub Actions (Recommended)

1. Create `.github/workflows/deploy.yml` (see Step 4.3)
2. Add `CLOUDFLARE_API_TOKEN` to GitHub Secrets
3. Push to main branch - automatic deployment!

### Option 2: Cloudflare Dashboard

1. Go to Workers & Pages
2. Create new application
3. Connect to GitHub repository
4. Configure build settings:
   - Build command: `npm run build && npm run pages:build`
   - Build output directory: `.open-next`
5. Add environment variables
6. Deploy!

## Monitoring

### View Logs

```bash
# Real-time logs
wrangler tail

# Recent logs
wrangler tail --format=pretty
```

### Analytics

View in Cloudflare Dashboard:
- Workers & Pages → Your Worker → Analytics
- Monitor requests, errors, CPU time

### Alerts

Set up alerts for:
- Error rate spikes
- High request volume
- Database query failures

## Rollback

If a deployment fails:

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback <deployment-id>
```

## Support

If you encounter issues:
- Check [OpenNext Cloudflare Docs](https://opennext.js.org/cloudflare)
- Check [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- Check [Clerk Documentation](https://clerk.com/docs)
- Review application logs: `wrangler tail`

## Next Steps

After successful deployment:
1. Set up real cash balance
2. Add your actual stock holdings as transactions
3. Create trading rules based on your strategy
4. Run daily rule evaluations
5. Execute trades and mark as done
6. Track portfolio performance

Congratulations! Your Financier app is now live on Cloudflare! 🎉

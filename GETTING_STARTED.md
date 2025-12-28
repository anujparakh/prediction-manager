# Getting Started - Financier

Get your Financier app up and running in 10 minutes! This guide will help you set up the app locally for development.

## Prerequisites

Before you begin, make sure you have:
- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- A **Clerk account** (free) - [Sign up here](https://clerk.com/)
- A **Twelve Data API key** (free) - [Sign up here](https://twelvedata.com/)
- A code editor (VS Code recommended)

## Step 1: Get Your API Keys (5 minutes)

### Clerk Setup

1. Go to [clerk.com](https://clerk.com/) and sign up
2. Create a new application:
   - Click **"Create Application"**
   - Name: "Financier - Dev"
   - Enable **Email** authentication
   - Click **"Create Application"**
3. Copy your API keys from the dashboard:
   - **Publishable Key** (starts with `pk_test_...`)
   - **Secret Key** (starts with `sk_test_...`)

### Twelve Data API Key

1. Go to [twelvedata.com](https://twelvedata.com/)
2. Click **"Get Started Free"**
3. Create an account and verify your email
4. Go to [API Console](https://twelvedata.com/account/api-keys)
5. Copy your **API Key**

**You now have all 3 API keys needed!** ✅

## Step 2: Clone and Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/financier.git
cd financier

# Install dependencies
npm install
```

Wait for dependencies to install (usually 1-2 minutes).

## Step 3: Configure Environment Variables (1 minute)

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Open `.env.local` in your editor**

3. **Paste your API keys:**
   ```env
   # Clerk Authentication (paste your keys from Step 1)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
   CLERK_SECRET_KEY=sk_test_YOUR_KEY_HERE
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

   # Stock APIs (paste your Twelve Data key from Step 1)
   TWELVE_DATA_API_KEY=YOUR_TWELVE_DATA_KEY_HERE

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Save the file**

## Step 4: Set Up Database (2 minutes)

Your app uses Cloudflare D1 (SQLite database). Let's set it up:

1. **Login to Cloudflare:**
   ```bash
   npx wrangler login
   ```
   This will open your browser to authenticate.

2. **Create local database:**
   ```bash
   npx wrangler d1 create financier-db
   ```

   Copy the `database_id` from the output.

3. **Update `wrangler.toml`:**
   Open `wrangler.toml` and replace `YOUR_DATABASE_ID` with the ID you just copied:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "financier-db"
   database_id = "abc123-your-id-here"  # Replace this!
   ```

4. **Run database migrations:**
   ```bash
   npx wrangler d1 execute financier-db --file=./lib/db/migrations/0001_initial.sql --local
   npx wrangler d1 execute financier-db --file=./lib/db/migrations/0002_add_rules.sql --local
   npx wrangler d1 execute financier-db --file=./lib/db/migrations/0003_add_recommendations.sql --local
   ```

Each command should show "✅ Successfully executed" message.

## Step 5: Run the App! (30 seconds)

```bash
npm run dev
```

You should see:
```
▲ Next.js 15.5.9
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in 2.5s
```

**Open your browser to [http://localhost:3000](http://localhost:3000)** 🎉

## Step 6: Create Your Account (1 minute)

1. Click **"Sign Up"**
2. Enter your email and password
3. Verify your email (check spam folder)
4. Sign in

**You're in!** 🚀

## Step 7: First-Time Setup (2 minutes)

### Set Your Cash Balance

1. Click **"Portfolio"** in the sidebar
2. Click **"Update Cash Balance"**
3. Enter your starting cash (e.g., `10000` for $10,000)
4. Click **"Update"**

### Add a Test Transaction (Optional)

1. Click **"Transactions"** in the sidebar
2. Click **"Add Transaction"**
3. Fill in:
   - Symbol: `AAPL`
   - Type: `BUY`
   - Quantity: `10`
   - Price: `150`
   - Date: Today's date
4. Click **"Add Transaction"**

Check your portfolio - you should see 10 shares of AAPL!

### Create Your First Rule

1. Click **"Rules"** in the sidebar
2. Click **"New Rule"**
3. Fill in:
   - Name: `AAPL RSI Oversold`
   - Symbol: `AAPL`
   - Expression: `RSI(14) < 30` (you can click the first example)
   - Action: `BUY`
   - Quantity Type: `FIXED`
   - Quantity Value: `10`
   - Check **"Is Active"**
4. Click **"Create Rule"**

### Test Rule Evaluation

1. Go to **"Dashboard"**
2. Click **"Evaluate Rules"**
3. Wait a few seconds
4. See recommendations appear (if RSI < 30)

**Congratulations! Everything works!** ✨

## Common Issues & Quick Fixes

### "Module not found" errors

```bash
rm -rf node_modules package-lock.json
npm install
```

### "Clerk publishableKey is invalid"

- Double-check you copied the **entire** key from Clerk dashboard
- Make sure there are no extra spaces
- Verify it starts with `pk_test_`

### "D1 database binding not found"

- Make sure you ran all 3 migration commands
- Restart the dev server: Stop (Ctrl+C) and run `npm run dev` again

### "Failed to fetch stock data"

- Verify your Twelve Data API key is correct
- Check you haven't exceeded 800 API calls today (free tier limit)
- Try a different symbol like `GOOGL` or `MSFT`

### Port 3000 already in use

```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

### Build errors

```bash
# Clean build
rm -rf .next
npm run build
```

## Next Steps

Now that your app is running:

### 1. Explore the Features

- **Dashboard**: Overview of your portfolio and recommendations
- **Portfolio**: View holdings and cash balance
- **Transactions**: Track all buy/sell activity
- **Rules**: Create and manage trading rules
- **Recommendations**: See rule evaluation results

### 2. Create More Rules

Try these example rules:
- **RSI Overbought (Sell)**: `RSI(14) > 70`
- **Price Below MA (Buy)**: `close < SMA(50)`
- **Volume Spike (Buy)**: `volume > avgVolume(20) * 2`
- **Combined**: `RSI(14) < 30 AND volume > avgVolume(20)`

### 3. Customize the App

- Modify components in `components/`
- Update styles in Tailwind classes
- Add new API routes in `app/api/`

### 4. Learn the Codebase

Key files to explore:
- `lib/rules/evaluator.ts` - Rule evaluation logic
- `lib/db/queries/portfolio.ts` - Portfolio calculations
- `app/(dashboard)/dashboard/page.tsx` - Dashboard UI

### 5. Deploy to Production

When you're ready to deploy:
1. Read [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Set up production Clerk app
3. Create production D1 database
4. Deploy to Cloudflare Pages

## Development Tips

### Hot Reload

Next.js has hot reload - just save files and see changes instantly!

### View Database

To see your database contents:
```bash
npx wrangler d1 execute financier-db --command="SELECT * FROM users;" --local
npx wrangler d1 execute financier-db --command="SELECT * FROM transactions;" --local
npx wrangler d1 execute financier-db --command="SELECT * FROM rules;" --local
```

### Clear Database

To start fresh:
```bash
npx wrangler d1 execute financier-db --command="DELETE FROM transactions;" --local
npx wrangler d1 execute financier-db --command="DELETE FROM rules;" --local
npx wrangler d1 execute financier-db --command="DELETE FROM recommendations;" --local
```

### TypeScript Errors

Check for type errors:
```bash
npm run build
```

### Format Code

If you have Prettier installed:
```bash
npx prettier --write .
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npx wrangler d1 execute DB --command="SQL" --local` | Run SQL query |

## Getting Help

- **Check the logs**: Look at your terminal for error messages
- **Browser console**: Press F12 to see frontend errors
- **Documentation**: Read [README.md](./README.md) for detailed info
- **Deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup

## Environment Variables Reference

| Variable | Where to Get It | Example |
|----------|----------------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys | `pk_test_...` |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys | `sk_test_...` |
| `TWELVE_DATA_API_KEY` | Twelve Data → API Console | `abc123...` |
| `NEXT_PUBLIC_APP_URL` | Your app URL | `http://localhost:3000` |

## Troubleshooting Checklist

If something doesn't work, verify:

- [ ] Node.js 18+ is installed (`node --version`)
- [ ] Dependencies are installed (`node_modules/` folder exists)
- [ ] `.env.local` file exists with all keys
- [ ] Clerk keys start with `pk_test_` and `sk_test_`
- [ ] Twelve Data API key is valid
- [ ] Database migrations ran successfully (3 commands)
- [ ] `wrangler.toml` has correct database_id
- [ ] Dev server is running (`npm run dev`)
- [ ] Browser is open to `http://localhost:3000`
- [ ] No other app using port 3000

## Success Checklist

You know everything is working when:

- [ ] App loads at http://localhost:3000
- [ ] You can sign up and sign in
- [ ] You can update cash balance
- [ ] You can add a transaction
- [ ] You can create a rule
- [ ] You can evaluate rules
- [ ] Dashboard shows your data
- [ ] Portfolio shows holdings
- [ ] No errors in browser console
- [ ] No errors in terminal

## What You've Built

You now have a fully functional stock trading rules engine that can:
- ✅ Authenticate users securely
- ✅ Manage cash and transactions
- ✅ Track portfolio holdings and P&L
- ✅ Create custom trading rules
- ✅ Evaluate rules against live stock data
- ✅ Generate buy/sell recommendations
- ✅ Execute trades with one click
- ✅ Maintain complete transaction history

**Amazing work!** You're ready to start using it or deploy to production! 🎉

---

Need help? Check the [README.md](./README.md) or [DEPLOYMENT.md](./DEPLOYMENT.md) for more information.

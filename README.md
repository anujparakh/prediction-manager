# Financier

A full-stack web application for managing stock trading rules and recommendations. Create custom trading rules using technical indicators, get automated buy/sell recommendations, and track your portfolio performance.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-orange)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎯 Trading Rules Engine
- **Visual Rule Builder**: Create trading rules with an intuitive interface
- **Technical Indicators**: RSI, SMA, EMA, Volume analysis
- **Complex Logic**: Support for AND/OR conditions
- **7 Pre-built Examples**: Copy and customize proven strategies
- **Real-time Validation**: Instant feedback on rule syntax
- **Active/Inactive Toggle**: Enable or disable rules without deletion

### 📊 Portfolio Management
- **Transaction Tracking**: Record all buy/sell transactions
- **Automatic Holdings Calculation**: No manual updates needed
- **Profit & Loss**: Real-time P&L tracking per holding
- **Cash Balance Management**: Automatic cash updates with transactions
- **Transaction History**: Filter and search transaction history
- **Manual Entry**: Add historical transactions with custom dates

### 💡 Smart Recommendations
- **Automated Evaluation**: Run all active rules with one click
- **Buy/Sell Signals**: Clear recommendations with quantities
- **Mark as Done Workflow**: One-click transaction creation
- **Dismiss Options**: Hide unwanted recommendations
- **Execution History**: Track all past recommendations
- **Rule Attribution**: See which rule triggered each recommendation

### 📈 Dashboard & Analytics
- **Portfolio Overview**: Total value, cash, holdings count
- **Today's Recommendations**: Quick view of pending actions
- **Recent Activity**: Transaction and recommendation summaries
- **Quick Actions**: Fast access to common tasks

### 🎨 Modern UI/UX
- **Toast Notifications**: Real-time feedback for all actions
- **Loading Skeletons**: Smooth loading states
- **Error Handling**: Clear, actionable error messages
- **Empty States**: Helpful guidance when no data exists
- **Mobile Responsive**: Works perfectly on all devices
- **Dark Mode Ready**: Theme support built-in

## 🛠️ Tech Stack

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - High-quality React components
- **[Lucide Icons](https://lucide.dev/)** - Beautiful, consistent icons
- **[Sonner](https://sonner.emilkowal.ski/)** - Toast notifications

### Backend
- **[Cloudflare Workers](https://workers.cloudflare.com/)** - Edge runtime for API routes
- **[Cloudflare D1](https://developers.cloudflare.com/d1/)** - Serverless SQLite database
- **[Cloudflare Pages](https://pages.cloudflare.com/)** - Global deployment platform

### Authentication
- **[Clerk](https://clerk.com/)** - Complete authentication solution
- Email sign-in, social logins, user management

### Stock Data
- **[Twelve Data API](https://twelvedata.com/)** - Real-time stock quotes and historical data
- Free tier: 800 API calls per day
- Technical indicators calculation

### Expression Parsing
- **[jsep](https://github.com/EricSmekens/jsep)** - JavaScript Expression Parser
- Custom AST evaluator for rule expressions
- Safe expression evaluation (no `eval()`)

### Technical Indicators
- **[technicalindicators](https://www.npmjs.com/package/technicalindicators)** - RSI, SMA, EMA calculations
- Lightweight and performant

### Form Handling
- **[react-hook-form](https://react-hook-form.com/)** - Performant form validation
- **[zod](https://zod.dev/)** - TypeScript-first schema validation

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Cloudflare account (free tier works)
- Clerk account (free tier works)
- Twelve Data API key (free tier works)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/financier.git
   cd financier
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your credentials:
   ```env
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

   # Stock APIs
   TWELVE_DATA_API_KEY=your_api_key

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up local D1 database**

   Login to Wrangler:
   ```bash
   npx wrangler login
   ```

   Create local database:
   ```bash
   npx wrangler d1 create financier-db
   ```

   Run migrations:
   ```bash
   npx wrangler d1 execute financier-db --file=./lib/db/migrations/0001_initial.sql --local
   npx wrangler d1 execute financier-db --file=./lib/db/migrations/0002_add_rules.sql --local
   npx wrangler d1 execute financier-db --file=./lib/db/migrations/0003_add_recommendations.sql --local
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Build for production**
   ```bash
   npm run build
   ```

## 📚 Project Structure

```
financier/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication pages
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/              # Protected dashboard pages
│   │   ├── dashboard/            # Main dashboard
│   │   ├── portfolio/            # Portfolio view
│   │   ├── transactions/         # Transaction history
│   │   ├── rules/                # Trading rules CRUD
│   │   └── recommendations/      # Recommendations view
│   ├── api/                      # API routes (Cloudflare Workers)
│   │   ├── portfolio/
│   │   ├── transactions/
│   │   ├── rules/
│   │   ├── recommendations/
│   │   └── stocks/
│   ├── layout.tsx                # Root layout with Clerk
│   └── middleware.ts             # Auth middleware
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── dashboard/
│   ├── portfolio/
│   ├── transactions/
│   ├── rules/
│   └── recommendations/
├── lib/                          # Core logic
│   ├── db/                       # Database layer
│   │   ├── client.ts             # D1 wrapper
│   │   ├── migrations/           # SQL migrations
│   │   └── queries/              # Database queries
│   ├── rules/                    # Rules engine
│   │   ├── parser.ts             # Expression parser
│   │   ├── evaluator.ts          # AST evaluator
│   │   └── validators.ts         # Expression validation
│   ├── stocks/                   # Stock data
│   │   ├── api-client.ts         # Twelve Data client
│   │   └── indicators.ts         # Technical indicators
│   └── cloudflare/
│       └── bindings.ts           # D1 access helpers
├── next.config.js                # Next.js config with Cloudflare adapter
├── wrangler.toml                 # Cloudflare configuration
├── tailwind.config.ts            # Tailwind CSS config
└── package.json
```

## 📖 Documentation

- **[Deployment Guide](./DEPLOYMENT.md)** - Step-by-step deployment to Cloudflare Pages
- **[Database Schema](./lib/db/migrations/)** - SQL migrations and schema
- **[API Documentation](./app/api/)** - API route implementations

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `TWELVE_DATA_API_KEY` | Twelve Data API key | Yes |
| `NEXT_PUBLIC_APP_URL` | Application URL | Yes |

See [.env.example](./.env.example) for complete list.

### Cloudflare Bindings

Configure in `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "financier-db"
database_id = "your-database-id"
```

## 🎯 Usage

### Creating a Trading Rule

1. Navigate to **Rules** page
2. Click **"New Rule"**
3. Enter rule details:
   - Name: "RSI Oversold Strategy"
   - Symbol: "AAPL"
   - Expression: `RSI(14) < 30`
   - Action: BUY
   - Quantity: 10 shares
4. Click **"Create Rule"**

### Evaluating Rules

1. Go to **Dashboard**
2. Click **"Evaluate Rules"** button
3. System evaluates all active rules
4. View recommendations in **"Today's Recommendations"** section

### Executing a Recommendation

1. Review recommendation details
2. Execute the trade in your brokerage account
3. Click **"Mark as Done"** in the app
4. Confirm the action
5. Transaction is created automatically
6. Cash balance is updated
7. Portfolio recalculates holdings

### Example Rules

**RSI Oversold (Buy Signal):**
```
RSI(14) < 30
```

**Price Above Moving Average (Buy Signal):**
```
close > SMA(50)
```

**Volume Spike with RSI:**
```
RSI(14) < 30 AND volume > avgVolume(20) * 2
```

**Multiple Conditions:**
```
(RSI(14) < 30 OR close < SMA(50)) AND volume > avgVolume(20)
```

## 🧪 Testing

Run type checking:
```bash
npm run build
```

Run linting:
```bash
npm run lint
```

## 🚀 Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for detailed deployment instructions.

Quick deploy to Cloudflare Pages:
```bash
# Build the app
npm run build

# Deploy
npx wrangler pages deploy .vercel/output/static --project-name=financier
```

## 💰 Cost

### Free Tier (1-10 users)
- **Cloudflare Pages**: FREE (unlimited requests)
- **Cloudflare Workers**: FREE (<100k requests/day)
- **Cloudflare D1**: FREE (<5M reads, <100k writes/day)
- **Clerk**: FREE (up to 10k monthly active users)
- **Twelve Data**: FREE (800 API calls/day)

**Total: $0/month** ✅

### Scaling Costs
- 100+ users may require Twelve Data paid plan: $79/month
- All other services remain free

## 🔒 Security

- ✅ Authentication with Clerk (industry-standard)
- ✅ API routes protected by auth middleware
- ✅ Expression parsing uses AST (no `eval()`)
- ✅ User data isolation (all queries filtered by user_id)
- ✅ Environment variables for secrets
- ✅ HTTPS enforced on Cloudflare
- ✅ CORS properly configured
- ✅ SQL injection prevention (parameterized queries)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Cloudflare](https://www.cloudflare.com/) - Edge platform
- [Clerk](https://clerk.com/) - Authentication
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Twelve Data](https://twelvedata.com/) - Stock data API
- [Vercel](https://vercel.com/) - For Next.js development

## 📧 Support

For issues and questions:
- Open an issue on [GitHub](https://github.com/YOUR_USERNAME/financier/issues)
- Check the [Deployment Guide](./DEPLOYMENT.md)
- Review [Cloudflare Docs](https://developers.cloudflare.com/)

## 🗺️ Roadmap

Future features:
- [ ] Backtesting rules against historical data
- [ ] Email/SMS notifications for recommendations
- [ ] Chart visualizations for portfolio performance
- [ ] Multiple portfolio support
- [ ] Paper trading mode
- [ ] Advanced technical indicators (MACD, Bollinger Bands)
- [ ] Rule performance analytics
- [ ] Export transactions to CSV
- [ ] Mobile app (React Native)

---

**Built with ❤️ using Next.js and Cloudflare**

# 🔑 How to Get Your Graph Protocol API Key

To get real Uniswap pool data, you need a Graph Protocol API key. Follow these steps:

## Step 1: Go to The Graph Studio
Visit: **https://thegraph.com/studio/**

## Step 2: Connect Your Wallet
- Click "Connect Wallet" 
- Connect with MetaMask, WalletConnect, or Coinbase Wallet
- You don't need any tokens - this is just for authentication

## Step 3: Create API Key
1. Once connected, click on your profile (top right)
2. Go to "Billing" or "API Keys" section
3. Click "Create API Key"
4. Give it a name like "UniRange-Lite"
5. Copy the generated API key

## Step 4: Setup Environment Variables
1. Create a file called `.env.local` in the project root
2. Add your API key:
```bash
NEXT_PUBLIC_GRAPH_API_KEY=your_api_key_here
```

## Step 5: Test Your Setup
Run the test script to verify everything works:
```bash
npm run test:subgraph
```
or
```bash
node test-subgraph.js
```

## Without API Key (Rate Limited)
If you don't want to get an API key right away, the app will use public endpoints with rate limits. Just leave the `.env.local` file empty or add:
```bash
NEXT_PUBLIC_USE_FREE_ENDPOINTS=true
```

## Pricing
- **Free Tier**: 100,000 queries per month
- **Pay-as-you-go**: $0.0001 per query after free tier
- For a personal LP calculator, the free tier is more than enough!

## Alternative: Alchemy or Infura
You can also use Alchemy or Infura subgraph endpoints, but The Graph Studio is recommended for Uniswap data.

---
**Note**: The API key is stored in `.env.local` which is already in `.gitignore` to keep it secret.

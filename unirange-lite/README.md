# UniRange-Lite

A comprehensive Uniswap V3/V4 liquidity position calculator that helps you analyze APR, APY, and projected revenues across Ethereum, Arbitrum One, Optimism, and Base networks.

## 🚀 How to Use UniRange-Lite

### 1. **Select Your Pool**
- **Choose Network**: Select from Ethereum, Arbitrum One, Optimism, or Base
- **Pick Token A**: Search and select your first token (e.g., "ETH", "WETH", or paste token address)
- **Pick Token B**: Search and select your second token (e.g., "USDC", "USDT", or paste token address)
- **Select Fee Tier**: Choose between 0.05%, 0.3%, or 1% fee tiers
- **Choose Version**: Select Uniswap V3 or V4 (V4 coming soon)

### 2. **Set Your Price Range**
- **Min Price**: Enter the minimum price at which you want to provide liquidity
- **Max Price**: Enter the maximum price at which you want to provide liquidity
- The prices are automatically displayed in the most intuitive format (e.g., "ETH per USDC" vs "USDC per ETH")

### 3. **Enter Position Size**
- **Liquidity Amount**: Enter how much you want to invest (in USD equivalent)
- The calculator will show you the exact token amounts required for your position

### 4. **View Results**
The calculator displays:
- **Current APR**: Annual percentage rate based on recent fee collection
- **Projected APY**: Compound annual yield including fee reinvestment
- **Daily Revenue**: Expected daily earnings from trading fees
- **Token Distribution**: How your liquidity will be split between the two tokens
- **Price Impact**: Current pool price and your position's relationship to it

## 💡 Key Features

### **Real-Time Data**
- Fetches live pool data from Uniswap subgraphs
- Uses on-chain RPC fallback for maximum reliability
- Shows subgraph lag and data freshness indicators

### **Intelligent Price Display**
- Automatically orders token pairs in the most readable format
- Converts complex tick ranges to human-readable prices
- Handles all token decimals automatically

### **Multi-Chain Support**
- **Ethereum**: The original Uniswap ecosystem
- **Arbitrum One**: Lower gas fees, faster transactions
- **Optimism**: Optimistic rollup with cheaper transactions
- **Base**: Coinbase's L2 solution

### **Status Indicators**
Look for these indicators in the top-right corner:
- 🟢 **Green**: Full API access with rate limits removed
- 🟠 **Orange**: Using rate-limited public endpoints
- 🟡 **Yellow**: Using RPC fallback due to subgraph issues

## 🔧 Advanced Usage

### **API Key Setup (Optional)**
For unlimited access and faster data fetching:
1. Get a free API key from [The Graph Protocol](https://thegraph.com/studio/)
2. Create a `.env.local` file in the project root
3. Add: `NEXT_PUBLIC_GRAPH_API_KEY=your_api_key_here`

See `API_KEY_SETUP.md` for detailed instructions.

### **Understanding the Calculations**
- **APR**: Based on the last 24 hours of fee collection data
- **APY**: Assumes daily compounding of earned fees
- **Revenue**: Extrapolated from recent pool activity and your position size
- **Range**: Your liquidity is only active when the price is within your specified range

### **Tips for Better Results**
1. **Choose Active Pools**: Look for pools with high volume and TVL
2. **Narrow Ranges**: Tighter ranges earn more fees but have higher impermanent loss risk
3. **Monitor Regularly**: Pool dynamics change, so check your positions frequently
4. **Consider Gas Costs**: Factor in transaction costs, especially on Ethereum mainnet

## 🛠️ Development

### Getting Started
```bash
npm install
npm run dev
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run test:subgraph` - Test subgraph connectivity

### Project Structure
- `src/app/` - Next.js 14 App Router pages
- `src/components/` - React components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Core business logic and API integrations
- `src/utils/` - Utility functions and calculations

## 📖 Documentation

- [API Key Setup Guide](./API_KEY_SETUP.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Setup Complete Guide](./SETUP_COMPLETE.md)

## 🚀 Deployment

### Static Export
```bash
npm run build
npm run export
```

The app can be deployed as a static site to any hosting provider that supports static files.

## ⚠️ Disclaimer

This tool is for educational and informational purposes only. Cryptocurrency investments carry significant risk. Always do your own research and consider consulting with financial advisors before making investment decisions.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

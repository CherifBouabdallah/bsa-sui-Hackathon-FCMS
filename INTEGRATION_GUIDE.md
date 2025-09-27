# CrownFunding - Integration Guide

🎉 **Frontend and Backend are now connected!**

## What's Working

### ✅ **Deployed Smart Contract**
- **Package ID**: `0xb1b127b4ec9bba67a818e96fb597c465ebb8779f6836c1767f47349d5dc55132`
- **Network**: Sui Testnet
- **Functions**: Create campaigns, donate, withdraw, refund, finalize

### ✅ **Frontend Integration**
- **URL**: http://localhost:3001
- **Wallet**: Connect your Sui wallet to interact
- **Network**: Make sure you're on Sui Testnet

## How to Use the DApp

### 1. **Connect Your Wallet**
- Open http://localhost:3001
- Click "Connect Wallet" in the top right
- Make sure you're on Sui Testnet network

### 2. **Get Some Testnet SUI**
- Go to [Sui Testnet Faucet](https://faucet.testnet.sui.io/)
- Enter your wallet address: `0x651beed5d7409be67b7fa9a8e12474d9316cdecc67063137d26597ab2ec583c7`
- Request testnet SUI tokens

### 3. **Create a Campaign**
- Click "Create Campaign"
- Fill in the details:
  - Title: "My Test Campaign"  
  - Description: "Testing the crowdfunding platform"
  - Goal: 10 SUI (for testing)
  - Deadline: Set a future date
  - Image URL: (optional)
- Click "Create Campaign"
- Approve the transaction in your wallet

### 4. **View & Interact with Campaigns**
- After creating, copy the campaign ID from the URL
- Go to "View Campaign"
- Enter the campaign ID to view details
- You can donate SUI to any active campaign
- Campaign owners can withdraw funds if goal is reached

### 5. **Check Your Donations**
- Go to "Donation Receipts" to see your donation history
- You can request refunds if campaigns fail

## Features Implemented

### 🎨 **Styling**
- Beautiful purple theme (#963B6B)
- White particle cursor effects
- Smooth page transitions
- CrownFunding branding with crown emoji
- Responsive design

### ⛓️ **Blockchain Integration**
- Campaign creation with metadata storage
- SUI donations with receipt NFTs  
- Automatic goal checking and state management
- Withdraw/refund functionality
- Real-time campaign data fetching

### 🔧 **Utilities**
- SUI/MIST conversion helpers
- Campaign progress calculation  
- Date/amount formatting
- Metadata parsing for campaign details
- Transaction builders for all operations

## Smart Contract Functions

The Move contract includes these key functions:
- `create_campaign()` - Create new crowdfunding campaigns
- `donate()` - Donate SUI and receive receipt NFT
- `finalize()` - Set campaign status after deadline
- `withdraw()` - Owner withdraws funds if successful
- `refund()` - Donors get refunds if campaign failed

## Next Steps

1. **Test the Flow**:
   - Create a test campaign
   - Donate to it from another wallet
   - Check the campaign progress
   - Test finalization and withdrawal

2. **Add More Features**:
   - Campaign discovery/listing
   - IPFS integration for metadata
   - Social sharing features
   - Email notifications

3. **Deploy to Production**:
   - Deploy contract to mainnet
   - Update package IDs in constants
   - Set up proper domain and hosting

## Troubleshooting

**If you get wallet connection issues**:
- Make sure you're on Sui Testnet
- Try refreshing the page
- Check browser console for errors

**If transactions fail**:
- Ensure you have enough SUI for gas fees
- Check that campaign deadlines are in the future
- Verify campaign IDs are valid

**For development issues**:
- Check the browser console
- Verify package ID is correct in constants.ts
- Make sure the development server is running on port 3001

---

🎊 **Congratulations! Your crowdfunding dApp is live and connected to the blockchain!**
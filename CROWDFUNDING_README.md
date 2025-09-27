# Crowdfunding Platform on Sui Blockchain

A decentralized crowdfunding platform built with Next.js, TypeScript, and Sui Move smart contracts. This platform allows users to create campaigns, donate to causes, and manage their contributions transparently on the Sui blockchain.

## Features

### 🚀 Campaign Management
- **Create Campaigns**: Launch crowdfunding campaigns with goals, deadlines, and metadata
- **Browse Campaigns**: Find and view existing campaigns by ID
- **Campaign States**: Automatic handling of Active, Succeeded, and Failed states

### 💰 Donation System
- **Secure Donations**: Donate SUI tokens to active campaigns
- **Donation Receipts**: NFT-like receipts for all donations made
- **Progress Tracking**: Real-time funding progress visualization

### 🔄 Smart Contract Features
- **Escrow System**: Funds are held securely in the campaign treasury
- **Automatic Finalization**: Campaigns finalize after deadline expires
- **Refund Mechanism**: Failed campaigns allow donors to claim refunds
- **Owner Withdrawal**: Successful campaigns allow owners to withdraw funds

## Smart Contract Structure

The crowdfunding platform uses a Move smart contract with the following key functions:

### Core Functions
- `create_campaign(goal, deadline_ms, metadata_cid)`: Create a new campaign
- `donate(campaign, coins, clock)`: Donate to an active campaign  
- `finalize(campaign, clock)`: Finalize a campaign after deadline
- `withdraw(campaign)`: Withdraw funds from successful campaign (owner only)
- `refund(campaign, receipt)`: Refund donation using receipt (failed campaigns only)

### Data Structures
- **Campaign**: Main campaign object with goal, deadline, raised amount, and state
- **DonationReceipt**: NFT receipt for each donation made

## Frontend Components

### Main Components
- **CreateCampaign**: Form to create new crowdfunding campaigns
- **Campaign**: Display campaign details, donation interface, and management
- **CampaignList**: Search and browse existing campaigns
- **DonationReceipts**: View donation history and manage refunds

### UI Features
- Responsive design with Tailwind CSS
- Real-time progress bars and funding visualization
- Wallet integration with Sui dApp Kit
- Loading states and error handling

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm package manager
- Sui CLI tools
- Sui wallet (e.g., Sui Wallet browser extension)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crowdfunding-platform
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Deploy the smart contract**
   ```bash
   cd move/crowdfunding
   sui move build
   sui client publish --gas-budget 100000000
   ```

4. **Update package ID**
   - Copy the package ID from deployment output
   - Update `constants.ts` with your deployed package ID:
   ```typescript
   export const TESTNET_CROWDFUNDING_PACKAGE_ID = "0xYOUR_PACKAGE_ID";
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Open in browser**
   - Navigate to `http://localhost:3000`
   - Connect your Sui wallet
   - Start creating and donating to campaigns!

## Usage Guide

### Creating a Campaign

1. Click "Create Campaign" in the main interface
2. Fill in campaign details:
   - **Title**: Campaign name
   - **Description**: What you're raising funds for
   - **Goal**: Target amount in SUI tokens
   - **Deadline**: Campaign end date
   - **Image URL**: Optional campaign image
3. Click "Create Campaign" and approve the transaction
4. Your campaign will be created and you'll get a campaign ID

### Donating to Campaigns

1. Use "Find Campaign" to locate a campaign by ID
2. View campaign details and progress
3. Enter donation amount in SUI
4. Click "Donate" and approve the transaction
5. Receive a donation receipt NFT

### Managing Donations

1. Click "My Donations" to view your donation history
2. See all campaigns you've supported
3. Request refunds for failed campaigns using your receipts

### Campaign States

- **Active**: Campaign is accepting donations
- **Succeeded**: Goal reached, owner can withdraw funds
- **Failed**: Goal not reached, donors can claim refunds

## Development

### Project Structure
```
app/
├── Campaign.tsx          # Campaign display and interaction
├── CreateCampaign.tsx    # Campaign creation form
├── DonationReceipts.tsx  # Donation management
├── App.tsx              # Main application logic
├── constants.ts         # Package IDs configuration
├── networkConfig.ts     # Sui network configuration
└── components/
    ├── CampaignList.tsx # Campaign browsing
    └── ui/             # Reusable UI components

move/
└── crowdfunding/
    └── sources/
        └── crowd.move   # Smart contract implementation
```

### Key Technologies

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Blockchain**: Sui Move smart contracts
- **Wallet**: Sui dApp Kit integration
- **State Management**: React hooks and React Query

## Smart Contract Events

The platform emits events for tracking:
- `CampaignCreated`: When new campaigns are launched
- `Donated`: When donations are made
- `Finalized`: When campaigns are finalized
- `Withdrawn`: When funds are withdrawn
- `Refunded`: When refunds are processed

## Security Considerations

- Funds are held in escrow during active campaigns
- Only campaign owners can withdraw from successful campaigns
- Refunds require original donation receipts
- All state changes are validated by the smart contract
- Deadlines are enforced using Sui's clock system

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For questions and support:
- Create an issue in the repository
- Check the Sui documentation
- Join the Sui Discord community

---

Built with ❤️ on Sui blockchain
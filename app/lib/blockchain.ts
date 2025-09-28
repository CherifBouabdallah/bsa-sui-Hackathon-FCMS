import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { CAMPAIGN_STATE, SUI_DECIMALS, MIST_PER_SUI } from "../constants";

export interface CampaignData {
  id: string;
  owner: string;
  goal: number;
  deadline_ms: number;
  raised: number;
  state: number;
  metadata_cid: string;
  // Parsed metadata
  title?: string;
  description?: string;
  imageUrl?: string;
}

export interface DonationReceiptData {
  id: string;
  campaign: string;
  donor: string;
  amount: number;
  ts_ms: number;
}

// Utility functions for converting between SUI and MIST
export const suiToMist = (sui: number): number => sui * MIST_PER_SUI;
export const mistToSui = (mist: number): number => mist / MIST_PER_SUI;

// Parse metadata from CID bytes
export const parseMetadata = (cidBytes: number[]): { title?: string; description?: string; imageUrl?: string } => {
  try {
    const cidString = new TextDecoder().decode(new Uint8Array(cidBytes));
    return JSON.parse(cidString);
  } catch {
    return {};
  }
};

// Create metadata CID bytes for campaign creation
export const createMetadataCid = (title: string, description: string, imageUrl?: string): number[] => {
  const metadata = { title, description, imageUrl };
  const metadataString = JSON.stringify(metadata);
  return Array.from(new TextEncoder().encode(metadataString));
};

// Get campaign state label
export const getCampaignStateLabel = (state: number): string => {
  switch (state) {
    case CAMPAIGN_STATE.ACTIVE:
      return "Active";
    case CAMPAIGN_STATE.SUCCEEDED:
      return "Succeeded";
    case CAMPAIGN_STATE.FAILED:
      return "Failed";
    default:
      return "Unknown";
  }
};

// Check if campaign is active
export const isCampaignActive = (campaign: CampaignData): boolean => {
  return campaign.state === CAMPAIGN_STATE.ACTIVE && Date.now() < campaign.deadline_ms;
};

// Check if campaign has reached its goal
export const hasReachedGoal = (campaign: CampaignData): boolean => {
  return campaign.raised >= campaign.goal;
};

// Calculate campaign progress percentage
export const getCampaignProgress = (campaign: CampaignData): number => {
  return Math.min((campaign.raised / campaign.goal) * 100, 100);
};

// Format SUI amount for display
export const formatSuiAmount = (mist: number): string => {
  const sui = mistToSui(mist);
  return sui.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
};

// Format date for display
export const formatDate = (timestamp: number): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
};

// Check if campaign funds have been withdrawn by examining the withdrawn field
export const checkIfFundsWithdrawn = async (
  suiClient: SuiClient,
  campaignId: string
): Promise<boolean> => {
  try {
    const result = await suiClient.getObject({
      id: campaignId,
      options: {
        showContent: true,
      },
    });

    if (!result.data?.content || result.data.content.dataType !== "moveObject") {
      return false;
    }

    const content = result.data.content as any;
    const fields = content.fields;
    
    // Use the withdrawn field from the smart contract - this is the definitive source
    const withdrawn = fields.withdrawn || false;
    
    // Also log additional info for debugging
    const raised = parseInt(fields.raised || "0");
    const state = fields.state;
    const treasuryBalance = parseInt(fields.treasury?.fields?.value || "0");
    
    console.log("🔍 Withdrawal status check:", {
      withdrawn,
      state,
      raised,
      treasuryBalance
    });
    
    return withdrawn;
  } catch (error) {
    console.error("Error checking withdrawal status:", error);
    return false;
  }
};

// Fetch campaign data from the blockchain
export const fetchCampaignData = async (
  suiClient: SuiClient,
  campaignId: string
): Promise<CampaignData | null> => {
  try {
    const result = await suiClient.getObject({
      id: campaignId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (!result.data?.content || result.data.content.dataType !== "moveObject") {
      return null;
    }

    const content = result.data.content as any;
    const fields = content.fields;

    // Parse metadata if available
    const metadata = fields.metadata_cid ? parseMetadata(fields.metadata_cid) : {};

    return {
      id: campaignId,
      owner: fields.owner,
      goal: parseInt(fields.goal),
      deadline_ms: parseInt(fields.deadline_ms),
      raised: parseInt(fields.raised),
      state: fields.state,
      metadata_cid: fields.metadata_cid,
      ...metadata,
    };
  } catch (error) {
    console.error("Error fetching campaign data:", error);
    return null;
  }
};

// Fetch user's donation receipts
export const fetchUserDonationReceipts = async (
  suiClient: SuiClient,
  userAddress: string,
  packageId: string
): Promise<DonationReceiptData[]> => {
  try {
    const result = await suiClient.getOwnedObjects({
      owner: userAddress,
      filter: {
        StructType: `${packageId}::crowd::DonationReceipt`,
      },
      options: {
        showContent: true,
        showType: true,
      },
    });

    const receipts: DonationReceiptData[] = [];
    
    for (const item of result.data) {
      if (item.data?.content && item.data.content.dataType === "moveObject") {
        const content = item.data.content as any;
        const fields = content.fields;
        
        receipts.push({
          id: item.data.objectId,
          campaign: fields.campaign,
          donor: fields.donor,
          amount: parseInt(fields.amount),
          ts_ms: parseInt(fields.ts_ms),
        });
      }
    }

    return receipts.sort((a, b) => b.ts_ms - a.ts_ms); // Sort by timestamp, newest first
  } catch (error) {
    console.error("Error fetching donation receipts:", error);
    return [];
  }
};

// Create transaction to create a new campaign
export const createCampaignTransaction = (
  packageId: string,
  goalSui: number,
  deadlineMs: number,
  title: string,
  description: string,
  imageUrl?: string
): Transaction => {
  const tx = new Transaction();
  
  const goalMist = suiToMist(goalSui);
  const cidBytes = createMetadataCid(title, description, imageUrl);
  
  tx.moveCall({
    arguments: [
      tx.pure.u64(goalMist),
      tx.pure.u64(deadlineMs),
      tx.pure.vector("u8", cidBytes),
    ],
    target: `${packageId}::crowd::create_campaign`,
  });
  
  return tx;
};

// Create transaction to donate to a campaign
export const createDonateTransaction = (
  packageId: string,
  campaignId: string,
  amountSui: number,
  coinObjectId: string
): Transaction => {
  const tx = new Transaction();
  
  // Split the coin to get the exact amount needed
  const amountMist = suiToMist(amountSui);
  const [coin] = tx.splitCoins(tx.object(coinObjectId), [amountMist]);
  
  tx.moveCall({
    arguments: [
      tx.object(campaignId),
      coin,
      tx.object("0x6"), // Clock object
    ],
    target: `${packageId}::crowd::donate`,
  });
  
  return tx;
};

// Create transaction to finalize a campaign
export const createFinalizeTransaction = (
  packageId: string,
  campaignId: string
): Transaction => {
  const tx = new Transaction();
  
  tx.moveCall({
    arguments: [
      tx.object(campaignId),
      tx.object("0x6"), // Clock object
    ],
    target: `${packageId}::crowd::finalize`,
  });
  
  return tx;
};

// Create transaction to withdraw funds (for campaign owner)
export const createWithdrawTransaction = (
  packageId: string,
  campaignId: string
): Transaction => {
  const tx = new Transaction();
  
  tx.moveCall({
    arguments: [
      tx.object(campaignId),
    ],
    target: `${packageId}::crowd::withdraw`,
  });
  
  return tx;
};

// Create transaction to refund donation (when campaign failed)
export const createRefundTransaction = (
  packageId: string,
  campaignId: string,
  receiptId: string
): Transaction => {
  const tx = new Transaction();
  
  tx.moveCall({
    arguments: [
      tx.object(campaignId),
      tx.object(receiptId),
    ],
    target: `${packageId}::crowd::refund`,
  });
  
  return tx;
};

// Create transaction to force finalize a campaign (for testing)
export const createForceSucceededTransaction = (
  packageId: string,
  campaignId: string
): Transaction => {
  const tx = new Transaction();
  
  tx.moveCall({
    arguments: [
      tx.object(campaignId),
    ],
    target: `${packageId}::crowd::force_succeeded`,
  });
  
  return tx;
};

// Fetch all campaigns by querying CampaignCreated events
export const fetchAllCampaigns = async (
  suiClient: SuiClient,
  packageId: string
): Promise<CampaignData[]> => {
  try {
    // Query for CampaignCreated events
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${packageId}::crowd::CampaignCreated`,
      },
      limit: 50, // Adjust limit as needed
      order: 'descending', // Newest first
    });

    const campaigns: CampaignData[] = [];
    
    // For each event, fetch the current campaign data
    for (const event of events.data) {
      if (event.parsedJson && typeof event.parsedJson === 'object') {
        const eventData = event.parsedJson as any;
        const campaignId = eventData.campaign;
        
        if (campaignId) {
          const campaignData = await fetchCampaignData(suiClient, campaignId);
          if (campaignData) {
            campaigns.push(campaignData);
          }
        }
      }
    }

    return campaigns;
  } catch (error) {
    console.error("Error fetching all campaigns:", error);
    return [];
  }
};

// Search campaigns by title or description
export const searchCampaigns = (
  campaigns: CampaignData[],
  searchTerm: string
): CampaignData[] => {
  if (!searchTerm.trim()) {
    return campaigns;
  }

  const term = searchTerm.toLowerCase();
  return campaigns.filter(campaign => 
    campaign.title?.toLowerCase().includes(term) ||
    campaign.description?.toLowerCase().includes(term)
  );
};

// Filter campaigns by status
export const filterCampaignsByStatus = (
  campaigns: CampaignData[],
  status: 'all' | 'active' | 'succeeded' | 'failed'
): CampaignData[] => {
  if (status === 'all') {
    return campaigns;
  }

  const statusMap = {
    active: CAMPAIGN_STATE.ACTIVE,
    succeeded: CAMPAIGN_STATE.SUCCEEDED,
    failed: CAMPAIGN_STATE.FAILED,
  };

  return campaigns.filter(campaign => campaign.state === statusMap[status]);
};

// Sort campaigns by different criteria
export const sortCampaigns = (
  campaigns: CampaignData[],
  sortBy: 'newest' | 'oldest' | 'goal' | 'progress' | 'deadline'
): CampaignData[] => {
  const sorted = [...campaigns];

  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => b.deadline_ms - a.deadline_ms);
    case 'oldest':
      return sorted.sort((a, b) => a.deadline_ms - b.deadline_ms);
    case 'goal':
      return sorted.sort((a, b) => b.goal - a.goal);
    case 'progress':
      return sorted.sort((a, b) => getCampaignProgress(b) - getCampaignProgress(a));
    case 'deadline':
      return sorted.sort((a, b) => a.deadline_ms - b.deadline_ms);
    default:
      return sorted;
  }
};
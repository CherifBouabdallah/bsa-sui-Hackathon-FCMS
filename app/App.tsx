'use client'
import { useCurrentAccount } from "@mysten/dapp-kit";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { useState, useEffect } from "react";
import { Campaign } from "./Campaign";
import { CreateCampaign } from "./CreateCampaign";
import { CampaignList } from "./components/CampaignList";
import { DonationReceipts } from "./DonationReceipts";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "./components/Navbar";

import { useSuiClient } from "@mysten/dapp-kit";
import { DEVNET_CROWDFUNDING_PACKAGE_ID } from "./constants";

function App() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const [campaignId, setCampaign] = useState<string | null>(null);
  const [view, setView] = useState<'welcome' | 'create' | 'search' | 'receipts' | 'campaign' | 'my-campaigns'>('welcome');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [isResolvingCampaign, setIsResolvingCampaign] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);

  // Helper function to resolve campaign name to ID
  const resolveCampaignIdentifier = async (identifier: string): Promise<string | null> => {
    // If it's already a valid Sui object ID, return it
    if (isValidSuiObjectId(identifier)) {
      return identifier;
    }

    // Try to get campaign map from localStorage first (quick lookup)
    const storedMap = localStorage.getItem('campaignMap');
    if (storedMap) {
      const campaignMap = JSON.parse(storedMap);
      if (campaignMap[identifier]) {
        return campaignMap[identifier];
      }
    }

    // If not found in localStorage, fetch from blockchain
    try {
      console.log('Resolving campaign name:', identifier);
      setIsResolvingCampaign(true);
      
      // Query events to find campaigns
      const events = await suiClient.queryEvents({
        query: {
          MoveEventType: `${DEVNET_CROWDFUNDING_PACKAGE_ID}::crowd::CampaignCreated`,
        },
        limit: 50,
        order: 'descending',
      });

      // Parse metadata and find matching campaign
      for (const event of events.data) {
        if (event.parsedJson && typeof event.parsedJson === 'object') {
          const eventData = event.parsedJson as any;
          const campaignId = eventData.campaign;
          
          if (campaignId) {
            try {
              const object = await suiClient.getObject({
                id: campaignId,
                options: {
                  showContent: true,
                },
              });

              if (object.data?.content?.dataType === "moveObject") {
                const fields = (object.data.content as any).fields;
                if (fields.metadata_cid) {
                  try {
                    const cidString = String.fromCharCode(...fields.metadata_cid);
                    const metadata = JSON.parse(cidString);
                    
                    // Create slug from title and check if it matches
                    const slug = metadata.title
                      ?.toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '')
                      .substring(0, 50);
                    
                    if (slug === identifier.toLowerCase() || 
                        metadata.title?.toLowerCase().includes(identifier.toLowerCase())) {
                      console.log('Found campaign:', metadata.title, '->', campaignId);
                      return campaignId;
                    }
                  } catch {}
                }
              }
            } catch (err) {
              console.error(`Error checking campaign ${campaignId}:`, err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error resolving campaign identifier:', error);
    } finally {
      setIsResolvingCampaign(false);
    }

    return null;
  };

  // Check for stored user name and handle first-time login
  useEffect(() => {
    if (currentAccount && typeof window !== 'undefined') {
      const userKey = `user_name_${currentAccount.address}`;
      const storedName = localStorage.getItem(userKey);
      
      if (storedName) {
        setUserName(storedName);
        setShowNameDialog(false);
      } else {
        // First time login for this wallet address - show name dialog
        setUserName(null);
        setShowNameDialog(true);
      }
    } else if (!currentAccount) {
      // Reset user name and dialog when account disconnects
      setUserName(null);
      setShowNameDialog(false);
    }
  }, [currentAccount?.address]); // Watch for address changes

  useEffect(() => {
    // Only access window on client side to prevent hydration errors
    const checkHashAndResolve = async () => {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.slice(1);
        if (hash) {
          const resolvedId = await resolveCampaignIdentifier(hash);
          if (resolvedId) {
            setCampaign(resolvedId);
            setView('campaign');
          }
        }
      }
    };

    checkHashAndResolve();
  }, []);

  const handleNameSubmit = (name: string) => {
    if (currentAccount && typeof window !== 'undefined') {
      const userKey = `user_name_${currentAccount.address}`;
      localStorage.setItem(userKey, name);
      setUserName(name);
      setShowNameDialog(false);
    }
  };

  const handleUpdateName = (name: string) => {
    if (currentAccount && typeof window !== 'undefined') {
      const userKey = `user_name_${currentAccount.address}`;
      localStorage.setItem(userKey, name);
      setUserName(name);
    }
  };

  const handleCampaignCreated = (id: string) => {
    console.log('Campaign created with ID:', id);
    if (typeof window !== 'undefined') {
      window.location.hash = id;
    }
    animatedViewChange('campaign', id);
  };

  const handleCampaignSelected = (id: string) => {
    console.log('Campaign selected with ID:', id);
    if (typeof window !== 'undefined') {
      window.location.hash = id;
    }
    animatedViewChange('campaign', id);
  };

  const animatedViewChange = (newView: 'welcome' | 'create' | 'search' | 'receipts' | 'campaign' | 'my-campaigns', newCampaignId?: string | null) => {
    console.log('Changing view to:', newView, 'with campaign ID:', newCampaignId);
    setIsTransitioning(true);
    setTimeout(() => {
      setView(newView);
      if (newCampaignId !== undefined) {
        setCampaign(newCampaignId);
      }
      setAnimationKey(prev => prev + 1);
      setIsTransitioning(false);
    }, 150);
  };

  const goBackToWelcome = () => {
    animatedViewChange('welcome', null);
    if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
  };

  if (!currentAccount) {
    return (
      <div className="min-h-screen w-full">
        <Navbar 
          onGoHome={goBackToWelcome}
          userName={userName}
          onUpdateName={handleUpdateName}
        />
        <div className="min-h-[60vh] flex items-center justify-center pt-4 sm:pt-6">
          <Card className="max-w-2xl w-full mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-8 select-none" style={{ userSelect: 'none', cursor: 'default' }}>
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                  <h2 className="text-2xl font-bold text-black mb-2 select-none">Welcome to Crowdfunding Platform</h2>
                  <p className="text-black text-lg select-none">Please connect your Sui wallet to start creating campaigns or supporting projects.</p>
                </div>
                
                <div className="space-y-3 text-sm text-black select-none">
                  <p>🚀 Create fundraising campaigns</p>
                  <p>💝 Support amazing projects</p>
                  <p>🔒 Secure blockchain transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show loading state when resolving campaign
  if (isResolvingCampaign) {
    return (
      <div className="min-h-screen w-full">
        <Navbar 
          view={view} 
          onViewChange={(newView) => animatedViewChange(newView)} 
          onGoHome={goBackToWelcome}
          userName={userName}
          onUpdateName={handleUpdateName}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading campaign...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      {/* Combined Navbar/Toolbar */}
      <Navbar 
        view={view} 
        onViewChange={(newView) => animatedViewChange(newView)} 
        onGoHome={goBackToWelcome}
        userName={userName}
        onUpdateName={handleUpdateName}
      />

      {/* Main Content */}
      <div 
        key={animationKey}
        className={`w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 transition-all duration-300 ease-in-out ${
          isTransitioning 
            ? 'opacity-0 translate-y-4 scale-95' 
            : 'opacity-100 translate-y-0 scale-100'
        } ${showNameDialog ? 'pointer-events-none' : 'pointer-events-auto'}`}
        style={{
          animation: isTransitioning ? 'none' : 'fadeSlideIn 0.3s ease-out'
        }}
      >
        {view === 'welcome' && (
          <div className="text-center" style={{ userSelect: 'none', cursor: 'default' }}>
            {/* Welcome Hero Section */}
            <div className="mb-8 sm:mb-12">
              <div className="mx-auto mb-4 sm:mb-6">
                <span className="text-5xl sm:text-6xl">🚀</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 px-4">
                {userName ? `Welcome ${userName}!` : 'Welcome back!'}
              </h1>
              <p className="text-lg sm:text-xl text-white max-w-4xl mx-auto mb-6 sm:mb-8 px-4">
                {userName ? `Hello ${userName}! ` : ''}Ready to make a difference? Create your own campaign or support existing projects on the blockchain.
              </p>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6 w-full max-w-6xl mx-auto">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                onClick={() => animatedViewChange('create')}
              >
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">✨</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Campaign</h3>
                    <p className="text-gray-600 text-sm">Launch your fundraising campaign and reach your goals with blockchain security.</p>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                onClick={() => animatedViewChange('search')}
              >
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🔍</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Campaigns</h3>
                    <p className="text-gray-600 text-sm">Discover and support amazing projects from creators around the world.</p>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                onClick={() => animatedViewChange('receipts')}
              >
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">📋</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">My Donations</h3>
                    <p className="text-gray-600 text-sm">Track your contributions and manage refunds for your donations.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats Section */}
            <div className="mt-12 lg:mt-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 sm:p-8 w-full max-w-6xl mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Platform Features</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">🔒</div>
                  <div className="text-sm font-medium text-gray-900 mt-2">Secure Escrow</div>
                  <div className="text-xs text-gray-600">Funds protected by smart contracts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">💝</div>
                  <div className="text-sm font-medium text-gray-900 mt-2">Transparent Donations</div>
                  <div className="text-xs text-gray-600">All transactions on blockchain</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">🔄</div>
                  <div className="text-sm font-medium text-gray-900 mt-2">Automatic Refunds</div>
                  <div className="text-xs text-gray-600">Failed campaigns get refunded</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'campaign' && campaignId && (
          <div className="space-y-4">
            <Campaign id={campaignId} />
          </div>
        )}

        {view === 'create' && (
          <CreateCampaign onCreated={handleCampaignCreated} />
        )}

        {view === 'search' && (
          <CampaignList onSelectCampaign={handleCampaignSelected} />
        )}

        {view === 'receipts' && (
          <DonationReceipts />
        )}

        {view === 'my-campaigns' && (
          <CampaignList onSelectCampaign={handleCampaignSelected} showOnlyMyCampaigns={true} />
        )}
      </div>

      {/* Name Dialog functionality has been integrated into the app */}
    </div>
  );
}

export default App;
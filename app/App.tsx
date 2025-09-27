'use client'
import { useCurrentAccount } from "@mysten/dapp-kit";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { useState, useEffect } from "react";
import { Campaign } from "./Campaign";
import { CreateCampaign } from "./CreateCampaign";
import { CampaignList } from "./components/CampaignList";
import { DonationReceipts } from "./DonationReceipts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "./components/Navbar";

function App() {
  const currentAccount = useCurrentAccount();
  const [campaignId, setCampaign] = useState<string | null>(null);
  const [view, setView] = useState<'welcome' | 'create' | 'search' | 'receipts' | 'campaign'>('welcome');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);


  useEffect(() => {
    // Only access window on client side to prevent hydration errors
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1);
      if (isValidSuiObjectId(hash)) {
        setCampaign(hash);
        setView('campaign');
      }

      
    }
  }, []);

  const handleCampaignCreated = (id: string) => {
    if (typeof window !== 'undefined') {
      window.location.hash = id;
    }
    animatedViewChange('campaign', id);
  };

  const handleCampaignSelected = (id: string) => {
    if (typeof window !== 'undefined') {
      window.location.hash = id;
    }
    animatedViewChange('campaign', id);
  };

  const animatedViewChange = (newView: 'welcome' | 'create' | 'search' | 'receipts' | 'campaign', newCampaignId?: string | null) => {
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
        <Navbar onGoHome={goBackToWelcome} />
        <div className="min-h-[60vh] flex items-center justify-center pt-4 sm:pt-6">
          <Card className="max-w-2xl w-full mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-8 select-none" style={{ userSelect: 'none', cursor: 'default' }}>
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                  <h2 className="text-2xl font-bold text-black mb-2 select-none" style={{ userSelect: 'none', cursor: 'default' }}>Welcome to Crowdfunding Platform</h2>
                  <p className="text-black text-lg select-none" style={{ userSelect: 'none', cursor: 'default' }}>Please connect your Sui wallet to start creating campaigns or supporting projects.</p>
                </div>
                
                <div className="space-y-3 text-sm text-black select-none" style={{ userSelect: 'none', cursor: 'default' }}>
                  <p style={{ userSelect: 'none', cursor: 'default' }}>🚀 Create fundraising campaigns</p>
                  <p style={{ userSelect: 'none', cursor: 'default' }}>💝 Support amazing projects</p>
                  <p style={{ userSelect: 'none', cursor: 'default' }}>🔒 Secure blockchain transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
      />

      {/* Main Content */}
      <div 
        key={animationKey}
        className={`w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 transition-all duration-300 ease-in-out ${
          isTransitioning 
            ? 'opacity-0 translate-y-4 scale-95' 
            : 'opacity-100 translate-y-0 scale-100'
        }`}
        style={{
          animation: isTransitioning ? 'none' : 'fadeSlideIn 0.3s ease-out'
        }}
      >
        {view === 'welcome' && (
          <div className="text-center" style={{ userSelect: 'none', cursor: 'default' }}>
            {/* Welcome Hero Section */}
            <div className="mb-8 sm:mb-12" style={{ userSelect: 'none', cursor: 'default' }}>
              <div className="mx-auto mb-4 sm:mb-6" style={{ userSelect: 'none', cursor: 'default' }}>
                <span className="text-5xl sm:text-6xl" style={{ userSelect: 'none', cursor: 'default' }}>🚀</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 px-4" style={{ userSelect: 'none', cursor: 'default' }}>
                Welcome back, Cherif!
              </h1>
              <p className="text-lg sm:text-xl text-white max-w-4xl mx-auto mb-6 sm:mb-8 px-4" style={{ userSelect: 'none', cursor: 'default' }}>
                Ready to make a difference? Create your own campaign or support existing projects on the blockchain.
              </p>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6 w-full max-w-6xl mx-auto" style={{ userSelect: 'none', cursor: 'default' }}>
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                onClick={() => setView('create')}
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
                onClick={() => setView('search')}
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
                onClick={() => setView('receipts')}
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
            <div className="mt-12 lg:mt-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 sm:p-8 w-full max-w-6xl mx-auto" style={{ userSelect: 'none', cursor: 'default' }}>
              <h3 className="text-lg font-semibold text-gray-900 mb-6" style={{ userSelect: 'none', cursor: 'default' }}>Platform Features</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" style={{ userSelect: 'none', cursor: 'default' }}>
                <div className="text-center" style={{ userSelect: 'none', cursor: 'default' }}>
                  <div className="text-2xl font-bold text-blue-600" style={{ userSelect: 'none', cursor: 'default' }}>🔒</div>
                  <div className="text-sm font-medium text-gray-900 mt-2" style={{ userSelect: 'none', cursor: 'default' }}>Secure Escrow</div>
                  <div className="text-xs text-gray-600" style={{ userSelect: 'none', cursor: 'default' }}>Funds protected by smart contracts</div>
                </div>
                <div className="text-center" style={{ userSelect: 'none', cursor: 'default' }}>
                  <div className="text-2xl font-bold text-green-600" style={{ userSelect: 'none', cursor: 'default' }}>💝</div>
                  <div className="text-sm font-medium text-gray-900 mt-2" style={{ userSelect: 'none', cursor: 'default' }}>Transparent Donations</div>
                  <div className="text-xs text-gray-600" style={{ userSelect: 'none', cursor: 'default' }}>All transactions on blockchain</div>
                </div>
                <div className="text-center" style={{ userSelect: 'none', cursor: 'default' }}>
                  <div className="text-2xl font-bold text-purple-600" style={{ userSelect: 'none', cursor: 'default' }}>🔄</div>
                  <div className="text-sm font-medium text-gray-900 mt-2" style={{ userSelect: 'none', cursor: 'default' }}>Automatic Refunds</div>
                  <div className="text-xs text-gray-600" style={{ userSelect: 'none', cursor: 'default' }}>Failed campaigns get refunded</div>
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
      </div>
    </div>
  );
}

export default App;

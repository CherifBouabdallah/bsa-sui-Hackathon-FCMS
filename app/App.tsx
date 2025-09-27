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

function App() {
  const currentAccount = useCurrentAccount();
  const [campaignId, setCampaign] = useState<string | null>(null);
  const [view, setView] = useState<'create' | 'search' | 'receipts' | 'campaign'>('create');

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (isValidSuiObjectId(hash)) {
      setCampaign(hash);
      setView('campaign');
    }
  }, []);

  const handleCampaignCreated = (id: string) => {
    window.location.hash = id;
    setCampaign(id);
    setView('campaign');
  };

  const handleCampaignSelected = (id: string) => {
    window.location.hash = id;
    setCampaign(id);
    setView('campaign');
  };

  const goBackToSelection = () => {
    setCampaign(null);
    setView('create');
    window.location.hash = '';
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="min-h-[500px]">
        <CardContent className="pt-6">
          {currentAccount ? (
            campaignId ? (
              <div className="space-y-4">
                {/* Back button when viewing a campaign */}
                <div className="flex justify-between items-center">
                  <Button 
                    onClick={goBackToSelection}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    ← Back to Campaign Selection
                  </Button>
                  <div className="text-sm text-gray-500">
                    Campaign ID: {campaignId.slice(0, 8)}...{campaignId.slice(-8)}
                  </div>
                </div>
                
                {/* Campaign component */}
                <Campaign id={campaignId} />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Navigation with proper styling */}
                <div className="flex justify-center space-x-2">
                  <Button
                    variant={view === 'create' ? 'default' : 'outline'}
                    onClick={() => setView('create')}
                    className={view === 'create' 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }
                  >
                    Create Campaign
                  </Button>
                  <Button
                    variant={view === 'search' ? 'default' : 'outline'}
                    onClick={() => setView('search')}
                    className={view === 'search' 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }
                  >
                    Find Campaign
                  </Button>
                  <Button
                    variant={view === 'receipts' ? 'default' : 'outline'}
                    onClick={() => setView('receipts')}
                    className={view === 'receipts' 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }
                  >
                    My Donations
                  </Button>
                </div>

                {/* Content based on view */}
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
            )
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Crowdfunding Platform</h2>
              <p className="text-gray-600">Please connect your wallet to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default App;

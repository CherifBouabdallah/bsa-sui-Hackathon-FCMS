'use client'

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { fetchAllCampaigns, getCampaignStateLabel, mistToSui, type CampaignData } from '../lib/blockchain';
import { useSuiClient } from '@mysten/dapp-kit';
import { DEVNET_CROWDFUNDING_PACKAGE_ID } from '../constants';

interface CampaignListProps {
  onSelectCampaign?: (campaignId: string) => void;
}

export function CampaignList({ onSelectCampaign }: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const suiClient = useSuiClient();

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);
        const campaignData = await fetchAllCampaigns(suiClient, DEVNET_CROWDFUNDING_PACKAGE_ID);
        setCampaigns(campaignData);
      } catch (err) {
        console.error('Failed to fetch campaigns:', err);
        setError('Failed to load campaigns. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, [suiClient]);

  const handleViewCampaign = (campaignId?: string) => {
    const id = campaignId || selectedCampaignId.trim();
    if (id && onSelectCampaign) {
      // Use the callback prop for proper app navigation
      onSelectCampaign(id);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => 
    campaign.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestampMs: number) => {
    return new Date(timestampMs).toLocaleDateString();
  };

  const getProgressPercentage = (raised: number, goal: number) => {
    return Math.min((raised / goal) * 100, 100);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        Discover Campaigns
      </h2>
      
      {/* Search and Quick Access */}
      <div className="mb-6 space-y-4">
        <Input
          type="text"
          placeholder="Search campaigns by title, description, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md border-purple-300 focus:border-purple-500"
        />
        
        <Card className="border-purple-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-purple-700">Quick Campaign Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Enter Campaign ID (e.g., 0x123...)"
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="border-purple-300 focus:border-purple-500"
              />
              <Button 
                onClick={() => handleViewCampaign()}
                disabled={!selectedCampaignId.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6"
              >
                View Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading campaigns...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 shadow-lg mb-6">
          <CardContent className="py-6">
            <p className="text-red-600 text-center">⚠️ {error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4 mx-auto block bg-red-600 hover:bg-red-700 text-white"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Campaigns Grid */}
      {!loading && !error && (
        <>
          <div className="mb-4 text-sm text-gray-600">
            Found {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''}
          </div>
          
          {filteredCampaigns.length === 0 ? (
            <Card className="border-gray-200 shadow-lg">
              <CardContent className="py-12 text-center">
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'No campaigns match your search.' : 'No campaigns found.'}
                </p>
                {!searchTerm && (
                  <p className="text-sm text-gray-500">
                    Be the first to create a campaign!
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCampaigns.map((campaign) => (
                <Card 
                  key={campaign.id} 
                  className="border-purple-200 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => handleViewCampaign(campaign.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-purple-700 text-lg truncate">
                      {campaign.title || `Campaign ${campaign.id.slice(0, 8)}...`}
                    </CardTitle>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        campaign.state === 0 ? 'bg-blue-100 text-blue-800' :
                        campaign.state === 1 ? 'bg-green-100 text-green-800' :
                        campaign.state === 2 ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getCampaignStateLabel(campaign.state)}
                      </span>
                      <span className="text-gray-500">
                        Until {formatDate(campaign.deadline_ms)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {campaign.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {campaign.description}
                        </p>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">
                            {mistToSui(campaign.raised).toFixed(2)} / {mistToSui(campaign.goal).toFixed(2)} SUI
                          </span>
                        </div>
                        <Progress 
                          value={getProgressPercentage(campaign.raised, campaign.goal)} 
                          className="h-2"
                        />
                        <div className="text-xs text-gray-500 text-right">
                          {getProgressPercentage(campaign.raised, campaign.goal).toFixed(1)}% funded
                        </div>
                      </div>

                      <div className="text-xs text-gray-400 truncate">
                        ID: {campaign.id}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
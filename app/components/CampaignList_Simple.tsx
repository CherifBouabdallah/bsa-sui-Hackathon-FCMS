'use client'

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function CampaignList() {
  const [selectedCampaignId, setSelectedCampaignId] = useState('');

  const handleViewCampaign = () => {
    if (selectedCampaignId.trim()) {
      window.location.href = `/campaign/${selectedCampaignId.trim()}`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        Discover Campaigns
      </h2>
      
      <Card className="mb-6 border-purple-200 shadow-lg">
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
              onClick={handleViewCampaign}
              disabled={!selectedCampaignId.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6"
            >
              View Campaign
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            💡 Enter a campaign ID to view and interact with it directly
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-purple-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-purple-700">✅ Core Features Working</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>🎯 Create new campaigns</li>
              <li>💰 Make donations with SUI</li>
              <li>🏁 "Finish Campaign Now" testing button</li>
              <li>💸 Withdraw funds as campaign owner</li>
              <li>🔗 Blockchain verification on Sui Explorer</li>
              <li>✨ White particle cursor effects</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-orange-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-orange-700">⚠️ Temporarily Simplified</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>📊 Advanced campaign discovery grid</li>
              <li>🔍 Search and filter functionality</li>
              <li>📈 Money flow verification component</li>
              <li>📊 Transaction history display</li>
            </ul>
            <p className="text-xs text-gray-600 mt-3">
              These features will be restored once webpack issues are resolved
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-green-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-green-700">🚀 Quick Start Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-purple-600">1.</span>
              <span>Go to <strong>"Create Campaign"</strong> to start a new crowdfunding campaign</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-purple-600">2.</span>
              <span>Copy the Campaign ID from the URL after creation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-purple-600">3.</span>
              <span>Use the Campaign ID above to view and test donations</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-purple-600">4.</span>
              <span>Click <strong>"Finish Campaign Now"</strong> to test money transfer</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
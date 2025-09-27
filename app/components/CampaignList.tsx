import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isValidSuiObjectId } from "@mysten/sui/utils";

export function CampaignList({ onSelectCampaign }: { onSelectCampaign: (id: string) => void }) {
  const [campaignId, setCampaignId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidSuiObjectId(campaignId)) {
      onSelectCampaign(campaignId);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Find Existing Campaign</CardTitle>
          <CardDescription className="text-gray-600">
            Enter a campaign ID to view and interact with an existing crowdfunding campaign.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="campaignId" className="block text-sm font-medium text-gray-700 mb-2">
                Campaign ID
              </label>
              <Input
                id="campaignId"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                placeholder="0x1234567890abcdef..."
                className="font-mono text-sm border-gray-300"
              />
            </div>
            
            <Button
              type="submit"
              disabled={!isValidSuiObjectId(campaignId)}
              className="w-full text-white"
              style={{ backgroundColor: '#963B6B' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7A2F56'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#963B6B'}
            >
              View Campaign
            </Button>
          </form>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">How to find Campaign IDs:</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Create a campaign first to get its object ID</li>
              <li>Copy the object ID from the URL hash after creating a campaign</li>
              <li>Or check the Sui Explorer for your package transactions</li>
              <li>Look for objects of type: <code className="bg-gray-100 px-1 rounded text-gray-800">Campaign</code></li>
              <li>Object IDs are 66 characters long and start with "0x"</li>
            </ul>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Recent Campaigns</h3>
            <p className="text-sm text-gray-500">
              Campaign discovery features will be added in future updates. For now, you can find campaigns by their object ID.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../networkConfig";
import { 
  CampaignData, 
  fetchAllCampaigns, 
  searchCampaigns,
  filterCampaignsByStatus,
  sortCampaigns,
  formatSuiAmount, 
  formatDate, 
  getCampaignProgress,
  getCampaignStateLabel,
  isCampaignActive
} from "../lib/blockchain";
import { CAMPAIGN_STATE } from "../constants";
import ClipLoader from "react-spinners/ClipLoader";

export function CampaignList({ onSelectCampaign }: { onSelectCampaign: (id: string) => void }) {
  const [campaignId, setCampaignId] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<CampaignData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'succeeded' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'goal' | 'progress' | 'deadline'>('newest');

  const suiClient = useSuiClient();
  const packageId = useNetworkVariable("crowdfundingPackageId");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidSuiObjectId(campaignId)) {
      onSelectCampaign(campaignId);
    }
  };

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const allCampaigns = await fetchAllCampaigns(suiClient, packageId);
      setCampaigns(allCampaigns);
      setFilteredCampaigns(allCampaigns);
    } catch (error) {
      console.error("Error loading campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [packageId]);

  useEffect(() => {
    let filtered = searchCampaigns(campaigns, searchTerm);
    filtered = filterCampaignsByStatus(filtered, statusFilter);
    filtered = sortCampaigns(filtered, sortBy);
    setFilteredCampaigns(filtered);
  }, [campaigns, searchTerm, statusFilter, sortBy]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Find by ID Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Find Campaign by ID</CardTitle>
          <CardDescription className="text-gray-600">
            Enter a specific campaign ID to view and interact with it directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-4">
            <Input
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              placeholder="0x1234567890abcdef..."
              className="font-mono text-sm border-gray-300 flex-1"
            />
            <Button
              type="submit"
              disabled={!isValidSuiObjectId(campaignId)}
              className="text-white px-6"
              style={{ backgroundColor: '#963B6B' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7A2F56'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#963B6B'}
            >
              View Campaign
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Browse All Campaigns Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Browse All Campaigns</CardTitle>
          <CardDescription className="text-gray-600">
            Discover and invest in crowdfunding campaigns from the community.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border-gray-300"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="goal">Highest Goal</option>
              <option value="progress">Best Progress</option>
              <option value="deadline">Ending Soon</option>
            </select>
            <Button
              onClick={loadCampaigns}
              disabled={isLoading}
              className="text-white px-4"
              style={{ backgroundColor: '#963B6B' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7A2F56'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#963B6B'}
            >
              {isLoading ? <ClipLoader size={16} color="white" /> : "Refresh"}
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <ClipLoader size={32} color="#963B6B" />
              <span className="ml-2 text-gray-600">Loading campaigns...</span>
            </div>
          )}

          {/* Campaigns Grid */}
          {!isLoading && (
            <>
              {filteredCampaigns.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No campaigns found</p>
                  <p className="text-sm text-gray-400">
                    {campaigns.length === 0 
                      ? "Be the first to create a campaign!" 
                      : "Try adjusting your search or filter criteria."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCampaigns.map((campaign) => {
                    const progress = getCampaignProgress(campaign);
                    const isActive = isCampaignActive(campaign);
                    const stateInfo = getCampaignStateLabel(campaign.state);
                    
                    return (
                      <Card 
                        key={campaign.id} 
                        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-gray-200 hover:border-purple-300"
                        onClick={() => onSelectCampaign(campaign.id)}
                      >
                        <CardContent className="p-4">
                          {campaign.imageUrl && (
                            <div className="aspect-video w-full mb-3 overflow-hidden rounded-lg bg-gray-100">
                              <img 
                                src={campaign.imageUrl} 
                                alt={campaign.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
                                {campaign.title || "Untitled Campaign"}
                              </h3>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                isActive ? 'bg-green-100 text-green-800' :
                                campaign.state === 1 ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {stateInfo}
                              </span>
                            </div>
                            
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {campaign.description || "No description provided"}
                            </p>
                            
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Progress</span>
                                <span>{progress.toFixed(1)}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                            
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">
                                {formatSuiAmount(campaign.raised)} / {formatSuiAmount(campaign.goal)} SUI
                              </span>
                              <span className="text-gray-500">
                                {formatDate(campaign.deadline_ms)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
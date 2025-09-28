'use client'

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { DEVNET_CROWDFUNDING_PACKAGE_ID } from '../constants';
import ClipLoader from 'react-spinners/ClipLoader';

// Types
interface CampaignData {
  id: string;
  owner: string;
  goal: string;
  deadline_ms: string;
  raised: string;
  state: number;
  metadata: {
    title?: string;
    description?: string;
    imageUrl?: string;
  };
  slug?: string; // Add slug field
}

interface CampaignListProps {
  onSelectCampaign?: (campaignId: string) => void;
  showOnlyMyCampaigns?: boolean;
}

// Helper functions
const formatSui = (mist: string): string => {
  const suiAmount = parseInt(mist) / 1_000_000_000;
  return suiAmount.toFixed(2);
};

const parseMetadata = (cidBytes: number[]): any => {
  try {
    const cidString = String.fromCharCode(...cidBytes);
    return JSON.parse(cidString);
  } catch {
    return { title: "Campaign", description: "No description available" };
  }
};

// Archive management functions
const ARCHIVE_STORAGE_KEY = 'archivedCampaigns';
const INITIAL_ARCHIVE_KEY = 'initialArchiveComplete';

const getArchivedCampaigns = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  const archived = localStorage.getItem(ARCHIVE_STORAGE_KEY);
  return new Set(archived ? JSON.parse(archived) : []);
};

const archiveCampaign = (campaignId: string): void => {
  if (typeof window === 'undefined') return;
  const archived = getArchivedCampaigns();
  archived.add(campaignId);
  localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify([...archived]));
};

const unarchiveCampaign = (campaignId: string): void => {
  if (typeof window === 'undefined') return;
  const archived = getArchivedCampaigns();
  archived.delete(campaignId);
  localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify([...archived]));
};

const markInitialArchiveComplete = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INITIAL_ARCHIVE_KEY, 'true');
};

const isInitialArchiveComplete = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(INITIAL_ARCHIVE_KEY) === 'true';
};

// Create URL-friendly slug from title
const createSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50); // Limit length
};

const getCampaignStateLabel = (state: number): string => {
  switch (state) {
    case 0: return "Active";
    case 1: return "Succeeded";
    case 2: return "Failed";
    default: return "Unknown";
  }
};

const getCampaignStateColor = (state: number): string => {
  switch (state) {
    case 0: return "bg-green-100 text-green-800 border-green-200";
    case 1: return "bg-blue-100 text-blue-800 border-blue-200";
    case 2: return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export function CampaignList({ onSelectCampaign, showOnlyMyCampaigns }: CampaignListProps) {
  // State management
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<'all' | 'active' | 'succeeded' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'mostFunded' | 'endingSoon'>('newest');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [refreshKey, setRefreshKey] = useState(0);
  
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const packageId = DEVNET_CROWDFUNDING_PACKAGE_ID;

  // Create a map of slugs to campaign IDs for quick lookup
  const slugToCampaignId = useMemo(() => {
    const map = new Map<string, string>();
    campaigns.forEach(campaign => {
      if (campaign.slug) {
        map.set(campaign.slug, campaign.id);
      }
    });
    return map;
  }, [campaigns]);

  // Export campaigns data to parent component if needed
  useEffect(() => {
    // Store campaigns in localStorage for App.tsx to access
    if (campaigns.length > 0) {
      const campaignMap = campaigns.reduce((acc, campaign) => {
        if (campaign.slug) {
          acc[campaign.slug] = campaign.id;
        }
        // Also store by ID for direct access
        acc[campaign.id] = campaign.id;
        return acc;
      }, {} as Record<string, string>);
      
      localStorage.setItem('campaignMap', JSON.stringify(campaignMap));
    }
  }, [campaigns]);

  // Fetch campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching campaigns with package ID:', packageId);

        // Query events to find campaign IDs
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${packageId}::crowd::CampaignCreated`,
          },
          limit: 50,
          order: 'descending',
        });

        console.log('Found events:', events.data.length);

        const campaignPromises = events.data.map(async (event) => {
          if (event.parsedJson && typeof event.parsedJson === 'object') {
            const eventData = event.parsedJson as any;
            const campaignId = eventData.campaign;
            
            if (campaignId) {
              try {
                const object = await suiClient.getObject({
                  id: campaignId,
                  options: {
                    showContent: true,
                    showType: true,
                  },
                });

                if (object.data?.content?.dataType === "moveObject") {
                  const fields = (object.data.content as any).fields;
                  const metadata = fields.metadata_cid ? parseMetadata(fields.metadata_cid) : {};
                  
                  // Create slug from title
                  const slug = metadata.title ? createSlug(metadata.title) : undefined;
                  
                  return {
                    id: campaignId,
                    owner: fields.owner,
                    goal: fields.goal,
                    deadline_ms: fields.deadline_ms,
                    raised: fields.raised || "0",
                    state: fields.state,
                    metadata,
                    slug,
                  };
                }
              } catch (err) {
                console.error(`Failed to fetch campaign ${campaignId}:`, err);
              }
            }
          }
          return null;
        });

        const fetchedCampaigns = (await Promise.all(campaignPromises)).filter(Boolean) as CampaignData[];
        
        console.log('Total campaigns fetched:', fetchedCampaigns.length);
        
        setCampaigns(fetchedCampaigns);
        
        // Auto-archive existing campaigns on first load (only once)
        if (!isInitialArchiveComplete() && fetchedCampaigns.length > 0) {
          console.log('🗃️ Auto-archiving existing campaigns...');
          fetchedCampaigns.forEach(campaign => {
            archiveCampaign(campaign.id);
          });
          markInitialArchiveComplete();
          console.log(`✅ Archived ${fetchedCampaigns.length} existing campaigns`);
        }
      } catch (err) {
        console.error('Failed to fetch campaigns:', err);
        setError('Failed to load campaigns. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [suiClient, packageId]);

  // Filter and sort campaigns
  const processedCampaigns = useMemo(() => {
    let filtered = [...campaigns];
    const archivedCampaigns = getArchivedCampaigns();

    // Apply archive filter based on active tab
    if (activeTab === 'active') {
      filtered = filtered.filter(c => !archivedCampaigns.has(c.id));
    } else {
      filtered = filtered.filter(c => archivedCampaigns.has(c.id));
    }

    // Apply owner filter for "My Campaigns"
    if (showOnlyMyCampaigns && currentAccount?.address) {
      filtered = filtered.filter(c => c.owner === currentAccount.address);
    }

    // Apply state filter
    if (filterState !== 'all') {
      const stateMap = {
        active: 0,
        succeeded: 1,
        failed: 2,
      };
      filtered = filtered.filter(c => c.state === stateMap[filterState]);
    }

    // Apply search filter - now also searches by slug
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.metadata.title?.toLowerCase().includes(term) ||
        c.metadata.description?.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term) ||
        c.slug?.includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'mostFunded':
          return parseInt(b.raised) - parseInt(a.raised);
        case 'endingSoon':
          return parseInt(a.deadline_ms) - parseInt(b.deadline_ms);
        case 'newest':
        default:
          return parseInt(b.deadline_ms) - parseInt(a.deadline_ms);
      }
    });

    return filtered;
  }, [campaigns, filterState, searchTerm, sortBy, showOnlyMyCampaigns, currentAccount?.address, activeTab, refreshKey]);

  // Handler for viewing campaigns
  const handleViewCampaign = (campaignId: string) => {
    if (!campaignId) {
      console.error('No campaign ID provided');
      return;
    }

    console.log('Viewing campaign:', campaignId);
    
    // Call the callback if it exists
    if (onSelectCampaign) {
      console.log('Calling onSelectCampaign with ID:', campaignId);
      onSelectCampaign(campaignId);
    } else {
      // Fallback: directly manipulate the URL if no callback provided
      console.log('No onSelectCampaign callback, using direct navigation');
      if (typeof window !== 'undefined') {
        window.location.hash = campaignId;
        window.location.reload();
      }
    }
  };

  // Helper functions for display
  const formatDate = (timestampMs: string) => {
    const date = new Date(parseInt(timestampMs));
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Ended";
    if (diffDays === 0) return "Ends today";
    if (diffDays === 1) return "1 day left";
    return `${diffDays} days left`;
  };

  const getProgressPercentage = (raised: string, goal: string) => {
    const raisedNum = parseInt(raised);
    const goalNum = parseInt(goal);
    if (goalNum === 0) return 0;
    return Math.min((raisedNum / goalNum) * 100, 100);
  };

  // Component sections
  const renderFilters = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
        {(['all', 'active', 'succeeded', 'failed'] as const).map((state) => (
          <Button
            key={state}
            variant={filterState === state ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterState(state)}
            className={filterState === state ? 'bg-purple-600 text-white' : ''}
          >
            {state.charAt(0).toUpperCase() + state.slice(1)}
          </Button>
        ))}
      </div>
      
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
        {(['newest', 'mostFunded', 'endingSoon'] as const).map((sort) => (
          <Button
            key={sort}
            variant={sortBy === sort ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSortBy(sort)}
            className={sortBy === sort ? 'bg-purple-600 text-white' : ''}
          >
            {sort === 'newest' ? '🆕 Newest' : 
             sort === 'mostFunded' ? '💰 Most Funded' : 
             '⏰ Ending Soon'}
          </Button>
        ))}
      </div>
    </div>
  );

  const renderStats = () => {
    // Use processedCampaigns to calculate stats based on current view (active/archived)
    const visibleCampaigns = processedCampaigns;
    const totalRaised = visibleCampaigns.reduce((sum, c) => sum + parseInt(c.raised), 0);
    const activeCount = visibleCampaigns.filter(c => c.state === 0).length;
    const succeededCount = visibleCampaigns.filter(c => c.state === 1).length;
    const successRate = visibleCampaigns.length > 0 
      ? ((succeededCount / visibleCampaigns.length) * 100).toFixed(0)
      : 0;

    // Dynamic labels based on current tab
    const tabLabel = activeTab === 'active' ? 'Active View' : 'Archived View';

    return (
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-700">
                {formatSui(totalRaised.toString())} SUI
              </div>
              <div className="text-sm text-purple-600">Total Raised ({tabLabel})</div>
              <div className="text-xs text-purple-500 mt-1">
                {visibleCampaigns.length} campaign{visibleCampaigns.length !== 1 ? 's' : ''}
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-700">{activeCount}</div>
              <div className="text-sm text-blue-600">Active Campaigns ({tabLabel})</div>
              <div className="text-xs text-blue-500 mt-1">
                {visibleCampaigns.filter(c => c.state === 2).length} failed, {succeededCount} succeeded
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-700">{successRate}%</div>
              <div className="text-sm text-green-600">Success Rate ({tabLabel})</div>
              <div className="text-xs text-green-500 mt-1">
                {succeededCount} of {visibleCampaigns.length} campaigns
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tab Comparison Summary */}
        <Card className={`border-2 ${activeTab === 'active' ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${activeTab === 'active' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                <span className="font-medium">
                  Currently viewing: <strong>{activeTab === 'active' ? '📌 Active' : '🗄️ Archived'}</strong> campaigns
                </span>
              </div>
              <div className="text-xs text-gray-600">
                Total campaigns in system: {campaigns.length} | 
                Active: {campaigns.filter(c => !getArchivedCampaigns().has(c.id)).length} | 
                Archived: {campaigns.filter(c => getArchivedCampaigns().has(c.id)).length}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        Discover Campaigns
      </h2>
      
      {/* Stats Dashboard */}
      {!loading && processedCampaigns.length > 0 && renderStats()}
      
      {/* Search and Quick Access */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-3">
          <Input
            type="text"
            placeholder="🔍 Search campaigns by title, description, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border-purple-300 focus:border-purple-500"
          />
          <Button
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            🔄 Refresh
          </Button>
        </div>
        
        {/* Filters */}
        {renderFilters()}
        
        {/* Archive Tabs */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <Button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'active' 
                  ? 'bg-white text-purple-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📌 Active Campaigns ({campaigns.filter(c => !getArchivedCampaigns().has(c.id)).length})
            </Button>
            <Button
              onClick={() => setActiveTab('archived')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'archived' 
                  ? 'bg-white text-purple-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🗄️ Archived ({campaigns.filter(c => getArchivedCampaigns().has(c.id)).length})
            </Button>
          </div>
          
          {/* Archive Management Buttons */}
          {activeTab === 'archived' && (
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  if (window.confirm('Restore all archived campaigns to active view?')) {
                    const archived = getArchivedCampaigns();
                    archived.forEach(id => unarchiveCampaign(id));
                    setRefreshKey(prev => prev + 1);
                    console.log('📌 Restored all archived campaigns');
                  }
                }}
                className="text-sm px-3 py-1 bg-green-500 hover:bg-green-600 text-white"
              >
                📌 Restore All
              </Button>
              <Button
                onClick={() => {
                  if (window.confirm('Permanently clear archive list? (Campaigns will return to active view)')) {
                    localStorage.removeItem(ARCHIVE_STORAGE_KEY);
                    setRefreshKey(prev => prev + 1);
                    setActiveTab('active');
                    console.log('🧹 Cleared archive');
                  }
                }}
                className="text-sm px-3 py-1 bg-red-500 hover:bg-red-600 text-white"
              >
                🧹 Clear Archive
              </Button>
            </div>
          )}
        </div>

      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <ClipLoader size={40} color="#9333ea" />
          <p className="text-gray-600 mt-4">Loading campaigns...</p>
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

      {/* Results Summary */}
      {!loading && !error && (
        <div className="mb-4 text-sm text-gray-600">
          Found <span className="font-semibold text-purple-600">{processedCampaigns.length}</span> campaign{processedCampaigns.length !== 1 ? 's' : ''}
          {searchTerm && ` matching "${searchTerm}"`}
          {filterState !== 'all' && ` (${filterState})`}
        </div>
      )}

      {/* Campaigns Grid */}
      {!loading && !error && (
        <>
          {processedCampaigns.length === 0 ? (
            <Card className="border-gray-200 shadow-lg">
              <CardContent className="py-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-600 mb-4 text-lg">
                  {searchTerm 
                    ? `No campaigns match "${searchTerm}"` 
                    : filterState !== 'all'
                    ? `No ${filterState} campaigns found`
                    : 'No campaigns found'}
                </p>
                {searchTerm && (
                  <Button 
                    onClick={() => setSearchTerm('')}
                    variant="outline"
                    className="border-purple-300 text-purple-600 hover:bg-purple-50"
                  >
                    Clear Search
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {processedCampaigns.map((campaign) => {
                const progress = getProgressPercentage(campaign.raised, campaign.goal);
                const isExpired = parseInt(campaign.deadline_ms) < Date.now();
                
                return (
                  <Card 
                    key={campaign.id} 
                    className="border-purple-200 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:scale-105 overflow-hidden"
                    onClick={() => handleViewCampaign(campaign.id)}
                  >
                    {/* Optional: Add image if exists */}
                    {campaign.metadata.imageUrl && (
                      <div className="h-48 w-full bg-gradient-to-r from-purple-100 to-pink-100 relative overflow-hidden">
                        <img 
                          src={campaign.metadata.imageUrl} 
                          alt={campaign.metadata.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="text-purple-700 text-lg truncate flex-1">
                          {campaign.metadata.title || `Campaign ${campaign.id.slice(0, 8)}...`}
                        </CardTitle>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCampaignStateColor(campaign.state)}`}>
                          {getCampaignStateLabel(campaign.state)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                          {isExpired ? '⏰ ' : '📅 '}{formatDate(campaign.deadline_ms)}
                        </span>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {campaign.metadata.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {campaign.metadata.description}
                          </p>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Raised</span>
                            <span className="font-bold text-purple-600">
                              {formatSui(campaign.raised)} / {formatSui(campaign.goal)} SUI
                            </span>
                          </div>
                          
                          <Progress 
                            value={progress} 
                            className="h-2"
                          />
                          
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                              {progress.toFixed(1)}% funded
                            </span>
                            {progress >= 100 && (
                              <span className="text-xs font-semibold text-green-600">
                                🎉 Goal Reached!
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t space-y-2">
                          {campaign.slug && (
                            <div className="text-xs text-gray-500 mb-1">
                              <span className="font-medium">Name:</span> {campaign.slug}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 truncate">
                            <span className="font-medium">ID:</span> {campaign.id}
                          </div>
                          
                          {/* Archive Button */}
                          <div className="flex justify-end">
                            {activeTab === 'active' ? (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveCampaign(campaign.id);
                                  setRefreshKey(prev => prev + 1);
                                  console.log(`📦 Archived campaign: ${campaign.metadata.title}`);
                                }}
                                className="text-xs px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white"
                              >
                                🗄️ Archive
                              </Button>
                            ) : (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unarchiveCampaign(campaign.id);
                                  setRefreshKey(prev => prev + 1);
                                  console.log(`📌 Restored campaign: ${campaign.metadata.title}`);
                                }}
                                className="text-xs px-2 py-1 bg-green-500 hover:bg-green-600 text-white"
                              >
                                📌 Restore
                              </Button>
                            )}
                          </div>
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

      {/* Empty State for New Users */}
      {!loading && !error && campaigns.length === 0 && !searchTerm && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Be the First!</h3>
          <p className="text-gray-600 mb-6">No campaigns have been created yet. Start the revolution!</p>
        </div>
      )}
      
      {/* Empty Archive State */}
      {!loading && !error && processedCampaigns.length === 0 && activeTab === 'archived' && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📂</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Archive is Empty</h3>
          <p className="text-gray-600 mb-6">No campaigns have been archived yet. Archive campaigns from the Active tab to organize your view!</p>
        </div>
      )}
      
      {/* Empty Active State (after archiving) */}
      {!loading && !error && processedCampaigns.length === 0 && activeTab === 'active' && campaigns.length > 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Clean Slate!</h3>
          <p className="text-gray-600 mb-6">All campaigns have been archived. New campaigns you create will appear here!</p>
          <Button
            onClick={() => setActiveTab('archived')}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            🗄️ View Archived Campaigns
          </Button>
        </div>
      )}
    </div>
  );
}
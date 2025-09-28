import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useSuiClient } from "@mysten/dapp-kit";
import ClipLoader from "react-spinners/ClipLoader";
import { Alert, AlertDescription } from "./ui/alert";

interface TransactionEvent {
  id: string;
  type: 'CampaignCreated' | 'Donated' | 'Withdrawn' | 'Refunded' | 'Finalized';
  timestamp: number;
  data: any;
  txDigest: string;
}

interface MoneyFlowVerificationProps {
  campaignId: string;
  campaignOwner: string;
}

const DEVNET_CROWDFUNDING_PACKAGE_ID = "0xb1b127b4ec9bba67a818e96fb597c465ebb8779f6836c1767f47349d5dc55132";

export function MoneyFlowVerification({ campaignId, campaignOwner }: MoneyFlowVerificationProps) {
  const [events, setEvents] = useState<TransactionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalDonated, setTotalDonated] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [totalRefunded, setTotalRefunded] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const suiClient = useSuiClient();

  // Format SUI amount
  const formatSuiAmount = (mist: number): string => {
    const sui = mist / 1_000_000_000;
    return sui.toFixed(4);
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const loadTransactionHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const eventTypes = [
        'CampaignCreated',
        'Donated', 
        'Withdrawn',
        'Refunded',
        'Finalized'
      ];

      const allEvents: TransactionEvent[] = [];
      let donated = 0;
      let withdrawn = 0;
      let refunded = 0;

      for (const eventType of eventTypes) {
        try {
          const result = await suiClient.queryEvents({
            query: {
              MoveEventType: `${DEVNET_CROWDFUNDING_PACKAGE_ID}::crowd::${eventType}`,
            },
            limit: 50,
            order: 'ascending',
          });

          for (const event of result.data) {
            if (event.parsedJson && typeof event.parsedJson === 'object') {
              const eventData = event.parsedJson as any;
              
              // Only include events for this campaign
              if (eventData.campaign === campaignId) {
                allEvents.push({
                  id: event.id.eventSeq,
                  type: eventType as any,
                  timestamp: parseInt(event.timestampMs || '0'),
                  data: eventData,
                  txDigest: event.id.txDigest,
                });

                // Calculate totals
                if (eventType === 'Donated') {
                  donated += parseInt(eventData.amount || '0');
                } else if (eventType === 'Withdrawn') {
                  withdrawn += parseInt(eventData.amount || '0');
                } else if (eventType === 'Refunded') {
                  refunded += parseInt(eventData.amount || '0');
                }
              }
            }
          }
        } catch (err) {
          console.log(`No ${eventType} events found or error:`, err);
        }
      }

      // Sort by timestamp
      allEvents.sort((a, b) => a.timestamp - b.timestamp);
      
      setEvents(allEvents);
      setTotalDonated(donated);
      setTotalWithdrawn(withdrawn);
      setTotalRefunded(refunded);
    } catch (err) {
      console.error("Error loading transaction history:", err);
      setError("Failed to load transaction history. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      loadTransactionHistory();
    }
  }, [campaignId]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'CampaignCreated': return '🎯';
      case 'Donated': return '💝';
      case 'Withdrawn': return '💰';
      case 'Refunded': return '↩️';
      case 'Finalized': return '🏁';
      default: return '📋';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'CampaignCreated': return 'text-blue-600 bg-blue-50';
      case 'Donated': return 'text-green-600 bg-green-50';
      case 'Withdrawn': return 'text-purple-600 bg-purple-50';
      case 'Refunded': return 'text-orange-600 bg-orange-50';
      case 'Finalized': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatEventDescription = (event: TransactionEvent) => {
    const { type, data } = event;
    
    switch (type) {
      case 'CampaignCreated':
        return `Campaign created with goal of ${formatSuiAmount(data.goal)} SUI`;
      case 'Donated':
        return `${formatSuiAmount(data.amount)} SUI donated`;
      case 'Withdrawn':
        return `${formatSuiAmount(data.amount)} SUI withdrawn to owner`;
      case 'Refunded':
        return `${formatSuiAmount(data.amount)} SUI refunded`;
      case 'Finalized':
        return `Campaign finalized - ${data.state === 1 ? '✅ Succeeded' : '❌ Failed'}`;
      default:
        return `${type} event`;
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  const explorerUrl = `https://testnet.suivision.xyz/object/${campaignId}`;
  const currentBalance = totalDonated - totalWithdrawn - totalRefunded;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          🔍 Money Flow Verification
        </CardTitle>
        <CardDescription className="text-gray-600">
          Track all donations and verify where funds go
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error State */}
        {error && (
          <Alert className="border-red-200">
            <AlertDescription className="text-red-600">
              ⚠️ {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 font-medium">Total Donated</p>
            <p className="text-2xl font-bold text-green-800">{formatSuiAmount(totalDonated)} SUI</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-600 font-medium">Withdrawn</p>
            <p className="text-2xl font-bold text-purple-800">{formatSuiAmount(totalWithdrawn)} SUI</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-600 font-medium">Refunded</p>
            <p className="text-2xl font-bold text-orange-800">{formatSuiAmount(totalRefunded)} SUI</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 font-medium">Current Balance</p>
            <p className="text-2xl font-bold text-blue-800">{formatSuiAmount(currentBalance)} SUI</p>
          </div>
        </div>

        {/* Owner Verification */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Campaign Owner Verification</h3>
          <p className="text-sm text-yellow-700 mb-2">
            <span className="font-medium">Owner Address:</span>
          </p>
          <code className="block bg-yellow-100 px-3 py-2 rounded text-xs text-yellow-900 break-all">
            {campaignOwner}
          </code>
          <p className="text-xs text-yellow-600 mt-2">
            ✅ Only this address can withdraw funds when campaign succeeds
            <br />
            ✅ All transactions are permanently recorded on blockchain
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            🔗 View on Sui Vision
          </a>
          <Button
            onClick={loadTransactionHistory}
            disabled={isLoading}
            className="text-white"
            style={{ backgroundColor: '#963B6B' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7A2F56'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#963B6B'}
          >
            {isLoading ? (
              <>
                <ClipLoader size={16} color="white" className="mr-2" />
                Loading...
              </>
            ) : (
              '🔄 Refresh History'
            )}
          </Button>
        </div>

        {/* Transaction History */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">📋 Transaction History</h3>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <ClipLoader size={32} color="#963B6B" />
              <span className="ml-3 text-gray-600">Loading transaction history...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
              <p>No transactions found for this campaign yet.</p>
              <p className="text-sm mt-1">Transactions will appear here once donations are made.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {events.map((event, index) => (
                <div 
                  key={`${event.id}-${index}`} 
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${getEventColor(event.type)}`}>
                    <span className="text-lg">{getEventIcon(event.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatEventDescription(event)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(event.timestamp)}
                    </p>
                    <a
                      href={`https://testnet.suivision.xyz/txblock/${event.txDigest}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      View Transaction ↗
                    </a>
                  </div>
                  <div className="text-xs text-gray-400">
                    #{index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Notes */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">🔒 Security Guarantees</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>✅ Smart contract enforces only campaign owner can withdraw</li>
            <li>✅ All transactions are immutably recorded on blockchain</li>
            <li>✅ Funds are held in escrow until campaign completes</li>
            <li>✅ Failed campaigns automatically enable refunds for donors</li>
            <li>✅ No intermediary can access or redirect funds</li>
          </ul>
        </div>

        {/* Balance Verification */}
        {events.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">💳 Balance Verification</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <div className="flex justify-between">
                <span>Total Incoming:</span>
                <span className="font-mono font-bold">+{formatSuiAmount(totalDonated)} SUI</span>
              </div>
              <div className="flex justify-between">
                <span>Total Outgoing:</span>
                <span className="font-mono font-bold">-{formatSuiAmount(totalWithdrawn + totalRefunded)} SUI</span>
              </div>
              <div className="border-t border-blue-300 pt-1 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Current Balance:</span>
                  <span className="font-mono">{formatSuiAmount(currentBalance)} SUI</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../networkConfig";
import { formatSuiAmount, formatDate } from "../lib/blockchain";
import ClipLoader from "react-spinners/ClipLoader";

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

export function MoneyFlowVerification({ campaignId, campaignOwner }: MoneyFlowVerificationProps) {
  const [events, setEvents] = useState<TransactionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalDonated, setTotalDonated] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [totalRefunded, setTotalRefunded] = useState(0);

  const suiClient = useSuiClient();
  const packageId = useNetworkVariable("crowdfundingPackageId");

  const loadTransactionHistory = async () => {
    setIsLoading(true);
    try {
      // Query all events for this campaign
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
              MoveEventType: `${packageId}::crowd::${eventType}`,
            },
            limit: 100,
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
        } catch (error) {
          console.log(`No ${eventType} events found or error:`, error);
        }
      }

      // Sort by timestamp
      allEvents.sort((a, b) => a.timestamp - b.timestamp);
      
      setEvents(allEvents);
      setTotalDonated(donated);
      setTotalWithdrawn(withdrawn);
      setTotalRefunded(refunded);
    } catch (error) {
      console.error("Error loading transaction history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId && packageId) {
      loadTransactionHistory();
    }
  }, [campaignId, packageId]);

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
        return `Campaign created by ${data.owner} with goal of ${formatSuiAmount(data.goal)} SUI`;
      case 'Donated':
        return `${formatSuiAmount(data.amount)} SUI donated by ${data.donor}`;
      case 'Withdrawn':
        return `${formatSuiAmount(data.amount)} SUI withdrawn to ${data.to}`;
      case 'Refunded':
        return `${formatSuiAmount(data.amount)} SUI refunded to ${data.to}`;
      case 'Finalized':
        return `Campaign finalized with state: ${data.state === 1 ? 'Succeeded' : 'Failed'}`;
      default:
        return `${type} event`;
    }
  };

  const explorerUrl = `https://suiexplorer.com/object/${campaignId}?network=testnet`;
  const currentBalance = totalDonated - totalWithdrawn - totalRefunded;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          🔍 Money Flow Verification
        </CardTitle>
        <CardDescription className="text-gray-600">
          Track where donations go and verify the campaign owner receives funds properly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Total Donated</p>
            <p className="text-2xl font-bold text-green-800">{formatSuiAmount(totalDonated)} SUI</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Withdrawn</p>
            <p className="text-2xl font-bold text-purple-800">{formatSuiAmount(totalWithdrawn)} SUI</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-orange-600 font-medium">Refunded</p>
            <p className="text-2xl font-bold text-orange-800">{formatSuiAmount(totalRefunded)} SUI</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Current Balance</p>
            <p className="text-2xl font-bold text-blue-800">{formatSuiAmount(currentBalance)} SUI</p>
          </div>
        </div>

        {/* Owner Verification */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Verify Campaign Owner</h3>
          <p className="text-sm text-yellow-700 mb-2">
            <span className="font-medium">Campaign Owner:</span> 
            <code className="bg-yellow-100 px-2 py-1 rounded text-xs ml-2">{campaignOwner}</code>
          </p>
          <p className="text-xs text-yellow-600">
            ✅ Only this address can withdraw funds when the campaign succeeds.
            <br />
            ✅ All withdrawal transactions are publicly recorded on the blockchain.
          </p>
        </div>

        {/* External Verification Links */}
        <div className="flex flex-wrap gap-2">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            🔗 View on Sui Explorer
          </a>
          <Button
            onClick={loadTransactionHistory}
            disabled={isLoading}
            className="text-white"
            style={{ backgroundColor: '#963B6B' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7A2F56'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#963B6B'}
          >
            {isLoading ? <ClipLoader size={16} color="white" /> : '🔄 Refresh History'}
          </Button>
        </div>

        {/* Transaction History */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">📋 Transaction History</h3>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <ClipLoader size={32} color="#963B6B" />
              <span className="ml-2 text-gray-600">Loading transaction history...</span>
            </div>
          ) : events.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions found for this campaign.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event, index) => (
                <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  <div className={`p-2 rounded-full ${getEventColor(event.type)}`}>
                    <span className="text-sm">{getEventIcon(event.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatEventDescription(event)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(event.timestamp)} • 
                      <a
                        href={`https://suiexplorer.com/txblock/${event.txDigest}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-blue-600 hover:underline"
                      >
                        View Transaction
                      </a>
                    </p>
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
            <li>✅ All transactions are recorded on blockchain (immutable)</li>
            <li>✅ Withdrawal events show exact recipient address</li>
            <li>✅ Failed campaigns automatically enable refunds</li>
            <li>✅ No one can access funds except through smart contract rules</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
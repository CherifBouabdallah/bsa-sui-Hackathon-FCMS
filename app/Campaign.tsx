// app/Campaign.tsx - Updated with MoneyFlowVerification enabled and Delete Campaign functionality

import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import type { SuiObjectData } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useNetworkVariable } from "./networkConfig";
import { MoneyFlowVerification } from "./components/MoneyFlowVerification";
import { checkIfFundsWithdrawn } from "./lib/blockchain";
import { useState, useEffect } from "react";
import ClipLoader from "react-spinners/ClipLoader";

interface CampaignFields {
  id: { id: string };
  owner: string;
  goal: string;
  deadline_ms: string;
  raised: string;
  state: number;
  metadata_cid: number[];
}

function getCampaignFields(data: SuiObjectData): CampaignFields | null {
  if (data.content?.dataType !== "moveObject") {
    return null;
  }

  return data.content.fields as unknown as CampaignFields;
}

function formatSui(mist: string): string {
  const suiAmount = parseInt(mist) / 1_000_000_000;
  return suiAmount.toFixed(2);
}

function getStateLabel(state: number): { label: string; color: string } {
  switch (state) {
    case 0:
      return { label: "Active", color: "text-green-600" };
    case 1:
      return { label: "Succeeded", color: "text-blue-600" };
    case 2:
      return { label: "Failed", color: "text-red-600" };
    default:
      return { label: "Unknown", color: "text-gray-600" };
  }
}

function parseMetadata(cidBytes: number[]): any {
  try {
    const cidString = String.fromCharCode(...cidBytes);
    return JSON.parse(cidString);
  } catch {
    return { title: "Campaign", description: "No description available" };
  }
}

export function Campaign({ id }: { id: string }) {
  const currentAccount = useCurrentAccount();
  const crowdfundingPackageId = useNetworkVariable("crowdfundingPackageId");
  const suiClient = useSuiClient();
  const [donationAmount, setDonationAmount] = useState("");
  const [waitingForTxn, setWaitingForTxn] = useState("");
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [fundsWithdrawn, setFundsWithdrawn] = useState<boolean>(false);
  const [checkingWithdrawal, setCheckingWithdrawal] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Set current time on client side only to prevent hydration errors
  useEffect(() => {
    setCurrentTime(Date.now());
  }, []);

  const { data, isPending, error, refetch } = useSuiClientQuery("getObject", {
    id,
    options: {
      showContent: true,
      showOwner: true,
    },
  });

  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  // Check if funds have been withdrawn when component loads or data changes
  useEffect(() => {
    const checkWithdrawalStatus = async () => {
      if (data?.data) {
        const campaignFields = getCampaignFields(data.data);
        if (campaignFields && campaignFields.state === 1) {
          setCheckingWithdrawal(true);
          try {
            const withdrawn = await checkIfFundsWithdrawn(suiClient, id);
            setFundsWithdrawn(withdrawn);
          } catch (error) {
            console.error("Error checking withdrawal status:", error);
          } finally {
            setCheckingWithdrawal(false);
          }
        }
      }
    };

    checkWithdrawalStatus();
  }, [data?.data, suiClient, id]);

  // Update countdown timer every second
  useEffect(() => {
    if (!data?.data) return;
    
    const fields = getCampaignFields(data.data);
    if (!fields?.deadline_ms) return;

    const updateTimer = () => {
      const now = Date.now();
      const deadline = parseInt(fields.deadline_ms);
      const difference = deadline - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${seconds}s`);
        }
      } else {
        setTimeLeft("Expired - Ready to finalize!");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [data?.data]);

  const executeMove = (
    action: string,
    transaction: () => Transaction,
    onSuccess?: () => void
  ) => {
    setWaitingForTxn(action);

    try {
      const tx = transaction();
      
      // Validate transaction has operations
      if (!tx || !tx.blockData || tx.blockData.transactions.length === 0) {
        console.error('Empty transaction block detected');
        setWaitingForTxn("");
        return;
      }

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async ({ digest }) => {
          await suiClient.waitForTransaction({ digest });
          await refetch();
          setWaitingForTxn("");
          if (onSuccess) onSuccess();
        },
        onError: (error) => {
          console.error(`❌ Transaction failed for action "${action}":`, error);
          
          // Decode Move abort errors
          if (error?.message?.includes('MoveAbort')) {
            const errorMsg = error.message;
            if (errorMsg.includes('}, 3)')) {
              console.error('🚫 Error: Campaign deadline has not been reached yet');
            } else if (errorMsg.includes('}, 6)')) {
              console.error('🚫 Error: Campaign deadline has passed (cannot donate anymore)');
            } else if (errorMsg.includes('}, 5)')) {
              console.error('🚫 Error: Campaign already finalized');
            } else if (errorMsg.includes('}, 7)')) {
              console.error('🚫 Error: Campaign has not succeeded (cannot withdraw)');
            } else if (errorMsg.includes('}, 8)')) {
              console.error('🚫 Error: You are not the campaign owner');
            } else if (errorMsg.includes('}, 10)')) {
              console.error('🚫 Error: Cannot delete campaign - donations have been made');
            }
          }
          
          // Special handling for force_succeeded function not found - try regular finalize
          if (action === "force_end" && (error?.message?.includes('function') || error?.message?.includes('EntryFunctionNotFound'))) {
            console.error('❌ The force_succeeded function is not available in the deployed contract.');
            console.log('� Trying regular finalize function instead...');
            
            // Fallback to regular finalize
            executeMove("finalize_fallback", () => {
              const tx = new Transaction();
              tx.moveCall({
                arguments: [
                  tx.object(id),
                  tx.object("0x6"), // Clock object
                ],
                target: `${crowdfundingPackageId}::crowd::finalize`,
              });
              return tx;
            });
          }
          
          setWaitingForTxn("");
        },
      }
    );
    } catch (error) {
      console.error('Transaction execution error:', error);
      setWaitingForTxn("");
    }
  };

  const donate = () => {
    if (!donationAmount || parseFloat(donationAmount) <= 0) return;
    
    const amountInMist = Math.floor(parseFloat(donationAmount) * 1_000_000_000);
    
    executeMove("donate", () => {
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInMist)]);
      
      tx.moveCall({
        arguments: [
          tx.object(id),
          coin,
          tx.object("0x6"), // Clock object
        ],
        target: `${crowdfundingPackageId}::crowd::donate`,
      });
      
      return tx;
    }, () => setDonationAmount(""));
  };

  const finalizeCampaign = () => {
    executeMove("finalize", () => {
      const tx = new Transaction();
      tx.moveCall({
        arguments: [
          tx.object(id),
          tx.object("0x6"), // Clock object
        ],
        target: `${crowdfundingPackageId}::crowd::finalize`,
      });
      return tx;
    });
  };

  const withdrawFunds = () => {
    console.log("🚀 Starting withdrawal process...");
    console.log("Campaign ID:", id);
    console.log("Campaign Owner:", campaignFields?.owner);
    console.log("Current Account:", currentAccount?.address);
    console.log("Is Owner:", isOwner);
    console.log("Campaign State:", campaignFields?.state);
    console.log("Campaign State Label:", getStateLabel(campaignFields?.state || 0));
    console.log("Raised Amount:", campaignFields?.raised);
    console.log("Raised in SUI:", formatSui(campaignFields?.raised || "0"));
    console.log("Package ID:", crowdfundingPackageId);
    
    // Pre-flight checks
    if (!campaignFields) {
      console.error("❌ No campaign data available");
      return;
    }
    
    if (campaignFields.state !== 1) {
      console.error(`❌ Campaign state is ${campaignFields.state}, but needs to be 1 (SUCCEEDED) for withdrawal`);
      return;
    }
    
    if (!isOwner) {
      console.error("❌ You are not the owner of this campaign");
      return;
    }
    
    if (fundsWithdrawn) {
      console.error("❌ Funds have already been withdrawn");
      return;
    }
    
    executeMove("withdraw", () => {
      const tx = new Transaction();
      tx.moveCall({
        arguments: [tx.object(id)],
        target: `${crowdfundingPackageId}::crowd::withdraw`,
      });
      console.log("💰 Withdraw transaction created:", tx);
      return tx;
    }, async () => {
      // On successful withdrawal, check the blockchain state
      console.log("✅ Withdrawal transaction successful!");
      try {
        const withdrawn = await checkIfFundsWithdrawn(suiClient, id);
        setFundsWithdrawn(withdrawn);
        console.log("💳 Withdrawal status updated:", withdrawn);
        
        // Show success message
        alert(`🎉 Withdrawal successful!\n\n${formatSui(campaignFields?.raised || "0")} SUI has been transferred to your wallet.`);
      } catch (error) {
        console.error("Error checking withdrawal status after transaction:", error);
        // Fallback: assume withdrawal was successful
        setFundsWithdrawn(true);
        alert(`✅ Withdrawal completed!\n\nFunds should be in your wallet now.`);
      }
    });
  };

  const forceEndCampaign = () => {
    console.log("🚀 Attempting to force campaign to end...");
    console.log("Campaign ID:", id);
    console.log("Campaign Owner:", campaignFields?.owner);
    console.log("Current Account:", currentAccount?.address);
    console.log("Campaign raised:", raisedSui, "SUI, Goal:", goalSui, "SUI");
    console.log("Campaign deadline:", deadline.toLocaleString());
    console.log("Is expired:", isExpired);
    
    // Try force_succeeded first, with fallback to regular finalize
    executeMove("force_end", () => {
      const tx = new Transaction();
      try {
        // Try the new force_succeeded function
        tx.moveCall({
          arguments: [tx.object(id)],
          target: `${crowdfundingPackageId}::crowd::force_succeeded`,
        });
        console.log("💰 Using force_succeeded function");
      } catch (error) {
        console.log("⚠️ force_succeeded not available, using regular finalize");
        // Fallback to regular finalize
        tx.moveCall({
          arguments: [
            tx.object(id),
            tx.object("0x6"), // Clock object
          ],
          target: `${crowdfundingPackageId}::crowd::finalize`,
        });
      }
      return tx;
    }, () => {
      console.log("✅ Campaign finalization successful!");
      console.log("🎯 Campaign should now be in succeeded state - you can withdraw funds!");
      
      // Refresh the component to update the UI
      setTimeout(() => {
        refetch();
      }, 2000);
    });
  };

  const runDiagnostics = async () => {
    console.log("🔍 === CAMPAIGN WITHDRAWAL DIAGNOSTICS ===");
    console.log("Campaign ID:", id);
    console.log("Package ID:", crowdfundingPackageId);
    console.log("Campaign Owner:", campaignFields?.owner);
    console.log("Current Account:", currentAccount?.address);
    console.log("Is Owner:", isOwner);
    console.log("Campaign State:", campaignFields?.state, "- Should be 1 for withdrawal");
    console.log("Campaign Raised:", campaignFields?.raised, "mist");
    console.log("Campaign Raised (SUI):", formatSui(campaignFields?.raised || "0"));
    console.log("Campaign Goal:", campaignFields?.goal, "mist");
    console.log("Campaign Goal (SUI):", formatSui(campaignFields?.goal || "0"));
    console.log("Funds Withdrawn:", fundsWithdrawn);
    console.log("Withdrawal Check Status:", checkingWithdrawal);
    console.log("Current Time:", new Date().toISOString());
    console.log("Campaign Deadline:", deadline.toISOString());
    console.log("Is Expired:", isExpired);
    
    // Test contract connection
    console.log("🧪 Testing contract connection...");
    try {
      console.log("Target for withdraw:", `${crowdfundingPackageId}::crowd::withdraw`);
      console.log("Target for force_succeeded:", `${crowdfundingPackageId}::crowd::force_succeeded`);
      
      // Try to fetch campaign data directly from blockchain
      console.log("🔗 Fetching fresh campaign data from blockchain...");
      const freshData = await suiClient.getObject({ 
        id, 
        options: { showContent: true, showOwner: true }
      });
      console.log("Fresh blockchain data:", freshData);
      
      if (freshData.data && freshData.data.content) {
        const fields = (freshData.data.content as any).fields;
        console.log("Fresh campaign fields:", fields);
        console.log("Fresh state:", fields?.state, "(0=Active, 1=Succeeded, 2=Failed)");
        console.log("Fresh raised:", fields?.raised);
        console.log("Fresh withdrawn flag:", fields?.withdrawn);
      }
    } catch (error) {
      console.error("Blockchain query error:", error);
    }
    
    // Check wallet connection
    console.log("💰 Wallet diagnostics:");
    console.log("Current account address:", currentAccount?.address);
    console.log("Wallet connected:", !!currentAccount);
    
    console.log("===========================================");
  };

  const deleteCampaign = () => {
    const confirmDelete = window.confirm(
      `⚠️ Are you sure you want to delete this campaign?\n\n` +
      `"${metadata?.title || 'Untitled Campaign'}"\n\n` +
      `This action will cancel the campaign and cannot be undone. ` +
      `Only campaigns with no donations can be deleted.`
    );
    
    if (!confirmDelete) return;

    console.log("🗑️ Attempting to delete/cancel campaign...");
    console.log("Campaign ID:", id);
    console.log("Campaign raised:", raisedSui, "SUI");
    
    executeMove("delete_campaign", () => {
      const tx = new Transaction();
      tx.moveCall({
        arguments: [tx.object(id)],
        target: `${crowdfundingPackageId}::crowd::cancel_campaign`,
      });
      console.log("🗑️ Cancel campaign transaction created");
      return tx;
    });
  };

  if (isPending) return <div className="p-4">Loading campaign...</div>;

  if (error) {
    return (
      <Alert>
        <AlertDescription>
          Failed to fetch campaign: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data.data) return <div className="p-4">Campaign not found</div>;

  const campaignFields = getCampaignFields(data.data);
  if (!campaignFields) return <div className="p-4">Invalid campaign data</div>;

  const metadata = parseMetadata(campaignFields.metadata_cid);
  const isOwner = currentAccount?.address === campaignFields.owner;
  const goalSui = formatSui(campaignFields.goal);
  const raisedSui = formatSui(campaignFields.raised);
  const progressPercentage = (parseInt(campaignFields.raised) / parseInt(campaignFields.goal)) * 100;
  const deadline = new Date(parseInt(campaignFields.deadline_ms));
  const isExpired = currentTime ? currentTime > deadline.getTime() : false;
  const state = getStateLabel(campaignFields.state);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-gray-900 text-xl">{metadata.title}</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                {metadata.description}
              </CardDescription>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${state.color} bg-gray-100`}>
              {state.label}
            </div>
          </div>
        </CardHeader>
      
        <CardContent className="space-y-6">
          {metadata.imageUrl && (
            <img 
              src={metadata.imageUrl} 
              alt={metadata.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          )}

          {/* Progress Section */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Raised: {raisedSui} SUI</span>
              <span>Goal: {goalSui} SUI</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ backgroundColor: '#963B6B', width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {progressPercentage.toFixed(1)}% funded
            </p>
          </div>

          {/* Campaign Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Deadline</p>
              <p className="font-medium">{deadline.toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Owner</p>
              <p className="font-medium font-mono text-xs">
                {campaignFields.owner.slice(0, 8)}...{campaignFields.owner.slice(-8)}
              </p>
            </div>
          </div>

          {/* Actions */}
          {campaignFields.state === 0 && !isExpired && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  placeholder="Amount in SUI"
                  className="flex-1 border-gray-300"
                />
                <Button
                  onClick={donate}
                  disabled={waitingForTxn !== "" || !donationAmount || parseFloat(donationAmount) <= 0}
                  className="text-white min-w-[100px]"
                  style={{ backgroundColor: '#963B6B' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7A2F56'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#963B6B'}
                >
                  {waitingForTxn === "donate" ? (
                    <ClipLoader size={16} color="white" />
                  ) : (
                    "Donate"
                  )}
                </Button>
              </div>

              {/* Testing buttons for campaign owner */}
              {isOwner && (
                <div className="border-t pt-3 mt-4">
                  <p className="text-sm text-gray-600 mb-2">👨‍💼 Owner Controls:</p>
                  <div className="flex flex-col gap-2">
                    
                    {/* Delete Campaign Button - only if no donations */}
                    {campaignFields.state === 0 && parseFloat(raisedSui) === 0 && (
                      <div className="bg-red-50 border border-red-200 rounded p-2">
                        <div className="flex gap-2 items-center">
                          <Button
                            onClick={deleteCampaign}
                            disabled={waitingForTxn !== ""}
                            className="text-white px-3 text-sm"
                            style={{ backgroundColor: '#EF4444' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF4444'}
                          >
                            {waitingForTxn === "delete_campaign" ? (
                              <ClipLoader size={14} color="white" />
                            ) : (
                              "🗑️ Delete Campaign"
                            )}
                          </Button>
                          <span className="text-xs text-red-600">
                            Cancel campaign permanently (only when no donations)
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-600 border-t pt-2">🧪 Testing Controls:</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={forceEndCampaign}
                        disabled={waitingForTxn !== ""}
                        className="text-white px-4 text-sm"
                        style={{ backgroundColor: '#DC2626' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B91C1C'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
                      >
                        {waitingForTxn === "force_end" ? (
                          <ClipLoader size={14} color="white" />
                        ) : (
                          "� End Campaign Now & Enable Withdrawal"
                        )}
                      </Button>
                      <span className="text-xs text-gray-500 self-center">
                        Forces campaign to succeed immediately for withdrawal testing
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={runDiagnostics}
                        className="text-white px-3 text-sm"
                        style={{ backgroundColor: '#6366F1' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4F46E5'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366F1'}
                      >
                        🔍 Run Diagnostics
                      </Button>
                      <span className="text-xs text-gray-500 self-center">
                        Check console logs to debug withdrawal issues
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                      <strong>🚀 Quick Withdrawal Testing:</strong><br/>
                      1. Donate any amount of SUI (doesn't need to meet goal)<br/>
                      2. Click "� End Campaign Now & Enable Withdrawal"<br/>
                      3. Use "💰 Withdraw Funds" button to transfer SUI to your wallet<br/>
                      <br/>
                      <strong>🗑️ Delete Campaign:</strong> Only available when no donations have been made.<br/>
                      <strong>🎯 End Now:</strong> Forces campaign to succeed immediately for testing withdrawals.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Campaign Finalization (when expired and still active) */}
          {campaignFields.state === 0 && isExpired && (
            <Button
              onClick={finalizeCampaign}
              disabled={waitingForTxn !== ""}
              className="w-full text-white"
              style={{ backgroundColor: '#963B6B' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7A2F56'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#963B6B'}
            >
              {waitingForTxn === "finalize" ? (
                <ClipLoader size={16} color="white" />
              ) : (
                "Finalize Campaign"
              )}
            </Button>
          )}

          {/* Withdrawal (for successful campaigns by owner) */}
          {campaignFields.state === 1 && isOwner && (
            <div className={`border rounded-lg p-4 space-y-3 ${
              fundsWithdrawn 
                ? 'bg-gray-50 border-gray-300' 
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="text-center">
                {checkingWithdrawal ? (
                  <>
                    <div className="flex items-center justify-center space-x-2">
                      <ClipLoader size={16} color="#6B7280" />
                      <span className="text-gray-600">Checking withdrawal status...</span>
                    </div>
                  </>
                ) : fundsWithdrawn ? (
                  <>
                    <h3 className="text-lg font-semibold text-gray-800">✅ Funds Already Withdrawn!</h3>
                    <p className="text-sm text-gray-700">
                      You have successfully withdrawn <span className="font-bold">{raisedSui} SUI</span> from this campaign.
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Treasury is now empty. Multiple withdrawals are prevented by the smart contract.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-green-800">🎉 Campaign Succeeded!</h3>
                    <p className="text-sm text-green-700">
                      You can now withdraw the funds raised: <span className="font-bold">{raisedSui} SUI</span>
                    </p>
                  </>
                )}
              </div>
              {!checkingWithdrawal && !fundsWithdrawn && (
                <Button
                  onClick={withdrawFunds}
                  disabled={waitingForTxn !== ""}
                  className="w-full text-white text-lg py-3"
                  style={{ backgroundColor: '#059669' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#047857'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                >
                  {waitingForTxn === "withdraw" ? (
                    <ClipLoader size={16} color="white" />
                  ) : (
                    "💰 Withdraw Funds to Your Wallet"
                  )}
                </Button>
              )}
              {!checkingWithdrawal && fundsWithdrawn && (
                <Button
                  disabled={true}
                  className="w-full text-gray-500 bg-gray-300 cursor-not-allowed text-lg py-3"
                >
                  💳 Funds Already Withdrawn
                </Button>
              )}
              {checkingWithdrawal && (
                <Button
                  disabled={true}
                  className="w-full text-gray-500 bg-gray-200 cursor-not-allowed text-lg py-3"
                >
                  <ClipLoader size={16} color="#6B7280" className="mr-2" />
                  Checking Status...
                </Button>
              )}
              <p className="text-xs text-green-600 text-center">
                Funds will be transferred directly to your wallet address: 
                <br />
                <code className="bg-green-100 px-2 py-1 rounded text-xs">
                  {campaignFields.owner.slice(0, 20)}...{campaignFields.owner.slice(-10)}
                </code>
              </p>
            </div>
          )}

          {/* Status Messages for Non-Owners */}
          {campaignFields.state === 1 && !isOwner && (
            <Alert>
              <AlertDescription className="text-green-700">
                🎉 Campaign succeeded! Goal reached. The campaign owner can now withdraw the funds.
                You can track the withdrawal in the Money Flow Verification section below.
              </AlertDescription>
            </Alert>
          )}

          {campaignFields.state === 2 && (
            <Alert>
              <AlertDescription className="text-red-700">
                ❌ Campaign failed to reach its goal. If you donated, you can request refunds using your donation receipts.
                Visit the "Donation Receipts" page to process your refund.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Money Flow Verification Section - Now Enabled! */}
      <MoneyFlowVerification 
        campaignId={id}
        campaignOwner={campaignFields.owner}
      />
    </div>
  );
}
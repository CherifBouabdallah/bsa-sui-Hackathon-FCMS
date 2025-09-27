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
// import { MoneyFlowVerification } from "./components/MoneyFlowVerification";
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

  const executeMove = (
    action: string,
    transaction: () => Transaction,
    onSuccess?: () => void
  ) => {
    setWaitingForTxn(action);

    signAndExecute(
      {
        transaction: transaction(),
      },
      {
        onSuccess: async ({ digest }) => {
          await suiClient.waitForTransaction({ digest });
          await refetch();
          setWaitingForTxn("");
          if (onSuccess) onSuccess();
        },
        onError: () => {
          setWaitingForTxn("");
        },
      }
    );
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
    executeMove("withdraw", () => {
      const tx = new Transaction();
      tx.moveCall({
        arguments: [tx.object(id)],
        target: `${crowdfundingPackageId}::crowd::withdraw`,
      });
      return tx;
    }, async () => {
      // On successful withdrawal, check the blockchain state
      try {
        const withdrawn = await checkIfFundsWithdrawn(suiClient, id);
        setFundsWithdrawn(withdrawn);
      } catch (error) {
        console.error("Error checking withdrawal status after transaction:", error);
        // Fallback: assume withdrawal was successful
        setFundsWithdrawn(true);
      }
    });
  };

  const forceFinalizeCampaign = () => {
    executeMove("force_finalize", () => {
      const tx = new Transaction();
      tx.moveCall({
        arguments: [tx.object(id)],
        target: `${crowdfundingPackageId}::crowd::force_succeeded`,
      });
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
                <p className="text-sm text-gray-600 mb-2">🧪 Testing Controls (Owner Only):</p>
                <div className="flex gap-2">
                  <Button
                    onClick={forceFinalizeCampaign}
                    disabled={waitingForTxn !== ""}
                    className="text-white px-4 text-sm"
                    style={{ backgroundColor: '#F59E0B' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F59E0B'}
                  >
                    {waitingForTxn === "force_finalize" ? (
                      <ClipLoader size={14} color="white" />
                    ) : (
                      "🏁 Finish Campaign Now"
                    )}
                  </Button>
                  <span className="text-xs text-gray-500 self-center">
                    Forces campaign to succeed for testing withdrawals
                  </span>
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

    {/* Money Flow Verification Section */}
    {/* <MoneyFlowVerification 
      campaignId={id}
      campaignOwner={campaignFields.owner}
    /> */}
    <div className="text-center text-gray-500 p-8">
      Money Flow Verification temporarily disabled for debugging
    </div>
  </div>
  );
}
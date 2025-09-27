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
          <Button
            onClick={withdrawFunds}
            disabled={waitingForTxn !== ""}
            className="w-full text-white"
            style={{ backgroundColor: '#963B6B' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7A2F56'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#963B6B'}
          >
            {waitingForTxn === "withdraw" ? (
              <ClipLoader size={16} color="white" />
            ) : (
              "Withdraw Funds"
            )}
          </Button>
        )}

        {/* Status Messages */}
        {campaignFields.state === 1 && (
          <Alert>
            <AlertDescription className="text-green-700">
              🎉 Campaign succeeded! Goal reached.
            </AlertDescription>
          </Alert>
        )}

        {campaignFields.state === 2 && (
          <Alert>
            <AlertDescription className="text-red-700">
              Campaign failed to reach its goal. Donors can request refunds using their donation receipts.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
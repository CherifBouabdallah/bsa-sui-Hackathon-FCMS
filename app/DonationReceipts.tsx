import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNetworkVariable } from "./networkConfig";
import { useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";

interface DonationReceiptData {
  id: { id: string };
  campaign: string;
  donor: string;
  amount: string;
  ts_ms: string;
}

function formatSui(mist: string): string {
  const suiAmount = parseInt(mist) / 1_000_000_000;
  return suiAmount.toFixed(4);
}

export function DonationReceipts() {
  const currentAccount = useCurrentAccount();
  const crowdfundingPackageId = useNetworkVariable("crowdfundingPackageId");
  const suiClient = useSuiClient();
  const [processingRefund, setProcessingRefund] = useState<string>("");

  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  // Query for user's donation receipts
  const { data: ownedObjects, isPending, refetch } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: currentAccount?.address as string,
      filter: {
        StructType: `${crowdfundingPackageId}::crowd::DonationReceipt`,
      },
      options: {
        showContent: true,
        showType: true,
      },
    },
    {
      enabled: !!currentAccount?.address && !!crowdfundingPackageId,
    }
  );

  const requestRefund = (receiptId: string, campaignId: string) => {
    setProcessingRefund(receiptId);

    const tx = new Transaction();
    tx.moveCall({
      arguments: [
        tx.object(campaignId),
        tx.object(receiptId),
      ],
      target: `${crowdfundingPackageId}::crowd::refund`,
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async ({ digest }) => {
          await suiClient.waitForTransaction({ digest });
          await refetch();
          setProcessingRefund("");
        },
        onError: (error) => {
          console.error("Refund failed:", error);
          setProcessingRefund("");
        },
      }
    );
  };

  if (!currentAccount) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-gray-600">Please connect your wallet to view donation receipts.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <ClipLoader size={24} />
            <p className="mt-2 text-gray-600">Loading donation receipts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const receipts = ownedObjects?.data || [];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Your Donation Receipts</CardTitle>
          <CardDescription className="text-gray-600">
            View your donation history and request refunds for failed campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No donation receipts found.</p>
              <p className="text-sm text-gray-500 mt-1">
                Donation receipts are created when you donate to campaigns.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt) => {
                if (!receipt.data?.content || receipt.data.content.dataType !== "moveObject") {
                  return null;
                }

                const receiptData = receipt.data.content.fields as unknown as DonationReceiptData;
                const donationDate = new Date(parseInt(receiptData.ts_ms));

                return (
                  <Card key={receipt.data.objectId} className="border-l-4 border-blue-500">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900">Donation Amount</h4>
                          <p className="text-lg font-semibold text-blue-600">
                            {formatSui(receiptData.amount)} SUI
                          </p>
                          <p className="text-xs text-gray-500">
                            {donationDate.toLocaleDateString()} at {donationDate.toLocaleTimeString()}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900">Campaign ID</h4>
                          <p className="font-mono text-xs text-gray-600 break-all">
                            {receiptData.campaign}
                          </p>
                        </div>

                        <div className="flex items-center justify-end">
                          <Button
                            onClick={() => requestRefund(receipt.data!.objectId!, receiptData.campaign)}
                            disabled={processingRefund === receipt.data!.objectId}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            {processingRefund === receipt.data!.objectId ? (
                              <ClipLoader size={14} color="#dc2626" />
                            ) : (
                              "Request Refund"
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Alert className="mt-6">
            <AlertDescription>
              <strong>Note:</strong> Refunds are only available for campaigns that have failed to reach their goal 
              and have been finalized. The refund amount will be transferred back to your wallet, and the donation 
              receipt will be destroyed in the process.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
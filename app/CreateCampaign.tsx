import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "./networkConfig";
import { createCampaignTransaction } from "./lib/blockchain";
import ClipLoader from "react-spinners/ClipLoader";

export function CreateCampaign({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const crowdfundingPackageId = useNetworkVariable("crowdfundingPackageId");
  const suiClient = useSuiClient();
  const {
    mutate: signAndExecute,
    isSuccess,
    isPending,
  } = useSignAndExecuteTransaction();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    goal: "",
    deadline: "",
    imageUrl: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [minDateTime, setMinDateTime] = useState("");

  // Set minimum datetime on client side only to prevent hydration errors
  useEffect(() => {
    setMinDateTime(new Date().toISOString().slice(0, 16));
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!formData.goal || parseFloat(formData.goal) <= 0) {
      newErrors.goal = "Goal must be a positive number";
    }
    if (!formData.deadline) {
      newErrors.deadline = "Deadline is required";
    } else {
      const deadlineDate = new Date(formData.deadline);
      if (deadlineDate <= new Date()) {
        newErrors.deadline = "Deadline must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  function createCampaign() {
    if (!validateForm()) {
      return;
    }

    try {
      const goalSui = parseFloat(formData.goal);
      const deadlineMs = new Date(formData.deadline).getTime();
      
      const tx = createCampaignTransaction(
        crowdfundingPackageId,
        goalSui,
        deadlineMs,
        formData.title,
        formData.description,
        formData.imageUrl || undefined
      );

      // Validate transaction before signing
      if (!tx || Object.keys(tx).length === 0) {
        console.error('Invalid transaction: Transaction is empty or malformed');
        return;
      }

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async ({ digest }) => {
            const { objectChanges } = await suiClient.waitForTransaction({
              digest: digest,
              options: {
                showObjectChanges: true,
              },
            });

            if (objectChanges) {
              const createdCampaign = objectChanges.find(
                (change) => change.type === "created"
              );
              if (createdCampaign && "objectId" in createdCampaign) {
                onCreated(createdCampaign.objectId);
              }
            }
          },
          onError: (error) => {
            console.error("Failed to create campaign:", error);
          },
        }
      );
    } catch (error) {
      console.error('Error creating campaign transaction:', error);
    }
  }

  function createQuickTestCampaign() {
    try {
      // Create a campaign with an already expired deadline for immediate testing
      const goalSui = 0.01; // Very small goal for easy testing  
      const deadlineMs = Date.now() - (60 * 1000); // 1 minute ago (already expired)
      
      const tx = createCampaignTransaction(
        crowdfundingPackageId,
        goalSui,
        deadlineMs,
        "Test Campaign (Expired - Ready to Finalize)",
        "Test campaign that's already expired and ready for immediate finalization and withdrawal testing",
        undefined
      );

      // Validate transaction before signing
      if (!tx || Object.keys(tx).length === 0) {
        console.error('Invalid transaction: Transaction is empty or malformed');
        return;
      }

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async ({ digest }) => {
            console.log('🚀 Test campaign created! Campaign is already expired - you can finalize it immediately!');
            const { objectChanges } = await suiClient.waitForTransaction({
              digest: digest,
              options: {
                showObjectChanges: true,
              },
            });

            if (objectChanges) {
              const createdCampaign = objectChanges.find(
                (change) => change.type === "created"
              );
              if (createdCampaign && "objectId" in createdCampaign) {
                onCreated(createdCampaign.objectId);
              }
            }
          },
          onError: (error) => {
            console.error("Failed to create test campaign:", error);
          },
        }
      );
    } catch (error) {
      console.error('Error creating test campaign transaction:', error);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-gray-900">Create New Campaign</CardTitle>
        <CardDescription className="text-gray-600">
          Launch a crowdfunding campaign and start raising funds for your project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Title *
          </label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Enter campaign title"
            className={errors.title ? "border-red-500" : "border-gray-300"}
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Describe your campaign and what you're raising funds for"
            rows={4}
            className={`flex min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.description ? "border-red-500" : "border-gray-300"}`}
            style={{ '--tw-ring-color': '#963B6B' } as React.CSSProperties}
          />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
        </div>

        <div>
          <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-1">
            Funding Goal (SUI) *
          </label>
          <Input
            id="goal"
            type="number"
            step="0.1"
            min="0"
            value={formData.goal}
            onChange={(e) => handleInputChange("goal", e.target.value)}
            placeholder="Enter funding goal in SUI"
            className={errors.goal ? "border-red-500" : "border-gray-300"}
          />
          {errors.goal && <p className="text-red-500 text-sm mt-1">{errors.goal}</p>}
        </div>

        <div>
          <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Deadline *
          </label>
          <Input
            id="deadline"
            type="datetime-local"
            value={formData.deadline}
            onChange={(e) => handleInputChange("deadline", e.target.value)}
            min={minDateTime}
            className={errors.deadline ? "border-red-500" : "border-gray-300"}
          />
          {errors.deadline && <p className="text-red-500 text-sm mt-1">{errors.deadline}</p>}
        </div>

        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Image URL (Optional)
          </label>
          <Input
            id="imageUrl"
            type="url"
            value={formData.imageUrl}
            onChange={(e) => handleInputChange("imageUrl", e.target.value)}
            placeholder="Enter image URL for your campaign"
            className="border-gray-300"
          />
        </div>

        <div className="space-y-3">
          <Button
            size="lg"
            onClick={createCampaign}
            disabled={isSuccess || isPending}
            className="w-full text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
            style={{ backgroundColor: '#963B6B' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7A2F56'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#963B6B'}
            onMouseDown={(e) => e.currentTarget.style.backgroundColor = '#6B2344'}
          >
            {isSuccess || isPending ? (
              <ClipLoader size={20} color="white" />
            ) : (
              "Create Campaign"
            )}
          </Button>
          
          {/* Testing helper */}
          <div className="border-t pt-3">
            <p className="text-sm text-gray-600 mb-2">🧪 Quick Testing:</p>
            <Button
              size="sm"
              onClick={createQuickTestCampaign}
              disabled={isSuccess || isPending}
              className="w-full text-white text-sm"
              style={{ backgroundColor: '#F59E0B' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F59E0B'}
            >
              🚀 Create Test Campaign (Short Deadline)
            </Button>
            <p className="text-xs text-gray-500 mt-1">
              Creates an already-expired campaign ready for immediate finalization & withdrawal testing
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
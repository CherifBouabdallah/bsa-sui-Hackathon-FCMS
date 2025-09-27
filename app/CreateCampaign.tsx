import { useState, useEffect } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "./networkConfig";
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

    const goalInSui = parseFloat(formData.goal) * 1_000_000_000; // Convert SUI to MIST (1 SUI = 10^9 MIST)
    const deadlineMs = new Date(formData.deadline).getTime();
    
    // Create metadata object for IPFS
    const metadata = {
      title: formData.title,
      description: formData.description,
      imageUrl: formData.imageUrl,
    };
    
    // For now, we'll use a simple string as CID placeholder
    // In production, you would upload to IPFS and get the actual CID
    const metadataCid = JSON.stringify(metadata);
    const cidBytes = Array.from(new TextEncoder().encode(metadataCid));

    const tx = new Transaction();
    tx.moveCall({
      arguments: [
        tx.pure.u64(goalInSui),
        tx.pure.u64(deadlineMs),
        tx.pure.vector("u8", cidBytes),
      ],
      target: `${crowdfundingPackageId}::crowd::create_campaign`,
    });

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
      </CardContent>
    </Card>
  );
}
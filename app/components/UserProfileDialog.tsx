"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface UserProfileDialogProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onUpdateName: (name: string) => void;
}

export function UserProfileDialog({ isOpen, currentName, onClose, onUpdateName }: UserProfileDialogProps) {
  const [name, setName] = useState(currentName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) return;
    
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    onUpdateName(trimmedName);
    setIsSubmitting(false);
    onClose();
  };

  const handleClose = () => {
    setName(currentName); // Reset to current name
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full mx-auto shadow-2xl border-2 border-purple-200 bg-white/95">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
            👤 Update Your Name
          </CardTitle>
          <p className="text-gray-600">
            Change how we address you in the app
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter your name (minimum 2 characters)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-purple-300 focus:border-purple-500"
                maxLength={50}
                autoFocus
                disabled={isSubmitting}
              />
              {name.trim().length > 0 && name.trim().length < 2 && (
                <p className="text-sm text-red-500 mt-1">Name must be at least 2 characters long</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || name.trim().length < 2 || isSubmitting || name.trim() === currentName}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Updating...
                  </>
                ) : (
                  "Update Name"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
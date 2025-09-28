"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface NameDialogProps {
  isOpen: boolean;
  onSubmit: (name: string) => void;
}

export function NameDialog({ isOpen, onSubmit }: NameDialogProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) return;
    
    setIsSubmitting(true);
    // Small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    onSubmit(trimmedName);
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full mx-auto shadow-2xl border-2 border-purple-200 bg-white/95">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
            👋 Welcome to CrownFunding!
          </CardTitle>
          <p className="text-gray-600">
            Let's personalize your experience. What should we call you?
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
            <Button
              type="submit"
              disabled={!name.trim() || name.trim().length < 2 || isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Setting up...
                </>
              ) : (
                "Let's Get Started! 🚀"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
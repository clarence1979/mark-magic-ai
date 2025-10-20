import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Key, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cache } from '@/services/apiKeyCache';
import { supabase } from '@/lib/supabase';

interface APIKeySetupProps {
  onSetup: (apiKey: string) => void;
  apiKey?: string;
}

export const APIKeySetup = ({ onSetup, apiKey }: APIKeySetupProps) => {
  const [inputApiKey, setInputApiKey] = useState(apiKey || cache.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  // Auto-populate from cache on mount and sync with other fields
  useEffect(() => {
    const cachedKey = cache.apiKey;
    if (cachedKey && cachedKey !== inputApiKey) {
      setInputApiKey(cachedKey);
    }
    // Sync all input fields periodically
    const syncInterval = setInterval(() => {
      cache.syncInputFields();
    }, 1000);
    return () => clearInterval(syncInterval);
  }, [inputApiKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputApiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter your OpenAI API key",
        variant: "destructive",
      });
      return;
    }

    if (!inputApiKey.startsWith('sk-')) {
      toast({
        title: "Invalid API Key",
        description: "OpenAI API keys should start with 'sk-'",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);

    try {
      console.log('Starting API key validation...');

      const result = await supabase.functions.invoke('validate-openai-key', {
        body: { apiKey: inputApiKey },
      });

      console.log('Full result object:', result);
      console.log('Result data:', result.data);
      console.log('Result error:', result.error);

      if (result.error) {
        console.error('Supabase function error:', result.error);
        toast({
          title: "Validation Error",
          description: result.error.message || "Failed to validate API key. Please try again.",
          variant: "destructive",
        });
        setIsValidating(false);
        return;
      }

      const responseData = result.data;
      console.log('Response data type:', typeof responseData);
      console.log('Response data:', responseData);

      if (!responseData) {
        toast({
          title: "Validation Error",
          description: "No response from validation service.",
          variant: "destructive",
        });
        setIsValidating(false);
        return;
      }

      if (!responseData.valid) {
        toast({
          title: "Invalid API Key",
          description: responseData.error || "The API key could not be validated. Please check your key and try again.",
          variant: "destructive",
        });
        setIsValidating(false);
        return;
      }

      cache.apiKey = inputApiKey;
      onSetup(inputApiKey);

      toast({
        title: "Success",
        description: "API key validated and configured successfully!",
      });
    } catch (error) {
      console.error('Validation exception:', error);
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Failed to validate API key. Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <div className="relative">
            <Input
              id="apiKey"
              type={showKey ? "text" : "password"}
              value={inputApiKey}
              onChange={(e) => setInputApiKey(e.target.value)}
              placeholder="sk-..."
              className="pr-10"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={isValidating}>
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            apiKey ? 'Update API Key' : 'Set API Key'
          )}
        </Button>
      </form>
      <div className="p-3 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          Your API key is stored locally and never shared. Get your API key from{' '}
          <a 
            href="https://platform.openai.com/api-keys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            OpenAI Dashboard
          </a>
        </p>
      </div>
    </div>
  );
};
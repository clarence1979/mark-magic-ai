import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { APIKeySetup } from '@/components/APIKeySetup';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  apiKey: string;
  onAPIKeySetup: (key: string) => void;
}

export const SettingsDialog = ({ apiKey, onAPIKeySetup }: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const hasValidKey = apiKey && apiKey.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "rounded-full transition-colors",
            hasValidKey
              ? "text-green-600 hover:text-green-700 hover:bg-green-100"
              : "text-red-600 hover:text-red-700 hover:bg-red-100"
          )}
          title={hasValidKey ? "Settings - API Key Configured" : "Settings - API Key Required"}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your API key and review important information for educators
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="text-lg font-semibold mb-3">OpenAI API Key</h3>
            <APIKeySetup
              apiKey={apiKey}
              onAPIKeySetup={(key) => {
                onAPIKeySetup(key);
                if (key) {
                  setOpen(false);
                }
              }}
            />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-3">Important Notice for Australian Schools</h3>
            <Alert className="border-warning/50 bg-warning/5">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <AlertDescription className="space-y-3 text-sm">
                <p className="font-semibold">
                  For Educators in Australian Schools
                </p>
                <p>
                  Before using this tool with student work, please ensure compliance with:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Privacy Act 1988</strong> - Obtain appropriate consent before processing student data</li>
                  <li><strong>Australian Privacy Principles (APPs)</strong> - Student data is sent to OpenAI's servers for processing</li>
                  <li><strong>School Privacy Policies</strong> - Check your school's data handling requirements</li>
                  <li><strong>Parental Consent</strong> - May be required for students under 18</li>
                </ul>
                <p className="font-semibold mt-3">
                  Data Storage Notice:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Single Processing Mode:</strong> Student work is processed in real-time and NOT stored in our database</li>
                  <li><strong>Batch Processing Mode:</strong> Student work IS temporarily stored in our Supabase database for batch processing and will be retained according to our data retention policy</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  Consult your school's privacy officer or IT administrator before use.
                </p>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

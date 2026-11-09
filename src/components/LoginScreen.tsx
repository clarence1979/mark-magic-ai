import { useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import * as eduai from '@/lib/eduai';

// Magic Marker marks handwriting with AI, so it needs a teachingtools.dev sign-in. It never
// asks for a password: people sign in at teachingtools.dev, and this screen moves on by itself
// when they come back to the tab (or straight away inside the teachingtools.dev desktop).
export const LoginScreen = () => {
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  const checkAgain = async () => {
    setChecking(true);
    await eduai.connect();
    setChecking(false);
    setChecked(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign in at teachingtools.dev</CardTitle>
          <CardDescription>
            Magic Marker uses AI to read and mark handwriting, so it needs your teachingtools.dev account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Open teachingtools.dev and sign in there.</li>
            <li>Come back to this tab. Magic Marker opens by itself.</li>
          </ol>
          <Button type="button" className="w-full" onClick={() => eduai.openSignIn()}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open teachingtools.dev
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={checkAgain} disabled={checking}>
            {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            I've signed in. Check again
          </Button>
          {checked && (
            <p className="text-xs rounded-md border border-amber-300 bg-amber-50 text-amber-800 p-2" role="status">
              No sign-in found yet. Make sure you signed in at teachingtools.dev in this same browser.
            </p>
          )}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-px" />
            Magic Marker never asks for your password, and no AI key is ever sent to this page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

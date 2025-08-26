import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield } from "lucide-react";

export function PrivacyPolicy() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Shield className="w-4 h-4 mr-2" />
          Privacy Policy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Privacy Policy</DialogTitle>
          <DialogDescription>
            How we protect your data and maintain your privacy
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-semibold text-base mb-3">Data Collection and Usage</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>API Keys:</strong> Your OpenAI API key is stored locally in your browser's localStorage. 
                  It is never transmitted to or stored on our servers.
                </p>
                <p>
                  <strong>Uploaded Files:</strong> Images and documents you upload are processed client-side and 
                  sent directly to OpenAI's API for text extraction and analysis. We do not store, cache, or 
                  retain any uploaded files.
                </p>
                <p>
                  <strong>Processing Results:</strong> OCR text, marking schemes, and assessment results are 
                  temporarily stored in your browser's memory during your session and are not persisted or 
                  transmitted to our servers.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Third-Party Services</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>OpenAI API:</strong> This application uses OpenAI's API to process your uploaded content. 
                  Data sent to OpenAI is subject to their privacy policy and terms of service. OpenAI has committed 
                  to not using API data for training their models.
                </p>
                <p>
                  <strong>No Analytics:</strong> We do not use any analytics, tracking, or monitoring services 
                  that would collect your personal information or usage patterns.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Data Security</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Encryption:</strong> All communication with OpenAI's API uses HTTPS encryption to 
                  protect your data in transit.
                </p>
                <p>
                  <strong>No Server Storage:</strong> Since we don't store any of your data on our servers, 
                  there's no risk of data breaches from our systems.
                </p>
                <p>
                  <strong>Local Control:</strong> You have complete control over your data. You can clear your 
                  API key and all local data by using your browser's clear data function.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Student Privacy</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Educational Content:</strong> We understand the sensitive nature of student work and 
                  assessments. No student information is stored or retained beyond your current session.
                </p>
                <p>
                  <strong>Compliance:</strong> This tool is designed to support educators while maintaining 
                  student privacy. Always ensure you have appropriate permissions before uploading student work.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Your Rights</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Data Deletion:</strong> Since no data is stored on our servers, simply clearing your 
                  browser data or removing your API key will delete all local information.
                </p>
                <p>
                  <strong>Access and Control:</strong> You have full access to and control over any data 
                  processed through this application.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Changes to This Policy</h3>
              <p className="text-muted-foreground">
                Any updates to this privacy policy will be clearly communicated through the application. 
                Continued use after changes indicates acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Contact Information</h3>
              <p className="text-muted-foreground">
                For questions about this privacy policy or data practices, please contact us through{' '}
                <a href="https://clarence.guru" className="text-primary hover:underline">clarence.guru</a>.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
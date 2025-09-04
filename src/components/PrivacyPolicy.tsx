import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield } from "lucide-react";

export function PrivacyPolicy() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="default" className="border-primary/20 bg-primary/5 hover:bg-primary/10">
          <Shield className="w-4 h-4 mr-2" />
          IT Security & Privacy Overview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">IT Security & Privacy Overview</DialogTitle>
          <DialogDescription>
            Comprehensive security assessment for school IT departments
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6 text-sm">
            
            <section className="bg-success/5 border border-success/20 rounded-lg p-4">
              <h3 className="font-semibold text-base mb-3 text-success">✓ Zero Server Data Storage Architecture</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Client-Side Processing:</strong> All data processing occurs in the user's browser. 
                  No student data, images, or assessment content is transmitted to or stored on our servers.
                </p>
                <p>
                  <strong>API Key Management:</strong> OpenAI API keys are stored exclusively in browser localStorage. 
                  Keys never leave the client device and are not accessible to our backend systems.
                </p>
                <p>
                  <strong>Session-Only Memory:</strong> OCR results and marking data exist only in browser memory 
                  during active sessions. Data is automatically cleared on page refresh or browser closure.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Data Flow & Architecture</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Direct API Communication:</strong> Student work is processed via direct HTTPS connection 
                  from user's browser to OpenAI's API endpoints (no intermediary servers).
                </p>
                <p>
                  <strong>Stateless Application:</strong> Our web application serves only static files. 
                  No database, user accounts, or server-side data processing occurs.
                </p>
                <p>
                  <strong>Network Traffic:</strong> Only HTTPS requests to OpenAI API. No data transmission 
                  to third-party analytics, tracking, or advertising services.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Educational Compliance Framework</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>FERPA Alignment:</strong> Zero server storage model eliminates traditional FERPA 
                  concerns related to educational record storage and access controls.
                </p>
                <p>
                  <strong>COPPA Considerations:</strong> No collection of personal information from users. 
                  Student data processing occurs entirely within OpenAI's compliant infrastructure.
                </p>
                <p>
                  <strong>District Data Governance:</strong> Tool operates within your existing OpenAI API 
                  agreement and data governance policies. No separate data processing agreement required.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">OpenAI Integration Security</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Enterprise-Grade Processing:</strong> Utilizes OpenAI's enterprise API infrastructure 
                  with SOC 2 Type 2 compliance and industry-standard encryption.
                </p>
                <p>
                  <strong>No Training Data Usage:</strong> OpenAI has committed that API data is not used 
                  for model training or improvement (per OpenAI API Terms of Service).
                </p>
                <p>
                  <strong>Data Retention:</strong> OpenAI processes and immediately discards data per their 
                  API data retention policy (typically 30 days maximum for safety monitoring).
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Technical Security Controls</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Transport Security:</strong> All communications use TLS 1.3 encryption. 
                  API keys are transmitted only via secure HTTPS headers.
                </p>
                <p>
                  <strong>Client-Side Validation:</strong> File type and size validation occurs in browser 
                  before any external API calls are made.
                </p>
                <p>
                  <strong>No Persistent Storage:</strong> Application includes no cookies, session storage, 
                  or persistent data storage beyond localStorage for API key convenience.
                </p>
                <p>
                  <strong>Content Security Policy:</strong> Strict CSP headers prevent XSS attacks and 
                  unauthorized data exfiltration.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Risk Assessment Summary</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Data Breach Risk:</strong> Minimal - No server-side data storage eliminates 
                  traditional database breach vectors.
                </p>
                <p>
                  <strong>Unauthorized Access:</strong> Low - Client-side processing limits exposure to 
                  individual user devices and OpenAI's secure infrastructure.
                </p>
                <p>
                  <strong>Data Loss:</strong> Controlled - All data processing is ephemeral and under 
                  direct user control.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">IT Administrator Controls</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Network Monitoring:</strong> All external API calls to api.openai.com are 
                  easily identifiable in network logs for monitoring and auditing.
                </p>
                <p>
                  <strong>Access Controls:</strong> Integrate with existing web filtering and access 
                  control policies. No special firewall rules required.
                </p>
                <p>
                  <strong>Usage Oversight:</strong> API usage and costs are managed through your district's 
                  OpenAI account dashboard with full administrative visibility.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Incident Response</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Data Containment:</strong> In case of security concerns, users can immediately 
                  clear all local data via browser settings or by removing API keys.
                </p>
                <p>
                  <strong>Audit Trail:</strong> All API interactions are logged in your OpenAI account's 
                  usage dashboard for forensic analysis if needed.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Implementation Recommendations</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Pilot Deployment:</strong> Begin with controlled pilot group using dedicated 
                  OpenAI API keys for usage monitoring and evaluation.
                </p>
                <p>
                  <strong>Staff Training:</strong> Ensure educators understand data handling best practices 
                  and obtain appropriate permissions before processing student work.
                </p>
                <p>
                  <strong>Regular Review:</strong> Monitor OpenAI API usage patterns and costs through 
                  your administrative dashboard.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Technical Support & Documentation</h3>
              <p className="text-muted-foreground">
                For technical questions or additional security documentation, contact us through{' '}
                <a href="https://clarence.guru" className="text-primary hover:underline">clarence.guru</a>.
                Additional security certifications and compliance documentation available upon request.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
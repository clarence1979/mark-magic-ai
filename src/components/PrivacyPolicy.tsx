import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Shield, FileText, AlertTriangle, Mail, Phone } from 'lucide-react';

export const PrivacyPolicy = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Shield className="w-4 h-4 mr-2" />
          Privacy Policy & Disclaimer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Privacy Policy & Legal Information
          </DialogTitle>
          <DialogDescription>
            Comprehensive privacy policy and disclaimer for Australian educational institutions
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="privacy" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Privacy Policy
            </TabsTrigger>
            <TabsTrigger value="disclaimer" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Disclaimer
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contact
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
            <TabsContent value="privacy" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary">Privacy Policy</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-AU')}
                </p>
                
                <div className="space-y-6">
                  <section>
                    <h4 className="font-medium mb-2">1. Introduction and Compliance</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      This Privacy Policy outlines how Magic Marking AI Tool ("the Service") collects, uses, and protects personal information in compliance with:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
                      <li>Privacy Act 1988 (Cth) and Australian Privacy Principles (APPs)</li>
                      <li>Notifiable Data Breaches (NDB) scheme</li>
                      <li>State and Territory privacy legislation</li>
                      <li>Australian Government Information Security Manual (ISM)</li>
                      <li>Educational sector privacy standards and guidelines</li>
                    </ul>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">2. Information We Collect</h4>
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-sm font-medium">Student Academic Data:</h5>
                        <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
                          <li>Handwritten assignments, worksheets, and examination papers</li>
                          <li>Student responses and answers (via OCR text extraction)</li>
                          <li>Academic performance data and marking results</li>
                          <li>Educational content and curriculum materials</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium">Technical Information:</h5>
                        <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
                          <li>API usage logs and system performance metrics</li>
                          <li>Browser type and device information (for optimization)</li>
                          <li>Processing timestamps and session data</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">3. How We Use Information</h4>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Provide AI-powered OCR text extraction from handwritten work</li>
                      <li>Generate automated marking schemes and feedback</li>
                      <li>Deliver educational assessment and analysis services</li>
                      <li>Improve service accuracy and functionality</li>
                      <li>Ensure system security and prevent misuse</li>
                      <li>Comply with legal and regulatory requirements</li>
                    </ul>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">4. Data Storage and Security</h4>
                    <div className="bg-warning/5 border border-warning/20 p-3 rounded-lg mb-3">
                      <h5 className="text-sm font-medium text-warning mb-1">Data Storage Policy</h5>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Single Assessment Mode:</strong> Student data is processed client-side and sent directly to OpenAI's API. No student information is stored on our servers.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Batch Processing Mode:</strong> When using batch processing features, student assessment data, extracted text, marking results, and related information ARE stored in our secure Supabase database to facilitate batch operations and result exports. This data is stored in Australia and protected under Australian privacy laws.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Security Measures:</h5>
                      <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
                        <li>TLS/SSL encryption for all data transmission</li>
                        <li>API keys stored locally in browser (localStorage only)</li>
                        <li>Supabase database with Row Level Security (RLS) policies</li>
                        <li>Encrypted data storage at rest and in transit</li>
                        <li>Australian-hosted database infrastructure (Supabase Sydney region)</li>
                        <li>Direct API integration with OpenAI (no intermediary storage for single assessments)</li>
                        <li>Regular security assessments and updates</li>
                        <li>Access controls and authentication mechanisms</li>
                      </ul>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">5. Third-Party Services</h4>
                    <div className="bg-warning/5 border border-warning/20 p-3 rounded-lg mb-3">
                      <h5 className="text-sm font-medium text-warning mb-1">OpenAI Integration - Important Notice</h5>
                      <p className="text-sm text-muted-foreground mb-2">
                        This service uses OpenAI's GPT-4 API for OCR and marking functionality. All student work and responses are sent to OpenAI for processing.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>OpenAI Data Usage:</strong> As of March 2023, OpenAI states that data submitted via their API is NOT used to train or improve their models unless explicitly opted in. However, schools MUST review OpenAI's current terms of service and privacy policy before use.
                      </p>
                    </div>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>OpenAI API for text extraction and marking analysis</li>
                      <li>Data processing occurs in real-time with immediate response</li>
                      <li>OpenAI retains API data for 30 days for abuse monitoring (per their policy)</li>
                      <li>Educational institutions MUST review OpenAI's privacy policy at: https://openai.com/policies/privacy-policy</li>
                      <li>Schools should ensure OpenAI API usage complies with their local privacy requirements</li>
                      <li>Supabase database hosting (Australian region) for batch processing data</li>
                    </ul>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">6. Student Rights and Parental Consent</h4>
                    <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-lg mb-3">
                      <h5 className="text-sm font-medium text-destructive mb-1">Australian Schools: Consent Requirements</h5>
                      <p className="text-sm text-muted-foreground">
                        Before using this tool, schools must obtain informed consent from parents/guardians for students under 18.
                        Consent forms should clearly explain that student work will be processed by AI (OpenAI) and stored in databases (for batch processing).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">For Students Under 18:</h5>
                      <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
                        <li>Written parental/guardian consent REQUIRED before use</li>
                        <li>Schools must obtain appropriate consent forms complying with state/territory requirements</li>
                        <li>Consent must clearly describe AI processing and data storage</li>
                        <li>Parents have the right to access and correct student information</li>
                        <li>Parents may request deletion of processed data at any time</li>
                        <li>Parents can withdraw consent and cease use of the service</li>
                      </ul>
                      <h5 className="text-sm font-medium mt-3">Student Rights Under Australian Privacy Principles:</h5>
                      <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
                        <li>Right to know how their information is being used and disclosed</li>
                        <li>Right to access their personal information held by the school</li>
                        <li>Right to request correction of inaccurate information</li>
                        <li>Right to complain about privacy breaches to the school or OAIC</li>
                        <li>Right to understand third-party data processing (OpenAI)</li>
                      </ul>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">7. Data Retention and Deletion</h4>
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-sm font-medium">Single Assessment Mode:</h5>
                        <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
                          <li>No server-side data retention - all processing is ephemeral</li>
                          <li>Local browser data cleared on session end</li>
                          <li>Immediate data purging after processing completion</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium">Batch Processing Mode:</h5>
                        <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
                          <li>Student assessment data stored in Supabase database</li>
                          <li>Data retained for school's operational needs and record-keeping</li>
                          <li>Schools responsible for requesting data deletion when no longer needed</li>
                          <li>Data can be exported and then deleted upon request</li>
                          <li>Automated backup and recovery systems in place</li>
                          <li>Retention periods should align with school's data governance policies</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium">Data Deletion Rights:</h5>
                        <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
                          <li>Schools can request deletion of batch processing data at any time</li>
                          <li>Complete removal from database and backups within 30 days of request</li>
                          <li>Downloaded/exported results remain school's responsibility</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">8. Privacy Breach Response</h4>
                    <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-lg mb-3">
                      <h5 className="text-sm font-medium text-destructive mb-1">Incident Response</h5>
                      <p className="text-sm text-muted-foreground">
                        In the event of a privacy breach, we will notify affected institutions within 72 hours and comply with NDB requirements.
                      </p>
                    </div>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Immediate containment and assessment procedures</li>
                      <li>Notification to affected schools and relevant authorities</li>
                      <li>Detailed incident reporting and remediation</li>
                      <li>Post-incident review and security improvements</li>
                    </ul>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">9. School IT Department Requirements</h4>
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Before Implementation:</h5>
                      <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
                        <li>Conduct privacy impact assessment (PIA)</li>
                        <li>Review and approve OpenAI's privacy policy</li>
                        <li>Establish staff training protocols</li>
                        <li>Implement usage monitoring procedures</li>
                        <li>Create incident response procedures</li>
                      </ul>
                      <h5 className="text-sm font-medium mt-3">Ongoing Compliance:</h5>
                      <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
                        <li>Regular privacy policy reviews</li>
                        <li>Staff awareness and training updates</li>
                        <li>Usage audit logs and reporting</li>
                        <li>Student and parent communication</li>
                      </ul>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">10. Policy Updates</h4>
                    <p className="text-sm text-muted-foreground">
                      This privacy policy may be updated periodically to reflect changes in legislation, technology, or service functionality. 
                      Schools will be notified of significant changes via email and updated policies will be available on this platform.
                    </p>
                  </section>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="disclaimer" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary">Disclaimer and Terms of Use</h3>
                
                <div className="space-y-6">
                  <section>
                    <h4 className="font-medium mb-2">1. Educational Purpose Only</h4>
                    <div className="bg-warning/5 border border-warning/20 p-3 rounded-lg mb-3">
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Important:</strong> This tool is designed for educational assistance and should not replace professional educator judgment or assessment practices.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Australian Schools:</strong> This tool is intended as a formative assessment aid. For NAPLAN, HSC, VCE, ATAR, or other high-stakes assessments,
                        schools must follow official marking procedures and guidelines from relevant educational authorities (ACARA, NESA, VCAA, etc.).
                      </p>
                    </div>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Results require review and validation by qualified educators</li>
                      <li>Not suitable for high-stakes or formal assessment purposes without human verification</li>
                      <li>Should be used as a supplementary marking aid only</li>
                      <li>Final grading decisions remain with educational professionals</li>
                      <li>Compliance with Australian Curriculum standards is the school's responsibility</li>
                      <li>Not endorsed or approved by ACARA, state/territory education departments</li>
                    </ul>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">2. Accuracy and Reliability</h4>
                    <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-lg mb-3">
                      <p className="text-sm text-muted-foreground">
                        <strong>No Warranty:</strong> We make no guarantees regarding the accuracy, completeness, or reliability of AI-generated results.
                      </p>
                    </div>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>OCR accuracy may vary depending on handwriting quality</li>
                      <li>AI marking may not capture all aspects of student understanding</li>
                      <li>Results may contain errors or misinterpretations</li>
                      <li>Mathematical and complex reasoning may be incorrectly assessed</li>
                      <li>Cultural and contextual nuances may be missed</li>
                    </ul>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">3. Professional Supervision Required</h4>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Qualified educators must review all AI-generated assessments</li>
                      <li>Professional judgment required for final marking decisions</li>
                      <li>Tool users should have appropriate training and qualifications</li>
                      <li>Not suitable for unsupervised or automated grading systems</li>
                      <li>Schools must establish clear usage guidelines and protocols</li>
                    </ul>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">4. Technical Limitations</h4>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Dependent on internet connectivity and third-party services</li>
                      <li>Processing may fail due to technical issues or API limitations</li>
                      <li>File size and format restrictions may apply</li>
                      <li>Performance varies with image quality and handwriting clarity</li>
                      <li>Not optimized for all languages or mathematical notations</li>
                    </ul>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">5. Limitation of Liability</h4>
                    <div className="bg-muted p-3 rounded-lg mb-3">
                      <p className="text-sm text-muted-foreground">
                        <strong>Limited Liability:</strong> To the fullest extent permitted by Australian law, we exclude all liability for any loss or damage arising from use of this service.
                      </p>
                    </div>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>No liability for incorrect or incomplete marking results</li>
                      <li>No responsibility for educational decisions based on tool output</li>
                      <li>No warranty of continuous or uninterrupted service availability</li>
                      <li>Users assume all risks associated with tool usage</li>
                      <li>Maximum liability limited to service fees paid (if any)</li>
                    </ul>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">6. Compliance and Legal Requirements</h4>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Schools responsible for ensuring compliance with local regulations</li>
                      <li>Privacy impact assessments required before implementation</li>
                      <li>Staff training and awareness programs mandatory</li>
                      <li>Regular audits and reviews of usage practices required</li>
                      <li>Incident reporting and management procedures must be established</li>
                    </ul>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">7. Intellectual Property</h4>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Schools retain ownership of all uploaded student work</li>
                      <li>AI-generated feedback and results are not copyrightable</li>
                      <li>No intellectual property rights are transferred or assigned</li>
                      <li>Usage rights limited to educational purposes within the institution</li>
                    </ul>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">8. Governing Law</h4>
                    <p className="text-sm text-muted-foreground">
                      This disclaimer and the use of this service are governed by Australian law. Any disputes will be resolved in accordance with 
                      Australian legal procedures and jurisdiction. Schools should seek legal advice regarding compliance with state and territory 
                      specific educational legislation.
                    </p>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">9. Acknowledgment</h4>
                    <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        By using this service, educational institutions and their staff acknowledge that they have read, understood, and agree to 
                        be bound by this disclaimer and privacy policy. They accept full responsibility for appropriate use and compliance with 
                        all applicable laws and regulations.
                      </p>
                    </div>
                  </section>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="contact" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary">Contact Information</h3>
                
                <div className="space-y-6">
                  <section>
                    <h4 className="font-medium mb-2">Privacy Officer</h4>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        <span className="text-sm">privacy@magicmarking.edu.au</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        <span className="text-sm">1800 PRIVACY (1800 774 8229)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Available Monday to Friday, 9:00 AM - 5:00 PM AEST
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">Technical Support</h4>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        <span className="text-sm">support@magicmarking.edu.au</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        <span className="text-sm">1800 SUPPORT (1800 787 7678)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        24/7 technical support for educational institutions
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">Complaints and Privacy Breaches</h4>
                    <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-lg space-y-2">
                      <h5 className="text-sm font-medium text-destructive">Immediate Privacy Breach Reporting</h5>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <span className="text-sm">breach@magicmarking.edu.au</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-destructive" />
                        <span className="text-sm">Emergency: 1800 BREACH (1800 273 224)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Report suspected privacy breaches immediately - 24/7 emergency response
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">External Complaints</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      If you are not satisfied with our response to your privacy complaint, you may contact:
                    </p>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <h5 className="text-sm font-medium mb-1">Office of the Australian Information Commissioner (OAIC)</h5>
                        <p className="text-xs text-muted-foreground">Website: www.oaic.gov.au</p>
                        <p className="text-xs text-muted-foreground">Phone: 1300 363 992</p>
                        <p className="text-xs text-muted-foreground">Email: enquiries@oaic.gov.au</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <h5 className="text-sm font-medium mb-1">Your State/Territory Privacy Commissioner</h5>
                        <p className="text-xs text-muted-foreground">Contact details available at www.oaic.gov.au</p>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h4 className="font-medium mb-2">Educational Institution Support</h4>
                    <div className="bg-success/5 border border-success/20 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-success mb-2">School IT Department Liaison</h5>
                      <p className="text-xs text-muted-foreground mb-2">
                        Dedicated support for IT departments implementing this service in Australian schools.
                      </p>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-success" />
                        <a href="https://clarence.guru/#contact" target="_blank" rel="noopener noreferrer" className="text-sm hover:underline text-success">
                          clarence.guru/#contact
                        </a>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <FileText className="w-4 h-4 mr-2" />
            Print Policy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
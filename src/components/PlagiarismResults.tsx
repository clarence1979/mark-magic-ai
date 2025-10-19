import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, ExternalLink, Shield } from 'lucide-react';
import { PlagiarismResult } from '@/services/plagiarismService';

interface PlagiarismResultsProps {
  result: PlagiarismResult;
}

export const PlagiarismResults = ({ result }: PlagiarismResultsProps) => {
  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 50) return 'destructive';
    if (similarity >= 30) return 'warning';
    return 'success';
  };

  const getSimilarityBadgeClass = (similarity: number) => {
    if (similarity >= 50) return 'bg-destructive/10 text-destructive border-destructive/30';
    if (similarity >= 30) return 'bg-warning/10 text-warning border-warning/30';
    return 'bg-success/10 text-success border-success/30';
  };

  return (
    <Card className="shadow-medium border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              result.isHighRisk ? 'bg-destructive/10' : 'bg-success/10'
            }`}>
              {result.isHighRisk ? (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              ) : (
                <CheckCircle className="w-6 h-6 text-success" />
              )}
            </div>
            <div>
              <CardTitle className="text-xl">Plagiarism Detection</CardTitle>
              <CardDescription>{result.summary}</CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-lg px-4 py-2 ${getSimilarityBadgeClass(result.overallSimilarity)}`}
          >
            {result.overallSimilarity}% Similar
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {result.isHighRisk && (
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertTitle>High Plagiarism Risk</AlertTitle>
            <AlertDescription>
              This work shows significant similarity to existing sources. Manual review is recommended.
            </AlertDescription>
          </Alert>
        )}

        {result.matches.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Detected Matches ({result.matches.length})</h4>
            {result.matches.map((match, index) => (
              <Card key={index} className="bg-muted/50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={getSimilarityBadgeClass(match.similarity)}
                        >
                          {match.similarity}% match
                        </Badge>
                        <span className="text-xs text-muted-foreground">{match.source}</span>
                      </div>
                      <div className="bg-background p-3 rounded border-l-4 border-warning">
                        <p className="text-sm italic">&ldquo;{match.matchedText}&rdquo;</p>
                      </div>
                      {match.url && (
                        <a
                          href={match.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                        >
                          View source <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-6 bg-success/5 rounded-lg border border-success/20">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="font-medium text-success">No Plagiarism Detected</p>
            <p className="text-sm text-muted-foreground mt-1">
              This work appears to be original
            </p>
          </div>
        )}

        <div className="bg-muted/30 p-4 rounded-lg border">
          <h4 className="font-semibold text-sm mb-2">Understanding Similarity Scores</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span>0-29%: Low similarity - likely original work</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning"></div>
              <span>30-49%: Moderate similarity - review recommended</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive"></div>
              <span>50%+: High similarity - manual investigation required</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

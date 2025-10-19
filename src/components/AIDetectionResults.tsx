import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, Bot, User, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { AIDetectionResult } from '@/services/aiDetectionService';

interface AIDetectionResultsProps {
  result: AIDetectionResult;
}

export const AIDetectionResults = ({ result }: AIDetectionResultsProps) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-destructive';
    if (confidence >= 40) return 'text-warning';
    return 'text-success';
  };

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 70) return 'bg-destructive';
    if (confidence >= 40) return 'bg-warning';
    return 'bg-success';
  };

  const getMetricStatus = (value: number, humanThreshold: number, isHigherBetter: boolean) => {
    const isGood = isHigherBetter ? value >= humanThreshold : value <= humanThreshold;
    return isGood ? (
      <CheckCircle className="w-4 h-4 text-success" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-warning" />
    );
  };

  return (
    <Card className="shadow-medium border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              result.isAIGenerated ? 'bg-destructive/10' : 'bg-success/10'
            }`}>
              {result.isAIGenerated ? (
                <Bot className="w-6 h-6 text-destructive" />
              ) : (
                <User className="w-6 h-6 text-success" />
              )}
            </div>
            <div>
              <CardTitle className="text-xl">AI Text Detection</CardTitle>
              <CardDescription>
                {result.isAIGenerated ? 'Likely AI-Generated' : 'Likely Human-Written'}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-lg px-4 py-2 ${getConfidenceColor(result.confidence)}`}
          >
            {Math.round(result.confidence)}% AI
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {result.isAIGenerated && result.confidence >= 70 && (
          <Alert variant="destructive">
            <Bot className="h-4 w-4" />
            <AlertTitle>High AI Probability Detected</AlertTitle>
            <AlertDescription>
              This text shows strong indicators of AI generation. Manual review is recommended.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">AI Confidence Score</span>
            <span className={`font-bold ${getConfidenceColor(result.confidence)}`}>
              {Math.round(result.confidence)}%
            </span>
          </div>
          <Progress
            value={result.confidence}
            className="h-3"
            indicatorClassName={getConfidenceBgColor(result.confidence)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              Human-like
            </span>
            <span className="flex items-center gap-1">
              <Bot className="w-3 h-3" />
              AI-like
            </span>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Statistical Analysis
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Perplexity</span>
                {getMetricStatus(result.metrics.perplexity, 100, true)}
              </div>
              <div className="text-lg font-bold">{result.metrics.perplexity.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Target: Human &gt; 100, AI &lt; 50
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Burstiness</span>
                {getMetricStatus(result.metrics.burstiness, 0.5, true)}
              </div>
              <div className="text-lg font-bold">{result.metrics.burstiness.toFixed(3)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Target: Human &gt; 0.5, AI &lt; 0.3
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Type-Token Ratio</span>
                {getMetricStatus(result.metrics.typeTokenRatio, 0.6, true)}
              </div>
              <div className="text-lg font-bold">{result.metrics.typeTokenRatio.toFixed(3)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Target: Human &gt; 0.6, AI &lt; 0.5
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Cross-Entropy</span>
                {getMetricStatus(result.metrics.crossEntropy, 4.5, true)}
              </div>
              <div className="text-lg font-bold">{result.metrics.crossEntropy.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Target: Human &gt; 4.5, AI &lt; 3.5
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Sentence Variance</span>
                {getMetricStatus(result.metrics.sentenceVariance, 8, true)}
              </div>
              <div className="text-lg font-bold">{result.metrics.sentenceVariance.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Target: Human &gt; 8, AI &lt; 6
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Fano Factor</span>
                {getMetricStatus(result.metrics.fanoFactor, 1.5, true)}
              </div>
              <div className="text-lg font-bold">{result.metrics.fanoFactor.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Target: Human &gt; 1.5, AI &lt; 1.0
              </div>
            </div>
          </div>
        </div>

        {result.suspiciousWords.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Suspicious AI Words Detected ({result.suspiciousWords.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.suspiciousWords.map((item, index) => (
                  <Badge key={index} variant="outline" className="bg-warning/10 text-warning border-warning/30">
                    {item.word} ({item.count}x)
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Analysis Explanation
          </h4>
          <p className="text-sm text-muted-foreground">{result.explanation}</p>
        </div>

        {result.recommendations.length > 0 && result.isAIGenerated && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary" />
                Recommendations for More Human-like Writing
              </h4>
              <ul className="space-y-2">
                {result.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <div className="bg-muted/30 p-4 rounded-lg border">
          <h4 className="font-semibold text-sm mb-2">Understanding AI Detection</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              <strong>Perplexity:</strong> Measures text predictability. AI text is more predictable.
            </p>
            <p>
              <strong>Burstiness:</strong> Measures sentence length variation. Humans vary more.
            </p>
            <p>
              <strong>Type-Token Ratio:</strong> Vocabulary diversity. Humans use more varied vocabulary.
            </p>
            <p className="text-warning font-medium pt-2">
              ⚠️ Note: AI detection is not 100% accurate. False positives can occur, especially with formal or technical writing.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

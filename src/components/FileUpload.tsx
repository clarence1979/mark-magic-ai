import { useState, useCallback, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Camera, File, Loader as Loader2, TriangleAlert as AlertTriangle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FileConversionService } from '@/services/fileConversionService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  disabled?: boolean;
}

export const FileUpload = ({ onFilesSelect, disabled }: FileUploadProps) => {
  const isMobile = useIsMobile();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [unsupportedFiles, setUnsupportedFiles] = useState<string[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return FileText;
    if (fileType === 'application/pdf') return File;
    if (fileType.includes('word') || fileType.includes('document')) return FileText;
    return File;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || isConverting) return;
    handleFilesSelect(Array.from(e.dataTransfer.files));
  }, [disabled, isConverting]);

  const validateFileSize = (file: File): boolean => {
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: `${file.name} exceeds 10 MB. Please select a smaller file.`,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleFilesSelect = async (files: File[]) => {
    const validSizeFiles = files.filter(validateFileSize);
    if (validSizeFiles.length === 0) return;

    setIsConverting(true);

    try {
      const convertedFiles: File[] = [];
      const rejected: string[] = [];
      let convertedCount = 0;

      for (const file of validSizeFiles) {
        const result = await FileConversionService.convertToPDFIfNeeded(file);

        if (result.success && result.file) {
          convertedFiles.push(result.file);
          if (result.converted) convertedCount++;
        } else if (result.unsupported) {
          rejected.push(file.name);
        } else if (result.error) {
          toast({
            title: 'Conversion Error',
            description: result.error,
            variant: 'destructive',
          });
        }
      }

      if (rejected.length > 0) {
        setUnsupportedFiles(rejected);
      }

      if (convertedFiles.length > 0) {
        const newFiles = [...selectedFiles, ...convertedFiles];
        setSelectedFiles(newFiles);
        onFilesSelect(newFiles);

        let description = `${convertedFiles.length} file(s) added successfully.`;
        if (convertedCount > 0) {
          description += ` ${convertedCount} file(s) automatically converted to PDF.`;
        }
        toast({ title: 'Files Added', description });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process files',
        variant: 'destructive',
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesSelect(Array.from(e.target.files));
      // Reset so same file can be re-selected if dismissed and retried
      e.target.value = '';
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFilesSelect([e.target.files[0]]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelect(newFiles);
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    onFilesSelect([]);
  };

  return (
    <>
      <Card className="w-full shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Student Work
          </CardTitle>
          <CardDescription>
            Accepts images (JPG, PNG, WEBP, HEIC, BMP), PDF, DOCX, and text files (TXT, CSV, HTML, MD).
            Other formats will show guidance on how to convert them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg ${isMobile ? 'p-4' : 'p-6'} text-center transition-all duration-200 mb-4 ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            } ${disabled || isConverting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !disabled && !isConverting && fileInputRef.current?.click()}
          >
            {isConverting ? (
              <>
                <Loader2 className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} mx-auto mb-3 text-primary animate-spin`} />
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium mb-2`}>
                  Processing files...
                </h3>
                <p className={`text-muted-foreground ${isMobile ? 'text-xs mb-3' : 'text-sm mb-4'}`}>
                  Please wait while we prepare your files
                </p>
              </>
            ) : (
              <>
                <Upload className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} mx-auto mb-3 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium mb-2`}>
                  {dragActive ? 'Drop your files here' : isMobile ? 'Choose files or take a photo' : 'Choose files or drag & drop'}
                </h3>
                <p className={`text-muted-foreground ${isMobile ? 'text-xs mb-3' : 'text-sm mb-4'}`}>
                  {isMobile
                    ? 'Images, PDF, DOCX, TXT and more'
                    : 'Images, PDF, DOCX, TXT, CSV, HTML, MD — other formats auto-convert where possible'}
                </p>
              </>
            )}

            {!isConverting && (
              <div className="flex gap-2 justify-center flex-wrap">
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className={isMobile ? 'text-sm px-3' : ''}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Select Files
                </Button>
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                  className={isMobile ? 'text-sm px-3' : ''}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {isMobile ? 'Camera' : 'Take Photo'}
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              multiple
              onChange={handleFileInput}
              className="hidden"
              disabled={disabled || isConverting}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture={isMobile ? 'environment' : undefined}
              onChange={handleCameraCapture}
              className="hidden"
              disabled={disabled || isConverting}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFiles}
                  disabled={disabled || isConverting}
                >
                  Clear All
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((file, index) => {
                  const IconComponent = getFileIcon(file.type);
                  return (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-6 h-6 text-primary flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium truncate ${isMobile ? 'text-sm' : ''}`}>{file.name}</p>
                          <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                            {!isMobile && file.type && ` • ${file.type.split('/')[1]?.toUpperCase()}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        disabled={disabled || isConverting}
                        className="flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unsupported file type dialog */}
      <Dialog open={unsupportedFiles.length > 0} onOpenChange={() => setUnsupportedFiles([])}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              File Format Not Supported
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p>
                  The following file{unsupportedFiles.length > 1 ? 's' : ''} cannot be accepted
                  because the format is not supported:
                </p>
                <ul className="space-y-1">
                  {unsupportedFiles.map((name) => (
                    <li key={name} className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      {name}
                    </li>
                  ))}
                </ul>
                <p className="text-sm">
                  Accepted formats: <strong>PDF, JPG, PNG, WEBP, HEIC, BMP, DOCX, TXT, CSV, HTML, MD</strong>.
                </p>
                <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                  <p className="font-medium mb-1">Need to convert your file?</p>
                  <p className="text-muted-foreground">
                    Visit <strong>anythingtopdf.com</strong> to convert almost any file format to PDF,
                    then upload the PDF here.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setUnsupportedFiles([])}>
              Dismiss
            </Button>
            <Button
              onClick={() => {
                window.open('https://www.anythingtopdf.com/', '_blank', 'noopener,noreferrer');
                setUnsupportedFiles([]);
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Go to anythingtopdf.com
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

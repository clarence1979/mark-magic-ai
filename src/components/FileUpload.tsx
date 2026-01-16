import { useState, useCallback, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Camera, File, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FileConversionService } from '@/services/fileConversionService';

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  disabled?: boolean;
}

export const FileUpload = ({ onFilesSelect, disabled }: FileUploadProps) => {
  const isMobile = useIsMobile();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const ACCEPTED_FILE_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword', // DOC
    'text/plain', // Sometimes PDFs are detected as text
    '', // Handle empty MIME types
  ];

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return FileText;
    if (fileType === 'application/pdf') return File;
    if (fileType.includes('word') || fileType.includes('document')) return FileText;
    return File;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || isConverting) return;

    const files = Array.from(e.dataTransfer.files);
    handleFilesSelect(files);
  }, [disabled, isConverting]);

  const validateFileSize = (file: File): boolean => {
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: `${file.name} is larger than 10MB. Please select a smaller file.`,
        variant: "destructive",
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
      let convertedCount = 0;

      for (const file of validSizeFiles) {
        const result = await FileConversionService.convertToPDFIfNeeded(file);

        if (result.success && result.file) {
          convertedFiles.push(result.file);
          if (result.converted) {
            convertedCount++;
          }
        } else if (result.error) {
          toast({
            title: "Conversion Error",
            description: result.error,
            variant: "destructive",
          });
        }
      }

      if (convertedFiles.length > 0) {
        const newFiles = [...selectedFiles, ...convertedFiles];
        setSelectedFiles(newFiles);
        onFilesSelect(newFiles);

        let description = `${convertedFiles.length} file(s) added successfully.`;
        if (convertedCount > 0) {
          description += ` ${convertedCount} file(s) automatically converted to PDF.`;
        }

        toast({
          title: "Files Added",
          description,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process files",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFilesSelect(files);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
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
    <Card className="w-full shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Student Work
        </CardTitle>
        <CardDescription>
          Upload images, PDF, DOCX, TXT, or other document files. Unsupported formats will be automatically converted to PDF.
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
                Converting files...
              </h3>
              <p className={`text-muted-foreground ${isMobile ? 'text-xs mb-3' : 'text-sm mb-4'}`}>
                Please wait while we process your files
              </p>
            </>
          ) : (
            <>
              <Upload className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} mx-auto mb-3 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium mb-2`}>
                {dragActive ? 'Drop your files here' : isMobile ? 'Choose files or take a photo' : 'Choose files or drag & drop'}
              </h3>
              <p className={`text-muted-foreground ${isMobile ? 'text-xs mb-3' : 'text-sm mb-4'}`}>
                {isMobile ? 'Any document or image file' : 'Images, PDF, DOCX, TXT - unsupported formats auto-convert to PDF'}
              </p>
            </>
          )}
          
          {!isConverting && (
            <div className="flex gap-2 justify-center flex-wrap">
              <Button
                variant="outline"
                disabled={disabled}
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className={isMobile ? "text-sm px-3" : ""}
              >
                <Upload className="w-4 h-4 mr-2" />
                Select Files
              </Button>
              <Button
                variant="outline"
                disabled={disabled}
                onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                className={isMobile ? "text-sm px-3" : ""}
              >
                <Camera className="w-4 h-4 mr-2" />
                {isMobile ? "Camera" : "Take Photo"}
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
            {...(isMobile && { inputMode: 'none' })}
          />
          
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture={isMobile ? "environment" : undefined}
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
                          {(file.size / 1024 / 1024).toFixed(2)} MB{isMobile ? '' : ` • ${file.type.split('/')[1]?.toUpperCase()}`}
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
  );
};
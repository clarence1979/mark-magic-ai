import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Camera, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  disabled?: boolean;
}

export const FileUpload = ({ onFilesSelect, disabled }: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const ACCEPTED_FILE_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword' // DOC
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

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFilesSelect(files);
  }, [disabled]);

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: `${file.name} is not supported. Please select images, PDF, or DOCX files.`,
        variant: "destructive",
      });
      return false;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File Too Large",
        description: `${file.name} is larger than 10MB. Please select a smaller file.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFilesSelect = (files: File[]) => {
    const validFiles = files.filter(validateFile);
    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(newFiles);
      onFilesSelect(newFiles);
      
      toast({
        title: "Files Added",
        description: `${validFiles.length} file(s) added successfully.`,
      });
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
          Upload images, PDF files, or DOCX documents. You can select multiple files or use your camera.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 mb-4 ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Upload className={`w-10 h-10 mx-auto mb-3 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          <h3 className="text-lg font-medium mb-2">
            {dragActive ? 'Drop your files here' : 'Choose files or drag & drop'}
          </h3>
          <p className="text-muted-foreground mb-4">
            Support for Images (JPG, PNG, HEIC), PDF, and DOCX files
          </p>
          
          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="outline" disabled={disabled} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
              <Upload className="w-4 h-4 mr-2" />
              Select Files
            </Button>
            <Button 
              variant="outline" 
              disabled={disabled} 
              onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.docx,.doc"
            multiple
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />
          
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
            disabled={disabled}
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
                disabled={disabled}
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
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1]?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      disabled={disabled}
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
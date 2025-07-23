import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, File, X, Check } from 'lucide-react';

interface FileUploadProps {
  onFileUploaded?: (filePath: string, fileName: string) => void;
  sessionId?: string;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded, sessionId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFile = async (file: File) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload files",
        variant: "destructive",
      });
      return;
    }

    const fileId = Date.now().toString();
    const filePath = `${user.id}/${fileId}-${file.name}`;

    // Add file to state with uploading status
    const newFile: UploadedFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      url: '',
      progress: 0,
      status: 'uploading'
    };

    setFiles(prev => [...prev, newFile]);

    try {
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('customer-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('customer-documents')
        .getPublicUrl(filePath);

      // Update file status
      setFiles(prev => prev.map(f => 
        f.name === file.name 
          ? { ...f, url: urlData.publicUrl, progress: 100, status: 'completed' }
          : f
      ));

      // Call callback if provided
      if (onFileUploaded) {
        onFileUploaded(filePath, file.name);
      }

      // If sessionId provided, add a message about the file upload
      if (sessionId) {
        await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionId,
            content: `📎 Uploaded file: ${file.name} (${formatFileSize(file.size)})`,
            message_type: 'user',
            metadata: {
              file_path: filePath,
              file_name: file.name,
              file_size: file.size,
              file_type: file.type
            }
          });
      }

      toast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded successfully`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      // Update file status to error
      setFiles(prev => prev.map(f => 
        f.name === file.name 
          ? { ...f, status: 'error' }
          : f
      ));

      toast({
        title: "Upload Failed",
        description: `Failed to upload ${file.name}`,
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = useCallback((selectedFiles: FileList) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    Array.from(selectedFiles).forEach(file => {
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 10MB`,
          variant: "destructive",
        });
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "File Type Not Supported",
          description: `${file.name} type is not supported`,
          variant: "destructive",
        });
        return;
      }

      uploadFile(file);
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  }, [handleFileSelect]);

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          File Upload
        </CardTitle>
        <CardDescription>
          Upload documents, images, or other files to share with support
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging 
              ? 'border-primary bg-primary/10' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop files here, or click to select
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.accept = '.jpg,.jpeg,.png,.gif,.pdf,.txt,.doc,.docx';
              input.onchange = (e) => {
                const target = e.target as HTMLInputElement;
                if (target.files) {
                  handleFileSelect(target.files);
                }
              };
              input.click();
            }}
          >
            Select Files
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Supported: Images, PDF, Word docs (Max 10MB)
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploaded Files</h4>
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <File className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="mt-1 h-1" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {file.status === 'completed' && (
                    <Badge variant="default" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                  {file.status === 'uploading' && (
                    <Badge variant="secondary" className="text-xs">
                      Uploading...
                    </Badge>
                  )}
                  {file.status === 'error' && (
                    <Badge variant="destructive" className="text-xs">
                      Error
                    </Badge>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeFile(file.name)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
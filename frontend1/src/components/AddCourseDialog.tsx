/**
 * @file AddCourseDialog.tsx
 * @author TheWatcher01
 * @date 07-11-2024
 * @description Component for adding a new course
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import axios, { AxiosProgressEvent } from "axios";
import frontendLogger from "@/config/frontendLogger";
import axiosInstance from '@/services/axiosConfig';

interface CourseFormData {
  title: string;
  description: string;
  level: string;
  category: string;
}

interface ApiErrorResponse {
  error: string;
  success: boolean;
}

const AddCourseDialog = () => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    level: "beginner",
    category: "",
  });

  // UI state
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Token verification function
  const checkAuth = (): string | null => {
    const token = localStorage.getItem("token");
    if (!token) {
      frontendLogger.warn("No authentication token found");
      return null;
    }

    // Basic JWT format verification
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      frontendLogger.warn("Invalid token format");
      localStorage.removeItem('token');
      return null;
    }

    return token;
  };

  const handleInputChange = (
    field: keyof CourseFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
      if (!formData.title) {
        const firstFileName = files[0].name.split(".").slice(0, -1).join(".");
        handleInputChange('title', firstFileName);
      }
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError("Title is required");
      return false;
    }
    if (!formData.category) {
      setError("Category is required");
      return false;
    }
    if (!selectedFiles || selectedFiles.length === 0) {
      setError("At least one file is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!validateForm()) return;

    const token = checkAuth();
    if (!token) {
      setError("Please log in to upload a course");
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    const submitFormData = new FormData();

    // Append form fields
    Object.entries(formData).forEach(([key, value]) => {
      submitFormData.append(key, value);
    });

    // Append files
    if (selectedFiles) {
      Array.from(selectedFiles).forEach((file) => {
        submitFormData.append("files", file);
      });
    }

    try {
      const response = await axiosInstance.post(
        '/api/courses/add-course',
        submitFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              frontendLogger.debug(`Upload progress: ${percentCompleted}%`);
            }
          },
        }
      );

      setSuccess("Course uploaded successfully!");
      resetForm();
      frontendLogger.info("Course upload successful", {
        courseId: response.data?.course?.courseId,
        filesCount: selectedFiles?.length
      });
    } catch (error) {
      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        frontendLogger.error("Upload error details:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });

        // Handle different error cases
        if (error.response?.status === 401) {
          const errorMsg = error.response.data?.error || "Session expired";
          setError(`Authentication failed: ${errorMsg}`);
          localStorage.removeItem('token');
          setTimeout(() => navigate('/login'), 2000);
        } else if (error.response?.status === 413) {
          setError("File size exceeds the maximum limit");
        } else if (error.code === 'ECONNABORTED') {
          setError("Upload timed out. Please try again");
        } else {
          setError(error.response?.data?.error || "Upload failed. Please try again");
        }
      } else {
        setError("An unexpected error occurred");
        frontendLogger.error("Unknown error:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      level: "beginner",
      category: "",
    });
    setSelectedFiles(null);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default">Add New Course</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Course</DialogTitle>
          <DialogDescription>
            Create a new course by filling out the details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="course-title">Course Title</Label>
              <Input
                id="course-title"
                name="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="course-category">Category</Label>
              <input
                type="hidden"
                id="course-category-hidden"
                name="category"
                value={formData.category}
              />
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger id="course-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="programming">Programming</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="course-level">Level</Label>
              <input
                type="hidden"
                id="course-level-hidden"
                name="level"
                value={formData.level}
              />
              <Select
                value={formData.level}
                onValueChange={(value) => handleInputChange('level', value)}
              >
                <SelectTrigger id="course-level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="course-description">Description</Label>
              <Textarea
                id="course-description"
                name="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="course-files">Course Materials</Label>
              <Input
                id="course-files"
                name="files"
                type="file"
                multiple
                onChange={handleFileChange}
                accept=".mp3,.wav,.txt,.pdf,.mp4,.avi,.mov,.jpeg,.jpg,.png,.md,.epub"
                className="mt-1"
              />
              {selectedFiles && (
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedFiles.length} file(s) selected
                </p>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Create Course'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCourseDialog;

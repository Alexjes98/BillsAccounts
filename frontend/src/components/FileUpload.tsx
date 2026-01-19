import React, { useRef } from "react";
import axios from "axios";
import { Upload } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

export function FileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setFreeData, setLoading, setError, isLoading } = useAppStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setError("Please upload a valid JSON file.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "http://localhost:5001/api/process-file",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      setFreeData(response.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to process file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-10">
      <CardHeader>
        <CardTitle>Welcome to Personal Finance</CardTitle>
        <CardDescription>
          Upload your JSON file to get started (Free Mode)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div
          className={cn(
            "border-2 border-dashed border-input rounded-lg p-10 flex flex-col items-center justify-center w-full cursor-pointer hover:bg-accent/50 transition",
            isLoading && "opacity-50 pointer-events-none",
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Click to upload JSON</p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json"
            onChange={handleFileChange}
          />
        </div>
        {isLoading && <p className="text-sm animate-pulse">Processing...</p>}
      </CardContent>
    </Card>
  );
}

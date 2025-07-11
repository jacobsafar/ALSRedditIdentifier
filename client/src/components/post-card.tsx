import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Check, X, AlertTriangle, RefreshCw, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MonitoredPost } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: MonitoredPost;
}

interface SentimentUpdateResponse {
  score: number;
  analysis: string;
  sentimentCategory: string;
}

export default function PostCard({ post }: PostCardProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState(post.sentimentCategory || "");
  const [isEditing, setIsEditing] = useState(false);

  // Update selectedCategory whenever post.sentimentCategory changes
  useEffect(() => {
    setSelectedCategory(post.sentimentCategory || "");
  }, [post.sentimentCategory]);

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PATCH", `/api/posts/${post.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    }
  });

  const updateSentimentMutation = useMutation({
    mutationFn: (category: string) =>
      apiRequest("PATCH", `/api/posts/${post.id}/sentiment`, { sentimentCategory: category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setIsEditing(false);
      toast({ title: "Sentiment category updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update sentiment category",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const markAsReviewed = async () => {
    try {
      window.open(post.url, '_blank');
      await updateStatusMutation.mutateAsync("reviewed");
      toast({ title: "Post marked as reviewed" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Failed to mark as reviewed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return "bg-red-500 text-white";
    if (score >= 7) return "bg-orange-500 text-white";
    if (score >= 5) return "bg-yellow-500";
    return "bg-green-500 text-white";
  };

  const analysis = post.analysis as { analysis: string };

  return (
    <Card className={cn(
      "transition-colors",
      post.score >= 9 && "border-red-200 bg-red-50/50",
      post.score >= 7 && post.score < 9 && "border-orange-200 bg-orange-50/50"
    )}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">r/{post.subreddit}</h3>
          <Badge>{post.author}</Badge>
          <Badge className={cn(
            getScoreColor(post.score),
            "flex items-center gap-1"
          )}>
            {post.score >= 8 && <AlertTriangle className="h-3 w-3" />}
            Score: {post.score}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
          </span>
        </div>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </CardHeader>

      <CardContent className="space-y-4">
        {post.title && (
          <div>
            <h4 className="font-medium mb-1">Title</h4>
            <p className={cn(
              "text-lg",
              post.score >= 8 && "font-semibold"
            )}>{post.title}</p>
          </div>
        )}

        <div>
          <h4 className="font-medium mb-1">Content</h4>
          <p className="whitespace-pre-wrap">{post.content}</p>
        </div>

        <div>
          <h4 className="font-medium mb-1">Analysis</h4>
          <p className={cn(
            "text-muted-foreground",
            post.score >= 8 && "text-red-700"
          )}>{analysis.analysis}</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium">Sentiment Category</h4>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update Category
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => updateSentimentMutation.mutate(selectedCategory)}
                    disabled={updateSentimentMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </div>
              )}
            </div>
          </div>

          {isEditing ? (
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select sentiment category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="emotional_distress">Emotional Distress</SelectItem>
                <SelectItem value="physical_challenges">Physical Challenges</SelectItem>
                <SelectItem value="support_needs">Support Needs</SelectItem>
                <SelectItem value="medical_concerns">Medical Concerns</SelectItem>
                <SelectItem value="daily_struggles">Daily Struggles</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {post.sentimentCategory ? 
                  post.sentimentCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                  'Not categorized'
                }
              </Badge>
            </div>
          )}
        </div>

      </CardContent>

      {post.status === "pending" && (
        <CardFooter className="flex justify-between gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => updateStatusMutation.mutate("ignored")}
              disabled={updateStatusMutation.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Ignore Post
            </Button>
            <Button
              variant="outline"
              onClick={() => updateStatusMutation.mutate("reviewed")}
              disabled={updateStatusMutation.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              Mark as Reviewed
            </Button>
          </div>
          <Button
            onClick={markAsReviewed}
            disabled={updateStatusMutation.isPending}
            className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            View on Reddit
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
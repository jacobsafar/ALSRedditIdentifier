import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, Check, X, AlertTriangle, RefreshCw, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { MonitoredPost } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface PostCardProps {
  post: MonitoredPost;
}

export default function PostCard({ post }: PostCardProps) {
  const { toast } = useToast();
  const [customPrompt, setCustomPrompt] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editedReply, setEditedReply] = useState(post.suggestedReply || "");
  const [isEditing, setIsEditing] = useState(false);

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PATCH", `/api/posts/${post.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    }
  });

  const regenerateReplyMutation = useMutation({
    mutationFn: (prompt: string) =>
      apiRequest("POST", `/api/posts/${post.id}/regenerate-reply`, { customPrompt: prompt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setIsDialogOpen(false);
      toast({ title: "Reply regenerated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to regenerate reply",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const saveReplyMutation = useMutation({
    mutationFn: (reply: string) =>
      apiRequest("PATCH", `/api/posts/${post.id}/update-reply`, { suggestedReply: reply }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setIsEditing(false);
      toast({ title: "Reply saved successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save reply",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const copyAndMarkReplied = async () => {
    try {
      // Open Reddit post in new tab
      window.open(post.url, '_blank');

      // Copy reply with appended extension link
      const replyWithExtension = `${post.suggestedReply}\n\n[AIBlock Chrome Extension](https://chromewebstore.google.com/detail/aiblock-block-ai-images-a/mkmlbghcbklnojegbkcdhfonmmopgdc?authuser=0&hl=en)`;
      await navigator.clipboard.writeText(replyWithExtension);

      // Mark as replied
      await updateStatusMutation.mutateAsync("replied");

      toast({ title: "Post opened and reply copied" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({ 
        title: "Failed to process",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Color coding based on score
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

        {post.suggestedReply && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium">Suggested Reply</h4>
              <div className="flex gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Regenerate Reply</DialogTitle>
                      <DialogDescription>
                        Enter a custom prompt to generate a new reply for this content.
                        Leave blank to use the default system prompt.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Enter custom prompt or leave blank for default"
                      className="min-h-[100px]"
                    />
                    <DialogFooter className="mt-4">
                      <Button
                        onClick={() => regenerateReplyMutation.mutate(customPrompt)}
                        disabled={regenerateReplyMutation.isPending}
                      >
                        {regenerateReplyMutation.isPending && (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Regenerate Reply
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={copyAndMarkReplied}
                  disabled={updateStatusMutation.isPending}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedReply}
                  onChange={(e) => setEditedReply(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditedReply(post.suggestedReply || "");
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveReplyMutation.mutate(editedReply)}
                    disabled={saveReplyMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className="text-muted-foreground cursor-pointer hover:bg-muted/50 p-2 rounded"
                onClick={() => setIsEditing(true)}
              >
                {post.suggestedReply}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {post.status === "pending" && (
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => updateStatusMutation.mutate("ignored")}
            disabled={updateStatusMutation.isPending}
          >
            <X className="mr-2 h-4 w-4" />
            Ignore
          </Button>
          <Button
            onClick={() => updateStatusMutation.mutate("replied")}
            disabled={updateStatusMutation.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            Mark as Replied
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
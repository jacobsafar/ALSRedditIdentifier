import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, Check, X, AlertTriangle, RefreshCw, Save, Edit2 } from "lucide-react";
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
import { formatDistanceToNow } from "date-fns";

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
      window.open(post.url, '_blank');
      const replyWithExtension = `${post.suggestedReply}\n\n[AIBlock Chrome Extension](https://chromewebstore.google.com/detail/aiblock-block-ai-images-a/mkmlbghcbklnojegbkcdhfonmmopgdc?authuser=0&hl=en)`;
      await navigator.clipboard.writeText(replyWithExtension);
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

  const getScoreColor = (score: number) => {
    if (score >= 9) return "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-glow-red";
    if (score >= 7) return "bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-glow-orange";
    if (score >= 5) return "bg-gradient-to-r from-yellow-400 to-amber-300 shadow-glow-yellow";
    return "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-glow-green";
  };

  const analysis = post.analysis as { analysis: string };

  return (
    <Card className={cn(
      "transition-all duration-500 ease-in-out transform hover:scale-[1.02] hover:shadow-xl",
      "bg-gradient-to-br from-white to-purple-50/30",
      post.score >= 9 && "border-red-200 bg-gradient-to-br from-red-50 to-pink-50/30 shadow-glow-soft-red",
      post.score >= 7 && post.score < 9 && "border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50/30 shadow-glow-soft-orange"
    )}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold transition-all duration-300 hover:text-primary hover:scale-105">
            r/{post.subreddit}
          </h3>
          <Badge className="transition-all duration-300 bg-gradient-to-r from-violet-500 to-purple-500 hover:shadow-glow-purple">
            {post.author}
          </Badge>
          <Badge className={cn(
            getScoreColor(post.score),
            "flex items-center gap-1 transition-all duration-300"
          )}>
            {post.score >= 8 && <AlertTriangle className="h-3 w-3 animate-pulse" />}
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
          className="hover:text-primary transition-all duration-300 hover:scale-110"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </CardHeader>

      <CardContent className="space-y-4">
        {post.title && (
          <div className="transition-all duration-300 ease-in-out group">
            <h4 className="font-medium mb-1">Title</h4>
            <p className={cn(
              "text-lg transition-all duration-300 group-hover:scale-[1.01]",
              post.score >= 8 && "font-semibold text-red-900"
            )}>{post.title}</p>
          </div>
        )}

        <div>
          <h4 className="font-medium mb-1">Content</h4>
          <p className="whitespace-pre-wrap transition-colors duration-300">{post.content}</p>
        </div>

        <div>
          <h4 className="font-medium mb-1">Analysis</h4>
          <p className={cn(
            "text-muted-foreground transition-colors duration-300",
            post.score >= 8 && "text-red-700"
          )}>{analysis.analysis}</p>
        </div>

        {post.suggestedReply && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium">Suggested Reply</h4>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="transition-all duration-300 hover:bg-muted/80 hover:shadow-md"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate Reply
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
                  size="sm"
                  onClick={copyAndMarkReplied}
                  disabled={updateStatusMutation.isPending}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-glow-purple transition-all duration-300 transform hover:-translate-y-1"
                >
                  Copy & Open in Reddit
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-2 border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-violet-50/30 transition-all duration-300 animate-in fade-in-0 shadow-glow-soft-purple">
                <div className="flex items-center gap-2 mb-2">
                  <Edit2 className="h-4 w-4" />
                  <span className="font-medium">Editing Reply</span>
                </div>
                <Textarea
                  value={editedReply}
                  onChange={(e) => setEditedReply(e.target.value)}
                  className="min-h-[150px] bg-white/80 resize-y transition-all duration-300 focus:shadow-glow-soft-purple"
                  placeholder="Edit your reply here..."
                />
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditedReply(post.suggestedReply || "");
                      setIsEditing(false);
                    }}
                    className="transition-all duration-300 hover:bg-red-50"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel Edit
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveReplyMutation.mutate(editedReply)}
                    disabled={saveReplyMutation.isPending}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white transition-all duration-300 hover:shadow-glow-green"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative border rounded-lg p-4 group hover:border-primary/50 transition-all duration-300 hover:shadow-glow-soft-purple bg-gradient-to-br from-white to-purple-50/30">
                <div className="absolute top-2 right-2 z-10">
                  <Button
                    variant="outline"
                    size="sm"
                    className="shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 hover:shadow-glow-purple"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit Reply
                  </Button>
                </div>
                <div className="text-muted-foreground group-hover:text-foreground pr-[100px] transition-all duration-300 whitespace-pre-wrap">
                  {post.suggestedReply}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {post.status === "opportunities" && (
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => updateStatusMutation.mutate("ignored")}
            disabled={updateStatusMutation.isPending}
            className="transition-all duration-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          >
            <X className="mr-2 h-4 w-4" />
            Ignore Post
          </Button>
          <Button
            onClick={() => updateStatusMutation.mutate("replied")}
            disabled={updateStatusMutation.isPending}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white transition-all duration-300 hover:shadow-glow-green"
          >
            <Check className="mr-2 h-4 w-4" />
            Mark as Replied
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
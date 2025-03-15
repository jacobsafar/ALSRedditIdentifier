import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, Check, X } from "lucide-react";
import type { MonitoredPost } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface PostCardProps {
  post: MonitoredPost;
}

export default function PostCard({ post }: PostCardProps) {
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PATCH", `/api/posts/${post.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    }
  });

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(post.suggestedReply || "");
  };

  const analysis = post.analysis as { analysis: string };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">r/{post.subreddit}</h3>
          <Badge>{post.author}</Badge>
          <Badge variant="secondary">Score: {post.score}</Badge>
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
            <p>{post.title}</p>
          </div>
        )}

        <div>
          <h4 className="font-medium mb-1">Content</h4>
          <p className="whitespace-pre-wrap">{post.content}</p>
        </div>

        <div>
          <h4 className="font-medium mb-1">Analysis</h4>
          <p className="text-muted-foreground">{analysis.analysis}</p>
        </div>

        {post.suggestedReply && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium">Suggested Reply</h4>
              <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground">{post.suggestedReply}</p>
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
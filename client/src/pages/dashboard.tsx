import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, RefreshCw, Loader2 } from "lucide-react";
import PostCard from "@/components/post-card";
import type { MonitoredPost } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [fetchStatus, setFetchStatus] = useState("");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["/api/posts", activeTab],
    queryFn: () => fetch(`/api/posts?status=${activeTab}`).then(r => r.json())
  });

  const fetchMutation = useMutation({
    mutationFn: async () => {
      setFetchStatus("Initializing content fetch...");
      const response = await fetch("/api/fetch", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch content");
      }

      return data;
    },
    onMutate: () => {
      toast({ title: "Starting content fetch", description: "This may take a few moments..." });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });

      if (data.errors?.length > 0) {
        toast({ 
          title: data.message,
          description: data.errors.join('\n'),
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "Content fetch complete",
          description: data.message,
          variant: "default"
        });
      }

      // Clear the status after a delay
      setTimeout(() => setFetchStatus(""), 3000);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error fetching content",
        description: error.message,
        variant: "destructive"
      });
      setFetchStatus("");
    }
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Reddit AI Monitor</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => fetchMutation.mutate()}
            disabled={fetchMutation.isPending}
          >
            {fetchMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {fetchMutation.isPending ? "Fetching..." : "Fetch New Content"}
          </Button>
          <Link href="/settings">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Status message */}
      {fetchStatus && (
        <Card className="p-4 mb-6 bg-muted">
          <p className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {fetchStatus}
          </p>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="replied">Replied</TabsTrigger>
          <TabsTrigger value="ignored">Ignored</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6 animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {posts?.map((post: MonitoredPost) => (
              <PostCard key={post.id} post={post} />
            ))}
            {posts?.length === 0 && (
              <Card className="p-6 text-center text-muted-foreground">
                No {activeTab} posts found
              </Card>
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
}
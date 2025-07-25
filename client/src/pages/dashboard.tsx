import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Settings, RefreshCw, Loader2, Trash2, Ban, Filter, ArrowUpDown, X } from "lucide-react";
import PostCard from "@/components/post-card";
import type { MonitoredPost } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import React from 'react';

type SortOrder = "score_desc" | "score_asc" | "newest" | "oldest" | "post_date_newest" | "post_date_oldest";

export default function Dashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("insights");
  const [fetchStatus, setFetchStatus] = useState("");
  const [selectedSubreddit, setSelectedSubreddit] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("score_desc");

  // Update sort order when tab changes
  useEffect(() => {
    setSortOrder(activeTab === "insights" ? "score_desc" : "newest");
  }, [activeTab]);

  // Get config for auto-fetch interval
  const { data: config } = useQuery({
    queryKey: ["/api/config"],
    queryFn: () => fetch("/api/config").then(r => r.json())
  });

  // Setup auto-fetch interval
  useEffect(() => {
    if (!config?.checkFrequency) return;

    const intervalId = setInterval(() => {
      // Only fetch if we're not already fetching
      if (!fetchMutation.isPending) {
        fetchMutation.mutate();
      }
    }, config.checkFrequency * 60 * 60 * 1000); // Convert hours to milliseconds

    return () => clearInterval(intervalId);
  }, [config?.checkFrequency]);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["/api/posts", activeTab],
    queryFn: () => {
      // Map insights tab to pending status for API compatibility
      const status = activeTab === "insights" ? "pending" : activeTab;
      return fetch(`/api/posts?status=${status}`).then(r => r.json());
    }
  });

  // Extract unique subreddits from posts
  const uniqueSubreddits = Array.from(new Set(posts?.map((post: MonitoredPost) => post.subreddit) || [])).sort();

  // Filter posts based on selected subreddit
  const filteredPosts = posts?.filter((post: MonitoredPost) => {
    if (selectedSubreddit !== "all" && post.subreddit !== selectedSubreddit) {
      return false;
    }
    return true;
  });

  // Sort posts based on active tab and criteria
  const sortedPosts = [...(filteredPosts || [])].sort((a: MonitoredPost, b: MonitoredPost) => {
    const aActionTime = a.statusChangedAt ? new Date(a.statusChangedAt) : new Date(a.timestamp);
    const bActionTime = b.statusChangedAt ? new Date(b.statusChangedAt) : new Date(b.timestamp);
    const aPostTime = new Date(a.timestamp);
    const bPostTime = new Date(b.timestamp);

    // For non-opportunities tabs, prioritize status change time by default
    if (activeTab !== "opportunities" && sortOrder === "newest") {
      return bActionTime.getTime() - aActionTime.getTime();
    }

    // Handle original post date sorting
    if (sortOrder === "post_date_newest") {
      return bPostTime.getTime() - aPostTime.getTime();
    }
    if (sortOrder === "post_date_oldest") {
      return aPostTime.getTime() - bPostTime.getTime();
    }

    // Handle score-based sorting
    if (sortOrder === "score_desc") {
      return b.score - a.score;
    }
    if (sortOrder === "score_asc") {
      return a.score - b.score;
    }

    // Handle action time-based sorting
    if (sortOrder === "newest") {
      return bActionTime.getTime() - aActionTime.getTime();
    }
    if (sortOrder === "oldest") {
      return aActionTime.getTime() - bActionTime.getTime();
    }

    // Default behavior based on tab
    return activeTab === "opportunities"
      ? b.score - a.score  // Default to score for opportunities
      : bActionTime.getTime() - aActionTime.getTime(); // Default to newest actions for replied/ignored
  });

  // Reset filters based on active tab
  const resetFilters = () => {
    setSelectedSubreddit("all");
    setSortOrder(activeTab === "insights" ? "score_desc" : "newest");
  };

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

  const clearAllMutation = useMutation({
    mutationFn: () =>
      fetch("/api/posts", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Successfully cleared all posts" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to clear posts",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const ignoreAllMutation = useMutation({
    mutationFn: () =>
      fetch("/api/posts/ignore-all", { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Successfully ignored all pending posts" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to ignore posts",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Helper function to get sort option label based on active tab
  const getSortLabel = (type: 'latest' | 'oldest') => {
    if (activeTab === 'reviewed') {
      return type === 'latest' ? "Latest Reviewed First" : "Oldest Reviewed First";
    } else if (activeTab === 'ignored') {
      return type === 'latest' ? "Latest Ignored First" : "Oldest Ignored First";
    }
    return "";
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">ALS Patient Sentiment Monitor</h1>
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

      {/* Bulk Actions */}
      <div className="flex gap-2 mb-6">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Insights
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all insights in your queue.
                This action cannot be undone. Posts marked as 'reviewed' or 'ignored' will not be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, Keep Insights</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => clearAllMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, Delete All Insights
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Ban className="mr-2 h-4 w-4" />
              Ignore All Insights
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark all current insights as ignored.
                You can still view them in the Ignored tab.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => ignoreAllMutation.mutate()}>
                Yes, Ignore All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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

      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        setSortOrder(value === "insights" ? "score_desc" : "newest");
      }}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          <TabsTrigger value="ignored">Ignored</TabsTrigger>
        </TabsList>

        {/* Filters Section - Show on all tabs */}
        {uniqueSubreddits.length > 0 && (
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedSubreddit} onValueChange={setSelectedSubreddit}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by subreddit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subreddits</SelectItem>
                  {uniqueSubreddits.map((subreddit: string) => (
                    <SelectItem key={subreddit} value={subreddit}>
                      r/{subreddit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortOrder} onValueChange={(value: SortOrder) => setSortOrder(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {activeTab === "insights" ? (
                    <>
                      <SelectItem value="score_desc">Highest Score First</SelectItem>
                      <SelectItem value="score_asc">Lowest Score First</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="newest">{getSortLabel('latest')}</SelectItem>
                      <SelectItem value="oldest">{getSortLabel('oldest')}</SelectItem>
                      <SelectItem value="post_date_newest">Post Date (Newest)</SelectItem>
                      <SelectItem value="post_date_oldest">Post Date (Oldest)</SelectItem>
                      <SelectItem value="score_desc">Highest Score First</SelectItem>
                      <SelectItem value="score_asc">Lowest Score First</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Show reset button when filters are not at default values */}
            {(selectedSubreddit !== "all" ||
              (activeTab === "insights" && sortOrder !== "score_desc") ||
              (activeTab !== "insights" && sortOrder !== "newest")) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 px-2"
              >
                <X className="h-4 w-4" />
                Reset filters
              </Button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6 animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* High Priority Section - Only show for insights tab */}
            {activeTab === "insights" && (
              <div className="space-y-4">
                {sortedPosts.filter(post => post.score >= 8).length > 0 && (
                  <>
                    <h2 className="text-xl font-semibold text-red-600 flex items-center gap-2">
                      High Priority Insights
                      <span className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        {sortedPosts.filter(post => post.score >= 8).length} items
                      </span>
                    </h2>
                    <div className="grid gap-4">
                      {sortedPosts
                        .filter(post => post.score >= 8)
                        .map((post: MonitoredPost) => (
                          <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Normal Priority/Reviewed/Ignored Section */}
            <div className="space-y-4">
              {(activeTab === "insights" ? sortedPosts.filter(post => post.score < 8).length > 0 : sortedPosts.length > 0) && (
                <>
                  <h2 className="text-xl font-semibold text-gray-600 flex items-center gap-2">
                    {activeTab === "insights" ? (
                      <>
                        Normal Priority Insights
                        <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                          {sortedPosts.filter(post => post.score < 8).length} items
                        </span>
                      </>
                    ) : (
                      <>
                        {activeTab === "replied" ? "Replied Content" : "Ignored Content"}
                        <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                          {sortedPosts.length} items
                        </span>
                      </>
                    )}
                  </h2>
                  <div className="grid gap-4">
                    {(activeTab === "opportunities"
                      ? sortedPosts.filter(post => post.score < 8)
                      : sortedPosts
                    ).map((post: MonitoredPost) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Empty State */}
            {sortedPosts.length === 0 && (
              <Card className="p-6 text-center text-muted-foreground">
                No {activeTab} posts found
                {selectedSubreddit !== "all" && " in r/" + selectedSubreddit}
              </Card>
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
}
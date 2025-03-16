import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { configSchema, insertSubredditSchema } from "@shared/schema";
import type { Config, MonitoredSubreddit } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { Link } from "wouter";
import React from 'react';

export default function Settings() {
  const { toast } = useToast();

  const { data: config, isLoading: isConfigLoading } = useQuery({
    queryKey: ["/api/config"],
    queryFn: () => fetch("/api/config").then(r => r.json())
  });

  const { data: subreddits, isLoading: isSubredditsLoading } = useQuery({
    queryKey: ["/api/subreddits"],
    queryFn: () => fetch("/api/subreddits").then(r => r.json())
  });

  const configForm = useForm<Config>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      scoreThreshold: 7,
      checkFrequency: 60,
      openAiPrompt: "",
    }
  });

  // Update form values when config is loaded
  React.useEffect(() => {
    if (config) {
      configForm.reset(config);
    }
  }, [config]);

  const subredditForm = useForm({
    resolver: zodResolver(insertSubredditSchema),
    defaultValues: {
      name: "",
      isActive: 1
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: (config: Config) => 
      apiRequest("PUT", "/api/config", config),
    onSuccess: () => {
      toast({ title: "Settings updated successfully" });
    }
  });

  const addSubredditMutation = useMutation({
    mutationFn: (data: { name: string }) =>
      apiRequest("POST", "/api/subreddits", { ...data, isActive: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subreddits"] });
      subredditForm.reset();
      toast({ title: "Subreddit added successfully" });
    }
  });

  const removeSubredditMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/subreddits/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subreddits"] });
      toast({ title: "Subreddit removed successfully" });
    }
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-4xl font-bold">Settings</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold">Monitor Configuration</h2>
          </CardHeader>
          <CardContent>
            {isConfigLoading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Form {...configForm}>
                <form onSubmit={configForm.handleSubmit(data => updateConfigMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={configForm.control}
                    name="scoreThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Score Threshold (1-10)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={configForm.control}
                    name="checkFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check Frequency (seconds)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={configForm.control}
                    name="openAiPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OpenAI System Prompt</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={updateConfigMutation.isPending}>
                    Save Configuration
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold">Monitored Subreddits</h2>
          </CardHeader>
          <CardContent>
            <Form {...subredditForm}>
              <form onSubmit={subredditForm.handleSubmit(data => addSubredditMutation.mutate(data))} className="flex gap-2 mb-4">
                <FormField
                  control={subredditForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Enter subreddit name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={addSubredditMutation.isPending}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </form>
            </Form>

            {isSubredditsLoading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {subreddits?.map((subreddit: MonitoredSubreddit) => (
                  <div key={subreddit.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span>r/{subreddit.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSubredditMutation.mutate(subreddit.id)}
                      disabled={removeSubredditMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
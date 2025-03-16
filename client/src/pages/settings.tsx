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
  FormDescription,
} from "@/components/ui/form";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { configSchema, insertSubredditSchema } from "@shared/schema";
import type { Config, MonitoredSubreddit } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { Link } from "wouter";
import React from 'react';
import { queryClient } from "@/lib/queryClient";

// Helper function to generate system prompt from form fields
const generateSystemPrompt = (values: {
  basePrompt: string;
  scoringCriteria: string;
  analysisGuidance: string;
  replyStyle: string;
}) => {
  const basePrompt = values.basePrompt?.trim() || "You are an AI assistant analyzing Reddit content for sentiment about AI technology.";
  const scoringCriteria = values.scoringCriteria?.trim() || "10 indicates high relevance and strong negative sentiment about AI";
  const analysisGuidance = values.analysisGuidance?.trim() || "a brief explanation of why you gave this score";
  const replyStyle = values.replyStyle?.trim() || "a courteous and factual 1-2 sentence reply that addresses their concerns";

  return `${basePrompt}
Please analyze the following text and respond with a JSON object containing:
{
  "score": number between 1-10 where ${scoringCriteria},
  "analysis": ${analysisGuidance},
  "suggestedReply": ${replyStyle}
}`;
};

// Helper function to parse system prompt into form fields
const parseSystemPrompt = (prompt: string) => {
  const defaultValues = {
    basePrompt: "You are an AI assistant analyzing Reddit content for sentiment about AI technology.",
    scoringCriteria: "10 indicates high relevance and strong negative sentiment about AI",
    analysisGuidance: "a brief explanation of why you gave this score",
    replyStyle: "a courteous and factual 1-2 sentence reply that addresses their concerns"
  };

  if (!prompt) return defaultValues;

  // Try to extract values from the prompt
  const basePromptMatch = prompt.match(/^(.*?)(?=\n\nPlease analyze)/s);
  const scoringMatch = prompt.match(/"score":\s*number between 1-10 where\s*(.*?)(?=,)/);
  const analysisMatch = prompt.match(/"analysis":\s*(.*?)(?=,)/);
  const replyMatch = prompt.match(/"suggestedReply":\s*(.*?)(?=\n*})/);

  return {
    basePrompt: basePromptMatch?.[1]?.trim() || defaultValues.basePrompt,
    scoringCriteria: scoringMatch?.[1]?.trim() || defaultValues.scoringCriteria,
    analysisGuidance: analysisMatch?.[1]?.trim() || defaultValues.analysisGuidance,
    replyStyle: replyMatch?.[1]?.trim() || defaultValues.replyStyle,
  };
};

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

  const configForm = useForm<Config & {
    basePrompt: string;
    scoringCriteria: string;
    analysisGuidance: string;
    replyStyle: string;
  }>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      scoreThreshold: 7,
      checkFrequency: 60,
      postsPerFetch: 25,
      openAiPrompt: "",
      basePrompt: "",
      scoringCriteria: "",
      analysisGuidance: "",
      replyStyle: "",
    }
  });

  // Update form values when config is loaded
  React.useEffect(() => {
    if (config) {
      const promptFields = parseSystemPrompt(config.openAiPrompt);
      configForm.reset({
        ...config,
        ...promptFields
      });
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
    mutationFn: (data: Config & {
      basePrompt: string;
      scoringCriteria: string;
      analysisGuidance: string;
      replyStyle: string;
    }) => {
      // Generate the system prompt from the form fields
      const systemPrompt = generateSystemPrompt({
        basePrompt: data.basePrompt || '',
        scoringCriteria: data.scoringCriteria || '',
        analysisGuidance: data.analysisGuidance || '',
        replyStyle: data.replyStyle || ''
      });

      // Send only the Config fields to the API
      return apiRequest("PUT", "/api/config", {
        scoreThreshold: data.scoreThreshold,
        checkFrequency: data.checkFrequency,
        postsPerFetch: data.postsPerFetch,
        openAiPrompt: systemPrompt
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      toast({ title: "Settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive"
      });
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
                          <Input type="number" min={1} max={10} {...field} />
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
                        <FormLabel>Check Frequency (hours)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0.5} 
                            max={12} 
                            step={0.5}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                        <FormDescription>
                          How often to check for new content (0.5 to 12 hours)
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={configForm.control}
                    name="postsPerFetch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Posts to Fetch per Subreddit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={5}
                            max={100}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <FormDescription>
                          Number of posts and comments to fetch from each subreddit (5-100)
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="ai-settings">
                      <AccordionTrigger className="text-lg font-semibold">
                        AI Analysis Settings
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <FormField
                          control={configForm.control}
                          name="basePrompt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>AI Assistant Role</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Define the AI assistant's role and context..."
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Describe the role and context for the AI assistant
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={configForm.control}
                          name="scoringCriteria"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Scoring Criteria</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Define what different scores mean..."
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Explain how the 1-10 score should be determined
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={configForm.control}
                          name="analysisGuidance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Analysis Guidelines</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Specify what the analysis should include..."
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Define what aspects should be included in the content analysis
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={configForm.control}
                          name="replyStyle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reply Style Guidelines</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Define how replies should be formatted..."
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Specify the tone, length, and style for suggested replies
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <Button type="submit" disabled={updateConfigMutation.isPending}>
                    {updateConfigMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
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
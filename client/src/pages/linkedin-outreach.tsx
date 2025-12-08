import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Linkedin, Mail, Send, Sparkles, Search, ArrowLeft, User, Briefcase, MapPin, Building, History, RotateCcw, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LinkedInAuthModal } from "@/components/linkedin-auth-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArchivesTable } from "@/components/ArchivesTable";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LinkedInProfile {
    name: string;
    headline: string;
    about: string;
    posts: string[];
    skills: string[];
    email?: string;
}

interface SearchResult {
    id: string;
    name: string;
    headline: string;
    location?: string;
    summary?: string;
    currentCompany?: string;
    experience?: string;
    activity: string;
    avatar: string;
    url: string;
}

interface EmailDraft {
    subject: string;
    body: string;
}

interface ScrapedProfile {
    id: string;
    name: string;
    headline: string;
    location: string;
    url: string;
    email: string | null;
    scrapedAt: string;
}

export default function LinkedInOutreach() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Authentication State
    const [authModalOpen, setAuthModalOpen] = useState(false);

    // Search State
    const [searchMode, setSearchMode] = useState(() => {
        const saved = localStorage.getItem("linkedin_searchMode");
        return saved ? JSON.parse(saved) : true;
    });
    const [jobTitle, setJobTitle] = useState(() => localStorage.getItem("linkedin_jobTitle") || "");
    const [industry, setIndustry] = useState(() => localStorage.getItem("linkedin_industry") || "");
    const [keywords, setKeywords] = useState(() => localStorage.getItem("linkedin_keywords") || "");
    const [searchResults, setSearchResults] = useState<SearchResult[]>(() => {
        const saved = localStorage.getItem("linkedin_searchResults");
        return saved ? JSON.parse(saved) : [];
    });

    // Analysis State
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(() => localStorage.getItem("linkedin_selectedProfileId"));
    const [profile, setProfile] = useState<LinkedInProfile | null>(() => {
        const saved = localStorage.getItem("linkedin_profile");
        return saved ? JSON.parse(saved) : null;
    });
    const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
    const [productContext, setProductContext] = useState("");

    // Persist state changes
    useEffect(() => {
        localStorage.setItem("linkedin_searchMode", JSON.stringify(searchMode));
        localStorage.setItem("linkedin_jobTitle", jobTitle);
        localStorage.setItem("linkedin_industry", industry);
        localStorage.setItem("linkedin_keywords", keywords);
        localStorage.setItem("linkedin_searchResults", JSON.stringify(searchResults));
        if (selectedProfileId) localStorage.setItem("linkedin_selectedProfileId", selectedProfileId);
        else localStorage.removeItem("linkedin_selectedProfileId");
        if (profile) localStorage.setItem("linkedin_profile", JSON.stringify(profile));
        else localStorage.removeItem("linkedin_profile");
    }, [searchMode, jobTitle, industry, keywords, searchResults, selectedProfileId, profile]);

    // Check LinkedIn authentication status
    const { data: authStatus, refetch: refetchAuthStatus } = useQuery<{ connected: boolean }>({
        queryKey: ["/api/linkedin/auth/status"],
        refetchInterval: 30000,
    });

    // Fetch archived profiles
    const { data: archives } = useQuery<ScrapedProfile[]>({
        queryKey: ["/api/linkedin/archives"],
    });

    const searchMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/linkedin/search", {
                jobTitle,
                industry,
                keywords
            });
            return res.json();
        },
        onSuccess: (data) => {
            const results = data.results || [];
            setSearchResults(results);

            if (data.message) {
                toast({
                    title: "Search Complete",
                    description: data.message,
                    variant: "default"
                });
            } else if (results.length > 0) {
                toast({
                    title: "Search Complete",
                    description: `Found ${results.length} profiles`,
                });
            }
        },
    });

    const scrapeMutation = useMutation({
        mutationFn: async (item: SearchResult) => {
            const res = await apiRequest("POST", "/api/linkedin/scrape", {
                url: item.url,
                profileId: item.id
            });
            return res.json();
        },
        onSuccess: (data) => {
            setProfile(data);
            setSearchMode(false);
            queryClient.invalidateQueries({ queryKey: ["/api/linkedin/archives"] });
            toast({
                title: "Profile Analyzed",
                description: `Found ${data.skills?.length || 0} skills, ${data.posts?.length || 0} recent posts`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to Load Profile",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const generateEmailMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/linkedin/generate-email", {
                profile,
                productContext,
            });
            return res.json();
        },
        onSuccess: (data) => {
            setEmailDraft(data);
            toast({
                title: "Email Generated",
                description: "AI has drafted a personalized email.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Generation Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const sendEmailMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/linkedin/send-email", {
                to: profile?.email || "mock-recipient@example.com",
                subject: emailDraft?.subject,
                body: emailDraft?.body,
                profile: profile
            });
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Email Sent",
                description: "The email has been queued for sending.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Sending Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleSelectProfile = (item: SearchResult) => {
        setSelectedProfileId(item.id);
        scrapeMutation.mutate(item);
    };

    const handleBackToSearch = () => {
        setSearchMode(true);
        setProfile(null);
        setEmailDraft(null);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">LinkedIn Outreach</h1>
                    <p className="text-muted-foreground mt-2">
                        Find prospects, analyze profiles, and generate AI cold emails.
                    </p>
                </div>
                <div className="flex gap-2">
                    {authStatus?.connected && (
                        <Button variant="outline" onClick={() => setAuthModalOpen(true)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Manage Connection
                        </Button>
                    )}
                    {!searchMode && (
                        <Button variant="outline" onClick={handleBackToSearch}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Search
                        </Button>
                    )}
                </div>
            </div>

            {/* LinkedIn Auth Modal */}
            <LinkedInAuthModal
                open={authModalOpen}
                onOpenChange={setAuthModalOpen}
                onSuccess={() => refetchAuthStatus()}
            />

            <Tabs defaultValue="search" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="search">Search & Analyze</TabsTrigger>
                    <TabsTrigger value="archives">Archives</TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="mt-6">
                    {!authStatus?.connected ? (
                        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-slate-50">
                            <div className="text-center space-y-4">
                                <div className="bg-white p-4 rounded-full shadow-sm inline-block">
                                    <Linkedin className="h-12 w-12 text-[#0077b5]" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-semibold">Connect your LinkedIn Account</h3>
                                    <p className="text-muted-foreground max-w-md mx-auto">
                                        To search and analyze profiles, you need to connect your LinkedIn account first.
                                        We use a secure, headless browser session.
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={() => setAuthModalOpen(true)}
                                className="mt-6 bg-[#0077b5] hover:bg-[#006399]"
                            >
                                <Linkedin className="mr-2 h-4 w-4" />
                                Connect LinkedIn
                            </Button>
                        </div>
                    ) : (
                        searchMode ? (
                            <div className="grid gap-6 lg:grid-cols-3">
                                {/* Search Filters */}
                                <Card className="lg:col-span-1 h-fit">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Search className="h-5 w-5 text-primary" />
                                            Search Filters
                                        </CardTitle>
                                        <CardDescription>
                                            Define your ideal customer profile.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Job Title</label>
                                            <Input
                                                placeholder="e.g. VP Sales, CTO"
                                                value={jobTitle}
                                                onChange={(e) => setJobTitle(e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">Use "Title - Company" format (e.g., "VP Sales - Microsoft") to filter by company</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Industry</label>
                                            <Input
                                                placeholder="e.g. SaaS, Fintech"
                                                value={industry}
                                                onChange={(e) => setIndustry(e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">Not currently used by search API</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Location</label>
                                            <Input
                                                placeholder="e.g. Bangalore, Mumbai, New York"
                                                value={keywords}
                                                onChange={(e) => setKeywords(e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">City or country name (auto-converted to geocode)</p>
                                        </div>

                                        {/* Search Guidelines */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                                            <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-1">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Search Tips
                                            </h4>
                                            <ul className="text-xs text-blue-800 space-y-1 ml-5 list-disc">
                                                <li>Use <strong>"Title - Company"</strong> to filter by company (e.g., "CTO - Google")</li>
                                                <li>Enter <strong>city or country</strong> for location (auto-geocoded)</li>
                                                <li>Only shows <strong>accessible profiles</strong> (free tier limitation)</li>
                                                <li>Fewer results = better quality data</li>
                                            </ul>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                className="flex-1"
                                                onClick={() => searchMutation.mutate()}
                                                disabled={searchMutation.isPending}
                                            >
                                                {searchMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <Search className="h-4 w-4 mr-2" />
                                                )}
                                                Find Prospects
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => {
                                                    setJobTitle("");
                                                    setIndustry("");
                                                    setKeywords("");
                                                    setSearchResults([]);
                                                    localStorage.removeItem("linkedin_jobTitle");
                                                    localStorage.removeItem("linkedin_industry");
                                                    localStorage.removeItem("linkedin_keywords");
                                                    localStorage.removeItem("linkedin_searchResults");
                                                }}
                                                title="Reset Search"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Search Results */}
                                <div className="lg:col-span-2 space-y-4">
                                    <h3 className="text-lg font-semibold">
                                        {searchResults.length > 0 ? `Found ${searchResults.length} Prospects` : "Results will appear here"}
                                    </h3>

                                    {searchResults.length === 0 && !searchMutation.isPending && (
                                        <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                                            <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                            <p>Enter filters and search to find leads.</p>
                                        </div>
                                    )}

                                    {/* Loading state */}
                                    {searchMutation.isPending && (
                                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                            <Loader2 className="h-12 w-12 mx-auto mb-3 text-primary animate-spin" />
                                            <p className="text-muted-foreground font-medium">Searching LinkedIn...</p>
                                            <p className="text-xs text-muted-foreground mt-2">This may take 15-30 seconds</p>
                                        </div>
                                    )}

                                    <div className="grid gap-4">
                                        {searchResults.map((result) => (
                                            <Card key={result.id} className="hover:shadow-md transition-shadow">
                                                <CardContent className="p-4 flex items-start gap-4">
                                                    <Avatar className="h-12 w-12">
                                                        {result.avatar && result.avatar.startsWith('http') ? (
                                                            <img
                                                                src={result.avatar}
                                                                alt={result.name}
                                                                loading="lazy"
                                                                className="h-full w-full object-cover rounded-full"
                                                            />
                                                        ) : (
                                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                                {result.name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        )}
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-semibold text-lg truncate">{result.name}</h4>
                                                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                                    <Briefcase className="h-3 w-3" />
                                                                    {result.headline}
                                                                </p>
                                                                {result.currentCompany && (
                                                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                                        <Building className="h-3 w-3" />
                                                                        {result.currentCompany}
                                                                    </p>
                                                                )}
                                                                {result.experience && (
                                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                                        <History className="h-3 w-3" />
                                                                        {result.experience}
                                                                    </p>
                                                                )}
                                                                {result.location && (
                                                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                                        <MapPin className="h-3 w-3" />
                                                                        {result.location}
                                                                    </p>
                                                                )}
                                                                {result.summary && (
                                                                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                                                        {result.summary}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleSelectProfile(result)}
                                                                disabled={scrapeMutation.isPending && selectedProfileId === result.id}
                                                            >
                                                                {scrapeMutation.isPending && selectedProfileId === result.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                ) : (
                                                                    <Sparkles className="h-4 w-4 mr-2" />
                                                                )}
                                                                Analyze
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Analysis View
                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* Profile Analysis */}
                                <Card className="h-fit">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="h-5 w-5 text-primary" />
                                            Profile Analysis
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {scrapeMutation.isPending ? (
                                            <div className="text-center py-12">
                                                <Loader2 className="h-12 w-12 mx-auto mb-3 text-primary animate-spin" />
                                                <p className="text-muted-foreground font-medium">Analyzing profile...</p>
                                                <p className="text-xs text-muted-foreground mt-2">Extracting insights and contact info</p>
                                            </div>
                                        ) : profile ? (
                                            <div className="space-y-6">
                                                <div className="flex items-start gap-4">
                                                    <Avatar className="h-16 w-16">
                                                        {profile.profileImageUrl && profile.profileImageUrl.startsWith('http') ? (
                                                            <img
                                                                src={profile.profileImageUrl}
                                                                alt={profile.name}
                                                                loading="lazy"
                                                                className="h-full w-full object-cover rounded-full"
                                                            />
                                                        ) : (
                                                            <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                                                                {profile.name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        )}
                                                    </Avatar>
                                                    <div>
                                                        <h3 className="text-xl font-bold">{profile.name}</h3>
                                                        <p className="text-muted-foreground">{profile.headline}</p>
                                                        {profile.email && (
                                                            <div className="mt-2 flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full w-fit">
                                                                <Mail className="h-3 w-3" />
                                                                {profile.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold mb-2">About</h4>
                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                        {profile.about}
                                                    </p>
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold mb-2">Key Skills</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {profile.skills.map((skill, i) => (
                                                            <Badge key={i} variant="secondary">
                                                                {skill}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold mb-2">Recent Activity</h4>
                                                    <ul className="space-y-2">
                                                        {profile.posts.slice(0, 3).map((post, i) => (
                                                            <li key={i} className="text-sm text-muted-foreground bg-slate-50 p-3 rounded-md">
                                                                "{post.substring(0, 100)}..."
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        ) : null}
                                    </CardContent>
                                </Card>

                                {/* Email Generator */}
                                <Card className="h-fit">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Sparkles className="h-5 w-5 text-primary" />
                                            AI Email Generator
                                        </CardTitle>
                                        <CardDescription>
                                            Personalized outreach based on profile analysis.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Product/Service Context</label>
                                            <Textarea
                                                placeholder="Describe what you're offering..."
                                                value={productContext}
                                                onChange={(e) => setProductContext(e.target.value)}
                                                rows={3}
                                            />
                                        </div>

                                        <Button
                                            className="w-full"
                                            onClick={() => generateEmailMutation.mutate()}
                                            disabled={generateEmailMutation.isPending || !profile}
                                        >
                                            {generateEmailMutation.isPending ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <Sparkles className="h-4 w-4 mr-2" />
                                            )}
                                            Generate Draft
                                        </Button>

                                        {emailDraft && (
                                            <div className="space-y-4 mt-4 pt-4 border-t">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Subject</label>
                                                    <Input value={emailDraft.subject} readOnly />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Body</label>
                                                    <Textarea
                                                        value={emailDraft.body}
                                                        readOnly
                                                        rows={8}
                                                        className="font-mono text-sm"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button className="flex-1" variant="outline" onClick={() => {
                                                        navigator.clipboard.writeText(`${emailDraft.subject}\n\n${emailDraft.body}`);
                                                        toast({ title: "Copied to clipboard" });
                                                    }}>
                                                        Copy to Clipboard
                                                    </Button>
                                                    <Button className="flex-1">
                                                        <Send className="h-4 w-4 mr-2" />
                                                        Send Email
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )
                    )
                    }
                </TabsContent >

                <TabsContent value="archives" className="mt-6">
                    <ArchivesTable />
                </TabsContent>
            </Tabs >
        </div >
    );
}

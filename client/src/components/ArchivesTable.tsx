import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Mail, Linkedin, Sparkles, Search, X, ChevronDown, ChevronRight, MapPin, Building } from "lucide-react";

interface ScrapedProfile {
    id: string;
    name: string;
    headline: string | null;
    company: string | null;
    location: string;
    url: string;
    email: string | null;
    emailConfidence?: number;
    avatar?: string | null;
    about?: string | null;
    skills?: string[] | null;
    scrapedAt: string;
}

const PROFILES_PER_PAGE = 20;

export function ArchivesTable() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [enrichingProfileId, setEnrichingProfileId] = useState<string | null>(null);

    const { data: archives } = useQuery<ScrapedProfile[]>({
        queryKey: ["/api/linkedin/archives"],
    });

    const enrichEmailMutation = useMutation({
        mutationFn: async (profileId: string) => {
            setEnrichingProfileId(profileId);
            const res = await apiRequest("POST", `/api/linkedin/enrich/${profileId}`, {});
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/linkedin/archives"] });
            toast({
                title: "Email Enriched",
                description: "The profile has been enriched with email data.",
            });
            setEnrichingProfileId(null);
        },
        onError: (error: Error) => {
            toast({
                title: "Enrichment Failed",
                description: error.message,
                variant: "destructive",
            });
            setEnrichingProfileId(null);
        },
    });

    // Filter archives based on search query
    const filteredArchives = archives?.filter(profile => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            profile.name.toLowerCase().includes(query) ||
            profile.company?.toLowerCase().includes(query) ||
            profile.headline?.toLowerCase().includes(query)
        );
    }) || [];

    // Calculate pagination
    const totalProfiles = filteredArchives.length;
    const totalPages = Math.ceil(totalProfiles / PROFILES_PER_PAGE);
    const startIndex = (currentPage - 1) * PROFILES_PER_PAGE;
    const paginatedArchives = filteredArchives.slice(startIndex, startIndex + PROFILES_PER_PAGE);

    const toggleExpand = (profileId: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(profileId)) {
            newExpanded.delete(profileId);
        } else {
            newExpanded.add(profileId);
        }
        setExpandedRows(newExpanded);
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1); // Reset to first page on search
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Archived Profiles</CardTitle>
                <CardDescription>
                    History of scraped profiles and extracted emails.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Search Input */}
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by name, company, or title..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-10 pr-10"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => handleSearchChange("")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Headline</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>LinkedIn URL</TableHead>
                            <TableHead>Scraped At</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedArchives.map((profile) => {
                            const isExpanded = expandedRows.has(profile.id);

                            return (
                                <Fragment key={profile.id}>
                                    <TableRow
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => toggleExpand(profile.id)}
                                    >
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleExpand(profile.id);
                                                }}
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    {profile.avatar && profile.avatar.startsWith('http') ? (
                                                        <img
                                                            src={profile.avatar}
                                                            alt={profile.name}
                                                            loading="lazy"
                                                            className="h-full w-full object-cover rounded-full"
                                                        />
                                                    ) : (
                                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                            {profile.name.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    )}
                                                </Avatar>
                                                <div>
                                                    <a
                                                        href={profile.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:text-primary hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {profile.name}
                                                    </a>
                                                    {profile.emailConfidence && profile.emailConfidence >= 75 && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 ml-2">
                                                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                            Verified
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate" title={profile.headline || ""}>{profile.headline}</TableCell>
                                        <TableCell>
                                            {profile.email ? (
                                                <span className="text-green-600 font-medium flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />
                                                    {profile.email}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <a
                                                href={profile.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline flex items-center gap-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Linkedin className="h-3 w-3" />
                                                View Profile
                                            </a>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(profile.scrapedAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            {!profile.email && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => enrichEmailMutation.mutate(profile.id)}
                                                    disabled={enrichingProfileId === profile.id}
                                                >
                                                    {enrichingProfileId === profile.id ? (
                                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                    ) : (
                                                        <Sparkles className="h-3 w-3 mr-1" />
                                                    )}
                                                    Enrich
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>

                                    {isExpanded && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="bg-muted/30 p-6">
                                                <div className="space-y-4">
                                                    {profile.headline && (
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-muted-foreground mb-1">Headline</h4>
                                                            <p className="text-sm">{profile.headline}</p>
                                                        </div>
                                                    )}

                                                    {profile.location && (
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-muted-foreground mb-1">Location</h4>
                                                            <p className="text-sm flex items-center gap-1">
                                                                <MapPin className="h-3 w-3" />
                                                                {profile.location}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {profile.company && (
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-muted-foreground mb-1">Company</h4>
                                                            <p className="text-sm flex items-center gap-1">
                                                                <Building className="h-3 w-3" />
                                                                {profile.company}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {profile.about && (
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-muted-foreground mb-1">About</h4>
                                                            <p className="text-sm whitespace-pre-wrap">{profile.about}</p>
                                                        </div>
                                                    )}

                                                    {profile.skills && profile.skills.length > 0 && (
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-muted-foreground mb-1">Skills</h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {profile.skills.map((skill, index) => (
                                                                    <span key={index} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                                        {skill}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 pt-2">
                                                        <a
                                                            href={profile.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                                                        >
                                                            <Linkedin className="h-3 w-3" />
                                                            View Full LinkedIn Profile
                                                        </a>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            );
                        })}
                        {filteredArchives.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    {searchQuery ? "No profiles found matching your search." : "No profiles archived yet."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages} ({totalProfiles} profile{totalProfiles !== 1 ? 's' : ''})
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Users, Search as SearchIcon, Loader2, ExternalLink, Briefcase, MapPin, Sparkles, X, ChevronLeft, ChevronRight } from "lucide-react";

interface SearchCriteria {
    jobTitle?: string;
    industry?: string;
    keywords?: string;
    company?: string;
}

interface ProfileHistory {
    id: number;
    profileId: string;
    profileUrl: string;
    name: string;
    headline?: string;
    location?: string;
    avatar?: string;
    viewedAt: string;
}

interface GroupedHistory {
    searchKey: string;
    searchCriteria: SearchCriteria;
    profiles: ProfileHistory[];
    viewedAt: string;
    count: number;
}

interface HistoryStats {
    total: number;
    uniqueSearches: number;
    lastViewed?: string;
}

interface HistoryTabProps {
    onAnalyzeProfile: (profileUrl: string, profileId: string, name: string) => void;
    isAnalyzing?: boolean;
}

export function HistoryTab({ onAnalyzeProfile, isAnalyzing = false }: HistoryTabProps) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Applied filters (only update when user clicks Apply)
    const [appliedStartDate, setAppliedStartDate] = useState("");
    const [appliedEndDate, setAppliedEndDate] = useState("");

    // Search and pagination state
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const PROFILES_PER_PAGE = 20;

    // Fetch history stats
    const { data: stats, isLoading: statsLoading } = useQuery<HistoryStats>({
        queryKey: ["/api/linkedin/history/stats"],
    });

    // Fetch grouped history with APPLIED date filters
    const queryParams = new URLSearchParams();
    if (appliedStartDate) queryParams.append("startDate", appliedStartDate);
    if (appliedEndDate) queryParams.append("endDate", appliedEndDate);
    const historyUrl = `/api/linkedin/history${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const { data: groupedHistory, isLoading: historyLoading } = useQuery<GroupedHistory[]>({
        queryKey: [historyUrl],
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const applyFilters = () => {
        setAppliedStartDate(startDate);
        setAppliedEndDate(endDate);
    };

    const resetFilters = () => {
        setStartDate("");
        setEndDate("");
        setAppliedStartDate("");
        setAppliedEndDate("");
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1); // Reset to first page on search
    };

    // Filter all profiles across all groups by search query
    const filteredHistory = groupedHistory?.map(group => ({
        ...group,
        profiles: group.profiles.filter(profile => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                profile.name.toLowerCase().includes(query) ||
                profile.headline?.toLowerCase().includes(query) ||
                profile.location?.toLowerCase().includes(query)
            );
        })
    })).filter(group => group.profiles.length > 0) || [];

    // Calculate total profiles for pagination info 
    const totalProfiles = filteredHistory.reduce((sum, group) => sum + group.profiles.length, 0);
    const totalPages = Math.ceil(filteredHistory.length / PROFILES_PER_PAGE);

    // Paginate groups
    const startIndex = (currentPage - 1) * PROFILES_PER_PAGE;
    const paginatedHistory = filteredHistory.slice(startIndex, startIndex + PROFILES_PER_PAGE);

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Profiles</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.total || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Viewed across all searches</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unique Searches</CardTitle>
                        <SearchIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.uniqueSearches || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Different search criteria</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Last Viewed</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-bold">
                            {statsLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : stats?.lastViewed ? (
                                formatDate(stats.lastViewed)
                            ) : (
                                "No data"
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">Most recent profile view</p>
                    </CardContent>
                </Card>
            </div>

            {/* Date Range Filter */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filter by Date Range</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">Start Date</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">End Date</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <Button onClick={applyFilters} disabled={!startDate && !endDate}>
                            Apply Filters
                        </Button>
                        {(appliedStartDate || appliedEndDate) && (
                            <Button variant="outline" onClick={resetFilters}>
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Search Input */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search profiles by name, headline, or location..."
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
                </CardContent>
            </Card>

            {/* Grouped History */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Search History</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                All profiles you've viewed, grouped by search criteria
                            </p>
                        </div>
                        {searchQuery && (
                            <div className="text-sm text-muted-foreground">
                                {totalProfiles} profile{totalProfiles !== 1 ? 's' : ''} found
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {historyLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : !groupedHistory || groupedHistory.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <SearchIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            {searchQuery ? (
                                <>
                                    <p>No profiles found matching "{searchQuery}"</p>
                                    <p className="text-sm mt-2">Try adjusting your search or filters.</p>
                                </>
                            ) : (
                                <>
                                    <p>No search history found.</p>
                                    {(startDate || endDate) && (
                                        <p className="text-sm mt-2">Try adjusting your date range filters.</p>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
                            {paginatedHistory.map((group, index) => (
                                <AccordionItem key={index} value={`item-${index}`}>
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {group.searchKey}
                                                </Badge>
                                                <Badge variant="secondary">{group.count} profiles</Badge>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(group.viewedAt)}
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-3 pt-2">
                                            {/* Search Criteria Summary */}
                                            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                                                <p className="font-semibold text-slate-700">Search Criteria:</p>
                                                <div className="grid grid-cols-2 gap-2 text-slate-600">
                                                    {group.searchCriteria.jobTitle && (
                                                        <div>
                                                            <span className="font-medium">Job Title:</span> {group.searchCriteria.jobTitle}
                                                        </div>
                                                    )}
                                                    {group.searchCriteria.industry && (
                                                        <div>
                                                            <span className="font-medium">Industry:</span> {group.searchCriteria.industry}
                                                        </div>
                                                    )}
                                                    {group.searchCriteria.keywords && (
                                                        <div>
                                                            <span className="font-medium">Location:</span> {group.searchCriteria.keywords}
                                                        </div>
                                                    )}
                                                    {group.searchCriteria.company && (
                                                        <div>
                                                            <span className="font-medium">Company:</span> {group.searchCriteria.company}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Profiles List */}
                                            <div className="grid gap-3">
                                                {group.profiles.map((profile) => (
                                                    <div
                                                        key={profile.id}
                                                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                                                    >
                                                        <Avatar className="h-10 w-10">
                                                            {profile.avatar && profile.avatar.startsWith('http') ? (
                                                                <img
                                                                    src={profile.avatar}
                                                                    alt={profile.name}
                                                                    loading="lazy"
                                                                    className="h-full w-full object-cover rounded-full"
                                                                />
                                                            ) : (
                                                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                                                                    {profile.name.substring(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            )}
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1">
                                                                    <a
                                                                        href={profile.profileUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="font-semibold hover:text-primary hover:underline inline-flex items-center gap-1"
                                                                    >
                                                                        {profile.name}
                                                                        <ExternalLink className="h-3 w-3" />
                                                                    </a>
                                                                    {profile.headline && (
                                                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                                            <Briefcase className="h-3 w-3" />
                                                                            {profile.headline}
                                                                        </p>
                                                                    )}
                                                                    {profile.location && (
                                                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                                            <MapPin className="h-3 w-3" />
                                                                            {profile.location}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col items-end gap-2">
                                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                        {formatDate(profile.viewedAt)}
                                                                    </span>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => onAnalyzeProfile(profile.profileUrl, profile.profileId, profile.name)}
                                                                        disabled={isAnalyzing}
                                                                    >
                                                                        {isAnalyzing ? (
                                                                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                                        ) : (
                                                                            <Sparkles className="h-3 w-3 mr-1" />
                                                                        )}
                                                                        Analyze
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t">
                            <div className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages} ({filteredHistory.length} search group{filteredHistory.length !== 1 ? 's' : ''}, {totalProfiles} profile{totalProfiles !== 1 ? 's' : ''})
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

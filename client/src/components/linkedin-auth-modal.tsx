import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Linkedin, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LinkedInAuthModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

interface AuthStatus {
    connected: boolean;
    expiresAt?: string;
    lastUsedAt?: string;
}

export function LinkedInAuthModal({ open, onOpenChange, onSuccess }: LinkedInAuthModalProps) {
    const { toast } = useToast();
    const [authStep, setAuthStep] = useState<"idle" | "authenticating" | "success" | "error">("idle");

    // Check authentication status
    const { data: authStatus, refetch: refetchStatus } = useQuery<AuthStatus>({
        queryKey: ["/api/linkedin/auth/status"],
        enabled: open,
    });

    const loginMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/linkedin/auth/login", {});
            return res.json();
        },
        onMutate: () => {
            setAuthStep("authenticating");
        },
        onSuccess: (data) => {
            if (data.success) {
                setAuthStep("success");
                toast({
                    title: "LinkedIn Connected!",
                    description: data.message,
                });
                refetchStatus();
                onSuccess?.();
                setTimeout(() => {
                    onOpenChange(false);
                    setAuthStep("idle");
                }, 2000);
            } else {
                setAuthStep("error");
                toast({
                    title: "Authentication Failed",
                    description: data.message,
                    variant: "destructive",
                });
            }
        },
        onError: (error: Error) => {
            setAuthStep("error");
            toast({
                title: "Authentication Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/linkedin/auth/logout", {});
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Disconnected",
                description: "LinkedIn session cleared",
            });
            refetchStatus();
            setAuthStep("idle");
        },
        onError: (error: Error) => {
            toast({
                title: "Logout Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const formatDate = (dateString?: string) => {
        if (!dateString) return "Unknown";
        const date = new Date(dateString);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    };

    const isExpiringSoon = (expiresAt?: string) => {
        if (!expiresAt) return false;
        const expires = new Date(expiresAt);
        const now = new Date();
        const daysUntilExpiry = (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry < 7;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Linkedin className="h-5 w-5 text-[#0077b5]" />
                        LinkedIn Authentication
                    </DialogTitle>
                    <DialogDescription>
                        Connect your LinkedIn account to enable profile scraping
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Current Status */}
                    {authStatus?.connected ? (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm font-medium text-green-900">Connected</p>
                                    <div className="text-xs text-green-700 space-y-1">
                                        {authStatus.lastUsedAt && (
                                            <p>Last used: {formatDate(authStatus.lastUsedAt)}</p>
                                        )}
                                        {authStatus.expiresAt && (
                                            <p>
                                                Expires: {formatDate(authStatus.expiresAt)}
                                                {isExpiringSoon(authStatus.expiresAt) && (
                                                    <Badge variant="outline" className="ml-2 text-yellow-700 border-yellow-300">
                                                        Expiring Soon
                                                    </Badge>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-start gap-3">
                                <XCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Not Connected</p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Connect your LinkedIn account to start scraping profiles
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Authentication Steps */}
                    {authStep === "authenticating" && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 animate-in fade-in">
                            <div className="flex items-start gap-3">
                                <Loader2 className="h-5 w-5 text-blue-600 animate-spin mt-0.5" />
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-blue-900">Opening Browser...</p>
                                    <p className="text-xs text-blue-700">
                                        A browser window will open. Please log in to your LinkedIn account.
                                    </p>
                                    <p className="text-xs text-blue-600">
                                        After logging in, the window will close automatically and your session will be saved.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {authStep === "error" && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 animate-in fade-in">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-900">Authentication Failed</p>
                                    <p className="text-xs text-red-700 mt-1">
                                        Please try again or check your LinkedIn credentials
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                        <h4 className="text-sm font-semibold text-blue-900 mb-2">How it works:</h4>
                        <ul className="text-xs text-blue-800 space-y-1.5 ml-4 list-disc">
                            <li>A browser window opens to LinkedIn's login page</li>
                            <li>You log in with your LinkedIn credentials</li>
                            <li>Your session is securely stored (cookies only)</li>
                            <li>All searches use your authenticated session</li>
                            <li>Session typically lasts 30 days</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    {authStatus?.connected ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="w-full sm:w-auto"
                            >
                                Close
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => logoutMutation.mutate()}
                                disabled={logoutMutation.isPending}
                                className="w-full sm:w-auto"
                            >
                                {logoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Disconnect
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => loginMutation.mutate()}
                                disabled={loginMutation.isPending || authStep === "authenticating"}
                                className="w-full sm:w-auto bg-[#0077b5] hover:bg-[#006399]"
                            >
                                {(loginMutation.isPending || authStep === "authenticating") && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                <Linkedin className="mr-2 h-4 w-4" />
                                Connect LinkedIn
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

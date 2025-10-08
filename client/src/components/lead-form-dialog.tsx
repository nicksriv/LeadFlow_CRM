import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertLeadSchema, type InsertLead, type Lead, type User, lineOfBusinessOptions } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Plus, X, Sparkles, Loader2 } from "lucide-react";

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead;
}

export function LeadFormDialog({ open, onOpenChange, lead }: LeadFormDialogProps) {
  const { toast } = useToast();
  
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const salesUsers = users.filter(u => u.role === "sales_rep" || u.role === "sales_manager");

  // Custom fields state management
  const [customFieldKey, setCustomFieldKey] = useState("");
  const [customFieldValue, setCustomFieldValue] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, any>>(
    (lead?.customFields as Record<string, any>) || {}
  );

  const form = useForm<InsertLead>({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      // Contact Information
      firstName: lead?.firstName || "",
      lastName: lead?.lastName || "",
      name: lead?.name || "",
      email: lead?.email || "",
      phone: lead?.phone || "",
      
      // Work Information
      position: lead?.position || "",
      department: lead?.department || "",
      industry: lead?.industry || "",
      experience: lead?.experience || "",
      
      // Social Profiles
      linkedinUrl: lead?.linkedinUrl || "",
      twitterUrl: lead?.twitterUrl || "",
      facebookUrl: lead?.facebookUrl || "",
      website: lead?.website || "",
      
      // Location Information
      city: lead?.city || "",
      state: lead?.state || "",
      country: lead?.country || "",
      
      // Company Information
      company: lead?.company || "",
      companyDomain: lead?.companyDomain || "",
      companyWebsite: lead?.companyWebsite || "",
      companyIndustry: lead?.companyIndustry || "",
      companySize: lead?.companySize || "",
      companyRevenue: lead?.companyRevenue || "",
      companyFoundedYear: lead?.companyFoundedYear || undefined,
      companyLinkedin: lead?.companyLinkedin || "",
      companyPhone: lead?.companyPhone || "",
      
      // System Fields
      lineOfBusiness: (lead?.lineOfBusiness as typeof lineOfBusinessOptions[number]) || undefined,
      ownerId: lead?.ownerId || undefined,
      notes: lead?.notes || "",
      tags: lead?.tags || [],
      customFields: (lead?.customFields as Record<string, any>) || {},
    },
  });

  // Auto-generate full name from firstName and lastName
  useEffect(() => {
    const subscription = form.watch((value, { name: fieldName }) => {
      if (fieldName === "firstName" || fieldName === "lastName") {
        const firstName = value.firstName || "";
        const lastName = value.lastName || "";
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          form.setValue("name", fullName);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const addCustomField = () => {
    if (customFieldKey.trim() && customFieldValue.trim()) {
      const newFields = { ...customFields, [customFieldKey.trim()]: customFieldValue.trim() };
      setCustomFields(newFields);
      form.setValue("customFields", newFields);
      setCustomFieldKey("");
      setCustomFieldValue("");
    }
  };

  const removeCustomField = (key: string) => {
    const newFields = { ...customFields };
    delete newFields[key];
    setCustomFields(newFields);
    form.setValue("customFields", newFields);
  };

  const mutation = useMutation({
    mutationFn: async (data: InsertLead) => {
      if (lead) {
        return apiRequest("PATCH", `/api/leads/${lead.id}`, data);
      }
      return apiRequest("POST", "/api/leads", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: lead ? "Lead updated" : "Lead created",
        description: lead
          ? "The lead has been updated successfully."
          : "The lead has been added to your pipeline.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const screenshotMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      const response = await fetch("/api/integrations/linkedin/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extract data from screenshot");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Auto-fill form fields with extracted data
        const extractedData = data.data;
        if (extractedData.firstName) form.setValue("firstName", extractedData.firstName);
        if (extractedData.lastName) form.setValue("lastName", extractedData.lastName);
        if (extractedData.email) form.setValue("email", extractedData.email);
        if (extractedData.phone) form.setValue("phone", extractedData.phone);
        if (extractedData.position) form.setValue("position", extractedData.position);
        if (extractedData.industry) form.setValue("industry", extractedData.industry);
        if (extractedData.company) form.setValue("company", extractedData.company);
        if (extractedData.city) form.setValue("city", extractedData.city);
        if (extractedData.state) form.setValue("state", extractedData.state);
        if (extractedData.country) form.setValue("country", extractedData.country);
        if (extractedData.notes) form.setValue("notes", extractedData.notes);
        if (extractedData.companyIndustry) form.setValue("companyIndustry", extractedData.companyIndustry);
        if (extractedData.linkedinUrl) form.setValue("linkedinUrl", extractedData.linkedinUrl);
        
        toast({
          title: "Data Extracted Successfully",
          description: "LinkedIn screenshot data has been auto-filled!",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Extraction Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScreenshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix to get just the base64 string
      const base64Data = base64.split(',')[1];
      screenshotMutation.mutate(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: InsertLead) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
          <DialogDescription>
            {lead
              ? "Update the lead information below."
              : "Enter comprehensive details about your new lead."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Accordion type="multiple" defaultValue={["contact"]} className="w-full">
              {/* Contact Information */}
              <AccordionItem value="contact">
                <AccordionTrigger className="text-base font-semibold">Contact Information</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-first-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Doe"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-last-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              {...field}
                              data-testid="input-lead-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Work Information */}
              <AccordionItem value="work">
                <AccordionTrigger className="text-base font-semibold">Work Information</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Chief Technology Officer"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-position"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Engineering"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-department"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Technology"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-industry"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="10+ years"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-experience"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Social Profiles */}
              <AccordionItem value="social">
                <AccordionTrigger className="text-base font-semibold">Social Profiles</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  {/* LinkedIn Screenshot Upload */}
                  <div className="p-4 border border-dashed rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3 mb-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h4 className="font-medium">Auto-fill from LinkedIn Screenshot</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload a screenshot of a LinkedIn profile to automatically extract and fill lead information
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotUpload}
                        disabled={screenshotMutation.isPending}
                        className="cursor-pointer"
                        data-testid="input-screenshot-upload"
                      />
                      {screenshotMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="linkedinUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn URL</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://linkedin.com/in/johndoe"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-lead-linkedin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="twitterUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Twitter/X</FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://twitter.com/johndoe"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-twitter"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="twitterUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Twitter</FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://twitter.com/johndoe"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-twitter"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="facebookUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facebook</FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://facebook.com/johndoe"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-facebook"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://example.com"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-website"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Location Information */}
              <AccordionItem value="location">
                <AccordionTrigger className="text-base font-semibold">Location Information</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="San Francisco"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="California"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-state"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="United States"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-country"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Company Information */}
              <AccordionItem value="company">
                <AccordionTrigger className="text-base font-semibold">Company Information</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Acme Inc."
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-company"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyDomain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Domain</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="acme.com"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-company-domain"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="companyWebsite"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Website</FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://acme.com"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-company-website"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyIndustry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Industry</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Software"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-company-industry"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="companySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Size</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="50-100 employees"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-company-size"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyRevenue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Revenue</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="$10M - $50M"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-company-revenue"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="companyFoundedYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Founded Year</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="2015"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-lead-company-founded-year"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Phone</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-lead-company-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="companyLinkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company LinkedIn</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://linkedin.com/company/acme"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-lead-company-linkedin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Additional Information */}
              <AccordionItem value="additional">
                <AccordionTrigger className="text-base font-semibold">Additional Information</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="ownerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned To</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === "unassigned" ? undefined : value)}
                          value={field.value || "unassigned"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-lead-owner">
                              <SelectValue placeholder="Select owner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {salesUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name} ({user.role === "sales_manager" ? "Manager" : "Sales Rep"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any additional notes about this lead..."
                            {...field}
                            value={field.value || ""}
                            rows={4}
                            data-testid="input-lead-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <div>
                      <FormLabel>Custom Fields</FormLabel>
                      <FormDescription>
                        Add custom data fields for this lead
                      </FormDescription>
                    </div>
                    
                    {Object.keys(customFields).length > 0 && (
                      <div className="space-y-2">
                        {Object.entries(customFields).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center gap-2 p-2 rounded-md bg-muted"
                          >
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <span className="text-sm font-medium">{key}:</span>
                              <span className="text-sm text-muted-foreground">{String(value)}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCustomField(key)}
                              data-testid={`button-remove-custom-field-${key}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Input
                        placeholder="Field name"
                        value={customFieldKey}
                        onChange={(e) => setCustomFieldKey(e.target.value)}
                        data-testid="input-custom-field-key"
                      />
                      <Input
                        placeholder="Field value"
                        value={customFieldValue}
                        onChange={(e) => setCustomFieldValue(e.target.value)}
                        data-testid="input-custom-field-value"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addCustomField}
                        disabled={!customFieldKey.trim() || !customFieldValue.trim()}
                        data-testid="button-add-custom-field"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-submit-lead"
              >
                {mutation.isPending
                  ? "Saving..."
                  : lead
                  ? "Update Lead"
                  : "Create Lead"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

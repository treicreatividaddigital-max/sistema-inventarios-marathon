import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGarmentSchema, type Category, type GarmentType, type Collection, type Lot, type Rack, type Garment } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Loader2, Upload, Camera, X } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Extended schema for form validation
const formSchema = insertGarmentSchema.extend({
  code: z.string().min(3, "Code must be at least 3 characters"),
  size: z.string().min(1, "Size is required"),
  color: z.string().min(1, "Color is required"),
  gender: z.enum(["MALE", "FEMALE", "UNISEX"]),
  status: z.enum(["IN_STOCK", "IN_TRANSIT", "SOLD", "RESERVED", "DAMAGED"]),
  categoryId: z.string().uuid("Must select a category"),
  garmentTypeId: z.string().uuid("Must select a type"),
  collectionId: z.string().uuid("Must select a collection"),
  lotId: z.string().uuid("Must select a lot"),
  photoUrl: z.string().optional().nullable(),
}).omit({ createdById: true, qrUrl: true });

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
  { id: 1, title: "Basic Info", description: "Product details" },
  { id: 2, title: "Classification", description: "Category & type" },
  { id: 3, title: "Location", description: "Collection & rack" },
  { id: 4, title: "Photo", description: "Upload image" },
];

export default function CuratorEditGarmentPage() {
  const [, params] = useRoute("/curator/garment/:id/edit");
  const garmentId = params?.id;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const triggerNativeCameraCapture = () => cameraInputRef.current?.click();
  const [deletePhoto, setDeletePhoto] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Load garment data
  const { data: garment, isLoading: garmentLoading } = useQuery<Garment>({
    queryKey: [`/api/garments/${garmentId}`],
    enabled: !!garmentId,
  });

  // Load categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Load collections
  const { data: collections = [], isLoading: collectionsLoading } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
  });

  // Load racks
  const { data: racks = [], isLoading: racksLoading } = useQuery<Rack[]>({
    queryKey: ["/api/racks"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      size: "",
      color: "",
      gender: "UNISEX",
      status: "IN_STOCK",
      categoryId: "",
      garmentTypeId: "",
      collectionId: "",
      lotId: "",
      rackId: undefined,
      photoUrl: undefined,
    },
  });

  // Update form when garment data loads
  useEffect(() => {
    if (garment) {
      form.reset({
        code: garment.code,
        size: garment.size,
        color: garment.color,
        gender: garment.gender,
        status: garment.status,
        categoryId: garment.categoryId,
        garmentTypeId: garment.garmentTypeId,
        collectionId: garment.collectionId,
        lotId: garment.lotId,
        rackId: garment.rackId ?? undefined,
        photoUrl: garment.photoUrl ?? undefined,
      });
      
      // Set existing photo preview
      if (garment.photoUrl) {
        setPhotoPreview(garment.photoUrl);
      }
    }
  }, [garment, form]);

  const progress = (currentStep / STEPS.length) * 100;

  // Watch categoryId to load garment types
  const selectedCategoryId = form.watch("categoryId");
  const { data: garmentTypes = [] } = useQuery<GarmentType[]>({
    queryKey: ["/api/garment-types/by-category", selectedCategoryId],
    enabled: !!selectedCategoryId,
  });

  // Watch collectionId to load lots
  const selectedCollectionId = form.watch("collectionId");
  const { data: lots = [] } = useQuery<Lot[]>({
    queryKey: ["/api/lots/by-collection", selectedCollectionId],
    enabled: !!selectedCollectionId,
  });

  // Update garment mutation
  const updateGarmentMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const formData = new FormData();

      formData.append("code", data.code);
      formData.append("size", data.size);
      formData.append("color", data.color);
      formData.append("gender", data.gender);
      formData.append("status", data.status ?? "IN_STOCK");
      formData.append("categoryId", data.categoryId);
      formData.append("garmentTypeId", data.garmentTypeId);
      formData.append("collectionId", data.collectionId);

      if (data.lotId) formData.append("lotId", data.lotId);
      if (data.rackId) formData.append("rackId", data.rackId);

      // Handle photo logic
      if (deletePhoto) {
        // Delete photo by setting to null
        formData.append("photoUrl", "");
      } else if (photoFile) {
        // Upload new photo file
        formData.append("photo", photoFile);
      }
      // If neither deletePhoto nor photoFile, don't touch photoUrl (preserve existing)

      return await apiRequest("PATCH", `/api/garments/${garmentId}`, formData);
    },
    onSuccess: () => {
      toast({
        title: "Garment updated successfully",
        description: "The garment has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/garments"], exact: false });
      navigate(`/garment/${garment?.code}`);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error || "Unknown error occurred";
      console.error("Error updating garment:", error);
      toast({
        title: "Error updating garment",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const nextStep = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: FormValues) => {
    updateGarmentMutation.mutate(data);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Evitar fugas de memoria si el preview anterior era un blob: URL
    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    setDeletePhoto(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
      form.setValue("photoUrl", "");
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = async () => {
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    if (!hasGetUserMedia) {
      triggerNativeCameraCapture();
      return;
    }

    let stream: MediaStream | null = null;
    let video: HTMLVideoElement | null = null;

    const timeout = (ms: number, message: string) =>
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms));

    const waitForVideoReady = async (v: HTMLVideoElement, ms: number) => {
      const start = Date.now();
      while (true) {
        if (v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) return;
        if (Date.now() - start > ms) throw new Error("Camera warmup timeout");
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    };

    try {
      setIsCapturingPhoto(true);

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      video = document.createElement("video");
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");

      video.style.position = "fixed";
      video.style.left = "-9999px";
      video.style.top = "0";
      video.style.width = "1px";
      video.style.height = "1px";
      document.body.appendChild(video);

      await Promise.race([video.play(), timeout(4000, "Camera playback blocked")]);
      await waitForVideoReady(video, 4000);

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(video, 0, 0);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Could not encode image"))),
          "image/jpeg",
          0.85
        );
      });

      const previewUrl = URL.createObjectURL(blob);
      setPhotoPreview(previewUrl);

      const file = new File([blob], `capture-${Date.now()}.jpg`, {
        type: blob.type || "image/jpeg",
      });
      setPhotoFile(file);
      form.setValue("photoUrl", "");

      toast({
        title: "Photo captured",
        description: "Photo has been captured successfully",
      });
    } catch (error: any) {
      if (cameraInputRef.current) {
        triggerNativeCameraCapture();
        toast({
          title: "Using phone camera",
          description: "If the in-app camera failed, we'll use your phone camera instead.",
        });
      } else {
        toast({
          title: "Camera error",
          description: error?.message || "Could not access camera",
          variant: "destructive",
        });
      }
    } finally {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (video && video.parentNode) video.parentNode.removeChild(video);
      setIsCapturingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
    setPhotoFile(null);
    setDeletePhoto(true);
    form.setValue("photoUrl", null);
  };

  if (garmentLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!garment) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/curator")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">Garment Not Found</h1>
            <p className="text-muted-foreground mt-2">
              The garment you're looking for doesn't exist
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-4">
        <Button type="button" variant="ghost" size="icon" onClick={() => navigate(`/garment/${garment.code}`)} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold">Edit Garment</h1>
          <p className="text-muted-foreground mt-2">
            Update garment information for {garment.code}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium">
            Step {currentStep} of {STEPS.length}
          </p>
          <p className="text-sm text-muted-foreground">
            {STEPS[currentStep - 1].title}
          </p>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={`flex-1 min-w-[120px] p-3 rounded-lg border transition-colors ${
              step.id === currentStep
                ? "bg-primary/10 border-primary"
                : step.id < currentStep
                ? "bg-muted border-border"
                : "bg-background border-border"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {step.id < currentStep ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              ) : (
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                    step.id === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.id}
                </div>
              )}
              <p className="text-sm font-medium">{step.title}</p>
            </div>
            <p className="text-xs text-muted-foreground ml-7">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
              <CardDescription>
                {STEPS[currentStep - 1].description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentStep === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Garment Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="GAR-2024-001"
                            data-testid="input-code"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Unique identifier for this garment
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-6 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Size</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-size">
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="XS">XS</SelectItem>
                              <SelectItem value="S">S</SelectItem>
                              <SelectItem value="M">M</SelectItem>
                              <SelectItem value="L">L</SelectItem>
                              <SelectItem value="XL">XL</SelectItem>
                              <SelectItem value="XXL">XXL</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Navy Blue"
                              data-testid="input-color"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-gender">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MALE">Male</SelectItem>
                              <SelectItem value="FEMALE">Female</SelectItem>
                              <SelectItem value="UNISEX">Unisex</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="IN_STOCK">In Stock</SelectItem>
                            <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                            <SelectItem value="SOLD">Sold</SelectItem>
                            <SelectItem value="RESERVED">Reserved</SelectItem>
                            <SelectItem value="DAMAGED">Damaged</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {currentStep === 2 && (
                <>
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoriesLoading ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : categories.length === 0 ? (
                              <SelectItem value="empty" disabled>No categories available</SelectItem>
                            ) : (
                              categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="garmentTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Garment Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedCategoryId}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {!selectedCategoryId ? (
                              <SelectItem value="disabled" disabled>First select category</SelectItem>
                            ) : garmentTypes.length === 0 ? (
                              <SelectItem value="empty" disabled>No types available</SelectItem>
                            ) : (
                              garmentTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {currentStep === 3 && (
                <>
                  <FormField
                    control={form.control}
                    name="collectionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collection</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-collection">
                              <SelectValue placeholder="Select collection" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {collectionsLoading ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : collections.length === 0 ? (
                              <SelectItem value="empty" disabled>No collections available</SelectItem>
                            ) : (
                              collections.map((col) => (
                                <SelectItem key={col.id} value={col.id}>
                                  {col.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lotId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lot</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedCollectionId}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-lot">
                              <SelectValue placeholder="Select lot" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {!selectedCollectionId ? (
                              <SelectItem value="disabled" disabled>First select collection</SelectItem>
                            ) : lots.length === 0 ? (
                              <SelectItem value="empty" disabled>No lots available</SelectItem>
                            ) : (
                              lots.map((lot) => (
                                <SelectItem key={lot.id} value={lot.id}>
                                  {lot.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rackId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rack (Optional)</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value === "none" ? undefined : value);
                          }}
                          value={field.value ?? "none"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-rack">
                              <SelectValue placeholder="No rack assigned" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No rack</SelectItem>
                            {racksLoading ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : (
                              racks.map((rack) => (
                                <SelectItem key={rack.id} value={rack.id}>
                                  {rack.name} {rack.zone ? `(${rack.zone})` : ""}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Assign to a storage location
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="photoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Photo (Optional)</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            {photoPreview ? (
                              <div className="relative aspect-[3/4] max-w-sm mx-auto">
                                <img
                                  src={photoPreview}
                                  alt="Preview"
                                  className="w-full h-full object-cover rounded-lg"
                                />
                                <div className="absolute top-2 right-2 flex gap-2">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleRemovePhoto}
                                    data-testid="button-remove-photo"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <label className="flex flex-col items-center justify-center w-full aspect-[3/4] max-w-sm mx-auto border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                  <div className="flex flex-col items-center justify-center py-8">
                                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-sm font-medium mb-1">
                                      Click to upload
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      PNG, JPG up to 10MB
                                    </p>
                                  </div>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    data-testid="input-photo"
                                  />
                                </label>
                                <input
                                  ref={cameraInputRef}
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={handlePhotoChange}
                                  data-testid="input-camera"
                                />
                                <div className="flex justify-center">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCameraCapture}
                                    disabled={isCapturingPhoto}
                                    data-testid="button-camera"
                                  >
                                    {isCapturingPhoto ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Opening camera...
                                      </>
                                    ) : (
                                      <>
                                        <Camera className="mr-2 h-4 w-4" />
                                        Take Photo
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          {garment.photoUrl && !deletePhoto && !photoFile
                            ? "Current photo is shown above. You can replace or remove it."
                            : "Optional: Upload or capture a photo of the garment"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => prevStep(e)}
              disabled={currentStep === 1}
              data-testid="button-previous"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={(e) => nextStep(e)}
                data-testid="button-next"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={updateGarmentMutation.isPending}
                data-testid="button-submit"
              >
                {updateGarmentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Update Garment
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn, invalidateGarmentQueries, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, X } from "lucide-react";

const formSchema = z.object({
  size: z.string().min(1, "Size is required"),
  color: z.string().min(1, "Color is required"),
  gender: z.enum(["MALE", "FEMALE", "UNISEX"]),
  status: z.enum(["IN_STOCK", "IN_TRANSIT", "SOLD", "RESERVED", "DAMAGED"]),
  categoryId: z.string().min(1, "Category is required"),
  garmentTypeId: z.string().min(1, "Type is required"),
  collectionId: z.string().min(1, "Collection is required"),
  lotId: z.string().min(1, "Lot is required"),
  rackId: z.string().optional(), // permitimos "" para "No rack"
  description: z.string().optional(), // Notes
});

type FormValues = z.infer<typeof formSchema>;
type PhotoItem = { file: File; previewUrl: string };

function makePreviewUrl(file: File) {
  return URL.createObjectURL(file);
}

export default function CuratorEditGarment() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const isReadOnly = user?.role === "ADMIN" || user?.role === "USER";
  const canDeleteGarment = user?.isMasterCurator === true;

  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<PhotoItem[]>([]);

  const [confirmState, setConfirmState] = useState<
    | { open: false }
    | { open: true; kind: "remove-existing"; index: number }
    | { open: true; kind: "remove-new"; index: number }
    | { open: true; kind: "clear-all" }
    | { open: true; kind: "delete-garment" }
  >({ open: false });

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const garmentQuery = useQuery<any>({
    queryKey: ["/api/garments", id],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: Boolean(id),
  });

  const categoriesQuery = useQuery({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const collectionsQuery = useQuery({
    queryKey: ["/api/collections"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const racksQuery = useQuery({
    queryKey: ["/api/racks"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const garment = garmentQuery.data as any;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      size: "",
      color: "",
      gender: "UNISEX",
      status: "IN_STOCK",
      categoryId: "",
      garmentTypeId: "",
      collectionId: "",
      lotId: "",
      rackId: "",
      description: "",
    },
  });

  const categoryId = form.watch("categoryId");
  const collectionId = form.watch("collectionId");

  const garmentTypesQuery = useQuery({
    queryKey: ["/api/garment-types/by-category", categoryId],
    enabled: !!categoryId,
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const lotsQuery = useQuery({
    queryKey: ["/api/lots/by-collection", collectionId],
    enabled: !!collectionId,
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Cascada solo cuando el usuario cambia (no durante reset inicial)
  const allowCascadeRef = useRef(false);

  function resolveId(obj: any, directKey: string, nestedKey: string) {
    const direct = obj?.[directKey];
    if (typeof direct === "string" && direct.length > 0) return direct;

    const nested = obj?.[nestedKey]?.id;
    if (typeof nested === "string" && nested.length > 0) return nested;

    return "";
  }

  useEffect(() => {
    if (!allowCascadeRef.current) return;
    form.setValue("garmentTypeId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  useEffect(() => {
    if (!allowCascadeRef.current) return;
    form.setValue("lotId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId]);

  // Hidrata form + fotos desde garment (sin disparar cascada)
  useEffect(() => {
    if (!garment) return;

    allowCascadeRef.current = false;

    const categoryIdResolved = resolveId(garment, "categoryId", "category");
    const garmentTypeIdResolved = resolveId(garment, "garmentTypeId", "garmentType");
    const collectionIdResolved = resolveId(garment, "collectionId", "collection");
    const lotIdResolved = resolveId(garment, "lotId", "lot");
    const rackIdResolved = resolveId(garment, "rackId", "rack");

    form.reset({
      size: garment.size || "",
      color: garment.color || "",
      gender: garment.gender || "UNISEX",
      status: garment.status || "IN_STOCK",
      categoryId: categoryIdResolved,
      garmentTypeId: garmentTypeIdResolved,
      collectionId: collectionIdResolved,
      lotId: lotIdResolved,
      rackId: rackIdResolved,
      // Notes: allow empty string to remain empty; do not use || here.
      description: typeof garment.description === "string" ? garment.description : "",
    });

    const urls = Array.isArray(garment.photoUrls)
      ? garment.photoUrls
      : garment.photoUrl
        ? [garment.photoUrl]
        : [];

    setExistingPhotoUrls(urls.slice(0, 4));

    // React Hook Form actualiza watchers async; re-activar cascada luego del reset
    setTimeout(() => {
      allowCascadeRef.current = true;
    }, 0);
  }, [garment, form]);

  const remainingSlots = 4 - existingPhotoUrls.length - newPhotos.length;

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    if (remainingSlots <= 0) {
      toast({ title: "Max 4 photos", description: "Remove a photo to add a new one." });
      return;
    }

    setNewPhotos((prev) => {
      const slots = Math.max(0, 4 - existingPhotoUrls.length - prev.length);
      if (slots <= 0) return prev;

      const toAdd = list.slice(0, slots).map((file) => ({
        file,
        previewUrl: makePreviewUrl(file),
      }));

      return [...prev, ...toAdd];
    });

    if (list.length > remainingSlots) {
      toast({ title: "Some photos were skipped", description: "You can only have 4 photos per garment." });
    }
  };

  // Limpieza de previews al desmontar
  useEffect(() => {
    return () => {
      newPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Metadata JSON patch (incluye Notes/description)
      const payload = {
        size: values.size,
        color: values.color,
        gender: values.gender,
        status: values.status,
        categoryId: values.categoryId,
        garmentTypeId: values.garmentTypeId,
        collectionId: values.collectionId,
        lotId: values.lotId,
        // Siempre enviar (permite quitar)
        rackId: values.rackId ?? "",
        // Siempre enviar (permite editar/borrar Notes)
        description: values.description ?? "",
      };

      return apiRequest("PATCH", `/api/garments/${id}`, payload);
    },
    onSuccess: async () => {
      invalidateGarmentQueries();
      await queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/garments",
      });
      await garmentQuery.refetch();
      toast({ title: "Saved" });
    },
    onError: (err: any) => {
      toast({
        title: "Update failed",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const quickSavePhotosMutation = useMutation({
    mutationFn: async (urls: string[]) => apiRequest("PATCH", `/api/garments/${id}`, { photoUrls: urls }),
    onSuccess: async () => {
      invalidateGarmentQueries();
      await queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/garments",
      });
      await garmentQuery.refetch();
      toast({ title: "Photos updated" });
    },
    onError: (err: any) => {
      toast({ title: "Photo update failed", description: err?.message || "Unknown error", variant: "destructive" });
    },
  });

  const uploadPhotosMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();

      // kept URLs (las existentes)
      fd.append("photoUrls", JSON.stringify(existingPhotoUrls));

      // nuevas fotos
      newPhotos.forEach((p) => fd.append("photos", p.file));

      // IMPORTANT: backend must implement PATCH /api/garments/:id/photos (multipart)
      return apiRequest("PATCH", `/api/garments/${id}/photos`, fd);
    },
    onSuccess: async (updated: any) => {
      // refrescar estado local (si el endpoint devuelve garment hidratado)
      const urls = Array.isArray(updated?.photoUrls)
        ? updated.photoUrls
        : updated?.photoUrl
          ? [updated.photoUrl]
          : [];

      setExistingPhotoUrls(urls.slice(0, 4));

      newPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setNewPhotos([]);

      invalidateGarmentQueries();
      await queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/garments",
      });
      await garmentQuery.refetch();

      toast({ title: "Photos updated" });
    },
    onError: (err: any) => {
      toast({
        title: "Photo upload failed",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/garments/${id}`),
    onSuccess: () => {
      invalidateGarmentQueries();
      toast({ title: "Deleted", description: "Garment deleted" });
      setLocation("/curator");
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err?.message || "Unknown error", variant: "destructive" });
    },
  });

  const combinedPreviews = useMemo(() => {
    const existing = existingPhotoUrls.map((url) => ({ kind: "existing" as const, url }));
    const pending = newPhotos.map((p) => ({ kind: "new" as const, url: p.previewUrl }));
    return [...existing, ...pending].slice(0, 4);
  }, [existingPhotoUrls, newPhotos]);

  const openRemoveExisting = (index: number) => setConfirmState({ open: true, kind: "remove-existing", index });
  const openRemoveNew = (index: number) => setConfirmState({ open: true, kind: "remove-new", index });
  const openClearAll = () => setConfirmState({ open: true, kind: "clear-all" });
  const openDeleteGarment = () => setConfirmState({ open: true, kind: "delete-garment" });

  const handleConfirm = async () => {
    if (!confirmState.open) return;

    if (confirmState.kind === "remove-existing") {
      const idx = confirmState.index;
      const next = existingPhotoUrls.filter((_, i) => i !== idx);
      setExistingPhotoUrls(next);
      await quickSavePhotosMutation.mutateAsync(next);
    }

    if (confirmState.kind === "remove-new") {
      const idx = confirmState.index;
      setNewPhotos((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        const removed = prev[idx];
        if (removed) URL.revokeObjectURL(removed.previewUrl);
        return next;
      });
    }

    if (confirmState.kind === "clear-all") {
      setExistingPhotoUrls([]);
      newPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setNewPhotos([]);
      await quickSavePhotosMutation.mutateAsync([]);
    }

    if (confirmState.kind === "delete-garment") {
      await deleteMutation.mutateAsync();
    }

    setConfirmState({ open: false });
  };

  if (isReadOnly) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Access restricted</h1>
        <p className="text-sm text-muted-foreground">Your role is read-only.</p>
      </div>
    );
  }

  if (garmentQuery.isLoading) return <div className="p-6">Loading...</div>;
  if (garmentQuery.error) return <div className="p-6">Failed to load garment</div>;
  if (!garment) return <div className="p-6">Garment not found</div>;

  const garmentTypes = (Array.isArray(garmentTypesQuery.data) ? garmentTypesQuery.data : []) as any[];
  const lots = (Array.isArray(lotsQuery.data) ? lotsQuery.data : []) as any[];

  const currentTypeId = form.watch("garmentTypeId") || "";
  const currentLotId = form.watch("lotId") || "";

  const fallbackGarmentType = garment?.garmentType;
  const fallbackLot = garment?.lot;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit garment</h1>
          <p className="text-sm text-muted-foreground">
            Code: <span className="font-mono">{garment.code}</span>
          </p>
        </div>

        {canDeleteGarment && (
          <Button variant="destructive" onClick={openDeleteGarment}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Photos (max 4)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{existingPhotoUrls.length + newPhotos.length} / 4</div>
            <Button
              variant="outline"
              onClick={openClearAll}
              disabled={existingPhotoUrls.length + newPhotos.length === 0}
            >
              Clear all
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {combinedPreviews.map((p, idx) => (
              <div key={`${p.kind}-${p.url}`} className="relative rounded-md overflow-hidden border bg-muted">
                <img src={p.url} alt={`photo ${idx + 1}`} className="w-full h-40 object-cover" />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  type="button"
                  onClick={() => {
                    if (p.kind === "existing") openRemoveExisting(idx);
                    else openRemoveNew(idx - existingPhotoUrls.length);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {Array.from({ length: Math.max(0, 4 - combinedPreviews.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="rounded-md border border-dashed h-40 bg-muted/30" />
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={remainingSlots <= 0}
            >
              Take photo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => uploadInputRef.current?.click()}
              disabled={remainingSlots <= 0}
            >
              Upload files
            </Button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(async (values) => {
                await updateMutation.mutateAsync(values);
                if (newPhotos.length > 0) {
                  await uploadPhotosMutation.mutateAsync();
                }
              })}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Size</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                      </FormControl>
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
                        <Input {...field} placeholder="e.g. Blue" />
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
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
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

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="IN_STOCK">In stock</SelectItem>
                          <SelectItem value="IN_TRANSIT">In transit</SelectItem>
                          <SelectItem value="SOLD">Sold</SelectItem>
                          <SelectItem value="RESERVED">Reserved</SelectItem>
                          <SelectItem value="DAMAGED">Damaged</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(categoriesQuery.data as any[] | undefined)?.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
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
                  name="garmentTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        key={`type:${String(field.value ?? "")}:${garmentTypes.length}`}
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        disabled={!categoryId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={categoryId ? "Select type" : "Select category first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fallbackGarmentType &&
                            currentTypeId &&
                            !garmentTypes.some((t: any) => t.id === currentTypeId) && (
                              <SelectItem value={currentTypeId}>{fallbackGarmentType.name}</SelectItem>
                            )}

                          {garmentTypes.map((t: any) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
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
                  name="collectionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select collection" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(collectionsQuery.data as any[] | undefined)?.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
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
                  name="lotId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lot</FormLabel>
                      <Select
                        key={`lot:${String(field.value ?? "")}:${lots.length}`}
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        disabled={!collectionId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={collectionId ? "Select lot" : "Select collection first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fallbackLot &&
                            currentLotId &&
                            !lots.some((l: any) => l.id === currentLotId) && (
                              <SelectItem value={currentLotId}>
                                {fallbackLot.code} — {fallbackLot.name}
                              </SelectItem>
                            )}

                          {lots.map((l: any) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.code} — {l.name}
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
                  name="rackId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rack (optional)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "__NONE__" ? "" : v)} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rack" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__NONE__">No rack</SelectItem>
                          {(racksQuery.data as any[] | undefined)?.map((r: any) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.code} — {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setLocation("/curator")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <AlertDialog open={confirmState.open} onOpenChange={(open) => setConfirmState(open ? confirmState : { open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmState.open && confirmState.kind === "delete-garment" ? "Delete garment" : "Confirm"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmState.open && confirmState.kind === "delete-garment" && "This action cannot be undone."}
              {confirmState.open && confirmState.kind === "clear-all" && "Remove all photos from this garment?"}
              {confirmState.open &&
                (confirmState.kind === "remove-existing" || confirmState.kind === "remove-new") &&
                "Remove this photo?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmState({ open: false })}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

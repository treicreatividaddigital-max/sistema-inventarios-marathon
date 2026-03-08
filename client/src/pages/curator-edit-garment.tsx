import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn, invalidateGarmentQueries } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, X } from "lucide-react";

const formSchema = z.object({
  // code no se puede cambiar (lo mostramos como readonly)
  size: z.string().min(1, "Size is required"),
  color: z.string().min(1, "Color is required"),
  gender: z.enum(["MALE", "FEMALE", "UNISEX"]),
  status: z.enum(["IN_STOCK", "IN_TRANSIT", "SOLD", "RESERVED", "DAMAGED"]),
  categoryId: z.string().min(1, "Category is required"),
  garmentTypeId: z.string().min(1, "Type is required"),
  collectionId: z.string().min(1, "Collection is required"),
  yearId: z.string().optional(),
  lotId: z.string().min(1, "Lot is required"),
  rackId: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type PhotoItem = { file: File; previewUrl: string };
type CustomFieldDef = { id: string; key: string; label: string; isRequired?: boolean; options: { id: string; value: string; label: string }[] };

function makePreviewUrl(file: File) {
  return URL.createObjectURL(file);
}

export default function CuratorEditGarment() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const isCurator = user?.role === "CURATOR";
  const isReadOnly = user?.role === "ADMIN" || user?.role === "USER";

  // Server will still enforce master curator via PRIMARY_CURATOR_EMAIL.
  const canDeleteGarment = user?.isMasterCurator === true;

  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<PhotoItem[]>([]);
  const [customAttributes, setCustomAttributes] = useState<Record<string, string>>({});

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
const yearsQuery = useQuery({
    queryKey: ["/api/years"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

const customFieldsQuery = useQuery<CustomFieldDef[]>({
    queryKey: ["/api/custom-fields/garment"],
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
      yearId: "",
      lotId: "",
      rackId: "",
      description: "",
    },
  });

  const collectionId = form.watch("collectionId");

  const garmentTypesQuery = useQuery({
    queryKey: ["/api/garment-types"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const lotsQuery = useQuery({
    queryKey: ["/api/lots/by-collection", collectionId],
    enabled: !!collectionId,
    queryFn: getQueryFn({ on401: "throw" }),
  });
  // Cascada (EDIT): no limpiar en el primer render (mantener valores del garment cargado)
  const didInitCascade = useRef(false);

  useEffect(() => {
    if (!didInitCascade.current) return;
    form.setValue("lotId", "");
  }, [collectionId]);

  useEffect(() => {
    didInitCascade.current = true;
  }, []);




  // Sincronizamos el form y las fotos al cargar la prenda
  useEffect(() => {
    if (!garment) return;

    form.reset({
      size: garment.size || "",
      color: garment.color || "",
      gender: garment.gender || "UNISEX",
      status: garment.status || "IN_STOCK",
      categoryId: garment.categoryId || "",
      garmentTypeId: garment.garmentTypeId || "",
      collectionId: garment.collectionId || "",
      yearId: garment.yearId || "",
      lotId: garment.lotId || "",
      rackId: garment.rackId || "",
      description: garment.description || "",
    });

    // Preferimos photoUrls; si por compatibilidad sólo viene photoUrl, lo convertimos.
    const urls = Array.isArray(garment.photoUrls)
      ? garment.photoUrls
      : garment.photoUrl
        ? [garment.photoUrl]
        : [];
    setExistingPhotoUrls(urls.slice(0, 4));
    setCustomAttributes(garment.customAttributes && typeof garment.customAttributes === "object" ? garment.customAttributes : {});
  }, [garment, form]);

  const remainingSlots = 4 - existingPhotoUrls.length - newPhotos.length;

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    // UX fast-fail
    if (remainingSlots <= 0) {
      toast({ title: "Max 4 photos", description: "Remove a photo to add a new one." });
      return;
    }

    // Guardrail: never exceed 4 total previews even if triggered rapidly.
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

  // Limpieza de previews cuando removemos fotos nuevas
  useEffect(() => {
    return () => {
      newPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const missingRequired = (customFieldsQuery.data ?? []).find((field) => field.isRequired && !customAttributes[field.key]);
      if (missingRequired) throw new Error(`${missingRequired.label} is required`);

      const fd = new FormData();

      // Campos de formulario
      fd.append("size", values.size);
      fd.append("color", values.color);
      fd.append("gender", values.gender);
      fd.append("status", values.status);
      fd.append("categoryId", values.categoryId);
      fd.append("garmentTypeId", values.garmentTypeId);
      fd.append("collectionId", values.collectionId);
      if (values.yearId) fd.append("yearId", values.yearId);
      fd.append("lotId", values.lotId);
      if (values.rackId) fd.append("rackId", values.rackId);
      if (values.description) fd.append("description", values.description);

      fd.append("customAttributes", JSON.stringify(customAttributes));

      // Lista actual de URLs que queremos conservar.
      // Nota: en esta opción A NO borramos físicamente del storage (GCS o disco).
      fd.append("photoUrls", JSON.stringify(existingPhotoUrls));

      // Nuevos archivos
      newPhotos.forEach((p) => fd.append("photos", p.file));

      const res = await apiRequest("PATCH", `/api/garments/${id}`, fd);
      return res;
    },
    onSuccess: () => {
      invalidateGarmentQueries();
      toast({ title: "Saved", description: "Garment updated" });
      // Luego de guardar, limpiamos los nuevos y recargamos desde server
      newPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setNewPhotos([]);
      garmentQuery.refetch();
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err?.message || "Unknown error", variant: "destructive" });
    },
  });

  const quickSavePhotosMutation = useMutation({
    // Persistimos cambios de fotos existentes (remove / clear) inmediatamente
    mutationFn: async (urls: string[]) => {
      const res = await apiRequest("PATCH", `/api/garments/${id}`, {
        photoUrls: urls,
      });
      return res;
    },
    onSuccess: () => {
      invalidateGarmentQueries();
      garmentQuery.refetch();
      toast({ title: "Photos updated" });
    },
    onError: (err: any) => {
      toast({ title: "Photo update failed", description: err?.message || "Unknown error", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/garments/${id}`);
      return res;
    },
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
        // revoke preview
        const removed = prev[idx];
        if (removed) URL.revokeObjectURL(removed.previewUrl);
        return next;
      });
    }

    if (confirmState.kind === "clear-all") {
      // Limpia URLs existentes (persistente) y fotos nuevas (local)
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

  // Guard UI: ADMIN/USER should not edit via direct URL
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit garment</h1>
          <p className="text-sm text-muted-foreground">Code: <span className="font-mono">{garment.code}</span></p>
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
            <div className="text-sm text-muted-foreground">
              {existingPhotoUrls.length + newPhotos.length} / 4
            </div>
            <Button variant="outline" onClick={openClearAll} disabled={(existingPhotoUrls.length + newPhotos.length) === 0}>
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
                  onClick={() => {
                    if (p.kind === "existing") {
                      const existingIdx = idx; // existing URLs are first in combined list
                      openRemoveExisting(existingIdx);
                    } else {
                      const newIdx = idx - existingPhotoUrls.length;
                      openRemoveNew(newIdx);
                    }
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {/* placeholders para completar grid 2x2 */}
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

          <p className="text-xs text-muted-foreground">
            Notes: In QA/local we can store in disk. In production, backend can store in Google Cloud Storage (GCS) when GCS_BUCKET is set.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Size</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. M" />
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(categoriesQuery.data as any[] | undefined)?.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select independent type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(garmentTypesQuery.data as any[] | undefined)?.map((t: any) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select collection" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(collectionsQuery.data as any[] | undefined)?.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                <FormField
                  control={form.control}
                  name="yearId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year (optional)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "__NONE__" ? "" : v)} value={field.value || "__NONE__"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__NONE__">No year</SelectItem>
                          {(yearsQuery.data as any[] | undefined)?.map((y: any) => (
                            <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select lot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(lotsQuery.data as any[] | undefined)?.map((l: any) => (
                            <SelectItem key={l.id} value={l.id}>{l.code} — {l.name}</SelectItem>
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
                      <Select onValueChange={(v) => field.onChange(v === "__NONE__" ? "" : v)} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rack" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__NONE__">No rack</SelectItem>
                          {(racksQuery.data as any[] | undefined)?.map((r: any) => (
                            <SelectItem key={r.id} value={r.id}>{r.code} — {r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {(customFieldsQuery.data ?? []).map((field) => (
                <FormItem key={field.id}>
                  <FormLabel>{field.label}{field.isRequired ? " *" : ""}</FormLabel>
                  <Select
                    onValueChange={(value) => setCustomAttributes((prev) => ({ ...prev, [field.key]: value === "__NONE__" ? "" : value }))}
                    value={customAttributes[field.key] || "__NONE__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__NONE__">No value</SelectItem>
                      {(field.options ?? []).map((option) => (
                        <SelectItem key={option.id} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              ))}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Notes..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setLocation("/curator")}>Cancel</Button>
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
              {confirmState.open && (confirmState.kind === "remove-existing" || confirmState.kind === "remove-new") && "Remove this photo?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmState({ open: false })}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

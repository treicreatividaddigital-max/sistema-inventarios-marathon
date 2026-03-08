// client/src/pages/curator-new-garment.tsx
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, getQueryFn, invalidateGarmentQueries } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useAuth } from "@/lib/auth-context";
import SearchableSelect from "@/components/ui/searchable-select";

// 3 pasos: datos base, ubicación, fotos
const formSchema = z.object({
  // El código se autogenera. El backend también lo genera si no se envía.
  code: z.string().optional(),
  size: z.string().min(1, "Size is required"),
  color: z.string().min(1, "Color is required"),
  gender: z.enum(["MALE", "FEMALE", "UNISEX"]),
  status: z.enum(["IN_STOCK", "IN_TRANSIT", "SOLD", "RESERVED", "DAMAGED"]).default("IN_STOCK"),
  categoryId: z.string().min(1, "Category is required"),
  garmentTypeId: z.string().min(1, "Garment type is required"),
  collectionId: z.string().min(1, "Collection is required"),
  yearId: z.string().optional(),
  lotId: z.string().min(1, "Lot is required"),
  rackId: z.string().min(1, "Rack is required"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;
type PhotoItem = { file: File; previewUrl: string };
type CustomFieldDef = { id: string; key: string; label: string; isRequired?: boolean; options: { id: string; value: string; label: string }[] };

const SIZE_OPTIONS = [
  { value: "XS", label: "XS" },
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
];

export default function CuratorNewGarment() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // === Estado de fotos (máximo 4) ===
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [removeIdx, setRemoveIdx] = useState<number | null>(null);
  const [customAttributes, setCustomAttributes] = useState<Record<string, string>>({});

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const filesInputRef = useRef<HTMLInputElement | null>(null);

  // Limpieza de previews
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      size: "M", // default
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

  useEffect(() => {
    form.setValue("lotId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId]);

  // 1) Traer el siguiente código automáticamente
  const nextCodeQuery = useQuery<{ code: string }>({
    queryKey: ["/api/garments/next-code"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  useEffect(() => {
    const code = nextCodeQuery.data?.code;
    if (!code) return;
    const current = form.getValues("code");
    if (!current) form.setValue("code", code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCodeQuery.data?.code]);

  // 2) Datos para selects
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: garmentTypes } = useQuery({
    queryKey: ["/api/garment-types"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: collections } = useQuery({
    queryKey: ["/api/collections"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: years } = useQuery({
    queryKey: ["/api/years"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: customFields } = useQuery<CustomFieldDef[]>({
    queryKey: ["/api/custom-fields/garment"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: lots } = useQuery({
    queryKey: ["/api/lots/by-collection", collectionId],
    enabled: !!collectionId,
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: racks } = useQuery({
    queryKey: ["/api/racks"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // --- Helpers fotos ---
  function addFiles(newFiles: File[]) {
    setPhotos((prev) => {
      const remaining = 4 - prev.length;
      if (remaining <= 0) return prev;

      const toAdd = newFiles.slice(0, remaining).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      return [...prev, ...toAdd];
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function onPickCamera() {
    cameraInputRef.current?.click();
  }

  function onPickFiles() {
    filesInputRef.current?.click();
  }

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const missingRequired = (customFields ?? []).find((field) => field.isRequired && !customAttributes[field.key]);
      if (missingRequired) throw new Error(`${missingRequired.label} is required`);

      const fd = new window.FormData();

      // Nota: el backend genera el code si viene vacío.
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (typeof value === "string" && value.trim() === "") return;
        fd.append(key, String(value));
      });

      fd.append("customAttributes", JSON.stringify(customAttributes));

      // Subimos hasta 4 fotos como "photos".
      photos.forEach((p) => fd.append("photos", p.file));

      return apiRequest("POST", "/api/garments", fd);
    },
    onSuccess: async () => {
      invalidateGarmentQueries();

      toast({
        title: "Garment created",
        description: "The garment has been created successfully.",
      });

      // Reset (mantener defaults)
      form.reset({
        code: "",
        size: "M",
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
      });

      setCustomAttributes({});

      // limpiar previews
      setPhotos((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        return [];
      });

      // Refrescar el próximo código para la siguiente creación
      await nextCodeQuery.refetch();

      setLocation("/curator");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Solo curador puede crear
  if (!user || user.role !== "CURATOR") {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You don&apos;t have permission to create garments.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>New Garment</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
              {/* CODE (autogenerado) */}
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Garment Code (auto)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled placeholder={nextCodeQuery.isLoading ? "Generating..." : ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SIZE */}
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select size"
                        options={SIZE_OPTIONS}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* COLOR */}
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

              {/* GENDER */}
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

              {/* STATUS */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
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

              {/* CATEGORY */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select category"
                        options={
                          ((categories as any[] | undefined) ?? []).map((c: any) => ({
                            value: c.id,
                            label: c.name,
                          })) ?? []
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* GARMENT TYPE */}
              <FormField
                control={form.control}
                name="garmentTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Garment Type</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select independent type"
                        disabled={false}
                        options={((garmentTypes as any[] | undefined) ?? []).map((t: any) => ({
                          value: t.id,
                          label: t.name,
                        }))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* COLLECTION */}
              <FormField
                control={form.control}
                name="collectionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select collection"
                        options={((collections as any[] | undefined) ?? []).map((c: any) => ({
                          value: c.id,
                          label: c.name,
                        }))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              {/* YEAR */}
              <FormField
                control={form.control}
                name="yearId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year (optional)</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Select year (optional)"
                        options={((years as any[] | undefined) ?? []).map((y: any) => ({
                          value: y.id,
                          label: String(y.year),
                        }))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* LOT */}
              <FormField
                control={form.control}
                name="lotId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={collectionId ? "Select lot" : "Select collection first"}
                        disabled={!collectionId}
                        options={((lots as any[] | undefined) ?? []).map((l: any) => ({
                          value: l.id,
                          label: l.name,
                        }))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* RACK */}
              <FormField
                control={form.control}
                name="rackId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rack</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select rack"
                        options={((racks as any[] | undefined) ?? []).map((r: any) => ({
                          value: r.id,
                          label: `${r.code} - ${r.name}`,
                        }))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(customFields ?? []).map((field) => (
                <FormItem key={field.id}>
                  <FormLabel>{field.label}{field.isRequired ? " *" : ""}</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={customAttributes[field.key] || ""}
                      onChange={(value) => setCustomAttributes((prev) => ({ ...prev, [field.key]: value }))}
                      placeholder={`Select ${field.label.toLowerCase()}`}
                      options={(field.options ?? []).map((option) => ({ value: option.value, label: option.label }))}
                    />
                  </FormControl>
                </FormItem>
              ))}

              {/* DESCRIPTION */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Notes..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* PHOTOS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Photos</div>
                  <div className="text-xs text-muted-foreground">{photos.length}/4</div>
                </div>

                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {photos.map((p, idx) => (
                      <div key={idx} className="relative overflow-hidden rounded-md border">
                        <img src={p.previewUrl} alt={`Photo ${idx + 1}`} className="h-32 w-full object-cover" />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute right-2 top-2"
                          onClick={() => setRemoveIdx(idx)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border p-4 text-sm text-muted-foreground">
                    Add up to 4 photos. You can use camera or upload files.
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={onPickCamera} disabled={photos.length >= 4}>
                    Take photo
                  </Button>
                  <Button type="button" variant="outline" onClick={onPickFiles} disabled={photos.length >= 4}>
                    Upload files
                  </Button>
                </div>

                {/* Hidden inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) addFiles([f]);
                    e.currentTarget.value = "";
                  }}
                />
                <input
                  ref={filesInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const list = Array.from(e.target.files || []);
                    if (list.length) addFiles(list);
                    e.currentTarget.value = "";
                  }}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setLocation("/curator")}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Confirmación de borrado de foto */}
      <AlertDialog open={removeIdx !== null} onOpenChange={(open) => !open && setRemoveIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove photo?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the photo from this new garment form.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeIdx !== null) removePhoto(removeIdx);
                setRemoveIdx(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
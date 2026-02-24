import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Tag, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
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
import { Badge } from "@/components/ui/badge";

type Category = {
  id: string;
  name: string;
};

type GarmentType = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string;
  category?: Category;
};

const typeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  categoryId: z.string().min(1, "Category is required"),
});

type TypeFormData = z.infer<typeof typeSchema>;

export default function CuratorTypesPage() {
  const { user } = useAuth();
  const isReadOnly = user?.role === "ADMIN" || user?.role === "USER";
  const canDeleteCatalog = user?.isMasterCurator === true;
  if (isReadOnly) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Types</h1>
          <p className="text-muted-foreground mt-2">Read-only access.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>Only curators can manage catalogs.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<GarmentType | null>(null);
  const [deletingType, setDeletingType] = useState<GarmentType | null>(null);

  const { data: types = [], isLoading } = useQuery<GarmentType[]>({
    queryKey: ["/api/garment-types"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<TypeFormData>({
    resolver: zodResolver(typeSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      categoryId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TypeFormData) => {
      return await apiRequest("POST", "/api/garment-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/garment-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Type created",
        description: "The garment type has been created successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating type",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TypeFormData }) => {
      return await apiRequest("PATCH", `/api/garment-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/garment-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Type updated",
        description: "The garment type has been updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingType(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating type",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/garment-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/garment-types"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/garments"] });
      toast({
        title: "Type deleted",
        description: "The garment type has been deleted successfully.",
      });
      setDeletingType(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting type",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
      setDeletingType(null);
    },
  });

  const handleOpenDialog = (type?: GarmentType) => {
    if (type) {
      setEditingType(type);
      form.reset({
        name: type.name,
        description: type.description || "",
        imageUrl: type.imageUrl || "",
        categoryId: type.categoryId,
      });
    } else {
      setEditingType(null);
      form.reset({
        name: "",
        description: "",
        imageUrl: "",
        categoryId: "",
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: TypeFormData) => {
    const cleanedData = {
      ...data,
      description: data.description || undefined,
      imageUrl: data.imageUrl || undefined,
    };

    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-muted-foreground">Loading types...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Garment Types</h1>
          <p className="text-muted-foreground mt-2">
            Manage garment type classifications
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-new-type">
          <Plus className="h-4 w-4 mr-2" />
          New Type
        </Button>
      </div>

      {types.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Tag className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No types yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first garment type
            </p>
            <Button className="mt-6" onClick={() => handleOpenDialog()} data-testid="button-create-first">
              <Plus className="h-4 w-4 mr-2" />
              Create Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {types.map((type) => {
            const category = categories.find((c) => c.id === type.categoryId);
            return (
              <Card key={type.id} data-testid={`card-type-${type.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex-1">{type.name}</CardTitle>
                    {category && (
                      <Badge variant="secondary" className="shrink-0">
                        {category.name}
                      </Badge>
                    )}
                  </div>
                  {type.description && (
                    <CardDescription className="line-clamp-2">
                      {type.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDialog(type)}
                    data-testid={`button-edit-${type.id}`}
                  >
                    <Pencil className="h-3 w-3 mr-2" />
                    Edit
                  </Button>
                  {canDeleteCatalog && (
                    <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setDeletingType(type)}
                    data-testid={`button-delete-${type.id}`}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-type-form">
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Garment Type" : "Create Garment Type"}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? "Update the garment type details below."
                : "Add a new garment type classification."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="T-Shirt" {...field} data-testid="input-name" />
                    </FormControl>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Short-sleeve performance top"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        {...field}
                        data-testid="input-image-url"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingType
                    ? "Update"
                    : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingType} onOpenChange={() => setDeletingType(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the garment type "{deletingType?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingType && deleteMutation.mutate(deletingType.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

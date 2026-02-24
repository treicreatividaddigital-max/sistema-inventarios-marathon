import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, LayoutGrid, Pencil, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

type Category = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  orderIndex: number;
};

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  orderIndex: z.number().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function CuratorCategoriesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      orderIndex: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      return await apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure New Garment sees updates
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/garment-types"] });
      toast({
        title: "Category created",
        description: "The category has been created successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating category",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryFormData }) => {
      return await apiRequest("PATCH", `/api/categories/${id}`, data);
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/garment-types"] });
      toast({
        title: "Category updated",
        description: "The category has been updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingCategory(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating category",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/garment-types"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/garments"] });
      toast({
        title: "Category deleted",
        description: "The category has been deleted successfully.",
      });
      setDeletingCategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting category",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
      setDeletingCategory(null);
    },
  });

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      form.reset({
        name: category.name,
        description: category.description || "",
        imageUrl: category.imageUrl || "",
        orderIndex: category.orderIndex,
      });
    } else {
      setEditingCategory(null);
      form.reset({
        name: "",
        description: "",
        imageUrl: "",
        orderIndex: categories.length,
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: CategoryFormData) => {
    const cleanedData = {
      ...data,
      description: data.description || undefined,
      imageUrl: data.imageUrl || undefined,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-muted-foreground">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Categories</h1>
          <p className="text-muted-foreground mt-2">
            Manage product categories
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-new-category">
          <Plus className="h-4 w-4 mr-2" />
          New Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <LayoutGrid className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No categories yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first category to get started
            </p>
            <Button className="mt-6" onClick={() => handleOpenDialog()} data-testid="button-create-first">
              <Plus className="h-4 w-4 mr-2" />
              Create Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id} data-testid={`card-category-${category.id}`}>
              <CardHeader>
                <CardTitle>{category.name}</CardTitle>
                {category.description && (
                  <CardDescription className="line-clamp-2">
                    {category.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOpenDialog(category)}
                  data-testid={`button-edit-${category.id}`}
                >
                  <Pencil className="h-3 w-3 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDeletingCategory(category)}
                  data-testid={`button-delete-${category.id}`}
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-category-form">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Create Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the category details below."
                : "Add a new category to organize your garments."}
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
                      <Input placeholder="Activewear" {...field} data-testid="input-name" />
                    </FormControl>
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
                        placeholder="High-performance athletic clothing"
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
                    : editingCategory
                    ? "Update"
                    : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category "{deletingCategory?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCategory && deleteMutation.mutate(deletingCategory.id)}
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

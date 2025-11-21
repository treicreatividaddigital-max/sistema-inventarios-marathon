import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Layers, Pencil, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

type Collection = {
  id: string;
  name: string;
  type: string | null;
  year: number | null;
  description: string | null;
};

const collectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  description: z.string().optional(),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

export default function CuratorCollectionsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);

  const { data: collections = [], isLoading } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
  });

  const form = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: "",
      type: "",
      year: undefined,
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CollectionFormData) => {
      return await apiRequest("POST", "/api/collections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lots"], exact: false });
      toast({
        title: "Collection created",
        description: "The collection has been created successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating collection",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CollectionFormData }) => {
      return await apiRequest("PATCH", `/api/collections/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lots"], exact: false });
      toast({
        title: "Collection updated",
        description: "The collection has been updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingCollection(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating collection",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/collections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lots"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/garments"] });
      toast({
        title: "Collection deleted",
        description: "The collection has been deleted successfully.",
      });
      setDeletingCollection(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting collection",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
      setDeletingCollection(null);
    },
  });

  const handleOpenDialog = (collection?: Collection) => {
    if (collection) {
      setEditingCollection(collection);
      form.reset({
        name: collection.name,
        type: collection.type || "",
        year: collection.year || undefined,
        description: collection.description || "",
      });
    } else {
      setEditingCollection(null);
      form.reset({
        name: "",
        type: "",
        year: undefined,
        description: "",
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: CollectionFormData) => {
    const cleanedData = {
      ...data,
      type: data.type || undefined,
      year: data.year || undefined,
      description: data.description || undefined,
    };

    if (editingCollection) {
      updateMutation.mutate({ id: editingCollection.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-muted-foreground">Loading collections...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Collections</h1>
          <p className="text-muted-foreground mt-2">
            Manage product collections
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-new-collection">
          <Plus className="h-4 w-4 mr-2" />
          New Collection
        </Button>
      </div>

      {collections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Layers className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No collections yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first collection
            </p>
            <Button className="mt-6" onClick={() => handleOpenDialog()} data-testid="button-create-first">
              <Plus className="h-4 w-4 mr-2" />
              Create Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Card key={collection.id} data-testid={`card-collection-${collection.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex-1">{collection.name}</CardTitle>
                  {collection.year && (
                    <Badge variant="secondary" className="shrink-0">
                      {collection.year}
                    </Badge>
                  )}
                </div>
                {collection.type && (
                  <p className="text-sm text-muted-foreground">{collection.type}</p>
                )}
                {collection.description && (
                  <CardDescription className="line-clamp-2">
                    {collection.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOpenDialog(collection)}
                  data-testid={`button-edit-${collection.id}`}
                >
                  <Pencil className="h-3 w-3 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDeletingCollection(collection)}
                  data-testid={`button-delete-${collection.id}`}
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
        <DialogContent data-testid="dialog-collection-form">
          <DialogHeader>
            <DialogTitle>
              {editingCollection ? "Edit Collection" : "Create Collection"}
            </DialogTitle>
            <DialogDescription>
              {editingCollection
                ? "Update the collection details below."
                : "Add a new product collection."}
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
                      <Input placeholder="Spring 2024" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Seasonal" {...field} data-testid="input-type" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2024"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-year"
                      />
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
                        placeholder="Spring/Summer 2024 collection"
                        {...field}
                        data-testid="input-description"
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
                    : editingCollection
                    ? "Update"
                    : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCollection} onOpenChange={() => setDeletingCollection(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the collection "{deletingCollection?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCollection && deleteMutation.mutate(deletingCollection.id)}
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

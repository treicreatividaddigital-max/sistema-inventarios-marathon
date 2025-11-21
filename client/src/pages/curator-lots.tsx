import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Box, Pencil, Trash2 } from "lucide-react";
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
};

type Lot = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  collectionId: string;
  collection?: Collection;
};

const lotSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  collectionId: z.string().min(1, "Collection is required"),
});

type LotFormData = z.infer<typeof lotSchema>;

export default function CuratorLotsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<Lot | null>(null);
  const [deletingLot, setDeletingLot] = useState<Lot | null>(null);

  const { data: lots = [], isLoading } = useQuery<Lot[]>({
    queryKey: ["/api/lots"],
  });

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
  });

  const form = useForm<LotFormData>({
    resolver: zodResolver(lotSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      collectionId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LotFormData) => {
      return await apiRequest("POST", "/api/lots", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({
        title: "Lot created",
        description: "The production lot has been created successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating lot",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LotFormData }) => {
      return await apiRequest("PATCH", `/api/lots/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({
        title: "Lot updated",
        description: "The production lot has been updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingLot(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating lot",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/lots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lots"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/garments"] });
      toast({
        title: "Lot deleted",
        description: "The production lot has been deleted successfully.",
      });
      setDeletingLot(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting lot",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
      setDeletingLot(null);
    },
  });

  const handleOpenDialog = (lot?: Lot) => {
    if (lot) {
      setEditingLot(lot);
      form.reset({
        code: lot.code,
        name: lot.name,
        description: lot.description || "",
        collectionId: lot.collectionId,
      });
    } else {
      setEditingLot(null);
      form.reset({
        code: "",
        name: "",
        description: "",
        collectionId: "",
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: LotFormData) => {
    const cleanedData = {
      ...data,
      description: data.description || undefined,
    };

    if (editingLot) {
      updateMutation.mutate({ id: editingLot.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-muted-foreground">Loading lots...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Lots</h1>
          <p className="text-muted-foreground mt-2">Manage production lots</p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-new-lot">
          <Plus className="h-4 w-4 mr-2" />
          New Lot
        </Button>
      </div>

      {lots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Box className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No lots yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first production lot
            </p>
            <Button className="mt-6" onClick={() => handleOpenDialog()} data-testid="button-create-first">
              <Plus className="h-4 w-4 mr-2" />
              Create Lot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {lots.map((lot) => {
            const collection = collections.find((c) => c.id === lot.collectionId);
            return (
              <Card key={lot.id} data-testid={`card-lot-${lot.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex-1">{lot.name}</CardTitle>
                    {collection && (
                      <Badge variant="secondary" className="shrink-0">
                        {collection.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-mono text-muted-foreground">{lot.code}</p>
                  {lot.description && (
                    <CardDescription className="line-clamp-2">
                      {lot.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDialog(lot)}
                    data-testid={`button-edit-${lot.id}`}
                  >
                    <Pencil className="h-3 w-3 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setDeletingLot(lot)}
                    data-testid={`button-delete-${lot.id}`}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-lot-form">
          <DialogHeader>
            <DialogTitle>
              {editingLot ? "Edit Lot" : "Create Lot"}
            </DialogTitle>
            <DialogDescription>
              {editingLot
                ? "Update the production lot details below."
                : "Add a new production lot."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="LOT-SS24-001" {...field} data-testid="input-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Spring Batch Alpha" {...field} data-testid="input-name" />
                    </FormControl>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-collection">
                          <SelectValue placeholder="Select collection" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {collections.map((collection) => (
                          <SelectItem key={collection.id} value={collection.id}>
                            {collection.name}
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
                        placeholder="First production batch for Spring 2024"
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
                    : editingLot
                    ? "Update"
                    : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingLot} onOpenChange={() => setDeletingLot(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the lot "{deletingLot?.name}" ({deletingLot?.code}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingLot && deleteMutation.mutate(deletingLot.id)}
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

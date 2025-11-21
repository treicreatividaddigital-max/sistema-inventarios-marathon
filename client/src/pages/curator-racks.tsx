import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Package, Pencil, Trash2 } from "lucide-react";
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

type Rack = {
  id: string;
  code: string;
  name: string;
  zone: string | null;
  qrUrl: string | null;
};

const rackSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  zone: z.string().optional(),
});

type RackFormData = z.infer<typeof rackSchema>;

export default function CuratorRacksPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRack, setEditingRack] = useState<Rack | null>(null);
  const [deletingRack, setDeletingRack] = useState<Rack | null>(null);

  const { data: racks = [], isLoading } = useQuery<Rack[]>({
    queryKey: ["/api/racks"],
  });

  const form = useForm<RackFormData>({
    resolver: zodResolver(rackSchema),
    defaultValues: {
      code: "",
      name: "",
      zone: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: RackFormData) => {
      return await apiRequest("POST", "/api/racks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/racks"] });
      toast({
        title: "Rack created",
        description: "The storage rack has been created successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating rack",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RackFormData }) => {
      return await apiRequest("PATCH", `/api/racks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/racks"] });
      toast({
        title: "Rack updated",
        description: "The storage rack has been updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingRack(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating rack",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/racks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/racks"] });
      toast({
        title: "Rack deleted",
        description: "The storage rack has been deleted successfully.",
      });
      setDeletingRack(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting rack",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
      setDeletingRack(null);
    },
  });

  const handleOpenDialog = (rack?: Rack) => {
    if (rack) {
      setEditingRack(rack);
      form.reset({
        code: rack.code,
        name: rack.name,
        zone: rack.zone || "",
      });
    } else {
      setEditingRack(null);
      form.reset({
        code: "",
        name: "",
        zone: "",
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: RackFormData) => {
    const cleanedData = {
      ...data,
      zone: data.zone || undefined,
    };

    if (editingRack) {
      updateMutation.mutate({ id: editingRack.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-muted-foreground">Loading racks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Racks</h1>
          <p className="text-muted-foreground mt-2">
            Manage storage racks and locations
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-new-rack">
          <Plus className="h-4 w-4 mr-2" />
          New Rack
        </Button>
      </div>

      {racks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No racks yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first storage rack
            </p>
            <Button className="mt-6" onClick={() => handleOpenDialog()} data-testid="button-create-first">
              <Plus className="h-4 w-4 mr-2" />
              Create Rack
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {racks.map((rack) => (
            <Card key={rack.id} data-testid={`card-rack-${rack.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex-1">{rack.name}</CardTitle>
                  {rack.zone && (
                    <Badge variant="secondary" className="shrink-0">
                      {rack.zone}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-mono text-muted-foreground">{rack.code}</p>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOpenDialog(rack)}
                  data-testid={`button-edit-${rack.id}`}
                >
                  <Pencil className="h-3 w-3 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDeletingRack(rack)}
                  data-testid={`button-delete-${rack.id}`}
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
        <DialogContent data-testid="dialog-rack-form">
          <DialogHeader>
            <DialogTitle>
              {editingRack ? "Edit Rack" : "Create Rack"}
            </DialogTitle>
            <DialogDescription>
              {editingRack
                ? "Update the storage rack details below."
                : "Add a new storage rack location."}
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
                      <Input placeholder="RAC-A-001" {...field} data-testid="input-code" />
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
                      <Input placeholder="Rack A-001" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Warehouse Section A" {...field} data-testid="input-zone" />
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
                    : editingRack
                    ? "Update"
                    : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingRack} onOpenChange={() => setDeletingRack(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the rack "{deletingRack?.name}" ({deletingRack?.code}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRack && deleteMutation.mutate(deletingRack.id)}
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

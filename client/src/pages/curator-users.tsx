import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "CURATOR"], { required_error: "Role is required" }),
});

type UserFormData = z.infer<typeof userSchema>;

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "CURATOR" | "USER";
  createdAt: string;
};

export default function CuratorUsersPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (user?.role !== "CURATOR" || user?.isMasterCurator !== true) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Team Management</h1>
          <p className="text-muted-foreground mt-2">
            You do not have permission to manage users.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>
              Only the master curator can create or delete users.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "", password: "", role: "ADMIN" },
  });

  const usersQuery = useQuery<UserRow[]>({
    queryKey: ["/api/users"],
    queryFn: async () => await apiRequest("GET", "/api/users"),
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => await apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      toast({ title: "User created", description: "The user has been created successfully." });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => await apiRequest("DELETE", `/api/users/${userId}`),
    onSuccess: () => {
      toast({ title: "User deleted", description: "The user has been deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Team Management</h1>
          <p className="text-muted-foreground mt-2">Curator-only user administration</p>
        </div>
        <Button onClick={() => { form.reset(); setIsDialogOpen(true); }} data-testid="button-new-user">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Only CURATOR can create/delete users.</CardDescription>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : usersQuery.isError ? (
            <p className="text-sm text-destructive">
              Error loading users: {String((usersQuery.error as any)?.message || usersQuery.error)}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usersQuery.data || []).map((u) => {
                  const isSelf = u.id === user?.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="font-mono text-xs">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "CURATOR" ? "default" : "secondary"}>{u.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.createdAt ? new Date(u.createdAt).toLocaleString() : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        {user?.isMasterCurator === true && (
                          <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isSelf || deleteMutation.isPending}
                              title={isSelf ? "You cannot delete yourself" : "Delete user"}
                              data-testid={`button-delete-user-${u.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the user{" "}
                                <span className="font-mono">{u.email}</span>.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground border border-destructive-border"
                                onClick={() => deleteMutation.mutate(u.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Create a new user with Admin or Curator role.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="Full name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input placeholder="email@company.com" {...field} /></FormControl>
                  <FormDescription>User will use this email to sign in.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl><Input type="password" placeholder="********" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="CURATOR">Curator</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

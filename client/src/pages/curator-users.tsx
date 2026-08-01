import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Trash2, UserPlus, Key, Copy, Check, Edit2 } from "lucide-react";
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
  DialogTrigger,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  isActive: boolean;
  createdAt: string;
  isMasterCurator?: boolean;
};

export default function CuratorUsersPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordUserName, setResetPasswordUserName] = useState<string>("");
  const [resetPasswordMode, setResetPasswordMode] = useState<"auto" | "manual">("auto");
  const [manualPassword, setManualPassword] = useState<string>("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [editRoleUserId, setEditRoleUserId] = useState<string | null>(null);
  const [editRoleUserName, setEditRoleUserName] = useState<string>("");
  const [editRoleValue, setEditRoleValue] = useState<"ADMIN" | "CURATOR">("ADMIN");

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

  const archiveMutation = useMutation({
    mutationFn: async (userId: string) => await apiRequest("PATCH", `/api/users/${userId}/archive`),
    onSuccess: () => {
      toast({ title: "User archived", description: "The user has been archived successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to archive user",
        variant: "destructive",
      });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (userId: string) => await apiRequest("PATCH", `/api/users/${userId}/reactivate`),
    onSuccess: () => {
      toast({ title: "User reactivated", description: "The user has been reactivated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reactivate user",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => await apiRequest("DELETE", `/api/users/${userId}`),
    onSuccess: () => {
      toast({ title: "User deleted", description: "The user has been permanently deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to delete user";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast({
        title: "Cannot delete user",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "ADMIN" | "CURATOR" }) =>
      await apiRequest("PATCH", `/api/users/${userId}`, { role }),
    onSuccess: () => {
      toast({ title: "Role updated", description: "The user role has been updated successfully." });
      setEditRoleDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const body = resetPasswordMode === "manual" ? { newPassword: manualPassword } : {};
      return await apiRequest("PATCH", `/api/users/${userId}/reset-password`, body);
    },
    onSuccess: (data: any) => {
      setTempPassword(data.tempPassword);
      setResetPasswordDialogOpen(false);
      setResetPasswordUserId(null);
      setResetPasswordMode("auto");
      setManualPassword("");
      setCopied(false);
    },
    onError: (error: any) => {
      setResetPasswordUserId(null);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const ResetPasswordDialog = ({ userId, userName }: { userId: string; userName: string }) => (
    <Dialog open={resetPasswordDialogOpen && resetPasswordUserId === userId} onOpenChange={setResetPasswordDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={resetPasswordMutation.isPending}
          title="Reset password"
          data-testid={`button-reset-password-${userId}`}
          onClick={() => {
            setResetPasswordUserId(userId);
            setResetPasswordUserName(userName);
            setResetPasswordDialogOpen(true);
          }}
          className="w-full md:w-auto text-xs md:text-sm"
        >
          <Key className="h-4 w-4 mr-2" />
          Reset Password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {userName}</DialogTitle>
          <DialogDescription>
            Choose how to reset the password. User will be required to change it on next login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={resetPasswordMode} onValueChange={(val) => setResetPasswordMode(val as "auto" | "manual")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id={`auto-gen-${userId}`} />
              <label htmlFor={`auto-gen-${userId}`} className="cursor-pointer font-medium text-sm">
                Auto-generate temporary password
              </label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">A secure random password will be generated</p>

            <div className="flex items-center space-x-2 mt-4">
              <RadioGroupItem value="manual" id={`manual-set-${userId}`} />
              <label htmlFor={`manual-set-${userId}`} className="cursor-pointer font-medium text-sm">
                Set new password manually
              </label>
            </div>
            {resetPasswordMode === "manual" && (
              <div className="ml-6 mt-2">
                <Input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  className="text-sm"
                />
                {manualPassword && manualPassword.length < 6 && (
                  <p className="text-xs text-destructive mt-1">Password must be at least 6 characters</p>
                )}
              </div>
            )}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setResetPasswordMode("auto")}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (resetPasswordMode === "manual" && manualPassword.length < 6) {
                toast({
                  title: "Invalid password",
                  description: "Password must be at least 6 characters",
                  variant: "destructive",
                });
                return;
              }
              setResetPasswordUserId(userId);
              setResetPasswordUserName(userName);
              setResetPasswordDialogOpen(false);
              resetPasswordMutation.mutate(userId);
            }}
            disabled={resetPasswordMutation.isPending || (resetPasswordMode === "manual" && manualPassword.length < 6)}
          >
            {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Team Management</h1>
          <p className="text-muted-foreground mt-2">Curator-only user administration</p>
        </div>
        <Button onClick={() => { form.reset(); setIsDialogOpen(true); }} data-testid="button-new-user" className="w-full md:w-auto">
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
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "active" | "archived")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">Active Users</TabsTrigger>
              <TabsTrigger value="archived">Archived Users</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4">
              {usersQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading users...</p>
              ) : usersQuery.isError ? (
                <p className="text-sm text-destructive">
                  Error loading users: {String((usersQuery.error as any)?.message || usersQuery.error)}
                </p>
              ) : (usersQuery.data || []).filter((u) => u.isActive).length === 0 ? (
                <p className="text-sm text-muted-foreground">No active users</p>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(usersQuery.data || [])
                          .filter((u) => u.isActive)
                          .map((u) => {
                            const isSelf = u.id === user?.id;
                            return (
                              <TableRow key={u.id}>
                                <TableCell className="font-medium">{u.name}</TableCell>
                                <TableCell className="font-mono text-xs">{u.email}</TableCell>
                                <TableCell>
                                  <Badge variant={u.isMasterCurator ? "default" : u.role === "CURATOR" ? "default" : "secondary"}>
                                    {u.isMasterCurator ? "Superadmin" : u.role === "CURATOR" ? "Editor" : "Viewer"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={u.isActive ? "default" : "secondary"}>
                                    {u.isActive ? "Active" : "Archived"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {u.createdAt ? new Date(u.createdAt).toLocaleString() : ""}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                  {user?.isMasterCurator === true && (
                                    <>
                                      <ResetPasswordDialog userId={u.id} userName={u.name} />

                                      {u.isActive ? (
                                        <>
                                          <Dialog open={editRoleDialogOpen && editRoleUserId === u.id} onOpenChange={setEditRoleDialogOpen}>
                                            <DialogTrigger asChild>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                title="Edit role"
                                                onClick={() => {
                                                  setEditRoleUserId(u.id);
                                                  setEditRoleUserName(u.name);
                                                  setEditRoleValue(u.role as "ADMIN" | "CURATOR");
                                                }}
                                              >
                                                <Edit2 className="h-4 w-4 mr-2" />
                                                Edit Role
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                              <DialogHeader>
                                                <DialogTitle>Edit role for {editRoleUserName}</DialogTitle>
                                                <DialogDescription>
                                                  Change the user role. This determines their permissions in the system.
                                                </DialogDescription>
                                              </DialogHeader>
                                              <div className="space-y-4">
                                                <Select value={editRoleValue} onValueChange={(val) => setEditRoleValue(val as "ADMIN" | "CURATOR")}>
                                                  <SelectTrigger>
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="ADMIN">Viewer (Read-only)</SelectItem>
                                                    <SelectItem value="CURATOR">Editor (Create/Edit)</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setEditRoleDialogOpen(false)}>
                                                  Cancel
                                                </Button>
                                                <Button
                                                  onClick={() => {
                                                    if (editRoleUserId) {
                                                      updateRoleMutation.mutate({ userId: editRoleUserId, role: editRoleValue });
                                                    }
                                                  }}
                                                  disabled={updateRoleMutation.isPending}
                                                >
                                                  {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
                                                </Button>
                                              </DialogFooter>
                                            </DialogContent>
                                          </Dialog>

                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={isSelf || archiveMutation.isPending}
                                                title={isSelf ? "You cannot archive yourself" : "Archive user"}
                                                data-testid={`button-archive-user-${u.id}`}
                                              >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Archive
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Archive this user?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  This will archive the user <span className="font-mono">{u.email}</span>. They can be reactivated later.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                  className="bg-destructive text-destructive-foreground border border-destructive-border"
                                                  onClick={() => archiveMutation.mutate(u.id)}
                                                >
                                                  Archive
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </>
                                      ) : (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              disabled={reactivateMutation.isPending}
                                              title="Reactivate user"
                                              data-testid={`button-reactivate-user-${u.id}`}
                                            >
                                              Reactivate
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Reactivate this user?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                The user <span className="font-mono">{u.email}</span> will be reactivated and can log in again.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => reactivateMutation.mutate(u.id)}
                                              >
                                                Reactivate
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      )}
                                    </>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {(usersQuery.data || [])
                      .filter((u) => u.isActive)
                      .map((u) => {
                        const isSelf = u.id === user?.id;
                        return (
                          <Card key={u.id}>
                            <CardContent className="pt-6 pb-4 space-y-3">
                              <div>
                                <p className="font-semibold text-base">{u.name}</p>
                                <p className="text-xs font-mono text-muted-foreground">{u.email}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant={u.isMasterCurator ? "default" : u.role === "CURATOR" ? "default" : "secondary"} className="text-xs">
                                  {u.isMasterCurator ? "Superadmin" : u.role === "CURATOR" ? "Editor" : "Viewer"}
                                </Badge>
                                <Badge variant="default" className="text-xs">
                                  Active
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Created {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                              </p>
                              {user?.isMasterCurator === true && (
                                <div className="flex flex-col gap-2 pt-2">
                                  <ResetPasswordDialog userId={u.id} userName={u.name} />

                                  {u.isActive ? (
                                    <>
                                      <Dialog open={editRoleDialogOpen && editRoleUserId === u.id} onOpenChange={setEditRoleDialogOpen}>
                                        <DialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full text-xs"
                                            onClick={() => {
                                              setEditRoleUserId(u.id);
                                              setEditRoleUserName(u.name);
                                              setEditRoleValue(u.role as "ADMIN" | "CURATOR");
                                            }}
                                          >
                                            <Edit2 className="h-3 w-3 mr-1" />
                                            Edit Role
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Edit role for {editRoleUserName}</DialogTitle>
                                            <DialogDescription>
                                              Change the user role. This determines their permissions in the system.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4">
                                            <Select value={editRoleValue} onValueChange={(val) => setEditRoleValue(val as "ADMIN" | "CURATOR")}>
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="ADMIN">Viewer (Read-only)</SelectItem>
                                                <SelectItem value="CURATOR">Editor (Create/Edit)</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => setEditRoleDialogOpen(false)}>
                                              Cancel
                                            </Button>
                                            <Button
                                              onClick={() => {
                                                if (editRoleUserId) {
                                                  updateRoleMutation.mutate({ userId: editRoleUserId, role: editRoleValue });
                                                }
                                              }}
                                              disabled={updateRoleMutation.isPending}
                                            >
                                              {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>

                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            className="w-full text-xs"
                                            disabled={isSelf || archiveMutation.isPending}
                                            data-testid={`button-archive-user-${u.id}`}
                                          >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Archive
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Archive this user?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This will archive the user <span className="font-mono">{u.email}</span>. They can be reactivated later.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              className="bg-destructive text-destructive-foreground border border-destructive-border"
                                              onClick={() => archiveMutation.mutate(u.id)}
                                            >
                                              Archive
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </>
                                  ) : (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full text-xs"
                                          disabled={reactivateMutation.isPending}
                                          data-testid={`button-reactivate-user-${u.id}`}
                                        >
                                          Reactivate
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Reactivate this user?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            The user <span className="font-mono">{u.email}</span> will be reactivated and can log in again.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => reactivateMutation.mutate(u.id)}
                                          >
                                            Reactivate
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="archived" className="mt-4">
              {usersQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading users...</p>
              ) : usersQuery.isError ? (
                <p className="text-sm text-destructive">
                  Error loading users: {String((usersQuery.error as any)?.message || usersQuery.error)}
                </p>
              ) : (usersQuery.data || []).filter((u) => !u.isActive).length === 0 ? (
                <p className="text-sm text-muted-foreground">No archived users</p>
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
                    {(usersQuery.data || [])
                      .filter((u) => !u.isActive)
                      .map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell className="font-mono text-xs">{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={u.role === "CURATOR" ? "default" : "secondary"}>{u.role}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.createdAt ? new Date(u.createdAt).toLocaleString() : ""}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {user?.isMasterCurator === true && (
                              <>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={reactivateMutation.isPending}
                                      title="Reactivate user"
                                    >
                                      Reactivate
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Reactivate this user?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        The user <span className="font-mono">{u.email}</span> will be reactivated.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => reactivateMutation.mutate(u.id)}
                                      >
                                        Reactivate
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      disabled={deleteMutation.isPending}
                                      title="Permanently delete user"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Permanently delete this user?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. The user <span className="font-mono">{u.email}</span> will be permanently deleted.
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
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
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

      <Dialog open={tempPassword !== null} onOpenChange={(open) => {
        if (!open) {
          setTempPassword(null);
          setResetPasswordDialogOpen(false);
          setResetPasswordMode("auto");
          setManualPassword("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset Successful</DialogTitle>
            <DialogDescription>
              A new password has been set for <span className="font-mono">{resetPasswordUserName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground font-medium">New Password:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all bg-background rounded px-3 py-2 font-mono text-sm font-bold">
                  {tempPassword}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword || "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Important:</p>
              <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                <li>Copy this password now. It will not be shown again.</li>
                <li>The user will be required to change it on their next login.</li>
                <li>Share this password securely with the user.</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => {
              setTempPassword(null);
              setResetPasswordDialogOpen(false);
              setResetPasswordMode("auto");
              setManualPassword("");
            }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

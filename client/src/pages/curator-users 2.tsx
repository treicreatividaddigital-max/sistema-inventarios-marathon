import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "CURATOR"], {
    required_error: "Role is required",
  }),
});

type UserFormData = z.infer<typeof userSchema>;

export default function CuratorUsersPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "ADMIN",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "The user has been created successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating user",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = () => {
    form.reset({
      name: "",
      email: "",
      password: "",
      role: "ADMIN",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: UserFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Team Management</h1>
          <p className="text-muted-foreground mt-2">
            Add team members with Admin or Curator roles
          </p>
        </div>
        <Button onClick={handleOpenDialog} data-testid="button-new-user">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About Roles</CardTitle>
          <CardDescription>Understanding access levels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm mb-1">Admin Role</h3>
            <p className="text-sm text-muted-foreground">
              View-only access to Dashboard and Search. Cannot modify inventory
              or create new items.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-1">Curator Role</h3>
            <p className="text-sm text-muted-foreground">
              Full access to all features including creating garments, managing
              categories, types, collections, lots, racks, and creating new
              team members.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Create a new Admin or Curator account
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
                      <Input
                        {...field}
                        placeholder="Full name"
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="email@example.com"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Minimum 6 characters"
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormDescription>
                      The user will use this password to login
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin (View-only)</SelectItem>
                        <SelectItem value="CURATOR">
                          Curator (Full access)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the access level for this user
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-create"
                >
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

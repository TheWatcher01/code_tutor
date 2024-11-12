// File path: code_tutor/frontend/src/components/auth/SignUpForm.tsx

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from 'react-hook-form';
import GitHubLogo from "@/components/icons/GitHubLogo";

export function SignUpForm() {
  // Initialize the form with react-hook-form
  const { register, handleSubmit, formState: { errors } } = useForm();

  // Handle form submission
  const onSubmit = (data: any) => {
    console.log(data);
  };

  // Handle GitHub sign-up button click
  const handleGitHubSignUp = () => {
    console.log("GitHub signup triggered");
  };

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Sign Up</CardTitle>
        <CardDescription>
          Enter your details to create an account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  placeholder="John"
                  {...register("firstName", { required: "First name is required" })}
                />
                {errors.firstName && <p className="text-red-500">{String(errors.firstName.message)}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  placeholder="Doe"
                  {...register("lastName", { required: "Last name is required" })}
                />
                {errors.lastName && <p className="text-red-500">{String(errors.lastName.message)}</p>}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="betty@holbertonschool.com"
                autoComplete="username" // Suggest email for auto-completion
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && <p className="text-red-500">{String(errors.email.message)}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password" // Suggest new password for auto-completion
                {...register("password", { required: "Password is required" })}
              />
              {errors.password && <p className="text-red-500">{String(errors.password.message)}</p>}
            </div>
            <Button type="submit" className="w-full">
              Create an account
            </Button>
            <Button
              variant="outline" // Changed to a valid variant type
              className="w-full flex items-center justify-center"
              onClick={handleGitHubSignUp}
            >
              <GitHubLogo className="mr-2" />
              Sign up with GitHub
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// File path: code_tutor/frontend/src/components/auth/LoginForm.tsx

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
import GitHubLoginButton from "@/components/auth/GitHubLoginButton";

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data: any) => {
    console.log(data);
  };

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="betty@holbertonschool.com"
                autoComplete="username"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && <p className="text-red-500">{String(errors.email.message)}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password", { required: "Password is required" })}
              />
              {errors.password && <p className="text-red-500">{String(errors.password.message)}</p>}
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
            <GitHubLoginButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

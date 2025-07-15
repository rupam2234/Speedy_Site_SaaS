"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import { EyeClosed, EyeIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import Logo from "@/components/logo/logo";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async () => {
    if (!email || !firstname || !lastname) {
      return;
    }
    const userData = { email: email, firstname: firstname, lastname: lastname };

    await fetch("/api/users/signup-validation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });
  };

  return (
    <main className="grid grid-cols-1 sm:grid-cols-2 w-full h-screen sm:h-auto items-center">
      <div className="order-2 hidden sm:order-1 md:flex justify-center items-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white h-full sm:h-screen w-full">
        <ThemeToggle />
      </div>

      <div className="order-1 sm:order-2 flex justify-center items-center h-full sm:h-screen w-full">
        <SignUp.Root path="/sign-up">
          <Clerk.Loading>
            {(isGlobalLoading) => (
              <>
                <SignUp.Step name="start">
                  <Card className="bg-transparent w-full sm:w-96 shadow-none border-none">
                    <CardHeader>
                      <div className="flex justify-center items-center mb-9">
                        <Logo />
                      </div>
                      <CardTitle className="text-2xl text-center antialiased">
                        Create your account
                      </CardTitle>
                      <CardDescription className="text-center dark:text-muted-foreground">
                        Welcome! Please fill in the details to get started.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-y-4 p-8 sm:p-0">
                      <div className="grid gap-x-4 gap-y-4">
                        <Clerk.Field
                          name={"emailAddress"}
                          className="space-y-2"
                        >
                          <Clerk.Label asChild>
                            <label className="text-sm font-semibold dark:text-muted-foreground">
                              Email Address
                            </label>
                          </Clerk.Label>
                          <Clerk.Input
                            required
                            asChild
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          >
                            <Input className="ring-0 focus-visible:ring-0" />
                          </Clerk.Input>
                          <Clerk.FieldError className="block text-sm text-destructive" />
                        </Clerk.Field>
                        <Clerk.Field name={"password"} className="space-y-2">
                          <Clerk.Label asChild>
                            <label className="text-sm font-semibold dark:text-muted-foreground">
                              Password
                            </label>
                          </Clerk.Label>
                          <div className="relative">
                            <Clerk.Input
                              required
                              asChild
                              type={showPassword ? "text" : "password"}
                            >
                              <Input className="ring-0 focus-visible:ring-0" />
                            </Clerk.Input>
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"
                              aria-label={
                                showPassword ? "Hide password" : "Show password"
                              }
                            >
                              {showPassword ? (
                                <EyeIcon size={18} />
                              ) : (
                                <EyeClosed size={18} />
                              )}
                            </button>
                          </div>
                          <Clerk.FieldError className="block text-sm text-destructive" />
                        </Clerk.Field>
                      </div>
                    </CardContent>
                    <CardFooter className="sm:my-8 px-8 sm:p-0">
                      <div className="grid w-full gap-y-5">
                        <SignUp.Captcha className="empty:hidden" />
                        <SignUp.Action submit asChild>
                          <Button
                            disabled={isGlobalLoading}
                            className="cursor-pointer"
                          >
                            <Clerk.Loading>
                              {(isLoading) => {
                                return isLoading ? (
                                  <Icons.spinner className="size-4 animate-spin" />
                                ) : (
                                  "Continue"
                                );
                              }}
                            </Clerk.Loading>
                          </Button>
                        </SignUp.Action>
                        <p className="flex items-center gap-x-3 text-sm text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                          or
                        </p>
                        <Clerk.Connection name="google" asChild>
                          <Button
                            size="default"
                            variant="outline"
                            type="button"
                            disabled={isGlobalLoading}
                            className="bg-blue-500 text-white hover:bg-blue-500/90 hover:text-white cursor-pointer"
                          >
                            <Clerk.Loading scope="provider:google">
                              {(isLoading) =>
                                isLoading ? (
                                  <Icons.spinner className="size-4 animate-spin" />
                                ) : (
                                  <>
                                    <Icons.google className="mr-2 size-4" />
                                    Continue with Google
                                  </>
                                )
                              }
                            </Clerk.Loading>
                          </Button>
                        </Clerk.Connection>
                        <p className="my-2 text-[13px] text-center text-muted-foreground">
                          Already have an account?{" "}
                          <Link
                            href={"/sign-in"}
                            className="font-semibold hover:text-gray-600"
                          >
                            Sign in
                          </Link>
                        </p>
                        <p className="my-2 text-[12px] text-center text-muted-foreground">
                          This site is protected by reCAPTCHA and the Google{" "}
                          <Link
                            href={"https://policies.google.com/privacy"}
                            className="underline hover:no-underline"
                          >
                            Privacy Policy
                          </Link>{" "}
                          and{" "}
                          <Link
                            href={"https://policies.google.com/terms"}
                            className="underline hover:no-underline"
                          >
                            Terms of Service
                          </Link>{" "}
                          apply.
                        </p>
                      </div>
                    </CardFooter>
                  </Card>
                </SignUp.Step>

                <SignUp.Step name="continue">
                  <Card className="w-full bg-transparent sm:w-96 shadow-none border-0">
                    <CardHeader>
                      <div className="flex justify-center items-center mb-9">
                        <Logo />
                      </div>
                      <CardDescription className="text-center">
                        One final step! Would you like to provide your
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-y-4 p-8 sm:p-0">
                      <div className="grid gap-x-4 gap-y-4">
                        <Clerk.Field name="firstName" className="space-y-2">
                          <Clerk.Label asChild>
                            <label className="text-sm font-semibold text-gray-700 dark:text-primary/50">
                              First Name
                            </label>
                          </Clerk.Label>
                          <Clerk.Input
                            type="text"
                            required
                            asChild
                            value={firstname}
                            onChange={(e) => {
                              setFirstname(e.target.value);
                            }}
                          >
                            <Input />
                          </Clerk.Input>
                          <Clerk.FieldError className="block text-sm text-destructive" />
                        </Clerk.Field>
                        <Clerk.Field name="lastName" className="space-y-2">
                          <Clerk.Label asChild>
                            <label className="text-sm font-semibold text-gray-700 dark:text-primary/50">
                              Last Name
                            </label>
                          </Clerk.Label>
                          <Clerk.Input
                            type="text"
                            required
                            asChild
                            value={lastname}
                            onChange={(e) => {
                              setLastname(e.target.value);
                            }}
                          >
                            <Input />
                          </Clerk.Input>
                          <Clerk.FieldError className="block text-sm text-destructive" />
                        </Clerk.Field>
                      </div>
                    </CardContent>
                    <CardFooter className="sm:my-8 px-8 sm:p-0">
                      <div className="grid w-full gap-y-5">
                        <SignUp.Action submit asChild>
                          <Button
                            disabled={isGlobalLoading}
                            onClick={handleSignUp}
                          >
                            <Clerk.Loading>
                              {(isLoading) => {
                                return isLoading ? (
                                  <Icons.spinner className="size-4 animate-spin" />
                                ) : (
                                  "Continue"
                                );
                              }}
                            </Clerk.Loading>
                          </Button>
                        </SignUp.Action>
                      </div>
                    </CardFooter>
                  </Card>
                </SignUp.Step>

                <SignUp.Step name="verifications">
                  <SignUp.Strategy name="email_code">
                    <Card className="w-full bg-transparent sm:w-96 shadow-none border-0">
                      <CardHeader>
                        <div className="flex justify-center items-center mb-9">
                          <Logo />
                        </div>
                        <CardTitle className="text-2xl text-primary text-center antialiased">
                          Please check your email
                        </CardTitle>
                        <CardDescription className="text-center">
                          We&apos;ve sent a validation code to {email}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-y-4 p-4 ">
                        <div className="grid gap-x-4 gap-y-4 items-center justify-center">
                          <Clerk.Field name={"code"} className="space-y-2">
                            <Clerk.Label className="sr-only">
                              Email Address
                            </Clerk.Label>
                            <div className="flex justify-center text-center">
                              <Clerk.Input
                                type="otp"
                                className="flex justify-center has-[:disabled]:opacity-50"
                                autoSubmit
                                render={({ value, status }) => {
                                  return (
                                    <div
                                      data-status={status}
                                      className={cn(
                                        "relative flex size-10 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
                                        {
                                          "z-10 ring-2 ring-ring ring-offset-background":
                                            status === "cursor" ||
                                            status === "selected",
                                        }
                                      )}
                                    >
                                      {value}
                                      {status === "cursor" && (
                                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                          <div className="animate-caret-blink h-4 w-px bg-foreground duration-1000" />
                                        </div>
                                      )}
                                    </div>
                                  );
                                }}
                              />
                            </div>
                            <Clerk.FieldError className="block text-center text-sm text-destructive" />
                          </Clerk.Field>
                          <SignUp.Action
                            asChild
                            resend
                            className="text-muted-foreground"
                            fallback={({ resendableAfter }) => (
                              <p className="text-muted-foreground text-[13px]">
                                Didn&apos;t receive a code? Resend code in{" "}
                                {resendableAfter} second(s)
                              </p>
                            )}
                          >
                            <Button type="button" variant="link" size="sm">
                              Resend the validation code
                            </Button>
                          </SignUp.Action>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <div className="grid w-full gap-y-4">
                          <SignUp.Action submit asChild>
                            <Button disabled={isGlobalLoading}>
                              <Clerk.Loading>
                                {(isLoading) => {
                                  return isLoading ? (
                                    <Icons.spinner className="size-4 animate-spin" />
                                  ) : (
                                    "Continue"
                                  );
                                }}
                              </Clerk.Loading>
                            </Button>
                          </SignUp.Action>
                        </div>
                      </CardFooter>
                    </Card>
                  </SignUp.Strategy>
                </SignUp.Step>
              </>
            )}
          </Clerk.Loading>
        </SignUp.Root>
      </div>
    </main>
  );
}

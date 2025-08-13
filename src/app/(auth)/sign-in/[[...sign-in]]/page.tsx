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
import { Label } from "@/components/ui/label";
import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { EyeClosed, EyeIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import Logo from "@/components/logo/logo";

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="grid grid-cols-1 sm:grid-cols-2 w-full h-screen sm:h-auto items-center">
      <div className="order-2 sm:order-1 flex justify-center items-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white h-full sm:h-screen w-full">
        <ThemeToggle />
      </div>
      <div className="order-1 sm:order-2 flex justify-center items-center h-full sm:h-screen w-full">
        <SignIn.Root path="/sign-in">
          <Clerk.Loading>
            {(isGlobalLoading: any) => (
              <>
                <SignIn.Step name="start">
                  <Card className="bg-transparent w-full sm:w-96 shadow-none border-0">
                    <CardHeader>
                      <div className="flex justify-center items-center mb-9">
                        <Logo />
                      </div>
                      <CardTitle className="text-2xl text-center antialiased">
                        Sign in
                      </CardTitle>
                      <CardDescription className="text-center dark:text-muted-foreground">
                        Welcome back! Please sign in to continue
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-y-4 p-8 sm:p-0">
                      <div className="grid gap-x-4 gap-y-4">
                        <Clerk.Field name="identifier" className="space-y-2">
                          <Clerk.Label asChild>
                            <label className="text-sm text-muted-foreground font-semibold dark:text-muted-foreground">
                              Email Address
                            </label>
                          </Clerk.Label>
                          <Clerk.Input required asChild type="email">
                            <Input className="ring-0 focus-visible:ring-0" />
                          </Clerk.Input>
                          <Clerk.FieldError className="block text-sm text-destructive" />
                        </Clerk.Field>
                      </div>
                    </CardContent>
                    <CardFooter className="sm:my-8 px-8 sm:p-0">
                      <div className="grid w-full gap-y-5">
                        <SignIn.Action submit asChild>
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
                        </SignIn.Action>
                        {/* <p className="flex items-center gap-x-3 text-sm text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
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
                        </Clerk.Connection> */}
                        <p className="my-2 text-[13px] text-center text-muted-foreground">
                          Don&apos;t have an account?{" "}
                          <Link
                            href={"/sign-up"}
                            className="font-semibold hover:text-gray-600"
                          >
                            Sign up
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
                </SignIn.Step>

                <SignIn.Step name="choose-strategy">
                  <Card className="w-full sm:w-96 bg-transparent shadow-none border-0">
                    <CardHeader>
                      <div className="flex justify-center items-center mb-9">
                        <Logo />
                      </div>
                      <CardTitle className="text-2xl text-center antialiased">
                        Use another method
                      </CardTitle>
                      <CardDescription className="text-center">
                        Facing issues? You can use any of these methods to sign
                        in.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-y-4 p-8 sm:p-0">
                      <SignIn.SupportedStrategy name="email_code" asChild>
                        <Button
                          type="button"
                          variant="link"
                          disabled={isGlobalLoading}
                        >
                          Email code
                        </Button>
                      </SignIn.SupportedStrategy>
                    </CardContent>
                    <CardFooter className="sm:my-8 px-8 sm:p-0">
                      <div className="grid w-full gap-y-5">
                        <SignIn.Action navigate="previous" asChild>
                          <Button disabled={isGlobalLoading}>
                            <Clerk.Loading>
                              {(isLoading) => {
                                return isLoading ? (
                                  <Icons.spinner className="size-4 animate-spin" />
                                ) : (
                                  "Go back"
                                );
                              }}
                            </Clerk.Loading>
                          </Button>
                        </SignIn.Action>
                      </div>
                    </CardFooter>
                  </Card>
                </SignIn.Step>

                <SignIn.Step name="verifications">
                  <SignIn.Strategy name="password">
                    <Card className="w-full bg-transparent sm:w-96 shadow-none border-0">
                      <CardHeader>
                        <div className="flex justify-center items-center mb-9">
                          <Logo />
                        </div>
                        <CardTitle className="text-[18px] text-center antialiased">
                          Welcome back <SignIn.SafeIdentifier />
                        </CardTitle>
                        <CardDescription className="text-center">
                          Enter your password to continue
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-y-4 p-8 sm:p-0">
                        <div className="grid gap-x-4 gap-y-4">
                          <Clerk.Field name="password" className="space-y-2">
                            <Clerk.Label asChild>
                              <Label className="text-sm font-semibold text-gray-700 dark:text-muted-foreground">
                                Password
                              </Label>
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
                                  showPassword
                                    ? "Hide password"
                                    : "Show password"
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
                          <SignIn.Action submit asChild>
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
                          </SignIn.Action>
                          <SignIn.Action navigate="choose-strategy" asChild>
                            <Button type="button" size="sm" variant="link">
                              Use another method
                            </Button>
                          </SignIn.Action>
                        </div>
                      </CardFooter>
                    </Card>
                  </SignIn.Strategy>

                  <SignIn.Strategy name="email_code">
                    <Card className="w-full bg-transparent sm:w-96 shadow-none border-0">
                      <CardHeader>
                        <div className="flex justify-center items-center mb-9">
                          <Logo />
                        </div>
                        <CardTitle className="text-2xl text-center antialiased">
                          Check your email
                        </CardTitle>
                        <CardDescription className="text-center">
                          Enter the verification code sent to your email in.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-y-2 p-8 sm:p-0">
                        <div className="grid gap-x-4 gap-y-4">
                          <Clerk.Field name="code">
                            <Clerk.Label className="sr-only">
                              Email verification code
                            </Clerk.Label>
                            <div className="grid gap-y-4 items-center justify-center">
                              <div className="flex justify-center text-center">
                                <Clerk.Input
                                  type="otp"
                                  autoSubmit
                                  className="flex justify-center has-[:disabled]:opacity-50"
                                  render={({ value, status }) => {
                                    return (
                                      <div
                                        data-status={status}
                                        className="relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md data-[status=selected]:ring-1 data-[status=selected]:ring-ring data-[status=cursor]:ring-1 data-[status=cursor]:ring-ring"
                                      >
                                        {value}
                                      </div>
                                    );
                                  }}
                                />
                              </div>
                              <Clerk.FieldError className="block text-sm text-destructive text-center" />
                              <SignIn.Action
                                asChild
                                resend
                                className="text-muted-foreground"
                                fallback={({ resendableAfter }: any) => (
                                  <p className="text-muted-foreground cursor-wait text-[13px] mb-0 sm:mb-4 ">
                                    Didn&apos;t receive a code? Resend code in{" "}
                                    {resendableAfter} second(s)
                                  </p>
                                )}
                              >
                                <Button
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  className="cursor-pointer"
                                >
                                  Resend the validation code
                                </Button>
                              </SignIn.Action>
                            </div>
                          </Clerk.Field>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <div className="grid w-full gap-y-4">
                          <SignIn.Action submit asChild>
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
                          </SignIn.Action>
                          {/* <SignIn.Action navigate="choose-strategy" asChild>
                            <Button size="sm" variant="link">
                              Use another method
                            </Button>
                          </SignIn.Action> */}
                        </div>
                      </CardFooter>
                    </Card>
                  </SignIn.Strategy>
                </SignIn.Step>
              </>
            )}
          </Clerk.Loading>
        </SignIn.Root>
      </div>
    </main>
  );
}

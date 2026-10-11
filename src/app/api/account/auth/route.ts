import { NextResponse } from "next/server";
import { newUserSignup } from "../../emails/newSignUp";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";


export async function GET() {
  const { supabase, user, error } = await getSupabaseServerUser();

  if (error || !user) {
    return NextResponse.json(
      { message: "Unauthorized", error: error ?? "Unauthorized" },
      { status: 401 },
    );
  }

  const userId = user.id;

  try {

    // PROFILE CHECK / CREATE
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      return NextResponse.json(
        { message: "Database error", error: profileError.message },
        { status: 500 },
      );
    }

    if (!profile) {
      const { error: insertProfileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email: user.email ?? null,
        });

      if (insertProfileError) {
        return NextResponse.json(
          {
            message: "Failed to create profile",
            error: insertProfileError.message,
          },
          { status: 500 },
        );
      }

      // if all good send new user message to admin
      await newUserSignup({
        userEmail: user.email ?? "unknown",
        userName: (user.user_metadata?.name as string) ?? "unknown name",
      });
    }

    // SERVICE MODEL: entitlements live in user_services. Free provisioning
    // happens automatically (DB trigger on auth.users + migration backfill),
    // so this route only reads what the account has — no gating writes.
    const { data: services, error: servicesError } = await supabase
      .from("user_services")
      .select("service_type, status")
      .eq("user_id", userId);

    if (servicesError) {
      return NextResponse.json(
        { message: "Database error", error: servicesError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Request allowed",
      access: "granted",
      user: {
        id: userId,
        email: user.email ?? null,
        name: (user.user_metadata?.name as string) ?? null,
      },
      services: services ?? [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Internal error", error: err.message },
      { status: 500 },
    );
  }
}


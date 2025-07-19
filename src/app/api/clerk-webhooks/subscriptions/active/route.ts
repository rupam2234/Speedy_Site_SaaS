// import { setupDB } from "@/lib/db";
// import { NextRequest, NextResponse } from "next/server";

// const helper = setupDB();

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();

//     if (!body || !body.data || !body.data.items) {
//       return NextResponse.json(
//         { message: "Missing subscription data" },
//         { status: 400 }
//       );
//     }

//     const activeItem = body.data.items.find(
//       (item: any) => item.status === "active"
//     );

//     if (!activeItem) {
//       return NextResponse.json(
//         { message: "No active subscription item found" },
//         { status: 404 }
//       );
//     }

//     const subscription_data = {
//       activePlan: activeItem.plan.slug,
//       has_lab_access: activeItem.plan.slug === "pro"
//           ? true
//           : activeItem.plan.slug === "basic_plan"
//           ? true
//           : false,
//       has_rum: activeItem.plan.slug === "pro" ? true : false,,
//       latest_payment_id: body.data?.latest_payment_id ?? "",
//       max_sites:
//         activeItem.plan.slug === "pro"
//           ? 4
//           : activeItem.plan.slug === "basic_plan"
//           ? 2
//           : 1,
//       plan_id: activeItem.plan?.id ?? "",
//       subscription_created_at: body.data?.created_at ?? null,
//       period_start: activeItem.period_start ?? null,
//       period_end: activeItem.period_end ?? null,
//       subscription_status: body.data?.status ?? "",
//     };

    

//     // const { data, error } = await helper
//     //   .from("users")
//     //   .update({
//     //     firstname: user.firstname,
//     //     lastname: user.lastname,
//     //     email: user.email,
//     //     plan_id: subscription_data.plan_id, // save plan to users table
//     //     subscription_status: subscription_data.subscription_status, // optional
//     //     latest_payment_id: subscription_data.latest_payment_id, // optional
//     //   })
//     //   .eq("id", user.id)
//     //   .select();

//     // if (error) {
//     //   console.error("Supabase update error:", error);
//     //   return NextResponse.json(
//     //     { message: "Error updating user", details: error.message },
//     //     { status: 500 }
//     //   );
//     }

//     return NextResponse.json(
//       {
//         message: "User updated",
//         user: data?.[0],
//         subscription: subscription_data,
//       },
//       { status: 200 }
//     );
//   } catch (err: any) {
//     console.error("Request error:", err);
//     return NextResponse.json(
//       { message: "Invalid request", error: err.message },
//       { status: 400 }
//     );
//   }
// }

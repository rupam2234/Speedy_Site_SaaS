import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { EmailReporting } from "../../dataTypes";

const worker = setupDB();

export async function POST(req: NextRequest) {
  const props: EmailReporting = await req.json();

  const action: "update" | "delete" =
    props?.report_verbosity && props.report_verbosity > 0 ? "update" : "delete";

  try {
    const { error } =
      action === "update"
        ? await worker
            .from("email_reporting")
            .upsert(props, { onConflict: "order_id" })
        : await worker
            .from("email_reporting")
            .delete()
            .eq("order_id", props.order_id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Unexpacted Error" },
      { status: 500 },
    );
  }
}

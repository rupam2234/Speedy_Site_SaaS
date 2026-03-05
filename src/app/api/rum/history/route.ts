import { setupDB } from "@/lib/db";

const worker = setupDB();

interface RumHistoryRequest {
  domain: string;
  date_from: string;
  date_to: string;
}

export async function POST(req: Request) {
  try {
    const { domain, date_from, date_to }: RumHistoryRequest = await req.json();

    if (!domain || !date_from || !date_to) {
      return Response.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    const { data: rum_history_data, error: rum_history_error } =
      await worker.rpc("get_rum_history", {
        p_domain: domain,
        p_from: date_from,
        p_to: date_to,
      });

    if (rum_history_error) {
      throw new Error(rum_history_error.message ?? "Error fetching rum history data")
    }

    return Response.json({ rum_history_data }, { status: 200 });
  } catch (err: any) {
    return Response.json(
      { message: err.message || "Unexpected error" },
      { status: 500 },
    );
  }
}

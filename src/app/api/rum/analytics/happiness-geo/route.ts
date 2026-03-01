import { setupDB } from "@/lib/db";

const supabase = setupDB();

interface Props {
  domain: string;
  start_date: string;
  end_date: string;
}

export async function POST(req: Request) {

  const {domain, end_date,start_date}: Props = await req.json();

  if(!domain || !end_date || !start_date){
    return Response.json({message: "Bad request"}, {status: 400});
  }

  try {
    const { data, error } = await supabase.rpc("user_happiness_dist", {
      domain_filter: domain,
      start_date: start_date,
      end_date: end_date,
    });

    if (error) {
      throw new Error(error.message);
    }

    return Response.json(
      { data },
      { status: 200 }
    );
  } catch (error: any) {
    return Response.json(
      { message: error.message || "failed to fetch UX data" },
      { status: 500 }
    );
  }
}

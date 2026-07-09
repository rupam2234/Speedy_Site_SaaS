import { OrderFormInput } from "@/app/account/one-time-payment/required-data/page";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { checkFavicon } from "@/components/utils";
import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();
const storage_handler = setupDB();

export async function POST(req: NextRequest) {
    const {
        wp_address,
        wp_login_url,
        selectedSite,
    }: OrderFormInput & {
        selectedSite: string;
    } = await req.json();

    if (!wp_address || !wp_login_url || !selectedSite) {
        return NextResponse.json("Bad request", { status: 400 });
    }

    const { user } = await getSupabaseServerUser();

    if (!user) {
        return NextResponse.json("User Unauthorized", { status: 401 });
    }

    const siteUrl = await validateSiteUrl(selectedSite);

    try {
        // Check whether the order already exists
        const { data: existingOrder, error: existingOrderError } = await worker
            .from("orders")
            .select("order_id")
            .eq("website_name", selectedSite)
            .maybeSingle();

        if (existingOrderError) {
            throw new Error(existingOrderError.message);
        }

        let orderId = existingOrder?.order_id;

        // Create order if it doesn't exist
        if (!orderId) {
            let faviconFilePath: string | null = null;

            const favicon = await checkFavicon(siteUrl);

            if (favicon) {
                faviconFilePath = await uploadFavicon(favicon, selectedSite);
            }

            const { data: newOrder, error: orderError } = await worker
                .from("orders")
                .insert({
                    website_address: siteUrl,
                    website_name: selectedSite,
                    favicon_file: faviconFilePath,
                    order_status: true,
                    user_id: user.id,
                })
                .select("order_id")
                .single();

            if (orderError) {
                throw new Error("Unexpacted error occured.");
            }

            orderId = newOrder.order_id;
        }

        // Save WordPress credentials
        const { error: wpError } = await worker
            .from("wordpress_cred")
            .insert({
                order_id: orderId,
                wp_address,
                wp_login_url,
            });

        if (wpError) {
            throw new Error(
                "Unexpacted error occured.");
        }

        return NextResponse.json(
            { message: "Details saved successfully." },
            { status: 200 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message || "Unexpacted error occured." },
            { status: 500 }
        );
    }
}

async function uploadFavicon(
    imageUrl: string,
    domain: string
): Promise<string> {
    if (!imageUrl) {
        throw new Error("Missing imageUrl");
    }

    if (!domain) {
        throw new Error("Missing domain");
    }

    const response = await fetch(imageUrl);

    if (!response.ok) {
        throw new Error("Failed to fetch favicon");
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const contentType = response.headers.get("content-type") ?? "image/png";

    const extension =
        contentType.split("/")[1] ||
        imageUrl.split(".").pop()?.split("?")[0] ||
        "png";

    const filePath = `favicon-${domain}.${extension}`;

    const { error } = await storage_handler.storage
        .from("favicons")
        .upload(filePath, imageBuffer, {
            upsert: true,
            contentType,
        });

    if (error) {
        throw new Error(error.message);
    }

    return filePath;
}

async function validateSiteUrl(input: string): Promise<string> {
    const siteUrl = input.startsWith("http")
        ? input
        : `https://${input}`;

    let url: URL;

    try {
        url = new URL(siteUrl);
    } catch {
        throw new Error("Invalid website URL");
    }

    try {
        let response = await fetch(url.toString(), {
            method: "HEAD",
            redirect: "follow",
        });

        // Some websites block HEAD requests, we can try GET
        if (!response.ok) {
            response = await fetch(url.toString(), {
                method: "GET",
                redirect: "follow",
            });
        }

        if (!response.ok) {
            throw new Error(`Website returned status ${response.status}`);
        }

        return url.toString();
    } catch {
        throw new Error("Website is unreachable");
    }
}
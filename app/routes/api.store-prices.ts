import { authenticate } from "app/shopify.server";
import StorePrice from "app/MongoDB/models/StorePrice";
import { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    try {
        await authenticate.admin(request);
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "2");
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            StorePrice.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            StorePrice.countDocuments(),
        ]);

        return new Response(
            JSON.stringify({
                success: true,
                data: JSON.parse(JSON.stringify(items)),
                total,
                page,
                limit,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error: any) {
        console.log("error occured on api.store-prices", error)
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
};

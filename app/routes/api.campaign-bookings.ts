import CampaignBooking from "app/MongoDB/models/CampaignBooking";
import { authenticate } from "app/shopify.server";
import type { LoaderFunctionArgs } from "react-router";

const DEFAULT_LIMIT = 10;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const action = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.admin(request);
    const body = await request.json();
    // console.log("body................", body);

    const page = Math.max(parseInt(body.page || "1", 10), 1);
    const limit = Math.max(parseInt(body.limit || `${DEFAULT_LIMIT}`, 10), 1);
    const search = (body.search || "").trim();
    const skip = (page - 1) * limit;

    const query = search
      ? {
        $or: [
          { name: { $regex: escapeRegex(search), $options: "i" } },
          { email: { $regex: escapeRegex(search), $options: "i" } },
          { mobile: { $regex: escapeRegex(search), $options: "i" } },
          { city: { $regex: escapeRegex(search), $options: "i" } },
          { store: { $regex: escapeRegex(search), $options: "i" } },
          { date: { $regex: escapeRegex(search), $options: "i" } },
          { status: { $regex: escapeRegex(search), $options: "i" } },
          { razorpay_order_id: { $regex: escapeRegex(search), $options: "i" } },
          { razorpay_payment_id: { $regex: escapeRegex(search), $options: "i" } },
        ],
      }
      : {};

    const [items, total] = await Promise.all([
      CampaignBooking.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CampaignBooking.countDocuments(query),
    ]);
    // console.log("items................", items);

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
      },
    );
  } catch (error: any) {
    console.error("error occurred on api.campaign-bookings", error);

    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

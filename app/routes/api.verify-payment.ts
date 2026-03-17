import crypto from "crypto";
import { ActionFunctionArgs } from "react-router";
import CampaignBooking from "app/MongoDB/models/CampaignBooking";

export const action = async ({ request }: ActionFunctionArgs) => {

    const body = await request.json();
    console.log("verify-payment, body:", body);

    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
    } = body;

    // verifying Razorpay signature
    const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

    console.log(
        "verify-payment — generated_signature:", generated_signature,
        "| received:", razorpay_signature
    );

    if (generated_signature !== razorpay_signature) {
        return new Response(JSON.stringify({
            success: false,
            message: "Invalid signature"
        }), { status: 400 });
    }

    // marking booking as paid in DB
    // email is intentionally NOT sent here — the webhook (payment.captured) is
    // the authoritative signal and handles all email notification with idempotency.
    try {
        await CampaignBooking.findOneAndUpdate(
            { razorpay_order_id },
            {
                $set: {
                    status: "paid",
                    razorpay_payment_id,
                }
            }
        );
        console.log("verify-payment: booking marked as paid for order:", razorpay_order_id);
    } catch (err) {
        // non-fatal: DB update failure shouldn't block the success response to the user
        console.error("verify-payment: DB update failed:", err);
    }

    return new Response(JSON.stringify({
        success: true,
        message: "Payment verified"
    }));
};
import crypto from "crypto";
import { ActionFunctionArgs } from "react-router";
import { sendAdminEmail } from "app/utils/email.server";
import CampaignBooking from "app/MongoDB/models/CampaignBooking";

export const action = async ({ request }: ActionFunctionArgs) => {

    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    // verifying webhook HMAC signature
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
        .update(body)
        .digest("hex");

    if (expectedSignature !== signature) {
        console.warn("razorpay-webhook: invalid signature");
        return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(body);
    console.log("razorpay-webhook event:", event.event);

    // handling only confirmed captures
    if (event.event !== "payment.captured") {
        return new Response("OK");
    }

    const payment = event.payload.payment.entity;
    const orderId: string = payment.order_id;
    const paymentId: string = payment.id;

    console.log("razorpay-webhook: payment.captured for order:", orderId, "payment:", paymentId);

    try {

        // fetching booking record saved during create-order
        const booking = await CampaignBooking.findOne({ razorpay_order_id: orderId });

        if (!booking) {
            console.error("razorpay-webhook: no booking found for order:", orderId);
            // returning 200 so Razorpay doesn't keep retrying — log for manual follow-up
            return new Response("OK");
        }

        // idempotency guard — skipping if email already sent
        if (booking.emailSent) {
            console.log("razorpay-webhook: email already sent for order:", orderId, "— skipping.");
            return new Response("OK");
        }

        // building vehicle rows for email
        const numVehicles = booking.numVehicles;
        const vehicleRows: Record<string, string> = {};
        const vehicles = booking.vehicles || [];

        for (let i = 0; i < numVehicles; i++) {
            const v = vehicles[i] || ({} as any);
            vehicleRows[`Vehicle ${i + 1} - Number`] = v.vehicleNumber || "N/A";
            vehicleRows[`Vehicle ${i + 1} - Make`] = v.vehicleMake || "N/A";
            vehicleRows[`Vehicle ${i + 1} - Model`] = v.vehicleModel || "N/A";
        }

        // sending admin email
        await sendAdminEmail({
            subject: `Campaign Booking - ${booking.name}`,
            formType: "Campaign Booking",
            data: {
                "Customer Name": booking.name,
                "Email": booking.email,
                "Mobile Number": booking.mobile,
                "Number of Vehicles": numVehicles,
                ...vehicleRows,
                "Booking Date": booking.date,
                "City": booking.city,
                "Store": booking.store,
                "Payment ID": paymentId,
                "Order ID": orderId,
            },
        });

        console.log("razorpay-webhook: email sent for order:", orderId);

        // marking email as sent and updating payment status
        await CampaignBooking.findOneAndUpdate(
            { razorpay_order_id: orderId },
            {
                $set: {
                    emailSent: true,
                    status: "paid",
                    razorpay_payment_id: paymentId,
                }
            }
        );

    } catch (err) {
        console.error("razorpay-webhook: processing error:", err);
        // returning 500 so Razorpay retries the webhook
        return new Response("Internal Server Error", { status: 500 });
    }

    return new Response("OK");
};
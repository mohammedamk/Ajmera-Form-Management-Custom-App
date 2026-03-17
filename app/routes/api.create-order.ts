import Razorpay from "razorpay";
import { ActionFunctionArgs } from "react-router";
import CampaignBooking from "app/MongoDB/models/CampaignBooking";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const action = async ({ request }: ActionFunctionArgs) => {
    const body = await request.json();
    const { amount, payload } = body;
    console.log("trigger on create-order, body:", JSON.stringify(body));

    const errors: Record<string, string> = {};
    const data = payload.data;

    if (!data.name || data.name.trim().length < 2) {
        errors.name = "Customer name is required and must be at least 2 characters.";
    }

    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
        errors.email = "A valid email address is required.";
    }

    if (!data.mobile || !/^\d{10}$/.test(data.mobile.replace(/\D/g, ""))) {
        errors.mobile = "A valid 10-digit mobile number is required.";
    }

    const numVehicles = parseInt(data.numVehicles) || 0;

    if (!numVehicles || numVehicles < 1 || numVehicles > 5) {
        errors.numVehicles = "Please select the number of vehicles (1–5).";
    } else {
        const vehicles: any[] = data.vehicles || [];
        for (let i = 0; i < numVehicles; i++) {
            const v = vehicles[i] || {};
            if (!v.vehicleNumber || v.vehicleNumber.trim().length !== 10) {
                errors[`vehicle_${i}_number`] = `Vehicle ${i + 1}: Vehicle number must be exactly 10 characters.`;
            }
            if (!v.vehicleMake || v.vehicleMake.trim().length === 0) {
                errors[`vehicle_${i}_make`] = `Vehicle ${i + 1}: Vehicle make is required.`;
            }
            if (!v.vehicleModel || v.vehicleModel.trim().length === 0) {
                errors[`vehicle_${i}_model`] = `Vehicle ${i + 1}: Vehicle model is required.`;
            }
        }
    }

    if (!data.date || data.date.trim().length === 0) {
        errors.date = "Please select a booking date.";
    }

    if (!data.city || data.city.trim().length === 0) {
        errors.city = "Please select a city.";
    }

    if (!data.store || data.store.trim().length === 0) {
        errors.store = "Please select a store.";
    }

    if (Object.keys(errors).length > 0) {
        console.log("errors", errors);
        return new Response(
            JSON.stringify({ success: false, errors, message: "Validation failed" }),
            { status: 400 }
        );
    }

    try {
        const order = await razorpay.orders.create({
            amount: amount * 100, // in paise
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        });

        console.log("order from create-order", order);

        // persist booking data linked to this order so webhook can retrieve it later
        await CampaignBooking.create({
            razorpay_order_id: order.id,
            name: data.name,
            email: data.email,
            mobile: data.mobile,
            city: data.city,
            store: data.store,
            date: data.date,
            numVehicles,
            vehicles: data.vehicles || [],
            amount,
            status: "pending",
            emailSent: false,
        });

        console.log("CampaignBooking saved for order:", order.id);

        return new Response(JSON.stringify({
            success: true,
            order,
        }));

    } catch (err) {
        console.error("create-order error:", err);
        return new Response(JSON.stringify({
            success: false,
            message: "Order creation failed",
        }), { status: 500 });
    }
};
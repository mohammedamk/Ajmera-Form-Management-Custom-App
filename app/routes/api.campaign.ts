import { authenticate } from "app/shopify.server";
import { sendAdminEmail } from "app/utils/email.server";
import { ActionFunctionArgs } from "react-router";

export const action = async ({ request }: ActionFunctionArgs) => {
    await authenticate.public.appProxy(request);
    const body = await request.json();
    const data = body.data;

    console.log("data................campaign", data);

    const errors: Record<string, string> = {};

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

    const vehicles: any[] = data.vehicles || [];
    const vehicleRows: Record<string, string> = {};
    for (let i = 0; i < numVehicles; i++) {
        const v = vehicles[i] || {};
        vehicleRows[`Vehicle ${i + 1} - Number`] = v.vehicleNumber || "N/A";
        vehicleRows[`Vehicle ${i + 1} - Make`] = v.vehicleMake || "N/A";
        vehicleRows[`Vehicle ${i + 1} - Model`] = v.vehicleModel || "N/A";
    }

    try {
        await sendAdminEmail({
            subject: `Campaign Booking - ${data.name}`,
            formType: "Offers Enquiry",
            data: {
                "Customer Name": data.name,
                "Email": data.email,
                "Mobile Number": data.mobile,
                "Number of Vehicles": numVehicles,
                ...vehicleRows,
                "Booking Date": data.date,
                "City": data.city,
                "Store": data.store,
            },
        });

        return new Response(
            JSON.stringify({ success: true, message: "Campaign booking submitted successfully" }),
            { status: 200 }
        );
    } catch (error) {
        console.error("Error sending campaign booking email", error);
        return new Response(
            JSON.stringify({ success: false, message: "Failed to send campaign booking email" }),
            { status: 500 }
        );
    }
};

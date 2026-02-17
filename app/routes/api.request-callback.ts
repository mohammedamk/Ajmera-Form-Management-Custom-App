import { authenticate } from "app/shopify.server";
import { sendAdminEmail } from "app/utils/email.server";
import { ActionFunctionArgs } from "react-router";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.public.appProxy(request);
    
    const body = await request.json();
    const data = body.data;

    console.log("data................request-callback", data);

    const errors: Record<string, string> = {};

    const validTypes = ["Customer Feedback", "Franchise Enquires", "Vender Queries"];
    if (!data.queryType || !validTypes.includes(data.queryType)) {
        errors.queryType = "Please select a query category.";
    }

    if (!data.name || data.name.trim().length < 2) {    
        errors.name = "Full name is required.";
    }

    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
        errors.email = "Valid email is required.";
    }

    if (!data.mobile || !/^\d{10}$/.test(data.mobile.replace(/\D/g, ""))) {
        errors["mobile-number"] = "10-digit mobile number is required.";
    }

    if (!data.city || data.city.trim().length === 0) {
        errors.city = "City is required.";
    }

    if (!data.message || data.message.trim().length < 5) {
        errors.message = "Message must be at least 5 characters.";
    }

    if (data.consent !== true) {
        errors.consent = "You must consent to be contacted to submit this form.";
    }

    if (!data.vehicleNumber || data.vehicleNumber.trim().length < 3) {
        errors["vehicle-number"] = "Please enter a valid vehicle number.";
    }

    if (Object.keys(errors).length > 0) {
        return new Response(
            JSON.stringify({ success: false, errors, message: "Validation failed" }), 
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        await sendAdminEmail({
            subject: `Request Callback - ${data.queryType}`,
            formType: "Call Back",
            data: {
                "Category": data.queryType, 
                "Customer Name": data.name,
                "Email": data.email,
                "Mobile": data.mobile,
                "City": data.city,
                "Message": data.message,
                "Vehicle Number": data.vehicleNumber,
                "Consent Given": data.consent ? "Yes" : "No"
            },
        });

        return new Response(
            JSON.stringify({ success: true, message: "Request callback sent successfully" }), 
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error sending request callback:", error);
        return new Response(
            JSON.stringify({ success: false, message: "Failed to send request callback" }), 
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};
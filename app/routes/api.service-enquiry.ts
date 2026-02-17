import { authenticate } from "app/shopify.server";
import { sendAdminEmail } from "app/utils/email.server";
import { ActionFunctionArgs } from "react-router";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.public.appProxy(request);
    
    const body = await request.json();
    const data = body.data;

    console.log("data................service-enquiry", data);

    const errors: Record<string, string> = {};

    if (!data.name || data.name.trim().length < 2) {
        errors.name = "Full name is required.";
    }

    if (!data.mobile || !/^\d{10}$/.test(data.mobile.replace(/\D/g, ""))) {
        errors["mobile-number"] = "A valid 10-digit mobile number is required.";
    }

    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
        errors.email = "A valid email address is required.";
    }

    if (!data.city || data.city.trim().length === 0) {
        errors.city = "City is required.";
    }

    if (!data.service || data.service.trim().length === 0) {
        errors.service = "Service type is missing.";
    }

    if (!data.message || data.message.trim().length < 5) {
        errors.message = "Please enter a message (at least 5 characters).";
    }

    if (Object.keys(errors).length > 0) {
        return new Response(
            JSON.stringify({ success: false, errors, message: "Validation failed" }), 
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        await sendAdminEmail({
            subject: `Service Enquiry from ${data.name}`,
            formType: "Service Enquiry",
            data: {
                "Service Requested": data.service,
                "Customer Name": data.name,
                "Mobile": data.mobile,
                "Email": data.email,
                "City": data.city,
                "Message": data.message,
            },
        });

        return new Response(
            JSON.stringify({ success: true, message: "Service enquiry mail sent successfully!" }), 
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error sending service enquiry email:", error);
        return new Response(
            JSON.stringify({ success: false, message: "Failed to send service enquiry mail" }), 
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};
import { authenticate } from "app/shopify.server";
import { sendAdminEmail } from "app/utils/email.server";
import { ActionFunctionArgs } from "react-router";

export const action = async ({ request }: ActionFunctionArgs) => {
    await authenticate.public.appProxy(request);
    
    const body = await request.json();
    const data = body.data;

    console.log("data................apply-technician", data);

    const errors: Record<string, string> = {};

    if (!data.name || data.name.trim().length < 2) {
        errors.name = "Full name is required.";
    }

    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
        errors.email = "Valid email address is required.";
    }

    if (!data.mobile || !/^\d{10}$/.test(data.mobile.replace(/\D/g, ""))) {
        errors["mobile-number"] = "10-digit mobile number is required.";
    }

    if (!data.city || data.city.trim().length === 0) {
        errors.city = "City is required.";
    }

    if (!data.role || data.role.trim().length === 0) {
        errors.role = "The position title is required.";
    }

    if (data.portfolio && !data.portfolio.startsWith("http")) {
        errors.portfolio = "Please provide a valid URL starting with http/https.";
    }

    if (Object.keys(errors).length > 0) {
        return new Response(
            JSON.stringify({ success: false, errors, message: "Please correct the errors." }), 
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        await sendAdminEmail({
            subject: `Job Application: ${data.role} from ${data.city}`,
            formType: "Applying Technician",
            data: {
                "Position": data.role,
                "Candidate Name": data.name,
                "Email": data.email,
                "Mobile": data.mobile,
                "City": data.city,
                "Portfolio/Work Link": data.portfolio || "Not Provided",
            },
        });

        return new Response(
            JSON.stringify({ success: true, message: "Application submitted successfully." }), 
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Career Form Error:", error);
        return new Response(
            JSON.stringify({ success: false, message: "Failed to submit application." }), 
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};
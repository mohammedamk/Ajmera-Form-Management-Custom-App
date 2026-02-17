import { authenticate } from "app/shopify.server";
import { sendAdminEmail } from "app/utils/email.server";
import { ActionFunctionArgs } from "react-router";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.public.appProxy(request);
    const body = await request.json();
    const data = body.data;
    console.log("data................", data);
    const errors: Record<string, string> = {};

    if (!data.name || data.name.trim().length < 2) {
        errors.name = "Name is required and must be at least 2 characters.";
    }

    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
        errors.email = "A valid email address is required.";
    }

    if (!data.mobile || !/^\d{10}$/.test(data.mobile.replace(/\D/g, ""))) {
        errors.mobile = "A valid 10-digit mobile number is required.";
    }

    if (!data.city || data.city.trim().length === 0) {
        errors.city = "City is required.";
    }

    if (!data.message || data.message.trim().length < 5) {
        errors.message = "Please enter a message (at least 5 characters).";
    }

    if (data.consent !== true) {
        errors.consent = "You must consent to be contacted to submit this form.";
    }

    if (Object.keys(errors).length > 0) {
        console.log("errors", errors);
        return new Response(
            JSON.stringify({ success: false, errors, message: "Validation failed" }),
            {
                status: 400
            }
        );
    }

    try {
        await sendAdminEmail({
            subject: `Call back for ${data.city}`,
            formType: "Contact Us",
            data: {
                Name: data.name,
                Email: data.email,
                Mobile: data.mobile,
                City: data.city,
                Message: data.message,
                "Consent Given": data.consent ? "Yes" : "No"
            },
        });

        return new Response(
            JSON.stringify({ success: true, message: "Call back email sent successfully" }),
            {
                status: 200
            }
        );
    } catch (error) {
        console.error("error on sending call back email", error);
        return new Response(
            JSON.stringify({ success: false, message: "Failed to send Call back email" }),
            {
                status: 500
            }
        );
    }
};
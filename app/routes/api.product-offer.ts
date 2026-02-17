import { authenticate } from "app/shopify.server";
import { sendAdminEmail } from "app/utils/email.server";
import { ActionFunctionArgs } from "react-router";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.public.appProxy(request);
    const body = await request.json();
    const data = body.data;

    console.log("data................product-offer", data);

    const errors: Record<string, string> = {};

    if (!data.name || data.name.trim().length < 2) {
        errors.name = "Name is required.";
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

    if (!data.offer || data.offer.trim().length === 0) {
        errors.offer = "Offer selection is missing.";
    }

    if (!data.message || data.message.trim().length < 5) {
        errors.message = "Please provide a brief message.";
    }

    if (Object.keys(errors).length > 0) {
        return new Response(
            JSON.stringify({ success: false, errors, message: "Please fix the errors in the form." }),
            { status: 400 }
        );
    }

    try {
        await sendAdminEmail({
            subject: `Offers Enquiry from ${data.name}`,
            formType: "Offers Enquiry",
            data: {
                Name: data.name,
                Mobile: data.mobile,
                Email: data.email,
                City: data.city,
                Offer: data.offer,
                Message: data.message,
            },
        });

        return new Response(
            JSON.stringify({ success: true, message: "Offers Enquiry email sent successfully" }),
            { status: 200 }
        );
    } catch (error) {
        console.error("error on sending product Offer email", error);
        return new Response(
            JSON.stringify({ success: false, message: "Failed to send Offers Enquiry email" }),
            { status: 500 }
        );
    }
};
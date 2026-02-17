import { authenticate } from "app/shopify.server";
import { sendAdminEmail } from "app/utils/email.server";
import { ActionFunctionArgs } from "react-router";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  const body = await request.json();
  const data = body.data;

  console.log("data................product-enquiry", data);

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

  if (!data.product || data.product.trim().length === 0) {
    errors.product = "Product selection is missing.";
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
      subject: `Product Enquiry from ${data.name}`,
      formType: "Product Enquiry",
      data: {
        Name: data.name,
        Mobile: data.mobile,
        Email: data.email,
        City: data.city,
        Product: data.product,
        Message: data.message,
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Product Enquiry email sent successfully" }), 
      { status: 200 }
    );
  } catch (error) {
    console.error("error on sending product Enquiry email", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to send Product Enquiry email" }), 
      { status: 500 }
    );
  }
};
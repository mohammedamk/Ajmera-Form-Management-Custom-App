import { authenticate } from "app/shopify.server";
import StorePrice from "app/MongoDB/models/StorePrice";
import { LoaderFunctionArgs } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.public.appProxy(request);

    const storePrices = await StorePrice.find()
      .sort({ city: 1 })
      .lean();
    console.log("storePrices................", storePrices);

    return new Response(
      JSON.stringify({
        success: true,
        data: JSON.parse(JSON.stringify(storePrices)),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.log("Error in api.campaign-location-prices:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
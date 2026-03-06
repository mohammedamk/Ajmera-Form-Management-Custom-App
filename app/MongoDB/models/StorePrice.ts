import mongoose from "mongoose";

const StorePriceSchema = new mongoose.Schema({
    city: { type: String, required: true },
    stores: { type: [String], required: true },
    price: { type: Number, required: true },
}, { timestamps: true });

// The model name is StorePrice, but the collection name is campaign_location_prices
const StorePrice = mongoose.models.StorePrice || mongoose.model("StorePrice", StorePriceSchema, "campaign_location_prices");

export default StorePrice;

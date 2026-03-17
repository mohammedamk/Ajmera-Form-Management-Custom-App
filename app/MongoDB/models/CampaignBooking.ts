import mongoose, { Schema, Document } from "mongoose";

export interface IVehicle {
    vehicleNumber: string;
    vehicleMake: string;
    vehicleModel: string;
}

export interface ICampaignBooking extends Document {
    razorpay_order_id: string;
    razorpay_payment_id?: string;
    name: string;
    email: string;
    mobile: string;
    city: string;
    store: string;
    date: string;
    numVehicles: number;
    vehicles: IVehicle[];
    amount: number;
    status: "pending" | "paid" | "failed";
    emailSent: boolean;
    createdAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
    {
        vehicleNumber: { type: String, required: true },
        vehicleMake: { type: String, required: true },
        vehicleModel: { type: String, required: true },
    },
    { _id: false }
);

const CampaignBookingSchema = new Schema<ICampaignBooking>(
    {
        razorpay_order_id: { type: String, required: true, unique: true, index: true },
        razorpay_payment_id: { type: String },
        name: { type: String, required: true },
        email: { type: String, required: true },
        mobile: { type: String, required: true },
        city: { type: String, required: true },
        store: { type: String, required: true },
        date: { type: String, required: true },
        numVehicles: { type: Number, required: true },
        vehicles: { type: [VehicleSchema], required: true },
        amount: { type: Number, required: true },
        status: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
        },
        emailSent: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const CampaignBooking =
    mongoose.models.campaign_bookings ||
    mongoose.model<ICampaignBooking>("campaign_bookings", CampaignBookingSchema);

export default CampaignBooking;

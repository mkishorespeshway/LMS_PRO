import paymentModel from '../models/payment.model.js'
import userModel from "../models/user.model.js";
import AppError from "../utils/error.utils.js";
import { razorpay } from "../server.js";
import crypto from 'crypto';

export const getRazorPayApiKey = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: "Razorpay API Key",
            key: process.env.RAZORPAY_KEY_ID
        })
    } catch (e) {
        return next(new AppError(e.message, 500))
    }

}

export const buySubscription = async (req, res, next) => {
    try {
        const { id } = req.user;
        const { courseId, coursePrice } = req.body;
        const user = await userModel.findById(id);

        if (!user) {
            return next(new AppError("Unauthorized, please login"));
        }

        if (user.role === "ADMIN") {
            return next(new AppError("Admin cannot purchase a subscription", 400));
        }

        const order = await razorpay.orders.create({
            amount: coursePrice * 100, // amount in smallest currency unit (e.g., 100 paise = 1 INR)
            currency: "INR",
            receipt: `receipt_${user._id}`,
        });

        user.subscription.id = order.id;
        user.subscription.status = order.status;
        user.subscription.courseId = courseId; // Store courseId with subscription

        await user.save();

        res.status(200).json({
            success: true,
            message: "Order Created Successfully",
            order_id: order.id,
        });
    } catch (e) {
        console.error(e); // Log the error for debugging
        return next(new AppError(e.message, 500));
    }
};


export const verifySubscription = async (req, res, next) => {
    try {
        const { id } = req.user;
        const { razorpay_payment_id, razorpay_signature, razorpay_order_id } = req.body;

        const user = await userModel.findById(id);
        if (!user) {
            return next(new AppError('Unauthorised, please login', 500))
        }

        const orderId = user.subscription.id;

        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return next(new AppError("Payment Not Verified, please try again", 500))
        }

        await paymentModel.create({
            razorpay_payment_id,
            razorpay_signature,
            razorpay_order_id
        })

        user.subscription.status = 'active';
        await user.save();

        res.status(200).json({
            success: true,
            message: "Payment Varified Successfully"
        })
    } catch (e) {
        return next(new AppError(e.message, 500))
    }
}

export const cancelSubscription = async (req, res, next) => {
    // This function is for cancelling subscriptions, which is not currently in use
    // as we are using an order-based payment system. Re-evaluate if subscriptions
    // are reintroduced.
    return next(new AppError('Subscription cancellation is not applicable in the current payment setup', 400));
};

export const allPayments = async (req, res, next) => {
    try {
        const { count } = req.query;

        const orders = await razorpay.orders.all({
            count: count || 10,
        });

        res.status(200).json({
            success: true,
            message: 'All Payments',
            allPayments: orders
        });
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
};

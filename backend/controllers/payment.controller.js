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

        // Add the course to the user's courseProgress
        if (user.subscription.courseId) {
            const courseId = user.subscription.courseId;
            const isAlreadyEnrolled = user.courseProgress.some(
                (cp) => cp.courseId && cp.courseId.toString() === courseId.toString()
            );

            if (!isAlreadyEnrolled) {
                user.courseProgress.push({
                    courseId: courseId,
                    lecturesCompleted: [],
                    quizScores: [],
                    isCompleted: false
                });
            }
        }

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
        const { count, skip } = req.query;

        // Fetch all payments from our database instead of Razorpay API
        // This ensures the data is "real" to this specific project
        const allPayments = await paymentModel.find({}).sort({ createdAt: -1 });

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        
        const finalMonths = {
            January: 0, February: 0, March: 0, April: 0, May: 0, June: 0,
            July: 0, August: 0, September: 0, October: 0, November: 0, December: 0
        };

        const parsedData = allPayments.map((payment) => {
            const monthInNumber = new Date(payment.createdAt).getMonth();
            return monthNames[monthInNumber];
        });

        for (const month of parsedData) {
            if (finalMonths.hasOwnProperty(month)) {
                finalMonths[month] = finalMonths[month] + 1;
            }
        }

        const monthlySalesRecord = Object.values(finalMonths);

        const totalSubscriptions = allPayments.length;

        // Since amount is not stored in the Payment model yet, 
        // we can either fetch from Razorpay for each ID or use a placeholder/calculated value.
        // For now, let's fetch the total revenue from Razorpay but we should ideally store it in DB.
        const razorpayPayments = await razorpay.payments.all({
            count: 100,
        });

        // Filter Razorpay payments to only include those in our database
        const dbPaymentIds = allPayments.map(p => p.razorpay_payment_id);
        const filteredPayments = razorpayPayments.items.filter(p => dbPaymentIds.includes(p.id));

        const totalRevenue = filteredPayments.reduce((acc, payment) => {
            if (payment.status === 'captured') {
                return acc + (payment.amount / 100);
            }
            return acc;
        }, 0);

        res.status(200).json({
            success: true,
            message: 'All Payments',
            allPayments,
            totalSubscriptions,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            monthlySalesRecord
        });
    } catch (e) {
        console.error("Error fetching payments:", e);
        return next(new AppError(e.message, 500));
    }
};

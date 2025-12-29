import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../../Layout/Layout";
import { BiRupee } from "react-icons/bi";
import {
  getRazorPayId,
  purchaseCourseBundle,
  verifyUserPayment,
} from "../../Redux/Slices/RazorpaySlice";
import toast from "react-hot-toast";
import { getUserData } from "../../Redux/Slices/AuthSlice";

export default function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { state } = useLocation();
  const coursePrice = state?.coursePrice || 499; // Default to 499 if no course price is passed
  const courseId = state?.courseId;
  const rzorpayKey = useSelector((state) => state?.razorpay?.key);
  const [order_id, setOrder_id] = useState(
    useSelector((state) => state?.razorpay?.order_id)
  );

  const userData = useSelector((state) => state?.auth?.data);
  const paymentDetails = {
    razorpay_payment_id: "",
    razorpay_order_id: "",
    razorpay_signature: "",
  };

  async function loadScript(src) {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  async function handleSubscription(e) {
    e.preventDefault();

    const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");

    if (!res) {
      toast.error("Razorpay SDK failed to load.");
      return;
    }

    if (!rzorpayKey || !order_id) {
      toast.error("something went wrong");
      return;
    }

    const options = {
      key: rzorpayKey,
      order_id: order_id,
      name: "LMS",
      description: "subscription",
      theme: {
        color: "#fff",
      },
      prefill: {
        email: userData?.email,
        name: userData?.fullName,
      },
      handler: async function (response) {
        paymentDetails.razorpay_payment_id = response.razorpay_payment_id;
        paymentDetails.razorpay_signature = response.razorpay_signature;
        paymentDetails.razorpay_order_id =
          response.razorpay_order_id;

        toast.success("Payment successful");

        const res = await dispatch(verifyUserPayment(paymentDetails));
        if (res?.payload?.success) {
          navigate("/checkout/success");
        } else {
          navigate("/checkout/fail");
        }
      },
    };
    console.log("Razorpay Key:", rzorpayKey);
    console.log("Order ID:", order_id);
    try {
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("Error initializing Razorpay: ", error);
      toast.error("Failed to open Razorpay checkout.");
    }
  }

  useEffect(() => {
    // Fetch the RazorPay ID
    (async () => {
      await dispatch(getRazorPayId());
    })();

    // Check the user's subscription status
    // The previous logic redirected to /courses if subscription status was 'active'.
    // This is incorrect for the new per-course purchase model.
    // We should only redirect if the user has ALREADY purchased THIS SPECIFIC course.
    
    // However, the checkout page is generic. It receives courseId via location state.
    // We should check if the user is already enrolled in THIS course.
    
    if (userData?.courseProgress?.some((cp) => cp.courseId === courseId)) {
        toast.error("You are already enrolled in this course");
        navigate("/courses");
        return;
    }

    // Original switch case removed as it was based on global subscription model
    // which conflicts with per-course purchase model.
    
    (async () => {
        // Always create a new order for the course purchase
        const response = await dispatch(purchaseCourseBundle({courseId, coursePrice}));
        if (response?.payload?.order_id) {
            setOrder_id(response.payload.order_id);
        }
    })();

  }, [dispatch, navigate, userData, courseId, coursePrice]);
  return (
    <Layout>
      <section className="flex flex-col gap-6 items-center py-8 px-3 min-h-[100vh]">
        <form
          onSubmit={handleSubscription}
          className="flex flex-col dark:bg-gray-800 bg-white gap-4 rounded-lg md:py-10 py-7 md:px-8 md:pt-3 px-3 md:w-[500px] w-full shadow-custom dark:shadow-xl transition duration-300"
        >
          <div>
            <h1 className="bg-yellow-500 w-full text-center py-4 text-2xl font-bold rounded-tl-lg rounded-tr-lg text-white">
              Subscription Bundle
            </h1>
            <div className="px-4 space-y-7 text-center text-gray-600 dark:text-gray-300">
              <p className="text-lg mt-5">
                Unlock access to all available courses on our platform for{" "}
                <span className="text-yellow-500 font-bold">1 year</span>. This
                includes both existing and new courses.
              </p>

              <p className="flex items-center justify-center gap-1 text-2xl font-bold text-yellow-500">
                <BiRupee />
                <span>{coursePrice}</span>
              </p>

              <div className="text-xs">
                <p className="text-blue-600 dark:text-yellow-500">
                  100% refund on cancellation
                </p>
                <p>* Terms and conditions apply *</p>
              </div>

              <button
                type="submit"
                className="bg-yellow-500  transition duration-300 w-full text-xl font-bold text-white py-2 rounded-bl-lg rounded-br-lg"
              >
                Buy now
              </button>
            </div>
          </div>
        </form>
      </section>
    </Layout>
  );
}

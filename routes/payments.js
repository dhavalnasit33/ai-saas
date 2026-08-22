const express = require("express");
const Payment = require("../models/Payment");
const Plan = require("../models/Plan");
const { protect, authorize, checkPermission } = require("../middleware/auth");
const paymentService = require("../utils/paymentService");
const mongoose = require("mongoose");
const User = require("../models/User");
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// @desc    Get all plans
// @route   GET /api/payments/plans
// @access  Public
router.get("/plans", async (req, res) => {
  try {
    const plans = await Plan.find({ is_active: true }).sort({ price: 1 });

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("Get plans error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const statusFilter = req.query.status;
    const planFilter = req.query.plan;
    const search = req.query.search;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const filter = {};

    // 1. Status filter
    if (statusFilter && statusFilter !== "all") {
      filter.status = statusFilter;
    }

    // 2. Plan filter (FIXED: Filter payment.plan directly instead of looking up users)
    if (planFilter && planFilter !== "all") {
      if (mongoose.Types.ObjectId.isValid(planFilter)) {
        filter.plan = planFilter;
      }
    }

    // 3. Search filter (username or email)
    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");

      // Find users matching search
      const usersMatchingSearch = await User.find(
        { $or: [{ name: regex }, { email: regex }] },
        { _id: 1 },
      ).lean();

      const userIdsMatchingSearch = usersMatchingSearch.map((u) => u._id);

      // We simply add this requirement to the filter.
      // This works in AND combination with the plan filter above.
      filter.user_id = { $in: userIdsMatchingSearch };
    }

    // 4. Date filter
    if (startDate || endDate) {
      filter.start_date = {};
      if (startDate) {
        filter.start_date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.start_date.$lte = end;
      }
    }

    // Count total payments with filters
    const total = await Payment.countDocuments(filter);

    // Fetch filtered payments with pagination
    const payments = await Payment.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate({
        path: "user_id",
        select: "name email plan",
      })
      .populate({
        path: "plan",
        select: "name display_name price yearly_price currency",
      })
      .lean();

    // Format response data
    const data = payments.map((p) => ({
      username: p.user_id?.name || "Unknown",
      userEmail: p.user_id?.email || "",
      userPlan: p.user_id?.plan || "",
      billingPeriod: p.billing_period,
      amountPaid: p.amount,
      currency: p.currency,
      paymentStatus: p.status,
      transactionId: p.transaction_id,
      planId: p.plan?._id,
      planName: p.plan?.name,
      planDisplayName: p.plan?.display_name,
      planStartDate: p.start_date,
      planEndDate: p.end_date,
      isExpired: p.is_expired,
    }));

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/stripe/activate-free-trial", protect, async (req, res) => {
  try {
    const result = await paymentService.activateFreeTrial(req.user.id);
    res.json(result);
  } catch (error) {
    console.error("Free trial activation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to activate free trial",
    });
  }
});

router.post("/stripe/create-checkout-session", protect, async (req, res) => {
  try {
    const {
      plan,
      currency = "USD",
      billing_period = "monthly",
      paymentOption = "try_free",
      rewardfulReferralId = null,
    } = req.body;

    if (rewardfulReferralId) {
      console.log("🎯 [Rewardful] Referral ID received at route:", rewardfulReferralId);
    }

    if (!plan)
      return res
        .status(400)
        .json({ success: false, message: "Plan is required" });

    const planDoc = await Plan.findOne({ _id: plan, is_active: true });
    if (!planDoc)
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });

    const paymentData = await paymentService.createStripeCheckoutSession(
      req.user.id,
      plan,
      currency,
      billing_period,
      paymentOption,
      rewardfulReferralId,
    );

    return res.json({
      success: true,
      session_url: paymentData.url,
    });
  } catch (error) {
    console.error("Stripe Checkout Session creation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create checkout session",
    });
  }
});

router.post("/stripe/create-portal-session", protect, async (req, res) => {
  try {
    const sessionData = await paymentService.createStripePortalSession(
      req.user.id,
    );

    res.json({
      success: true,
      url: sessionData.url,
    });
  } catch (error) {
    console.error("Portal session error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create portal session",
    });
  }
});

router.post("/save-cancel-feedback", protect, async (req, res) => {
  try {
    const { reason, feedback } = req.body;

    // Find the user's active stripe payment
    const payment = await Payment.findOne({
      user_id: req.user._id, // Assumes you have req.user from authMiddleware
      status: { $in: ["success", "cancelling"] },
      payment_method: "stripe",
      transaction_id: { $ne: null },
    }).sort({ createdAt: -1 });

    if (payment) {
      // Save the feedback to the database
      payment.cancellation_reason = reason;
      payment.cancellation_feedback = feedback;
      await payment.save();
      console.log(`💾 Saved cancellation feedback for user ${req.user.email}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error saving cancellation feedback:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/stripe/cancel-subscription", protect, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      user_id: req.user.id,
      status: { $in: ["success"] }, // only active subscriptions
    });

    if (!payment || !payment.transaction_id) {
      return res.status(404).json({
        success: false,
        message: "Active subscription not found or missing subscription ID",
        data: null,
      });
    }

    console.log("Cancelling subscription:", payment.transaction_id);

    // Cancel subscription at period end
    const cancelledSubscription = await stripe.subscriptions.update(
      payment.transaction_id,
      { cancel_at_period_end: true },
    );

    return res.status(200).json({
      success: true,
      message: "Subscription will cancel at the end of billing period",
      data: {
        payment_id: payment._id,
        transaction_id: payment.transaction_id,
        plan: payment.plan,
        stripe_subscription: cancelledSubscription,
      },
    });
  } catch (error) {
    console.error("Cancellation feedback error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send feedback",
    });
  }
});

router.get("/stripe/verify-session", protect, async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id)
      return res
        .status(400)
        .json({ success: false, message: "Session ID required" });

    // Find your Payment record
    const payment = await Payment.findOne({ session_id: session_id });

    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });

    const isPaid = payment.status === "success";

    return res.json({ success: true, payment });
  } catch (error) {
    console.error("Verify session error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create Razorpay order
// @route   POST /api/payments/razorpay/create-order
// @access  Private
router.post("/razorpay/create-order", protect, async (req, res) => {
  try {
    const { plan, currency = "INR" } = req.body;

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: "Plan is required",
      });
    }

    const planDoc = await Plan.findOne({ name: plan, is_active: true });
    if (!planDoc) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const paymentData = await paymentService.createRazorpayPayment(
      req.user.id,
      plan,
      planDoc.price,
      currency,
    );

    res.json({
      success: true,
      data: paymentData,
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create Razorpay order",
    });
  }
});

// @desc    Verify Razorpay payment
// @route   POST /api/payments/razorpay/verify
// @access  Private
router.post("/razorpay/verify", protect, async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment verification data",
      });
    }

    const payment = await paymentService.verifyRazorpayPayment(
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    );

    res.json({
      success: true,
      message: "Payment verified successfully",
      data: {
        payment_id: payment._id,
        status: payment.status,
        plan: payment.plan,
      },
    });
  } catch (error) {
    console.error("Razorpay verification error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Payment verification failed",
    });
  }
});

// // @desc    Stripe webhook
// // @route   POST /api/payments/stripe/webhook
// // @access  Public
// router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
//   try {
//     const sig = req.headers['stripe-signature'];
//     const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

//     let event;
//     try {
//       event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
//     } catch (err) {
//       console.error('Webhook signature verification failed:', err.message);
//       return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     await paymentService.handleStripeWebhook(event);

//     res.json({ received: true });
//   } catch (error) {
//     console.error('Stripe webhook error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Webhook processing failed'
//     });
//   }
// });

// @desc    Get user payment history
// @route   GET /api/payments/history
// @access  Private
router.get("/history", protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    let query = { user_id: req.user.id };
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: payments,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get payment history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate(
      "user_id",
      "name email",
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Users can only view their own payments, admins can view all
    if (
      payment.user_id._id.toString() !== req.user.id &&
      !req.user.roles.includes("Admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Get payment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Process refund
// @route   POST /api/payments/:id/refund
// @access  Private (Admin only)
router.post("/:id/refund", protect, authorize("Admin"), async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const paymentId = req.params.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid refund amount is required",
      });
    }

    const refund = await paymentService.processRefund(
      paymentId,
      amount,
      reason,
    );

    res.json({
      success: true,
      message: "Refund processed successfully",
      data: {
        refund_id: refund.id,
        amount,
        status: "processed",
      },
    });
  } catch (error) {
    console.error("Refund processing error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process refund",
    });
  }
});

// @desc    Get payment analytics
// @route   GET /api/payments/analytics/overview
// @access  Private (Admin/Marketing Manager)
router.get(
  "/analytics/overview",
  protect,
  authorize("Admin", "Marketing Manager"),
  async (req, res) => {
    try {
      const { start_date, end_date } = req.query;

      const startDate = start_date
        ? new Date(start_date)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date) : new Date();

      const analytics = await paymentService.getPaymentAnalytics(
        startDate,
        endDate,
      );
      // Get unique plan IDs from breakdown
      const planIds = analytics.breakdown.map((item) => item.plan);
      const plans = await Plan.find({ _id: { $in: planIds } });

      // Create a map for quick lookup
      const planMap = {};
      plans.forEach((plan) => {
        planMap[plan._id] = plan.display_name;
      });

      // Replace plan IDs with names
      analytics.breakdown = analytics.breakdown.map((item) => ({
        ...item,
        plan: planMap[item.plan] || item.plan, // fallback to ID if not found
      }));

      res.json({
        success: true,
        data: analytics,
        period: {
          start: startDate,
          end: endDate,
        },
      });
    } catch (error) {
      console.error("Payment analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

module.exports = router;

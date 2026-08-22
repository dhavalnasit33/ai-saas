const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Razorpay = require("razorpay");
const Payment = require("../models/Payment");
const User = require("../models/User");
const Plan = require("../models/Plan");
const emailService = require("./emailService");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentService {
  // Create Razorpay order
  async createRazorpayPayment(userId, planName, amount, currency = "INR") {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const plan = await Plan.findOne({ name: planName });
      if (!plan) {
        throw new Error("Plan not found");
      }

      // Create Razorpay order
      //   const order = await razorpay.orders.create({
      //     amount: Math.round(amount * 100), // Convert to paise
      //     currency: currency.toUpperCase(),
      //     receipt: `receipt_${userId}_${Date.now()}`,
      //     notes: {
      //       userId: userId.toString(),
      //       plan: planName,
      //       userEmail: user.email
      //     }
      //   });

      const shortReceipt = `r_${userId.toString().slice(-6)}_${Date.now()
        .toString()
        .slice(-6)}`; // always < 40 chars
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency.toUpperCase(),
        receipt: shortReceipt,
        notes: {
          userId: userId.toString(),
          plan: planName,
          userEmail: user.email,
        },
      });
      // Create payment record
      const payment = await Payment.create({
        user_id: userId,
        amount,
        currency,
        transaction_id: order.id,
        payment_method: "razorpay",
        status: "pending",
        plan: planName,
        gateway_response: {
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
        },
      });

      return {
        payment_id: payment._id,
        order_id: order.id,
        amount,
        currency,
        key: process.env.RAZORPAY_KEY_ID,
      };
    } catch (error) {
      console.error("Razorpay payment creation error:", error);
      throw error;
    }
  }

  async createStripeCheckoutSession(
    userId,
    planId,
    currency = "USD",
    billing_period = "monthly",
    paymentOption = "try_free",
    rewardfulReferralId = null,
  ) {
    try {
      console.log("💡 Starting createStripeCheckoutSession...");
      console.log(
        "User ID:",
        userId,
        "Plan ID:",
        planId,
        "Currency:",
        currency,
        "Billing period:",
        billing_period,
      );
      if (rewardfulReferralId) {
        console.log("🎯 Rewardful Referral ID received:", rewardfulReferralId);
      } else {
        console.log("ℹ️ No Rewardful referral ID provided.");
      }

      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");
      console.log("✅ Found user:", user.email);

      const plan = await Plan.findById(planId);
      if (!plan) throw new Error("Plan not found");
      console.log("✅ Found plan:", plan.name);

      // Select the correct Stripe Price ID based on billing period
      const stripePriceId =
        billing_period === "yearly"
          ? plan.stripe_yearly_price_id
          : plan.stripe_monthly_price_id;

      if (!stripePriceId)
        throw new Error("Stripe price ID missing for this plan");
      console.log("✅ Using Stripe Price ID:", stripePriceId);

      const currentPrice =
        billing_period === "yearly" ? plan.yearly_price : plan.price;

      // Check eligibility for discount based on persisted flag OR new user intent
      // const isEligibleForDiscount =
      //   user.isDiscountEligible === true ||
      //   (user.payment_option === "pay_now" && !user.has_used_trial);
      const isEligibleForDiscount = false; // Discount flow disabled

      // Force pay_now if user has already used trial or paid once
      let effectivePaymentOption = paymentOption;
      if (
        effectivePaymentOption === "try_free" &&
        (user.has_used_trial || user.has_paid_once)
      ) {
        console.log("⚠️ User already used trial or paid. Forcing pay_now.");
        effectivePaymentOption = "pay_now";
      }

      let appliedOption = effectivePaymentOption;
      let finalPrice = currentPrice;
      let trialDays = undefined;

      if (effectivePaymentOption === "try_free") {
        // 7-day trial (7 days)
        appliedOption = "try_free";
        trialDays = 7;
        finalPrice = currentPrice;
      } else if (isEligibleForDiscount) {
        // User is eligible for the 10% lifetime discount
        // appliedOption = "pay_now";
        // finalPrice = currentPrice * 0.9;
        appliedOption = "pay_now";
        finalPrice = currentPrice;
      } else {
        // Standard payment
        appliedOption = "pay_now";
        finalPrice = currentPrice;
      }

      // Update user with selected option
      user.payment_option = appliedOption;
      await user.save();

      // Create pending DB entry
      const payment = await Payment.create({
        user_id: userId,
        billing_period,
        amount: finalPrice,
        currency,
        transaction_id: null,
        payment_method: "stripe",
        status: "pending",
        plan: planId,
        payment_option: appliedOption,
      });
      console.log("💾 Payment entry created in DB:", payment._id);

      // Create Stripe Subscription Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: user.email || "support@onechatai.ai",
        payment_method_types: ["card"],
        client_reference_id: rewardfulReferralId || undefined,

        // line_items: [
        //   {
        //     price: stripePriceId,
        //     quantity: 1,
        //   },
        // ],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(), // e.g., 'usd'
              unit_amount: Math.round(finalPrice * 100), // Stripe needs cents (e.g. 14.99 -> 1499)
              recurring: {
                // THIS is what makes it a monthly/yearly subscription automatically!
                interval: billing_period === "yearly" ? "year" : "month",
              },
              product_data: {
                name:
                  appliedOption === "pay_now" && isEligibleForDiscount
                    ? `${plan.display_name || plan.name} (10% Lifetime Discount)`
                    : plan.display_name || plan.name, // The name shown on the checkout page

                  description: trialDays ? "You will not be charged or billed today!" : undefined,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
        metadata: {
          payment_id: payment._id.toString(),
          user_id: userId.toString(),
          plan_id: planId.toString(),
          billing_period,
          ...(rewardfulReferralId && { referral: rewardfulReferralId }),
        },
        subscription_data: {
          trial_period_days: trialDays,
          metadata: {
            payment_id: payment._id.toString(),
            user_id: userId.toString(),
            plan_id: planId.toString(),
            billing_period,
            ...(rewardfulReferralId && { referral: rewardfulReferralId }),
          },
        },
      });
      console.log("SESSION METADATA:", session.metadata);
      console.log("💳 Stripe Checkout session created:", session.id);

      payment.session_id = session.id;
      await payment.save();
      console.log("💾 Payment entry updated with session_id");

      return {
        session_id: session.id,
        url: session.url,
      };
    } catch (err) {
      console.error("[Stripe Subscription] Error:", err);
      throw err;
    }
  }

  async activateFreeTrial(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      if (user.has_used_trial) {
        throw new Error("You have already used your free trial.");
      }

      const proMaxPlan = await Plan.findOne({ name: "pro" });
      if (!proMaxPlan) throw new Error("Trial plan configuration missing.");

      // 1. Setup Trial status
      user.plan = "pro";
      user.has_used_trial = true;
      user.isDiscountEligible = false; // Starting a trial disqualifies for lifetime discount
      user.payment_option = "try_free";
      user.subscription_status = "trialing";
      user.trial_end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      user.hasSeenWelcomePopup = true;

      // 2. Grant tokens & save
      await user.updateTokensForPlan("pro");
      await user.save();

      // 3. Create historical payment record
      const payment = await Payment.create({
        user_id: userId,
        billing_period: "monthly",
        amount: 0,
        currency: "USD",
        payment_method: "stripe", // Consistency
        status: "success",
        plan: proMaxPlan._id,
        payment_option: "try_free",
        start_date: new Date(),
        end_date: user.trial_end,
      });

      console.log(
        `✅ Free trial activated for ${user.email}. User Plan: ${user.plan}, Tokens: ${user.remaining_tokens}. Expires: ${user.trial_end}`,
      );
      return { success: true, payment };
    } catch (error) {
      console.error("Free trial activation error:", error);
      throw error;
    }
  }

  async createStripePortalSession(userId) {
    try {
      // 1. Find the active payment/subscription for this user
      const payment = await Payment.findOne({
        user_id: userId,
        status: { $in: ["success", "cancelling"] },
        payment_method: "stripe",
        transaction_id: { $ne: null },
      }).sort({ createdAt: -1 });

      if (!payment) {
        throw new Error("No active Stripe subscription found");
      }

      // 2. Retrieve the subscription from Stripe to get the Customer ID
      // (Since we didn't save stripe_customer_id on the User model in your snippet)
      const subscription = await stripe.subscriptions.retrieve(
        payment.transaction_id,
      );

      if (!subscription || !subscription.customer) {
        throw new Error("Stripe customer not found");
      }

      // 3. Create the Portal Session
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.customer,
        return_url: `${process.env.CLIENT_URL}/pricing-plans`, // Where to send them after they click "Return"
      });

      return { url: session.url };
    } catch (error) {
      console.error("Create Portal Session Error:", error);
      throw error;
    }
  }
  async handleStripeWebhook(event) {
    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutCompleted(event.data.object);
        break;

      case "invoice.paid":
        await this.handleInvoicePaid(event.data.object);
        break;

      case "customer.subscription.deleted":
        await this.handleSubscriptionCancelled(event.data.object);
        break;
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(event.data.object);
        break;

      case "checkout.session.expired":
        await this.handleCheckoutSessionExpired(event.data.object);
        break;

      case "invoice.payment_failed":
      case "invoice.payment_action_required":
        await this.handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log("⚠️ Unhandled event type:", event.type);
    }
  }

  async handleCheckoutSessionExpired(session) {
    try {
      console.log(`🔔 Checkout session ${session.id} expired`);
      const payment = await Payment.findOne({ session_id: session.id });
      if (payment && payment.status === "pending") {
        payment.status = "failed";
        await payment.save();
        console.log(
          `🔴 Payment record ${payment._id} marked as failed (expired session)`,
        );
      }
    } catch (err) {
      console.error("❌ Error handling checkout.session.expired:", err);
    }
  }

  async handleInvoicePaymentFailed(invoice) {
    try {
      console.log(
        `🔔 Invoice payment failed for invoice: ${invoice.id}, status: ${invoice.status}`,
      );

      let paymentId = invoice.metadata?.payment_id;
      let payment = await Payment.findById(paymentId);

      if (!payment && invoice.subscription) {
        payment = await Payment.findOne({
          transaction_id: invoice.subscription,
          payment_method: "stripe",
        });
      }

      if (!payment)
        return console.warn(
          "⚠️ Payment not found for failed invoice:",
          invoice.id,
        );

      const user = await User.findById(payment.user_id);
      if (!user)
        return console.warn("⚠️ User not found for payment:", payment._id);

      // Downgrade user to basic plan immediately on payment failure
      console.log(
        `🟡 Payment failed for ${user.email}, downgrading to basic. Status: ${invoice.status}`,
      );

      // Update subscription status on user
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription,
        );
        user.subscription_status = subscription.status; // usually 'past_due' or 'unpaid'
      }

      await user.updateTokensForPlan("basic");

      payment.status = "failed";
      await payment.save();

      // Send email notification to user about failed payment?
      // (Optional, but good for UX)
    } catch (err) {
      console.error("❌ Error handling invoice.payment_failed:", err);
    }
  }

  async handleCheckoutCompleted(session) {
    try {
      const paymentId = session.metadata?.payment_id;
      if (!paymentId)
        return console.warn("⚠️ No payment_id in session metadata");

      const payment = await Payment.findById(paymentId);
      if (!payment) return console.warn("⚠️ Payment not found:", paymentId);

      payment.session_id = session.id;

      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription,
        );

        payment.transaction_id = subscription.id;

        // For subscriptions, payment_status 'paid' or 'no_payment_required' (trial) is required
        // unless it's explicitly 'trialing' in sub status
        const isHealthyStatus = ["active", "trialing"].includes(
          subscription.status,
        );
        const isPaid = ["paid", "no_payment_required"].includes(
          session.payment_status,
        );

        payment.status = isHealthyStatus && isPaid ? "success" : "pending";

        console.log(
          "💾 Subscription ID saved:",
          subscription.id,
          "Status:",
          subscription.status,
          "Payment Status:",
          session.payment_status,
        );

        if (isHealthyStatus && isPaid) {
          // 1️⃣ Cancel previous subscription(s)
          const existingPayments = await Payment.find({
            user_id: payment.user_id,
            _id: { $ne: payment._id },
            status: { $in: ["success"] },
            transaction_id: { $ne: null },
          });

          for (const oldPayment of existingPayments) {
            await stripe.subscriptions.update(oldPayment.transaction_id, {
              cancel_at_period_end: true,
            });
            oldPayment.status = "cancelled";
            await oldPayment.save();
            console.log(
              `🔴 Previous subscription cancelled: ${oldPayment.transaction_id}`,
            );
          }

          // 2️⃣ Update user plan and tokens
          const user = await User.findById(payment.user_id);
          console.log("🟢 User found:", user);
          const plan = await Plan.findById(payment.plan);
          console.log("🟢plan:", plan);
          if (user && plan) {
            user.plan = plan.name;
            user.has_used_trial = true;
            user.subscription_status = subscription.status;
            user.trial_end = subscription.trial_end
              ? new Date(subscription.trial_end * 1000)
              : null;
            user.current_period_end = subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null;
            await user.updateTokensForPlan(plan.name);
            await user.save();
            console.log(`🟢 User ${user.email} plan updated to ${plan.name}`);

            // Trigger Reddit, Meta & Google CAPI Events in parallel
            try {
              const { sendRedditSignUpEvent } = require("./redditCapi");
              const { sendMetaPurchaseEvent } = require("./metaCapi");
              const { sendGoogleSignUpEvent } = require("./googleCapi");
              const price = session.amount_total ? (session.amount_total / 100) : (plan ? plan.price : 0);
              
              await Promise.allSettled([
                sendRedditSignUpEvent(user, session.id, price),
                sendMetaPurchaseEvent(user, session.id, price),
                sendGoogleSignUpEvent(user, session),
              ]);
            } catch (capiErr) {
              console.error("Failed to send CAPI conversions:", capiErr);
            }
          }
        }
      }

      await payment.save();
      console.log("🔵 Checkout completed for payment:", paymentId);
    } catch (err) {
      console.error("⚠️ handleCheckoutCompleted error:", err);
    }
  }

  async handleInvoicePaid(invoice) {
    let paymentId = invoice.metadata?.payment_id;
    let subscription;

    // 1. Always try to retrieve the real subscription object from Stripe
    if (invoice.subscription) {
      try {
        subscription = await stripe.subscriptions.retrieve(
          invoice.subscription,
        );
        if (!paymentId) {
          paymentId = subscription.metadata?.payment_id;
        }
      } catch (err) {
        console.error("Failed to retrieve subscription:", err);
        return;
      }
    }

    let payment = await Payment.findById(paymentId);

    // Fallback: If metadata is missing, try to find by transaction_id (Subscription ID)
    if (!payment && invoice.subscription) {
      payment = await Payment.findOne({
        transaction_id: invoice.subscription,
        payment_method: "stripe",
      });
    }

    if (!payment)
      return console.warn(
        "Payment not found in DB for invoice:",
        invoice.id,
        "paymentId:",
        paymentId,
        "subscription:",
        invoice.subscription,
      );

    const user = await User.findById(payment.user_id);
    const plan = await Plan.findById(payment.plan);

    // 2. First payment activation (Handles both immediate payments AND $0 trial invoices)
    if (invoice.billing_reason === "subscription_create") {
      payment.status = ["active", "trialing"].includes(subscription.status)
        ? "success"
        : "pending";
      payment.transaction_id = invoice.subscription;
      payment.last_renewal = new Date();
      await payment.save();

      // ✅ Use REAL subscription data, not hardcoded values
      user.subscription_status = subscription.status; // Will accurately reflect 'trialing' or 'active'
      user.current_period_end = new Date(
        subscription.current_period_end * 1000,
      );
      user.trial_end = subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null;
      user.has_used_trial = true;
      if (invoice.amount_paid > 0) {
        user.has_paid_once = true;
        // Lock in the lifetime discount if they paid for a 'pay_now' session
        // if (payment.payment_option === 'pay_now') {
        //   user.isDiscountEligible = true;
        // }
      }

      // Only grant tokens if status is healthy
      if (["active", "trialing"].includes(subscription.status)) {
        await user.updateTokensForPlan(plan.name);

        // Trigger Reddit, Meta & Google CAPI Events in parallel (Invoice Paid)
        try {
          const { sendRedditSignUpEvent } = require("./redditCapi");
          const { sendMetaPurchaseEvent } = require("./metaCapi");
          const { sendGoogleSignUpEvent } = require("./googleCapi");
          const price = invoice.amount_paid ? (invoice.amount_paid / 100) : (plan ? plan.price : 0);
          const eventId = payment.session_id || invoice.subscription;

          await Promise.allSettled([
            sendRedditSignUpEvent(user, eventId, price),
            sendMetaPurchaseEvent(user, eventId, price),
            sendGoogleSignUpEvent(user, { id: eventId }),
          ]);
        } catch (capiErr) {
          console.error("Failed to send CAPI conversions from invoice.paid:", capiErr);
        }
      } else {
        await user.updateTokensForPlan("basic");
      }

      console.log(
        "🟢 Subscription Activated (Invoice):",
        invoice.subscription,
        "Status:",
        subscription.status,
      );
      return;
    }

    // 3. Renewals (A real invoice paid after trial ends or next billing cycle)
    payment.last_renewal = new Date();
    payment.status = "success";
    await payment.save();

    // Update user subscription state for a standard renewal
    user.subscription_status = subscription ? subscription.status : "active";
    user.current_period_end = new Date(invoice.period_end * 1000);
    user.trial_end = null; // Trial is officially over if a renewal invoice is paid

    if (invoice.amount_paid > 0) {
      user.has_paid_once = true;
    }

    // Only grant tokens if status is healthy
    if (["active", "trialing"].includes(user.subscription_status)) {
      await user.updateTokensForPlan(plan.name);
    } else {
      await user.updateTokensForPlan("basic");
    }
    await user.save();

    console.log("🟢 Subscription Renewal:", invoice.subscription);
  }

  async handleSubscriptionCancelled(subscription) {
    try {
      console.log(
        `🔔 Subscription ${subscription.id} has been deleted/cancelled in Stripe`,
      );

      // Find the payment record in the database
      const payment = await Payment.findOne({
        transaction_id: subscription.id,
      });
      if (!payment) {
        console.warn(
          "⚠️ Payment record not found for subscription:",
          subscription.id,
        );
        return;
      }

      // Update payment status to cancelled
      payment.status = "cancelled";
      await payment.save();
      console.log(`🔴 Payment record ${payment._id} updated to cancelled`);

      // Find the user
      const user = await User.findById(payment.user_id);
      if (!user) {
        console.warn("⚠️ User not found for payment:", payment._id);
        return;
      }

      // 1. Fetch the Plan document so we know the string name of the plan being cancelled
      const Plan = require("../models/Plan");
      const cancelledPlanDoc = await Plan.findById(payment.plan);

      // 2. Check if the user's CURRENT plan matches the plan that just expired.
      // This prevents downgrading a user who simply upgraded to a higher tier!
      if (cancelledPlanDoc && user.plan === cancelledPlanDoc.name) {
        console.log(
          `🔴 Subscription expired/cancelled for user ${user.email}, downgrading to basic`,
        );

        user.subscription_status = "canceled";
        user.trial_end = null;
        user.current_period_end = null;
        await user.updateTokensForPlan("basic");
        console.log(`🟢 User ${user.email} plan updated to basic`);
      } else {
        console.log(
          `ℹ️ Old subscription (${cancelledPlanDoc?.name}) cancelled for ${user.email}, but they are actively on '${user.plan}'. No downgrade applied.`,
        );
      }
    } catch (err) {
      console.error("❌ Error handling subscription update:", err);
    }
  }
  // async handleSubscriptionCancelled(subscription) {
  //   try {
  //     // Only proceed if subscription is set to cancel at period end
  //     if (!subscription.cancel_at_period_end) return;

  //     console.log(`🔔 Subscription ${subscription.id} scheduled to cancel at period end`);

  //     // Find the payment record in the database
  //     const payment = await Payment.findOne({ transaction_id: subscription.id });
  //     if (!payment) {
  //       console.warn("⚠️ Payment record not found for subscription:", subscription.id);
  //       return;
  //     }

  //     // Update payment status to cancelled
  //     payment.status = "cancelled";
  //     await payment.save();
  //     console.log(`🔴 Payment record ${payment._id} updated to cancelled`);

  //     // Find the user
  //     const user = await User.findById(payment.user_id);
  //     if (!user) {
  //       console.warn("⚠️ User not found for payment:", payment._id);
  //       return;
  //     }

  //     // 🟢 THE FIX STARTS HERE 🟢
  //     // 1. Fetch the Plan document so we know the string name (e.g., 'pro', 'pro_max') of the plan being cancelled
  //     const Plan = require("../models/Plan"); // Make sure Plan is imported at the top of your file
  //     const cancelledPlanDoc = await Plan.findById(payment.plan);

  //     // 2. Check if the user's CURRENT plan matches the plan that just expired.
  //     if (cancelledPlanDoc && user.plan === cancelledPlanDoc.name) {
  //       // The user is actually on the plan that expired. Safe to downgrade.
  //       console.log(`🔴 Subscription expired/cancelled for user ${user.email}, downgrading to basic`);

  //       await user.updateTokensForPlan("basic");
  //       // Note: updateTokensForPlan already calls this.save() and sets this.plan = plan

  //       console.log(`🟢 User ${user.email} plan updated to basic`);
  //     } else {
  //       // The plans DON'T match! This means they upgraded to a different plan (like pro_max). Do nothing.
  //       console.log(`ℹ️ Old subscription (${cancelledPlanDoc?.name}) cancelled for ${user.email}, but they are actively on '${user.plan}'. No downgrade applied.`);
  //     }
  //     // 🟢 THE FIX ENDS HERE 🟢

  //   } catch (err) {
  //     console.error("❌ Error handling subscription update:", err);
  //   }
  // }

  async handleSubscriptionUpdated(subscription) {
    const payment = await Payment.findOne({ transaction_id: subscription.id });
    if (!payment)
      return console.warn("⚠️ Payment not found for updated subscription");

    const user = await User.findById(payment.user_id);
    if (!user) {
      console.warn("⚠️ User not found for payment:", payment._id);
      return;
    }

    // If subscription is scheduled to cancel
    if (subscription.cancel_at_period_end) {
      // 1. Check if we already processed this to avoid sending duplicate emails
      // Stripe sometimes sends the 'customer.subscription.updated' webhook multiple times
      const isAlreadyCancelling = payment.status === "cancelling";

      payment.status = "cancelling";
      user.subscription_status = "cancelling";

      // 2. Send the email to support only if this is the first time we see it cancel
      if (!isAlreadyCancelling) {
        await emailService.sendCancellationFeedbackToSupport(user, payment);

        // 3. Clear the feedback from DB so we don't accidentally send it again later
        payment.cancellation_reason = null;
        payment.cancellation_feedback = null;
      }
      // ❌ DO NOT downgrade tokens here
      // User keeps full access until period end
    } else {
      // If cancellation is removed or subscription stays active
      payment.status = ["active", "trialing"].includes(subscription.status)
        ? "success"
        : "pending";

      user.subscription_status = subscription.status;
      user.current_period_end = new Date(
        subscription.current_period_end * 1000,
      );
      user.trial_end = subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null;

      // Only grant tokens if status is healthy
      if (["active", "trialing"].includes(subscription.status)) {
        const plan = await Plan.findById(payment.plan);
        if (plan) {
          await user.updateTokensForPlan(plan.name);
        } else {
          console.warn(
            `⚠️ Plan not found for ID: ${payment.plan} during subscription update`,
          );
        }
      } else {
        console.log(
          `🟡 Subscription status is ${subscription.status}, downgrading user ${user.email} to basic`,
        );
        await user.updateTokensForPlan("basic");
      }
      await user.save();
    }

    await payment.save();

    console.log(
      `🔔 Subscription updated: ${subscription.id}, status: ${subscription.status}, payment record status: ${payment.status}`,
    );
  }
  // Verify Razorpay payment
  async verifyRazorpayPayment(paymentId, orderId, signature) {
    try {
      const crypto = require("crypto");
      const body = orderId + "|" + paymentId;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== signature) {
        throw new Error("Invalid payment signature");
      }

      // Update payment status
      const payment = await Payment.findOne({ transaction_id: orderId });
      if (!payment) {
        throw new Error("Payment not found");
      }

      payment.status = "success";
      payment.gateway_response = {
        ...payment.gateway_response,
        payment_id: paymentId,
        signature,
      };
      await payment.save();

      // Update user plan and tokens
      const user = await User.findById(payment.user_id);
      if (user) {
        const plan = await Plan.findById(payment.plan);
        if (plan) {
          await user.updateTokensForPlan(plan.name);
        } else {
          console.warn(
            `⚠️ Plan not found for ID: ${payment.plan} during Razorpay verification`,
          );
        }
      }

      return payment;
    } catch (error) {
      console.error("Razorpay verification error:", error);
      throw error;
    }
  }

  // Process refund
  async processRefund(paymentId, amount, reason = "Customer request") {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.status !== "success") {
        throw new Error("Cannot refund unsuccessful payment");
      }

      let refund;
      if (payment.payment_method === "stripe") {
        refund = await stripe.refunds.create({
          payment_intent: payment.transaction_id,
          amount: Math.round(amount * 100),
          reason: "requested_by_customer",
        });
      } else if (payment.payment_method === "razorpay") {
        refund = await razorpay.payments.refund(
          payment.gateway_response.payment_id,
          {
            amount: Math.round(amount * 100),
          },
        );
      }

      // Update payment record
      payment.status = "refunded";
      payment.refund_id = refund.id;
      payment.refund_amount = amount;
      await payment.save();

      return refund;
    } catch (error) {
      console.error("Refund processing error:", error);
      throw error;
    }
  }

  // Get payment analytics
  async getPaymentAnalytics(startDate, endDate) {
    try {
      const matchStage = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setUTCHours(23, 59, 59, 999)),
        },
      };

      const analytics = await Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              status: "$status",
              plan: "$plan",
              payment_method: "$payment_method",
            },
            count: { $sum: 1 },
            total_amount: { $sum: "$amount" },
          },
        },
        {
          $group: {
            _id: null,
            total_revenue: {
              $sum: {
                $cond: [
                  { $eq: ["$_id.status", "success"] },
                  "$total_amount",
                  0,
                ],
              },
            },
            total_transactions: {
              $sum: "$count",
            },
            success_transactions: {
              $sum: {
                $cond: [{ $eq: ["$_id.status", "success"] }, "$count", 0],
              },
            },
            breakdown: {
              $push: {
                status: "$_id.status",
                plan: "$_id.plan",
                payment_method: "$_id.payment_method",
                count: "$count",
                total_amount: "$total_amount",
              },
            },
          },
        },
      ]);

      return (
        analytics[0] || {
          total_revenue: 0,
          total_transactions: 0,
          breakdown: [],
        }
      );
    } catch (error) {
      console.error("Payment analytics error:", error);
      throw error;
    }
  }
}

module.exports = new PaymentService();

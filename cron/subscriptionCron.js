const cron = require("node-cron");
const User = require("../models/User");
const Payment = require("../models/Payment");

const startSubscriptionCron = () => {
  // Run every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("🕒 Running Subscription Cron (checking for expired trials)...");

    try {
      // Find users whose trial has ended
      const expiredTrialUsers = await User.find({
        subscription_status: "trialing",
        trial_end: { $lt: new Date() },
      });

      if (expiredTrialUsers.length === 0) {
        console.log("✅ No expired trials found.");
        return;
      }

      for (const user of expiredTrialUsers) {
        console.log(`🔴 Trial expired for ${user.email}. Downgrading to basic.`);

        // 1. Update user to basic plan
        // updateTokensForPlan will save the user and set plan/tokens
        await user.updateTokensForPlan("basic");
        
        // 2. Clear trial status
        user.subscription_status = "canceled";
        user.trial_end = null;
        user.payment_option = "try_free"; // Keep track that they used trial
        await user.save();

        // 3. Mark the payment record as cancelled/expired
        const payment = await Payment.findOne({
          user_id: user._id,
          status: "success",
          payment_option: "try_free"
        }).sort({ createdAt: -1 });

        if (payment) {
          payment.status = "cancelled";
          await payment.save();
        }
      }

      console.log(`✅ Processed ${expiredTrialUsers.length} expired trials.`);
    } catch (error) {
      console.error("❌ Subscription Cron Error:", error);
    }
  });
};

module.exports = startSubscriptionCron;

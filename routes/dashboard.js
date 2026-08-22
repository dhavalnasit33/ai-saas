const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");
const ChatHistory = require("../models/ChatHistory");
const Plan = require("../models/Plan");
const Payment = require("../models/Payment");
const PromptHistory = require("../models/PromptHistory");
const GuestUsage = require("../models/GuestUsage");

// GET /api/dashboard
router.get("/user-wise", protect, async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    if (req.user?.id) {
      // Registered user case
      const userId = req.user.id;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const planDoc = await Plan.findOne({ name: user.plan });
      const totalTokens = planDoc ? planDoc.token_limit : 0;

      const usageData = await ChatHistory.aggregate([
        { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
        { $unwind: "$messages" },
        {
          $match: {
            "messages.metadata.tokens_used": { $gt: 0 },
            "messages.timestamp": { $gte: thirtyDaysAgo, $lte: today },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$messages.timestamp",
              },
            },
            tokensUsed: { $sum: "$messages.metadata.tokens_used" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const last30DaysUsage = Array.from({ length: 30 }, (_, i) => {
        const day = new Date();
        day.setDate(today.getDate() - (29 - i));
        const dayStr = day.toISOString().split("T")[0];
        const usage = usageData.find((u) => u._id === dayStr);
        return usage ? usage.tokensUsed : 0;
      });

      const used_tokens = last30DaysUsage.reduce((acc, curr) => acc + curr, 0);

      return res.json({
        plan: planDoc.display_name,
        total_tokens: totalTokens,
        remaining_tokens: user.remaining_tokens,
        lastLogin: user.createdAt,
        last30DaysUsage,
        used_tokens,
      });
    } else if (req.guestUser?._id) {
      // Guest user case
      const guestUserId = req.guestUser._id;

      const guestUser = await GuestUsage.findById(guestUserId);
      if (!guestUser)
        return res.status(404).json({ message: "Guest User not found" });

      return res.json({
        guest_id: guestUser._id,
        ip: guestUser.ip,
        total_tokens:50000,
        used_tokens: guestUser.api_count,
        last_used: guestUser.last_used,
      });
    } else {
      return res.status(400).json({ message: "User information not provided" });
    }
  } catch (err) {assetPath: 'assets/images/graphic_design_bookmark.png',
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Get admin dashboard analytics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
router.get("/", protect, authorize("Admin"), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const today = new Date();
    const startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1, 0, 0, 0, 0));

    // 1️⃣ User statistics
    const userStats = await User.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          active: [{ $match: { status: "active" } }, { $count: "count" }],
          new_users: [
            { $match: { createdAt: { $gte: startDate } } },
            { $count: "count" },
          ],
          by_plan: [{ $group: { _id: "$plan", count: { $sum: 1 } } }],
        },
      },
    ]);

    // 2️⃣ Revenue statistics (overall)
    const revenueStats = await Payment.aggregate([
      { $match: { status: "success", createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          total_revenue: { $sum: "$amount" },
          total_transactions: { $sum: 1 },
          avg_transaction: { $avg: "$amount" },
        },
      },
    ]);

    // 3️⃣ Monthly revenue (for chart)
    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: "success",
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 4)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total_revenue: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // 4️⃣ Usage statistics (from ChatHistory)
    const usageStats = await ChatHistory.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: "$messages" },
      { $match: { "messages.metadata.tokens_used": { $gt: 0 } } },
      {
        $group: {
          _id: null,
          total_prompts: { $sum: 1 },
          total_tokens: { $sum: "$messages.metadata.tokens_used" },
          successful_prompts: {
            $sum: { $cond: ["$messages.metadata.success", 1, 0] },
          },
          avg_response_time: { $avg: "$messages.metadata.response_time" },
        },
      },
    ]);

    // 5️⃣ Top tools
    const topTools = await ChatHistory.aggregate([
      { $unwind: "$messages" },
      {
        $match: {
          "messages.metadata.tokens_used": { $gt: 0 },
          "messages.metadata.tool_category_id": { $exists: true },
        },
      },
      {
        $group: {
          _id: "$messages.metadata.tool_category_id",
          usage_count: { $sum: 1 },
          tokens_used: { $sum: "$messages.metadata.tokens_used" },
        },
      },
      {
        $lookup: {
          from: "toolcategories",
          localField: "_id",
          foreignField: "_id",
          as: "tool_info",
        },
      },
      { $sort: { usage_count: -1 } },
      { $limit: 5 },
    ]);

    // 6️⃣ Daily usage trend
    const dailyUsage = await ChatHistory.aggregate([
      { $unwind: "$messages" },
      {
        $match: {
          "messages.metadata.tokens_used": { $gt: 0 },
          "messages.timestamp": { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$messages.timestamp",
              },
            },
          },
          prompts: { $sum: 1 },
          tokens: { $sum: "$messages.metadata.tokens_used" },
          unique_users: { $addToSet: "$user_id" },
        },
      },
      { $addFields: { unique_users_count: { $size: "$unique_users" } } },
      { $sort: { "_id.date": 1 } },
    ]);

    // 7️⃣ Monthly usage trend
    const monthlyUsage = await ChatHistory.aggregate([
      { $unwind: "$messages" },
      {
        $match: {
          "messages.metadata.tokens_used": { $gt: 0 },
          "messages.timestamp": {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 4)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$messages.timestamp" },
            month: { $month: "$messages.timestamp" },
          },
          unique_users: { $addToSet: "$user_id" },
          prompts: { $sum: 1 },
          tokens: { $sum: "$messages.metadata.tokens_used" },
        },
      },
      { $addFields: { unique_users_count: { $size: "$unique_users" } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      success: true,
      data: {
        users: userStats[0],
        revenue: revenueStats[0] || {
          total_revenue: 0,
          total_transactions: 0,
          avg_transaction: 0,
        },
        monthly_revenue: monthlyRevenue,
        usage: usageStats[0] || {
          total_prompts: 0,
          total_tokens: 0,
          successful_prompts: 0,
          avg_response_time: 0,
        },
        top_tools: topTools,
        daily_usage: dailyUsage,
        monthly_usage: monthlyUsage,
        period_days: days,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;

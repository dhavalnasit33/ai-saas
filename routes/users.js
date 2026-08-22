const express = require("express");
const User = require("../models/User");
const PromptHistory = require("../models/PromptHistory");
const Payment = require("../models/Payment");
const { protect, authorize, checkPermission } = require("../middleware/auth");
const AdminUser = require("../models/AdminUser");
const { removeChildAdminsWithTransaction } = require("../utils/adminHelper");

const router = express.Router();

function getSubscriptionDisplayLabel(user) {
  const now = new Date();

  // 1. Paid Active
  if (user?.subscription_status === "active") {
    let tier = "Basic";
    if (user?.plan === "pro_max") tier = "Premium";
    else if (user?.plan === "pro") tier = "Standard";
    else if (user?.plan === "standard") tier = "Basic";
    else if (user?.plan === "lite") tier = "Lite";
    return `Paid Active (${tier})`;
  }

  // 2. Trial Active
  if (
    user?.subscription_status === "trialing" &&
    (!user?.trial_end || new Date(user.trial_end) > now)
  ) {
    return "Trial Active";
  }

  // 3. Plan Expired
  // Any user who was on paid plan, but canceled their paid subscription
  if (user?.has_paid_once) {
    return "Plan Expired";
  }

  // 4. Trial Expired
  // Any user who creates accounts, starts trial, and at the end of the trial
  // their payments did not complete or they canceled their plan
  if (user?.has_used_trial && !user?.has_paid_once) {
    return "Trial Expired";
  }

  // 5. Registered
  // Any user who creates an account, but doesn’t start the 7 day trial
  return "Registered";
}

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
router.get("/", protect, authorize("Admin"), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, plan, status, role } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (plan) {
      query.plan = plan;
    }

    if (status) {
      query.status = status;
    }

    if (role) {
      query.roles = { $in: [role] };
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const usersWithDisplay = users.map((u) => {
      const obj = typeof u.toObject === "function" ? u.toObject() : u;
      const subscription_display = getSubscriptionDisplayLabel(obj);
      return {
        ...obj,
        subscription_display,
        plan_status: subscription_display,
      };
    });

    const total = await User.countDocuments(query);

    // Get user statistics
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          total_users: { $sum: 1 },
          active_users: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          basic_users: {
            $sum: { $cond: [{ $eq: ["$plan", "basic"] }, 1, 0] },
          },
          lite_users: {
            $sum: { $cond: [{ $eq: ["$plan", "lite"] }, 1, 0] },
          },
          pro_users: {
            $sum: { $cond: [{ $eq: ["$plan", "pro"] }, 1, 0] },
          },
          pro_max_users: {
            $sum: { $cond: [{ $eq: ["$plan", "pro_max"] }, 1, 0] },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: usersWithDisplay,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
      stats: stats[0] || {},
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Get logged-in user profile with plan name
// @route   GET /api/users/me
// @access  Private
router.get("/me", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select(
      "-password -history -favorites -selected_categories -authProvider",
    );

    // console.log("user", user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin or own profile)
router.get("/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("history");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Users can only view their own profile, admins can view all
    if (
      user._id.toString() !== req.user.id &&
      !req.user.roles.includes("Admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get user's usage statistics
    const usageStats = await PromptHistory.aggregate([
      { $match: { user_id: user._id } },
      {
        $group: {
          _id: null,
          total_prompts: { $sum: 1 },
          total_tokens_used: { $sum: "$tokens_used" },
          successful_prompts: {
            $sum: { $cond: ["$success", 1, 0] },
          },
          avg_response_time: { $avg: "$response_time" },
        },
      },
    ]);

    // Get payment history
    const paymentStats = await Payment.aggregate([
      { $match: { user_id: user._id } },
      {
        $group: {
          _id: null,
          total_payments: { $sum: 1 },
          total_spent: { $sum: "$amount" },
          successful_payments: {
            $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        user,
        usage_stats: usageStats[0] || {},
        payment_stats: paymentStats[0] || {},
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or own profile)
// router.put('/:id', protect, async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     // Users can only update their own profile, admins can update all
//     if (user._id.toString() !== req.user.id && !req.user.roles.includes('Admin')) {
//       return res.status(403).json({
//         success: false,
//         message: 'Access denied'
//       });
//     }

//     const allowedFields = ['name', 'profile_picture'];

//     // Admins can update additional fields
//     if (req.user.roles.includes('Admin')) {
//       allowedFields.push('plan', 'remaining_tokens', 'status', 'roles');
//     }

//     const updateData = {};
//     allowedFields.forEach(field => {
//       if (req.body[field] !== undefined) {
//         updateData[field] = req.body[field];
//       }
//     });

//     const updatedUser = await User.findByIdAndUpdate(
//       req.params.id,
//       updateData,
//       { new: true, runValidators: true }
//     ).select('-password');

//     res.json({
//       success: true,
//       message: 'User updated successfully',
//       data: updatedUser
//     });
//   } catch (error) {
//     console.error('Update user error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// });

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or own profile)
router.put("/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isAdmin = req.user.roles.includes("Admin");
    const isOwner = user._id.toString() === req.user.id;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Allow admins to update all fields available to users, plus admin-specific fields
    const baseFields = [
      "firstName",
      "lastName",
      "name",
      "email",
      "region",
      "gender",
      "age",
      "profile_picture",
      "hasSeenWelcomePopup",
      "isDiscountEligible",
      "payment_option",
      "onboarding_completion_pct",
      "activation_pct",
      "paid_conversion_pct",
      "interests",
    ];

    const adminFields = ["plan", "remaining_tokens", "status", "roles"];

    // Include password if provided
    const passwordIncluded =
      req.body.password && req.body.password.trim() !== "";
    if (passwordIncluded) {
      baseFields.push("password");
    }

    const allowedFields = isAdmin
      ? [...baseFields, ...adminFields]
      : baseFields;

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Hash password if provided
    if (passwordIncluded) {
      const bcrypt = require("bcryptjs");
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(req.body.password, salt);
    }

    if (isAdmin && req.body.plan && req.body.plan !== user.plan) {
      const tokenLimits = {
        basic: 3000000,
        lite: 4000000,
        standard: 4000000,
        pro: 5000000,
        pro_max: 10000000,
      };
      const videoCreditLimits = {
        basic: 0,
        lite: 0,
        standard: 0,
        pro: 400,
        pro_max: 1000,
      };
      const imageCreditLimits = {
        basic: 0,
        lite: 300,
        standard: 300,
        pro: 1000,
        pro_max: 2000,
      };

      // Set the new values based on the selected plan
      updateData.remaining_tokens = tokenLimits[req.body.plan];
      updateData.video_credits = videoCreditLimits[req.body.plan];
      updateData.image_credits = imageCreditLimits[req.body.plan];
    }

    // Ensure onboarding_completion_pct only increases
    if (req.body.onboarding_completion_pct !== undefined) {
      const currentPct = user.onboarding_completion_pct || 0;
      const newPct = parseInt(req.body.onboarding_completion_pct);

      if (newPct > currentPct) {
        updateData.onboarding_completion_pct = newPct;
      } else {
        delete updateData.onboarding_completion_pct;
      }
    }

    // Ensure activation_pct only increases
    if (req.body.activation_pct !== undefined) {
      const currentPct = user.activation_pct || 0;
      const newPct = parseInt(req.body.activation_pct);

      if (newPct > currentPct) {
        updateData.activation_pct = newPct;
      } else {
        delete updateData.activation_pct;
      }
    }

    // Ensure paid_conversion_pct only increases
    if (req.body.paid_conversion_pct !== undefined) {
      const currentPct = user.paid_conversion_pct || 0;
      const newPct = parseInt(req.body.paid_conversion_pct);

      if (newPct > currentPct) {
        updateData.paid_conversion_pct = newPct;
      } else {
        delete updateData.paid_conversion_pct;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    ).select("-password");

    return res.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Update user's dashboard tool customization
// @route   PUT /api/users/me/dashboard-customization
// @access  Private
router.put("/me/dashboard-customization", protect, async (req, res) => {
  try {
    const { category, selectedTools } = req.body;
    if (!category || !Array.isArray(selectedTools)) {
      return res.status(400).json({
        success: false,
        message: "Category and selectedTools array are required",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.customized_dashboard_tools) {
      user.customized_dashboard_tools = new Map();
    }

    // Set customization for this category
    user.customized_dashboard_tools.set(category, selectedTools);
    await user.save();

    return res.json({
      success: true,
      message: "Dashboard customization updated successfully",
      data: user.customized_dashboard_tools,
    });
  } catch (error) {
    console.error("Update dashboard customization error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Don't allow deleting users with Admin role
    if (user.roles.includes("Admin")) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete admin users",
      });
    }

    // if (user.roles.some((role) => role == 'Admin_user')) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'First remove user from Admin User'
    //   })
    // }

    try {
      await removeChildAdminsWithTransaction(user._id.toString());
    } catch (error) {
      console.error("Failed to remove child admins: ", error);
      return res.status(500).json({
        success: false,
        message: "Failed to remove child admins",
      });
    }

    // Check and delete from AdminUser collection
    await AdminUser.findOneAndDelete({ user_id: user._id });

    // If user was supposed to be in AdminUser but deletion failed
    // if (!deletedAdminUser) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Admin user deletion failed. Please check if user exists in AdminUser collection.'
    //   });
    // }

    // Proceed to delete from User collection
    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Delete Users
// @route   DELETE /api/users
// @access  Private (Admin only)
router.delete("/", protect, authorize("Admin"), async (req, res) => {
  const users = req.body;

  if (!Array.isArray(users) || users.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No users provided",
    });
  }

  const deleteUserIds = users.map((user) => user.id);

  try {
    const foundUsers = await User.find({ _id: { $in: deleteUserIds } }).lean();

    const deletableUsers = [];
    const skippedUsers = [];

    for (const user of foundUsers) {
      const hasAdmin = user.roles.some((role) => role == "Admin");
      const hasAdminUser = user.roles.some((role) => role == "Admin_user");

      if (hasAdmin) {
        skippedUsers.push({
          id: user._id,
          name: user.name,
          reason: "Admin user cannot be deleted",
        });
        continue;
      }
      if (hasAdminUser) {
        try {
          await removeChildAdminsWithTransaction(user._id.toString());
        } catch (error) {
          console.error("Failed to remove child admins: ", error);
          return res.status(500).json({
            success: false,
            message: "Failed to remove child admins",
          });
        }
      }

      if (!hasAdminUser && !hasAdmin) {
        // Check and remove from AdminUser collection
        await AdminUser.findOneAndDelete({ user_id: user._id });

        // Proceed with deletion after removal
        deletableUsers.push(user._id);
        continue;
      }

      deletableUsers.push(user._id);
    }

    console.log("🚀 ~ skippedUsers:", skippedUsers);
    const deleteResult = await User.deleteMany({
      _id: { $in: deletableUsers },
    });
    const skippedUserNames = skippedUsers.map((user) => user.name).join(", ");
    const finalMessage =
      `${deleteResult.deletedCount} users deleted successfully` +
      (skippedUserNames ? `. Skipped users: ${skippedUserNames}` : "");
    res.json({
      success: true,
      message: finalMessage,
      deletedCount: deleteResult.deletedCount,
      skippedUsers,
    });
  } catch (error) {
    console.error("Bulk delete users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during deleting users",
    });
  }
});

// @desc    Add tokens to user
// @route   POST /api/users/:id/add-tokens
// @access  Private (Admin only)
router.post(
  "/:id/add-tokens",
  protect,
  authorize("Admin"),
  async (req, res) => {
    try {
      const { tokens } = req.body;

      if (!tokens || tokens <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid token amount is required",
        });
      }

      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      user.remaining_tokens += tokens;
      await user.save();

      res.json({
        success: true,
        message: `${tokens} tokens added successfully`,
        data: {
          remaining_tokens: user.remaining_tokens,
        },
      });
    } catch (error) {
      console.error("Add tokens error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

router.get("/list", protect, async (req, res) => {
  try {
    // Return _id and name only
    const users = await User.find({ status: "active" })
      .select("name")
      .sort({ name: 1 });

    res.json({ success: true, data: users });
  } catch (err) {
    console.error("Get User List Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// // @desc    Get user's prompt history
// // @route   GET /api/users/:id/history
// // @access  Private (Admin or own profile)
// router.get('/:id/history', protect, async (req, res) => {
//   try {
//     const { page = 1, limit = 10 } = req.query;
//     const userId = req.params.id;

//     // Users can only view their own history, admins can view all
//     if (userId !== req.user.id && !req.user.roles.includes('Admin')) {
//       return res.status(403).json({
//         success: false,
//         message: 'Access denied'
//       });
//     }

//     const history = await PromptHistory.find({ user_id: userId })
//       .populate('tool_category_id', 'name category')
//       .sort({ createdAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     const total = await PromptHistory.countDocuments({ user_id: userId });

//     res.json({
//       success: true,
//       data: history,
//       pagination: {
//         current: page,
//         pages: Math.ceil(total / limit),
//         total
//       }
//     });
//   } catch (error) {
//     console.error('Get user history error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// });

// @desc    Get user's prompt history (last 2 days)
// @route   GET /api/users/:id/history
// @access  Private (Admin or own profile)
router.get("/:id/history", protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.params.id;

    // Ensure only the user or an admin can access the data
    if (userId !== req.user.id && !req.user.roles.includes("Admin")) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Calculate two days ago (start of the day in UTC)
    const now = new Date();
    const twoDaysAgo = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - 2,
        0,
        0,
        0,
        0,
      ),
    );

    const history = await PromptHistory.find({
      user_id: userId,
      createdAt: { $gte: twoDaysAgo },
    })
      .populate("tool_category_id", "name category")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await PromptHistory.countDocuments({
      user_id: userId,
      createdAt: { $gte: twoDaysAgo },
    });

    res.json({
      success: true,
      data: history,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Get user history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});
// @desc    Suspend/Activate user
// @route   PATCH /api/users/:id/status
// @access  Private (Admin only)
router.patch("/:id/status", protect, authorize("Admin"), async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "suspended", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be active, suspended, or inactive",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Don't allow suspending admin users
    if (user.roles.includes("Admin") && status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Cannot suspend admin users",
      });
    }

    user.status = status;
    await user.save();

    res.json({
      success: true,
      message: `User ${status} successfully`,
      data: {
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;

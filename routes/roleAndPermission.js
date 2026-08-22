const express = require("express");

const {
  validateRoleAndPermission,
  handleValidationErrors,
  validateEditRoleAndPermission,
} = require("../middleware/validation");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth"); // Assuming these are in auth.js
const AdminUser = require("../models/AdminUser");
const RoleAndPermission = require("../models/roleAndPermission");

const router = express.Router();

const deepMerge = (target, source) => {
  if (!source) return target;

  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      // If both target and source have this key as object, merge recursively
      if (
        target[key] &&
        typeof target[key] === "object" &&
        !Array.isArray(target[key])
      ) {
        target[key] = deepMerge({ ...target[key] }, source[key]);
      } else {
        // Otherwise, copy the source object
        target[key] = { ...source[key] };
      }
    } else {
      // For primitive values or arrays, overwrite with source value
      target[key] = source[key];
    }
  }
  return target;
};

// @desc    get role name  in array
// @route   GET /api/roleAndPermission/roleName
// @access  Public (consider making this private/admin-only for security)
router.get("/roleName", protect, async (req, res) => {
  try {
    const roleName = await RoleAndPermission.find({}, "roleName").lean();
    if (!roleName) {
      return res.status(404).json({
        success: false,
        message: "No roles found.",
      });
    }
    res.json({
      success: true,
      data: roleName.map((role) => role.roleName),
    });
  } catch (error) {
    console.error("Get role name error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Get all roles and permissions (filtered by creator ID)
// @route   GET /api/roleAndPermission/:id
// @access  Public (consider making this private/admin-only for security)
router.get("/:id", protect, authorize("Admin"), async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "User ID is required to fetch roles created by them.",
    });
  }

  try {
    // Fetch roles created by a specific user OR the default admin role (if created_by_user_id is null/undefined)
    let roleAndPermission = [];
    const userData = await User.findById(id);
    if (userData.roles.some((role) => role == "Admin")) {
      roleAndPermission = await RoleAndPermission.find();
    } else {
      roleAndPermission = await RoleAndPermission.find(
        {
          $or: [
            { created_by_user_id: null }, // For roles explicitly set to null creator
            { created_by_user_id: id },
            { created_by_user_id: { $exists: false } }, // For roles without a creator (e.g., default Admin)
          ],
        },
        "_id roleName permissions"
      ).lean();
    }

    //before send role remi\ove role whonmae is Admin
    roleAndPermission = roleAndPermission.filter(
      (role) => role.roleName !== "Admin"
    );

    if (!roleAndPermission || roleAndPermission.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No roles or permissions found for this user.",
      });
    }
    res.json({
      success: true,
      data: roleAndPermission,
    });
  } catch (error) {
    console.error("Get role and permission error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Create new role and permission
// @route   POST /api/roleAndPermission
// @access  Private (Admin)
router.post(
  "/",
  protect,
  authorize("Admin"),
  validateRoleAndPermission,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { roleName, permissions } = req.body;
      const trimmedRoleName = roleName.trim();
      if (
        roleName.trim().toLowerCase() == "admin" ||
        roleName.trim().toLowerCase() == "admin_user"
      ) {
        return res.status(400).json({
          success: false,
          message: "Admin role is reserved and cannot be created.",
        });
      }
      // Prevent "admin" word in role name (case-insensitive)
      if (/admin/i.test(trimmedRoleName)) {
        return res.status(400).json({
          success: false,
          message: `This role name is reserved. Please choose a unique and descriptive name for your role.`,
        });
      }

      const created_by_user_id = req.user.id;

      // Check if roleName already exists for this creator OR globally
      const existingRole = await RoleAndPermission.findOne({
        $or: [
          { roleName: trimmedRoleName, created_by_user_id: null },
          { roleName: trimmedRoleName, created_by_user_id: created_by_user_id },
          { roleName: trimmedRoleName, created_by_user_id: { $exists: false } },
        ],
      });

      if (existingRole) {
        return res.status(400).json({
          success: false,
          message:
            "Role name already exists for this creator or as a global role.",
        });
      }

      const newRole = new RoleAndPermission({
        roleName: trimmedRoleName,
        permissions: permissions || {},
        created_by_user_id: created_by_user_id,
      });

      const savedRole = await newRole.save();

      res.status(201).json({
        success: true,
        message: `Role "${savedRole.roleName}" with permissions created successfully.`,
        data: savedRole,
      });
    } catch (error) {
      console.error("Create role and permission error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @desc    Update an existing role and its permissions
// @route   PUT /api/roleAndPermission/:id
// @access  Private (Admin or user with 'manage_roles' permission)
router.put(
  "/update",
  protect,
  authorize("Admin"),
  validateEditRoleAndPermission,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { role_id, role_name, permissions, updated_by_user_id } = req.body;

      if (!role_id) {
        return res.status(400).json({
          success: false,
          message: "Role ID is required.",
        });
      }

      const trimmedRoleName = role_name.trim();
      if (
        role_name.trim().toLowerCase() == "admin" ||
        role_name.trim().toLowerCase() == "admin_user"
      ) {
        return res.status(400).json({
          success: false,
          message: "Admin role is reserved and cannot be created.",
        });
      }
      // Prevent "admin" word in role name (case-insensitive)
      if (/admin/i.test(trimmedRoleName)) {
        return res.status(400).json({
          success: false,
          message: `This role name is reserved. Please choose a unique and descriptive name for your role.`,
        });
      }

      let roleToUpdate = await RoleAndPermission.findById(role_id);
      let oldRoleName = roleToUpdate.roleName;

      if (!roleToUpdate) {
        return res.status(404).json({
          success: false,
          message: "Role not found.",
        });
      }

      // Check for unique role name (excluding current role)
      if (role_name && role_name.trim() !== roleToUpdate.roleName) {
        const existingRole = await RoleAndPermission.findOne({
          roleName: role_name.trim(),
          _id: { $ne: role_id },
        });

        if (existingRole) {
          return res.status(400).json({
            success: false,
            message: `Role name "${role_name.trim()}" already exists.`,
          });
        }

        roleToUpdate.roleName = role_name.trim();
      }

      // Merge permissions
      if (permissions) {
        const currentPermissions = roleToUpdate.permissions.toObject();
        roleToUpdate.permissions = deepMerge(currentPermissions, permissions);
      }

      roleToUpdate.updated_by_user_id = updated_by_user_id || req.user.id;

      const updatedRole = await roleToUpdate.save();
      //check update role is failed or not

      if (oldRoleName !== updatedRole.roleName) {
        // Find all AdminUsers with this role
        const adminUsers = await AdminUser.find({ role: updatedRole._id });

        for (const admin of adminUsers) {
          const userId = admin.user_id;

          const user = await User.findById(userId);

          if (user && Array.isArray(user.roles)) {
            const roleIndex = user.roles.findIndex((r) => r === oldRoleName);
            if (roleIndex !== -1) {
              user.roles[roleIndex] = updatedRole.roleName;
              let result = await user.save();
              if (!result) {
                return res.status(207).json({
                  success: false,
                  message: `user ${user.name} role update failed`,
                });
              }
            }
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: `Role "${updatedRole.roleName}" updated successfully.`,
        data: updatedRole,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @desc Delete a role and its permissions
// @route DELETE /api/roleAndPermission/:id
// @access Private (Admin or user with 'manage_roles' permission)
router.delete("/:id", protect, authorize("Admin"), async (req, res) => {
  try {
    const roleId = req.params.id;

    const roleToDelete = await RoleAndPermission.findById(roleId);
    if (!roleToDelete) {
      return res.status(404).json({
        success: false,
        message: "Role not found.",
      });
    }

    // Prevent deletion of the default 'Admin' role
    if (
      (roleToDelete.roleName === "Admin" ||
        roleToDelete.roleName === "Admin_user") &&
      (roleToDelete.created_by_user_id === null ||
        typeof roleToDelete.created_by_user_id === "undefined")
    ) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete the default system Admin role.",
      });
    }

    const roleNameToRemove = roleToDelete.roleName;

    // 🧹 Remove all AdminUser documents assigned to this role
    const deletedAdmins = await AdminUser.deleteMany({ role: roleId });
    if (!deletedAdmins.acknowledged) {
      return res.status(207).json({
        success: false,
        message: `Role deleted from Admin users, but some cleanup failed. Removed ${deletedAdmins.deletedCount} admin users.`,
      });
    }

    // 🧹 Remove this role name from users' roles array
    const updatedUsers = await User.updateMany(
      { roles: roleNameToRemove },
      { $pull: { roles: roleNameToRemove } }
    );
    if (!deletedAdmins.acknowledged) {
      return res.status(207).json({
        success: false,
        message: `Role deleted from user, but some cleanup failed. Updated ${updatedUsers.modifiedCount} users.`,
      });
    }

    // Delete the RoleAndPermission document
    await RoleAndPermission.findByIdAndDelete(roleId);

    return res.status(200).json({
      success: true,
      message: `Role "${roleNameToRemove}" deleted successfully. Removed ${deletedAdmins.deletedCount} admin users and updated ${updatedUsers.modifiedCount} users.`,
    });
  } catch (error) {
    console.error("Delete role and permission error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;

//  roleToUpdate.permissions = {
//         ...roleToUpdate.permissions.toObject(),
//         ...permissions,
//         UserMenu: {
//           ...roleToUpdate.permissions.UserMenu.toObject(),
//           ...(permissions.UserMenu || {}),
//         },
//         ToolCategoriesMenu: {
//           ...roleToUpdate.permissions.ToolCategoriesMenu.toObject(),
//           ...(permissions.ToolCategoriesMenu || {}),
//         },
//         ToolsManagementMenu: {
//           ...roleToUpdate.permissions.ToolsManagementMenu.toObject(),
//           ...(permissions.ToolsManagementMenu || {}),
//         },
//          MarketingToolCategoriesMenu: {
//     ...roleToUpdate.permissions.MarketingToolCategoriesMenu.toObject(),
//           ...(permissions.MarketingToolCategoriesMenu || {}),
//   },
//   MarketingToolsManagementMenu: {
//   ...roleToUpdate.permissions.MarketingToolsManagementMenu.toObject(),
//           ...(permissions.MarketingToolsManagementMenu || {}),
//   },
//         // NewsMenu: {
//         //   ...roleToUpdate.permissions.NewsMenu.toObject(),
//         //   ...(permissions.NewsMenu || {}),
//         // },
//         NewsCategoryMenu: {
//           ...roleToUpdate.permissions.NewsCategoryMenu.toObject(),
//           ...(permissions.NewsCategoryMenu || {}),
//         },
//         PagesMenu: {
//           ...roleToUpdate.permissions.PagesMenu.toObject(),
//           ...(permissions.PagesMenu || {}),
//         },
//         SystemLogsMenu: {
//           ...roleToUpdate.permissions.SystemLogsMenu.toObject(),
//           ...(permissions.SystemLogsMenu || {}),
//         },
//         ContactMenu: {
//           ...roleToUpdate.permissions.ContactMenu.toObject(),
//           ...(permissions.ContactMenu || {}),
//         },
//         SeoMenu: {
//           ...roleToUpdate.permissions.SeoMenu.toObject(),
//           ...(permissions.SeoMenu || {}),
//         },
//             FaviconSettingMenu: {
//           ...roleToUpdate.permissions.FaviconSettingMenu.toObject(),
//           ...(permissions.FaviconSettingMenu || {}),
//         },
//         DiscoverRecipesCategoriesMenu: {
//           ...roleToUpdate.permissions.DiscoverRecipesCategoriesMenu.toObject(),
//           ...(permissions.DiscoverRecipesCategoriesMenu || {}),
//         },
//         DiscoverRecipesCollectionsMenu: {
//           ...roleToUpdate.permissions.DiscoverRecipesCollectionsMenu.toObject(),
//           ...(permissions.DiscoverRecipesCollectionsMenu || {}),
//         },
//         DiscoverRecipesToolsMenu: {
//           ...roleToUpdate.permissions.DiscoverRecipesToolsMenu.toObject(),
//           ...(permissions.DiscoverRecipesToolsMenu || {}),
//         },
//         DiscoverDestinationsCategoriesMenu: {
//           ...roleToUpdate.permissions.DiscoverDestinationsCategoriesMenu.toObject(),
//           ...(permissions.DiscoverDestinationsCategoriesMenu || {}),
//         },
//         DiscoverDestinationsCollectionsMenu: {
//           ...roleToUpdate.permissions.DiscoverDestinationsCollectionsMenu.toObject(),
//           ...(permissions.DiscoverDestinationsCollectionsMenu || {}),
//         },
//         DiscoverDestinationsToolsMenu: {
//           ...roleToUpdate.permissions.DiscoverDestinationsToolsMenu.toObject(),
//           ...(permissions.DiscoverDestinationsToolsMenu || {}),
//         },
//         FindCompaniesMenu: {
//           ...roleToUpdate.permissions.FindCompaniesMenu.toObject(),
//           ...(permissions.FindCompaniesMenu || {}),
//         },
//         CoverLetterGeneratorMenu: {
//           ...roleToUpdate.permissions.CoverLetterGeneratorMenu.toObject(),
//           ...(permissions.CoverLetterGeneratorMenu || {}),
//         },
//         ResumeGeneratorMenu: {
//           ...roleToUpdate.permissions.ResumeGeneratorMenu.toObject(),
//           ...(permissions.ResumeGeneratorMenu || {}),
//         },
//         OnlineIncomeMenu: {
//           ...roleToUpdate.permissions.OnlineIncomeMenu.toObject(),
//           ...(permissions.OnlineIncomeMenu || {}),
//         },
//         BusinessNameGenerator: {
//           ...roleToUpdate.permissions.BusinessNameGenerator.toObject(),
//           ...(permissions.BusinessNameGenerator || {}),
//         },
//          BusinessIdeasGenerator: {
//           ...roleToUpdate.permissions.BusinessIdeasGenerator.toObject(),
//           ...(permissions.BusinessIdeasGenerator || {}),
//         },
//         InterviewPreparationMenu: {
//           ...roleToUpdate.permissions.InterviewPreparationMenu.toObject(),
//           ...(permissions.InterviewPreparationMenu || {}),
//         },
//         EmailMenu: {
//           ...roleToUpdate.permissions.EmailMenu.toObject(),
//           ...(permissions.EmailMenu || {}),
//         },
//         ParaphraseMenu: {
//           ...roleToUpdate.permissions.ParaphraseMenu.toObject(),
//           ...(permissions.ParaphraseMenu || {}),
//         },
//         MessageMenu: {
//           ...roleToUpdate.permissions.MessageMenu.toObject(),
//           ...(permissions.MessageMenu || {}),
//         },
//         CheckGrammarMenu: {
//           ...roleToUpdate.permissions.CheckGrammarMenu.toObject(),
//           ...(permissions.CheckGrammarMenu || {}),
//         },
//         BlogPostMenu: {
//           ...roleToUpdate.permissions.BlogPostMenu.toObject(),
//           ...(permissions.BlogPostMenu || {}),
//         },
//         SocialMediaMenu: {
//           ...roleToUpdate.permissions.SocialMediaMenu.toObject(),
//           ...(permissions.SocialMediaMenu || {}),
//         },
//          TranslateContentMenu: {
//           ...roleToUpdate.permissions.TranslateContentMenu.toObject(),
//           ...(permissions.TranslateContentMenu || {}),
//         },
//         WellnessMenu: {
//           ...roleToUpdate.permissions.WellnessMenu.toObject(),
//           ...(permissions.WellnessMenu || {}),
//         },
//         TherapyMenu: {
//           ...roleToUpdate.permissions.TherapyMenu.toObject(),
//           ...(permissions.TherapyMenu || {}),
//         },
//         WeightLossMenu: {
//           ...roleToUpdate.permissions.WeightLossMenu.toObject(),
//           ...(permissions.WeightLossMenu || {}),
//         },
//         NutritionPlannerMenu: {
//           ...roleToUpdate.permissions.NutritionPlannerMenu.toObject(),
//           ...(permissions.NutritionPlannerMenu || {}),
//         },
//         CalorieCalculatorMenu: {
//            ...roleToUpdate.permissions.CalorieCalculatorMenu.toObject(),
//           ...(permissions.CalorieCalculatorMenu || {}),
//         },
//         SymptomCheckerMenu: {
//           ...roleToUpdate.permissions.SymptomCheckerMenu.toObject(),
//           ...(permissions.SymptomCheckerMenu || {}),
//         },
//         SolutionsMenu: {
//           ...roleToUpdate.permissions.SolutionsMenu.toObject(),
//           ...(permissions.SolutionsMenu || {}),
//         },
//         DocumentsMenu: {
//           ...roleToUpdate.permissions.DocumentsMenu.toObject(),
//           ...(permissions.DocumentsMenu || {}),
//         },
//         ResearchMenu: {
//           ...roleToUpdate.permissions.ResearchMenu.toObject(),
//           ...(permissions.ResearchMenu || {}),
//         },
//         MarketingMenu: {
//           ...roleToUpdate.permissions.MarketingMenu.toObject(),
//           ...(permissions.MarketingMenu || {}),
//         },
//         FundingMenu: {
//           ...roleToUpdate.permissions.FundingMenu.toObject(),
//           ...(permissions.FundingMenu || {}),
//         },
//         FinancialAdvisorMenu: {
//           ...roleToUpdate.permissions.FinancialAdvisorMenu.toObject(),
//           ...(permissions.FinancialAdvisorMenu || {}),
//         },
//         SaveMoneyMenu: {
//           ...roleToUpdate.permissions.SaveMoneyMenu.toObject(),
//           ...(permissions.SaveMoneyMenu || {}),
//         },
//         BudgetCalculatorMenu: {
//           ...roleToUpdate.permissions.BudgetCalculatorMenu.toObject(),
//           ...(permissions.BudgetCalculatorMenu || {}),
//         },
//         RetirementCalculatorMenu: {
//           ...roleToUpdate.permissions.RetirementCalculatorMenu.toObject(),
//           ...(permissions.RetirementCalculatorMenu || {}),
//         },
//         DebtReliefMenu: {
//           ...roleToUpdate.permissions.DebtReliefMenu.toObject(),
//           ...(permissions.DebtReliefMenu || {}),
//         },
//         InvestingMenu: {
//           ...roleToUpdate.permissions.InvestingMenu.toObject(),
//           ...(permissions.InvestingMenu || {}),
//         },
//         VisionBoardGeneratorMenu : {
//           ...roleToUpdate.permissions.VisionBoardGeneratorMenu.toObject(),
//           ...(permissions.VisionBoardGeneratorMenu || {}),
//         }
//       };

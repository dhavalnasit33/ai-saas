const express = require('express');
const User = require('../models/User');
const PromptHistory = require('../models/PromptHistory');
const Payment = require('../models/Payment');
const ToolCategory = require('../models/ToolCategory');
const AdminUser = require('../models/AdminUser');
const { protect, authorize, checkPermission } = require('../middleware/auth');
const roleandpermission = require('../models/roleAndPermission');
const { removeChildAdminsWithTransaction } = require('../utils/adminHelper');
const mongoose = require('mongoose');
const router = express.Router();


// @desc    Get all admin users assigned by a user or all (if super admin)
// @route   GET /api/admin/users/:id
// @access  Private (Admin)

router.get('/users/:id', protect, authorize('Admin'), async (req, res) => {
  const id = req.params.id;
  const { page = 1, limit = 10, search = '' } = req.query;

  try {
    const userData = await User.findById(id).select('roles');
    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Base match condition (restrict by assigned_by if not Admin)
    let matchStage = { is_active: true };
    if (!userData.roles.includes('Admin')) {
      matchStage.assigned_by = new mongoose.Types.ObjectId(id);
    }

    // Create regex for search
    const regex = new RegExp(search, 'i');

    // ========= COUNT PIPELINE =========
    const countPipeline = [
      { $match: matchStage },

      // Populate user_id
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user_id'
        }
      },
      { $unwind: '$user_id' },

      // Populate role
      {
        $lookup: {
          from: 'roleandpermissions',
          localField: 'role',
          foreignField: '_id',
          as: 'role'
        }
      },
      { $unwind: '$role' },

      // Populate assigned_by
      {
        $lookup: {
          from: 'users',
          localField: 'assigned_by',
          foreignField: '_id',
          as: 'assigned_by'
        }
      },
      { $unwind: '$assigned_by' },
    ];

    // Apply search filter (if provided)
    if (search) {
      countPipeline.push({
        $match: {
          $or: [
            { 'user_id.name': { $regex: regex } },
            { 'user_id.email': { $regex: regex } },
            { 'role.roleName': { $regex: regex } }
          ]
        }
      });
    }

    // Count documents
    countPipeline.push({ $count: 'total' });
    const countResult = await AdminUser.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // ========= MAIN DATA PIPELINE =========
    const pipeline = [
      { $match: matchStage },

      // Populate user_id
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user_id'
        }
      },
      { $unwind: '$user_id' },

      // Populate role
      {
        $lookup: {
          from: 'roleandpermissions',
          localField: 'role',
          foreignField: '_id',
          as: 'role'
        }
      },
      { $unwind: '$role' },

      // Populate assigned_by
      {
        $lookup: {
          from: 'users',
          localField: 'assigned_by',
          foreignField: '_id',
          as: 'assigned_by'
        }
      },
      { $unwind: '$assigned_by' },
    ];

    // Apply search filter (same as count)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user_id.name': { $regex: regex } },
            { 'user_id.email': { $regex: regex } },
            { 'role.roleName': { $regex: regex } }
          ]
        }
      });
    }

    // Pagination & sort
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) }
    );

    // Execute
    const adminUsers = await AdminUser.aggregate(pipeline);

    res.json({
      success: true,
      data: adminUsers,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


//desc   Get admin user by ID
// @route  GET /api/admin/users/:adminUserId
// @access Public

router.get('/users-admin/:adminUserId', protect, async (req, res) => {
  const adminUserId = req.params.adminUserId;

  try {
    const adminUser = await AdminUser.find({ user_id: adminUserId })
      .populate('user_id', 'name email profile_picture')
      .populate('role', 'roleName permissions')
      .populate('assigned_by', 'name email');

    if (!adminUser || adminUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Process each adminUser found (in case find returns multiple, though for a user_id it's likely one)
    const processedAdminUsers = adminUser.map(user => {
      const { role, extra_permission, ...rest } = user.toObject(); // Convert Mongoose document to plain object

      // Start with the role permissions
      let mergedPermissions = { ...role.permissions };

      // If extra_permission exists, iterate over its keys and merge
      if (extra_permission) {
        for (const menu in extra_permission) {
          if (extra_permission.hasOwnProperty(menu)) {
            // If the menu exists in role permissions, merge its sub-permissions
            if (mergedPermissions[menu]) {
              mergedPermissions[menu] = {
                ...mergedPermissions[menu],
                ...extra_permission[menu]
              };
            } else {
              // If the menu only exists in extra_permission, add it
              mergedPermissions[menu] = extra_permission[menu];
            }
          }
        }
      }

      // Create a new role object with the merged permissions
      const newRole = {
        ...role,
        permissions: mergedPermissions
      };

      // Return the user object with the updated role and without extra_permission
      return {
        ...rest,
        role: newRole
      };
    });

    res.json({
      success: true,
      data: processedAdminUsers // Send the processed data
    });

  } catch (error) {
    console.error('Get admin user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Assign admin role to user
// @route   POST /api/admin/users/:userId/assign-role
// @access  Private (Admin)
router.post('/users/:userId/assign-role', protect, authorize('Admin'), async (req, res) => {
  try {
    const { role, extra_permission
    } = req.body;
    // console.log("🚀 ~ role:", role)
    const userId = req.params.userId;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }

    // Validate role as ObjectId
    // if (!mongoose.Types.ObjectId.isValid(role)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Invalid role ID'
    //   });
    // }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already has admin role
    const existingAdminUser = await AdminUser.findOne({ user_id: userId });
    if (existingAdminUser) {
      return res.status(400).json({
        success: false,
        message: 'User already has admin role'
      });
    }

    // Determine can_edit_roles based on role document
    const roleDoc = await roleandpermission.findById(role);
    if (!roleDoc) {
      return res.status(400).json({
        success: false,
        message: 'Role not found'
      });
    }

    // const canEditRoles = roleDoc.name === 'Admin';

    // Create admin user record
    const adminUser = await AdminUser.create({
      user_id: userId,
      role,
      // can_edit_roles: canEditRoles,
      extra_permission: extra_permission || [],
      assigned_by: req.user.id
    });

    // Update user roles
    if (!user.roles.includes(roleDoc.roleName)) {
      user.roles.push(roleDoc.roleName);
      await user.save();
    }

    await adminUser.populate('user_id', 'name email');

    res.status(201).json({
      success: true,
      message: 'Admin role assigned successfully',
      data: adminUser
    });
  } catch (error) {
    console.error('Assign admin role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update admin user permissions
// @route   PUT /api/admin/users/:adminUserId
// @access  Private (Admin)
router.put('/users/:adminUserId', protect, authorize('Admin'), async (req, res) => {
  try {
    const { role, is_active, extra_permission } = req.body;
    const adminUserId = req.params.adminUserId;

    let adminUser = await AdminUser.findById(adminUserId).populate('role', 'roleName');
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    const oldRoleName = adminUser.role?.roleName;
    const roleDoc = await roleandpermission.findById(role);

    if (role) {
      if (!roleDoc) {
        return res.status(400).json({
          success: false,
          message: 'Role not found'
        });
      }

      const newRoleName = roleDoc.roleName;

      // 🧠 Trigger recursive removal if role is changing away from 'Admin_user'
      if (oldRoleName === 'Admin_user' && newRoleName !== 'Admin_user') {
        try {
          await removeChildAdminsWithTransaction(adminUser.user_id.toString());
        } catch (err) {
          console.error('Failed to remove child admins:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to clean child admin_user roles'
          });
        }
      }

      adminUser.role = role;
      adminUser.extra_permission = extra_permission || [];
    }

    if (is_active !== undefined) {
      adminUser.is_active = is_active;
    }

    adminUser = await adminUser.save();
    await adminUser.populate('role', 'roleName permissions');

    // 🧠 Update User.roles field
    let user = await User.findById(adminUser.user_id);
    if (user) {
      const allRoles = await roleandpermission.find({}, 'roleName');
      const validRoleNames = allRoles.map(role => role.roleName);

      user.roles = user.roles.filter(roleName => !validRoleNames.includes(roleName));
      if (!user.roles.includes(adminUser.role.roleName)) {
        user.roles.push(adminUser.role.roleName);
      }

      let result = await user.save();
      if (!result) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update user roles'
        });
      }
    }

    await adminUser.populate('user_id', 'name email profile_picture')
    await adminUser.populate('role', 'roleName permissions')
    await adminUser.populate('assigned_by', 'name email');

    res.json({
      success: true,
      message: 'Admin user updated successfully',
      data: adminUser
    });
  } catch (error) {
    console.error('Update admin user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Remove admin role from user
// @route   DELETE /api/admin/users/:adminUserId
// @access  Private (Admin)
router.delete('/users/:adminUserId', protect, authorize('Admin'), async (req, res) => {
  try {
    const adminUserId = req.params.adminUserId;

    const adminUser = await AdminUser.findById(adminUserId).populate('role');
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    const adminCount = await AdminUser.countDocuments({
      role: adminUser.role._id,
      is_active: true
    });

    if (adminUser.role.name === 'Admin' && adminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the last admin user'
      });
    }

    // 🧠 Recursively remove all assigned child admin_users
    try {
      await removeChildAdminsWithTransaction(adminUser.user_id.toString());
    } catch (err) {
      console.error('Failed to remove child admins during delete:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove child admin_user roles'
      });
    }

    // Remove role from User
    const user = await User.findById(adminUser.user_id);
    if (user) {
      user.roles = user.roles.filter(roleName => roleName !== adminUser.role.roleName );
      await user.save();
    }

    await AdminUser.findByIdAndDelete(adminUserId);

    res.json({
      success: true,
      message: 'Admin role removed successfully'
    });
  } catch (error) {
    console.error('Remove admin role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


// @desc    Get system logs
// @route   GET /api/admin/logs
// @access  Private (Admin)
router.get('/logs', protect, authorize('Admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, level, start_date, end_date } = req.query;

    // This is a placeholder - in production, you'd integrate with your logging system
    // For now, we'll return recent prompt history as activity logs
    let query = {};

    if (start_date && end_date) {
      query.createdAt = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    const logs = await PromptHistory.find(query)
      .populate('user_id', 'name email')
      .populate('tool_category_id', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PromptHistory.countDocuments(query);

    // Transform to log format
    const formattedLogs = logs.map(log => ({
      id: log._id,
      timestamp: log.createdAt,
      level: log.success ? 'info' : 'error',
      message: `User ${log.user_id?.name} used ${log.tool_category_id?.name}`,
      details: {
        user: log.user_id?.name,
        email: log.user_id?.email,
        tool: log.tool_category_id?.name,
        tokens_used: log.tokens_used,
        api_used: log.api_used,
        success: log.success,
        response_time: log.response_time
      }
    }));

    res.json({
      success: true,
      data: formattedLogs,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Export data
// @route   GET /api/admin/export/:type
// @access  Private (Admin)
router.get('/export/:type', protect, checkPermission('export_data'), async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json', start_date, end_date } = req.query;

    let query = {};
    if (start_date && end_date) {
      query.createdAt = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    let data;
    let filename;

    switch (type) {
      case 'users':
        data = await User.find(query).select('-password');
        filename = 'users_export';
        break;
      case 'payments':
        data = await Payment.find(query).populate('user_id', 'name email');
        filename = 'payments_export';
        break;
      case 'history':
        data = await PromptHistory.find(query)
          .populate('user_id', 'name email')
          .populate('tool_category_id', 'name category');
        filename = 'history_export';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    if (format === 'csv') {
      // Convert to CSV (simplified implementation)
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data,
        exported_at: new Date().toISOString(),
        total_records: data.length
      });
    }
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data.length) return '';

  const headers = Object.keys(data[0].toObject ? data[0].toObject() : data[0]);
  const csvHeaders = headers.join(',');

  const csvRows = data.map(item => {
    const obj = item.toObject ? item.toObject() : item;
    return headers.map(header => {
      const value = obj[header];
      if (typeof value === 'object' && value !== null) {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });
  return [csvHeaders, ...csvRows].join('\n');
}

// ==========================================
// CONTENT SAFETY ADMIN API ENDPOINTS
// ==========================================

const ViolationEvent = require('../models/ViolationEvent');

// @desc    Get paginated content safety violations log
// @route   GET /api/admin/safety/violations
// @access  Private (Admin)
router.get('/safety/violations', protect, authorize('Admin'), async (req, res) => {
  try {
    const { page = 1, limit = 15, source, tool } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = {};
    if (source) query.source = source;
    if (tool) query.tool = tool;

    const [violations, total] = await Promise.all([
      ViolationEvent.find(query)
        .populate('userId', 'name email status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ViolationEvent.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: violations,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching safety violations:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get list of suspended users
// @route   GET /api/admin/safety/suspended-users
// @access  Private (Admin)
router.get('/safety/suspended-users', protect, authorize('Admin'), async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find({ status: 'suspended' })
        .select('name email plan status createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments({ status: 'suspended' }),
    ]);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching suspended users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Unban / Restore a suspended user
// @route   POST /api/admin/safety/users/:id/unban
// @access  Private (Admin)
router.post('/safety/users/:id/unban', protect, authorize('Admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = 'active';
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.email} has been successfully unbanned and restored to active status.`,
      user: {
        id: user._id,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get content safety overall metrics
// @route   GET /api/admin/safety/stats
// @access  Private (Admin)
router.get('/safety/stats', protect, authorize('Admin'), async (req, res) => {
  try {
    const since30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalViolations, violations30Days, suspendedUsersCount, topCategoryAggregation] = await Promise.all([
      ViolationEvent.countDocuments({}),
      ViolationEvent.countDocuments({ createdAt: { $gte: since30Days } }),
      User.countDocuments({ status: 'suspended' }),
      ViolationEvent.aggregate([
        { $unwind: '$categories' },
        { $group: { _id: '$categories', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalViolations,
        violations30Days,
        suspendedUsersCount,
        topCategories: topCategoryAggregation.map(item => ({ category: item._id, count: item.count })),
      },
    });
  } catch (error) {
    console.error('Error fetching safety stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

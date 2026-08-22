const mongoose = require('mongoose');

const adminUserSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId || String,
    ref: 'RoleAndPermission',  
    // enum: ['Admin', 'SEO Manager', 'Marketing Manager', 'UI/UX Designer'],
    required: true
  },
  // permissions: [{
  //   type: String,
  //   enum: [
  //     'view_users',
  //     'edit_users',
  //     'delete_users',
  //     'view_payments',
  //     'process_refunds',
  //     'view_analytics',
  //     'edit_tools',
  //     'manage_ai_providers',
  //     'manage_plans',
  //     'export_data',
  //     'manage_roles'
  //   ]
  // }],
  // can_edit_roles: {
  //   type: Boolean,
  //   default: false
  // },
  // can_edit_roles: {
  //   type: Boolean,
  //   default: false
  // },
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  extra_permission : {
    //here i am get array of objects of permisions 
    type: mongoose.Schema.Types.Mixed,
    required: false,
    default: []
  }
}, {
  timestamps: true
});

// Define role permissions
// adminUserSchema.statics.getRolePermissions = function(role) {
//   const rolePermissions = {
//     'Admin': [
//       'view_users', 'edit_users', 'delete_users',
//       'view_payments', 'process_refunds',
//       'view_analytics', 'edit_tools',
//       'manage_ai_providers', 'view_all_history',
//       'export_data', 'manage_roles'
//     ],
//     'SEO Manager': [
//       'view_users', 'view_all_history', 'view_analytics', 'export_data'
//     ],
//     'Marketing Manager': [
//       'view_users', 'view_analytics', 'view_payments'
//     ],
//     'UI/UX Designer': [
//       'edit_tools', 'view_analytics'
//     ]
//   };
  
//   return rolePermissions[role] || [];
// };

module.exports = mongoose.model('AdminUser', adminUserSchema);

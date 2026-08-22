// // utils/adminHelpers.js (Optimized with Transaction Support)
// const AdminUser = require('../models/AdminUser');
// const User = require('../models/User');
// const RoleAndPermission = require('../models/roleandpermission');
// const mongoose = require('mongoose');

// /**
//  * Recursively removes all child admin_users assigned by a specific user.
//  * Optimized with Promise.all and batch DB operations.
//  * @param {string} adminUserId - The user_id of the admin whose tree you want to clean up.
//  * @param {Set<string>} visited - Tracks visited users to avoid circular loops.
//  * @param {mongoose.ClientSession} session - The MongoDB session for transaction.
//  */
// async function removeChildAdminUsers(adminUserId, visited = new Set(), session = null) {
//   if (visited.has(adminUserId)) return;
//   visited.add(adminUserId);

//   const children = await AdminUser.find({ assigned_by: adminUserId }).session(session);
//   if (children.length === 0) return;

//   // Recursively clean children in parallel
//   await Promise.all(
//     children.map(child => removeChildAdminUsers(child.user_id.toString(), visited, session))
//   );

//   // Batch role lookup
//   const roleMap = await RoleAndPermission.find({
//     _id: { $in: children.map(child => child.role) }
//   }).session(session);
//   const roleNameById = new Map(roleMap.map(role => [role._id.toString(), role.roleName]));

//   // Batch user update
//   const users = await User.find({
//     _id: { $in: children.map(child => child.user_id) }
//   }).session(session);

//   for (const user of users) {
//     for (const child of children) {
//       if (user._id.toString() === child.user_id.toString()) {
//         const roleName = roleNameById.get(child.role.toString());
//         if (roleName) {
//           user.roles = user.roles.filter(r => r !== roleName);
//         }
//       }
//     }
//     await user.save({ session });
//   }

//   // Batch delete AdminUser documents
//   await AdminUser.deleteMany({
//     _id: { $in: children.map(child => child._id) }
//   }).session(session);
// }

// /**
//  * Wrapper to run the removal process inside a transaction.
//  * @param {string} adminUserId - The root user_id to start deletion from.
//  */
// async function removeChildAdminsWithTransaction(adminUserId) {
//   const session = await mongoose.startSession();

//   try {
//     await session.withTransaction(async () => {
//       await removeChildAdminUsers(adminUserId, new Set(), session);
//     });
//   } catch (error) {
//     console.error('Transaction failed inside removeChildAdminsWithTransaction:', error);
//     throw error; // Let caller handle response
//   } finally {
//     await session.endSession();
//   }
// }

// module.exports = { removeChildAdminsWithTransaction };


// utils/adminHelpers.js (Optimized without Transaction)
const AdminUser = require('../models/AdminUser');
const User = require('../models/User');
const RoleAndPermission = require('../models/roleAndPermission');

/**
 * Recursively removes all child admin_users assigned by a specific user.
 * Optimized with Promise.all and batch DB operations.
 * @param {string} adminUserId - The user_id of the admin whose tree you want to clean up.
 * @param {Set<string>} visited - Tracks visited users to avoid circular loops.
 */
async function removeChildAdminUsers(adminUserId, visited = new Set()) {
    if (visited.has(adminUserId)) return;
    visited.add(adminUserId);

    const children = await AdminUser.find({ assigned_by: adminUserId });
    if (children.length === 0) return;

    // Recursively clean children in parallel
    await Promise.all(
        children.map(child => removeChildAdminUsers(child.user_id.toString(), visited))
    );

    // Batch role lookup
    const roleMap = await RoleAndPermission.find({
        _id: { $in: children.map(child => child.role) }
    });
    const roleNameById = new Map(roleMap.map(role => [role._id.toString(), role.roleName]));

    // Batch user update
    const users = await User.find({
        _id: { $in: children.map(child => child.user_id) }
    });

    for (const user of users) {
        for (const child of children) {
            if (user._id.toString() === child.user_id.toString()) {
                const roleName = roleNameById.get(child.role.toString());
                if (roleName) {
                    user.roles = user.roles.filter(r => r !== roleName);
                }
            }
        }
        await user.save();
    }

    // Batch delete AdminUser documents
    await AdminUser.deleteMany({
        _id: { $in: children.map(child => child._id) }
    });
}

/**
 * Wrapper to run the removal process (without transaction).
 * @param {string} adminUserId - The root user_id to start deletion from.
 */
async function removeChildAdminsWithTransaction(adminUserId) {
    try {
        await removeChildAdminUsers(adminUserId, new Set());
    } catch (error) {
        console.error('Failed inside removeChildAdminsWithTransaction (no transaction):', error);
        throw error; // Let caller handle response
    }
}

module.exports = { removeChildAdminsWithTransaction };

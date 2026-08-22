const User = require('../models/User');
const PromptHistory = require('../models/PromptHistory');
const Payment = require('../models/Payment');
const ToolCategory = require('../models/ToolCategory');

class AnalyticsService {
  // Get comprehensive dashboard analytics
  async getDashboardAnalytics(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    try {
      const [
        userMetrics,
        usageMetrics,
        revenueMetrics,
        toolMetrics,
        trendsData
      ] = await Promise.all([
        this.getUserMetrics(startDate),
        this.getUsageMetrics(startDate),
        this.getRevenueMetrics(startDate),
        this.getToolMetrics(startDate),
        this.getTrendsData(startDate)
      ]);

      return {
        users: userMetrics,
        usage: usageMetrics,
        revenue: revenueMetrics,
        tools: toolMetrics,
        trends: trendsData,
        period_days: days
      };
    } catch (error) {
      console.error('Analytics error:', error);
      throw error;
    }
  }

  async getUserMetrics(startDate) {
    const [totalUsers, newUsers, activeUsers, usersByPlan] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startDate } }),
      User.countDocuments({ 
        lastLogin: { $gte: startDate },
        status: 'active'
      }),
      User.aggregate([
        {
          $group: {
            _id: '$plan',
            count: { $sum: 1 },
            avg_tokens: { $avg: '$remaining_tokens' }
          }
        }
      ])
    ]);

    return {
      total: totalUsers,
      new: newUsers,
      active: activeUsers,
      by_plan: usersByPlan,
      growth_rate: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(2) : 0
    };
  }

  async getUsageMetrics(startDate) {
    const usageStats = await PromptHistory.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total_requests: { $sum: 1 },
          total_tokens: { $sum: '$tokens_used' },
          successful_requests: {
            $sum: { $cond: ['$success', 1, 0] }
          },
          failed_requests: {
            $sum: { $cond: ['$success', 0, 1] }
          },
          avg_response_time: { $avg: '$response_time' },
          unique_users: { $addToSet: '$user_id' }
        }
      },
      {
        $addFields: {
          unique_users_count: { $size: '$unique_users' },
          success_rate: {
            $multiply: [
              { $divide: ['$successful_requests', '$total_requests'] },
              100
            ]
          }
        }
      }
    ]);

    return usageStats[0] || {
      total_requests: 0,
      total_tokens: 0,
      successful_requests: 0,
      failed_requests: 0,
      avg_response_time: 0,
      unique_users_count: 0,
      success_rate: 0
    };
  }

  async getRevenueMetrics(startDate) {
    const revenueStats = await Payment.aggregate([
      {
        $match: {
          status: 'success',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total_revenue: { $sum: '$amount' },
          total_transactions: { $sum: 1 },
          avg_transaction: { $avg: '$amount' },
          revenue_by_plan: {
            $push: {
              plan: '$plan',
              amount: '$amount'
            }
          }
        }
      }
    ]);

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = await Payment.aggregate([
      {
        $match: {
          status: 'success',
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          mrr: { $sum: '$amount' }
        }
      }
    ]);

    const baseStats = revenueStats[0] || {
      total_revenue: 0,
      total_transactions: 0,
      avg_transaction: 0,
      revenue_by_plan: []
    };

    return {
      ...baseStats,
      mrr: mrr[0]?.mrr || 0
    };
  }

  async getToolMetrics(startDate) {
    const toolStats = await PromptHistory.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$tool_category_id',
          usage_count: { $sum: 1 },
          tokens_used: { $sum: '$tokens_used' },
          unique_users: { $addToSet: '$user_id' },
          avg_response_time: { $avg: '$response_time' },
          success_rate: {
            $avg: { $cond: ['$success', 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'toolcategories',
          localField: '_id',
          foreignField: '_id',
          as: 'tool_info'
        }
      },
      {
        $addFields: {
          unique_users_count: { $size: '$unique_users' },
          tool_name: { $arrayElemAt: ['$tool_info.name', 0] },
          tool_category: { $arrayElemAt: ['$tool_info.category', 0] }
        }
      },
      {
        $sort: { usage_count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    return toolStats;
  }

  async getTrendsData(startDate) {
    // Daily usage trends
    const dailyTrends = await PromptHistory.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          requests: { $sum: 1 },
          tokens: { $sum: '$tokens_used' },
          unique_users: { $addToSet: '$user_id' },
          successful_requests: {
            $sum: { $cond: ['$success', 1, 0] }
          }
        }
      },
      {
        $addFields: {
          unique_users_count: { $size: '$unique_users' }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // User registration trends
    const registrationTrends = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          new_users: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Revenue trends
    const revenueTrends = await Payment.aggregate([
      {
        $match: {
          status: 'success',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    return {
      daily_usage: dailyTrends,
      registrations: registrationTrends,
      revenue: revenueTrends
    };
  }

  // Get user-specific analytics
  async getUserAnalytics(userId, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [usageStats, toolUsage, dailyActivity] = await Promise.all([
      PromptHistory.aggregate([
        {
          $match: {
            user_id: userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            total_requests: { $sum: 1 },
            total_tokens: { $sum: '$tokens_used' },
            successful_requests: {
              $sum: { $cond: ['$success', 1, 0] }
            },
            avg_response_time: { $avg: '$response_time' }
          }
        }
      ]),
      PromptHistory.aggregate([
        {
          $match: {
            user_id: userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$tool_category_id',
            usage_count: { $sum: 1 },
            tokens_used: { $sum: '$tokens_used' }
          }
        },
        {
          $lookup: {
            from: 'toolcategories',
            localField: '_id',
            foreignField: '_id',
            as: 'tool_info'
          }
        },
        {
          $sort: { usage_count: -1 }
        }
      ]),
      PromptHistory.aggregate([
        {
          $match: {
            user_id: userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            requests: { $sum: 1 },
            tokens: { $sum: '$tokens_used' }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ])
    ]);

    return {
      usage_stats: usageStats[0] || {},
      tool_usage: toolUsage,
      daily_activity: dailyActivity,
      period_days: days
    };
  }
}

module.exports = new AnalyticsService();
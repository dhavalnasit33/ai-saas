const express = require('express');
const PromptHistory = require('../models/PromptHistory');
const { protect, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user's prompt history
// @route   GET /api/history
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, tool_category, api_used, success } = req.query;
    
    let query = { user_id: req.user.id };
    
    if (tool_category) {
      query.tool_category_id = tool_category;
    }
    
    if (api_used) {
      query.api_used = api_used;
    }
    
    if (success !== undefined) {
      query.success = success === 'true';
    }

    const history = await PromptHistory.find(query)
      .populate('tool_category_id', 'name category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PromptHistory.countDocuments(query);

    // Calculate total tokens used
    const tokenStats = await PromptHistory.aggregate([
      { $match: { user_id: req.user.id } },
      {
        $group: {
          _id: null,
          total_tokens: { $sum: '$tokens_used' },
          total_requests: { $sum: 1 },
          successful_requests: {
            $sum: { $cond: ['$success', 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: history,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      },
      stats: tokenStats[0] || {
        total_tokens: 0,
        total_requests: 0,
        successful_requests: 0
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get specific history entry
// @route   GET /api/history/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const historyEntry = await PromptHistory.findById(req.params.id)
      .populate('tool_category_id', 'name category description')
      .populate('user_id', 'name email');

    if (!historyEntry) {
      return res.status(404).json({
        success: false,
        message: 'History entry not found'
      });
    }

    // Users can only view their own history, admins can view all
    if (historyEntry.user_id._id.toString() !== req.user.id && !req.user.roles.includes('Admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: historyEntry
    });
  } catch (error) {
    console.error('Get history entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete history entry
// @route   DELETE /api/history/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const historyEntry = await PromptHistory.findById(req.params.id);

    if (!historyEntry) {
      return res.status(404).json({
        success: false,
        message: 'History entry not found'
      });
    }

    // Users can only delete their own history, admins can delete all
    if (historyEntry.user_id.toString() !== req.user.id && !req.user.roles.includes('Admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await PromptHistory.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'History entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user's usage analytics
// @route   GET /api/history/analytics/usage
// @access  Private
router.get('/analytics/usage', protect, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analytics = await PromptHistory.aggregate([
      {
        $match: {
          user_id: req.user.id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            tool_category: '$tool_category_id',
            api_used: '$api_used'
          },
          count: { $sum: 1 },
          tokens_used: { $sum: '$tokens_used' },
          avg_response_time: { $avg: '$response_time' }
        }
      },
      {
        $lookup: {
          from: 'toolcategories',
          localField: '_id.tool_category',
          foreignField: '_id',
          as: 'tool_info'
        }
      },
      {
        $sort: { '_id.date': -1 }
      }
    ]);

    // Get top used tools
    const topTools = await PromptHistory.aggregate([
      {
        $match: {
          user_id: req.user.id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$tool_category_id',
          count: { $sum: 1 },
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
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    res.json({
      success: true,
      data: {
        daily_usage: analytics,
        top_tools: topTools,
        period_days: days
      }
    });
  } catch (error) {
    console.error('Usage analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Export user history
// @route   GET /api/history/export
// @access  Private
router.get('/export', protect, async (req, res) => {
  try {
    const { format = 'json', start_date, end_date } = req.query;
    
    let query = { user_id: req.user.id };
    
    if (start_date && end_date) {
      query.createdAt = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    const history = await PromptHistory.find(query)
      .populate('tool_category_id', 'name category')
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      // Convert to CSV format
      const csv = [
        'Date,Tool,Category,Prompt,Response,API Used,Tokens Used,Response Time,Success',
        ...history.map(entry => [
          entry.createdAt.toISOString(),
          entry.tool_category_id?.name || 'Unknown',
          entry.tool_category_id?.category || 'Unknown',
          `"${entry.prompt.replace(/"/g, '""')}"`,
          `"${entry.response.replace(/"/g, '""')}"`,
          entry.api_used,
          entry.tokens_used,
          entry.response_time,
          entry.success
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=prompt_history.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: history,
        exported_at: new Date().toISOString(),
        total_entries: history.length
      });
    }
  } catch (error) {
    console.error('Export history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

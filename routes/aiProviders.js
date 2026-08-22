const express = require('express');
const AIProvider = require('../models/AIProvider');
const { protect, authorize, checkPermission } = require('../middleware/auth');
const { validateAIProvider, handleValidationErrors } = require('../middleware/validation');
const { aiService } = require('../utils/aiService');
const AIModel = require('../models/AIModel');

const router = express.Router();

// @desc    Get all AI providers
// @route   GET /api/ai-providers
// @access  Private (Admin)
router.get('/', async (req, res) => {
  try {
    const providers = await AIProvider.find().select('-api_key');
    
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('Get AI providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get AI provider by ID
// @route   GET /api/ai-providers/:id
// @access  Private (Admin)
router.get('/:id', protect, async (req, res) => {
  try {
    const provider = await AIProvider.findById(req.params.id).select('-api_key');
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'AI provider not found'
      });
    }

    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('Get AI provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create AI provider
// @route   POST /api/ai-providers
// @access  Private (Admin)
router.post('/', protect, validateAIProvider, handleValidationErrors, async (req, res) => {
  try {
    const provider = await AIProvider.create(req.body);
    
    // Refresh AI service providers
    await aiService.refreshProviders();
    
    // Return without API key
    const providerResponse = await AIProvider.findById(provider._id).select('-api_key');
    
    res.status(201).json({
      success: true,
      message: 'AI provider created successfully',
      data: providerResponse
    });
  } catch (error) {
    console.error('Create AI provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update AI provider
// @route   PUT /api/ai-providers/:id
// @access  Private (Admin)
router.put('/:id', protect, async (req, res) => {
  try {
    const provider = await AIProvider.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'AI provider not found'
      });
    }

    const updatedProvider = await AIProvider.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-api_key');

    // Refresh AI service providers
    await aiService.refreshProviders();

    res.json({
      success: true,
      message: 'AI provider updated successfully',
      data: updatedProvider
    });
  } catch (error) {
    console.error('Update AI provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete AI provider
// @route   DELETE /api/ai-providers/:id
// @access  Private (Admin)
// router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
//   try {
//     const provider = await AIProvider.findById(req.params.id);
    
//     if (!provider) {
//       return res.status(404).json({
//         success: false,
//         message: 'AI provider not found'
//       });
//     }

//     await AIProvider.findByIdAndDelete(req.params.id);

//     // Refresh AI service providers
//     await aiService.refreshProviders();

//     res.json({
//       success: true,
//       message: 'AI provider deleted successfully'
//     });
//   } catch (error) {
//     console.error('Delete AI provider error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// });
// @desc    Delete AI provider
// @route   DELETE /api/ai-providers/:id
// @access  Private (Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const provider = await AIProvider.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'AI provider not found'
      });
    }

    // Delete all child AI models associated with the provider
    await AIModel.deleteMany({ ai_provider_id: provider._id });

    // Delete the AI provider
    await AIProvider.findByIdAndDelete(req.params.id);

    // Refresh AI service providers
    await aiService.refreshProviders();

    res.json({
      success: true,
      message: 'AI provider and associated models deleted successfully'
    });
  } catch (error) {
    console.error('Delete AI provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Toggle AI provider status
// @route   PATCH /api/ai-providers/:id/toggle
// @access  Private (Admin)
// router.patch('/:id/toggle', protect, authorize('Admin'), async (req, res) => {
//   try {
//     const provider = await AIProvider.findById(req.params.id);
    
//     if (!provider) {
//       return res.status(404).json({
//         success: false,
//         message: 'AI provider not found'
//       });
//     }

//     provider.is_active = !provider.is_active;
//     await provider.save();

//     // Refresh AI service providers
//     await aiService.refreshProviders();

//     res.json({
//       success: true,
//       message: `AI provider ${provider.is_active ? 'activated' : 'deactivated'} successfully`,
//       data: { is_active: provider.is_active }
//     });
//   } catch (error) {
//     console.error('Toggle AI provider error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// });

// @desc    Toggle AI provider status
// @route   PATCH /api/ai-providers/:id/toggle
// @access  Private (Admin)
router.patch('/:id/toggle', protect, async (req, res) => {
  try {
    const provider = await AIProvider.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'AI provider not found'
      });
    }

    provider.is_active = !provider.is_active;
    await provider.save();

    // Update child AI models
    const models = await AIModel.find({ ai_provider_id: provider._id });
    models.forEach(model => {
      model.is_active = provider.is_active;
      model.save();
    });

    // Refresh AI service providers
    await aiService.refreshProviders();

    res.json({
      success: true,
      message: `AI provider ${provider.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { is_active: provider.is_active }
    });
  } catch (error) {
    console.error('Toggle AI provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Test AI provider connection
// @route   POST /api/ai-providers/:id/test
// @access  Private (Admin)
router.post('/:id/test', protect, async (req, res) => {
  try {
    const provider = await AIProvider.findById(req.params.id).select('+api_key');
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'AI provider not found'
      });
    }

    if (!provider.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Provider is not active'
      });
    }

    // Test the provider with a simple prompt
    const testPrompt = 'Say "Hello, this is a test connection."';
    const systemPrompt = 'You are a helpful assistant. Respond exactly as requested.';

    try {
      const response = await aiService.generateResponse(testPrompt, systemPrompt, provider.name);
      
      res.json({
        success: true,
        message: 'AI provider connection test successful',
        data: {
          provider: response.provider,
          model: response.model,
          response: response.response,
          test_time: new Date().toISOString()
        }
      });
    } catch (testError) {
      res.status(400).json({
        success: false,
        message: 'AI provider connection test failed',
        error: testError.message
      });
    }
  } catch (error) {
    console.error('Test AI provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get AI provider usage statistics
// @route   GET /api/ai-providers/:id/stats
// @access  Private (Admin)
router.get('/:id/stats', protect, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const provider = await AIProvider.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'AI provider not found'
      });
    }

    // Get usage statistics from prompt history
    const PromptHistory = require('../models/PromptHistory');
    
    const stats = await PromptHistory.aggregate([
      {
        $match: {
          api_used: provider.name,
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
          total_cost: { $sum: { $multiply: ['$tokens_used', provider.cost_per_token] } }
        }
      }
    ]);

    // Daily usage breakdown
    const dailyUsage = await PromptHistory.aggregate([
      {
        $match: {
          api_used: provider.name,
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
          successful: { $sum: { $cond: ['$success', 1, 0] } }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        provider: {
          name: provider.name,
          display_name: provider.display_name,
          model: provider.model,
          is_active: provider.is_active
        },
        period_stats: stats[0] || {
          total_requests: 0,
          total_tokens: 0,
          successful_requests: 0,
          failed_requests: 0,
          avg_response_time: 0,
          total_cost: 0
        },
        daily_usage: dailyUsage,
        period_days: days
      }
    });
  } catch (error) {
    console.error('Get AI provider stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

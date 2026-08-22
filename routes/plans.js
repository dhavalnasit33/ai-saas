const express = require('express');
const Plan = require('../models/Plan');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all plans
// @route   GET /api/plans
// @access  Public
router.get('/', async (req, res) => {
  try {
    const plans = await Plan.find({ is_active: true }).sort({ price: 1 });
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get plan by ID
// @route   GET /api/plans/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    if (!plan.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Plan is not available'
      });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create new plan
// @route   POST /api/plans
// @access  Private (Admin only)
router.post('/', protect, authorize('Admin'), async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan
    });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update plan
// @route   PUT /api/plans/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    const updatedPlan = await Plan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: updatedPlan
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete plan
// @route   DELETE /api/plans/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    await Plan.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Toggle plan status
// @route   PATCH /api/plans/:id/toggle
// @access  Private (Admin only)
router.patch('/:id/toggle', protect, authorize('Admin'), async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    plan.is_active = !plan.is_active;
    await plan.save();

    res.json({
      success: true,
      message: `Plan ${plan.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { is_active: plan.is_active }
    });
  } catch (error) {
    console.error('Toggle plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
const express = require('express');

const { validateSetting } = require('../middleware/validation');
const { handleValidationErrors } = require('../middleware/validation');
const { protect, authorize } = require('../middleware/auth');
const Setting = require('../models/Setting');

const router = express.Router();

// GET all settings
router.get('/', protect, async (req, res) => {
  try {
    const settings = await Setting.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET single setting by key
router.get('/:key', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key }).lean();
    if (!setting) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }
    res.json({ success: true, data: setting });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// CREATE a new setting
router.post('/', protect, authorize('admin'), validateSetting, handleValidationErrors, async (req, res) => {
  try {
    const { key, value, description } = req.body;
    const exists = await Setting.findOne({ key });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Setting key already exists' });
    }
    const setting = await Setting.create({ key, value, description });
    res.status(201).json({ success: true, data: setting, message: 'Setting created successfully' });
  } catch (error) {
    console.error('Create setting error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// UPDATE or CREATE a setting by key
router.put('/:key', protect, authorize('admin'), validateSetting, handleValidationErrors, async (req, res) => {
  try {
    const { value, description } = req.body;

    const setting = await Setting.findOneAndUpdate(
      { key: req.params.key },          
      { value, description },           
      { 
        new: true,                      
        upsert: true,                  
        setDefaultsOnInsert: true    
      }
    );

    const message = setting.wasNew
      ? 'Setting created successfully'
      : 'Setting updated successfully';

    res.json({ success: true, data: setting, message });
  } catch (error) {
    console.error('Upsert setting error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// DELETE a setting by key
router.delete('/:key', protect, authorize('admin'), async (req, res) => {
  try {
    const setting = await Setting.findOneAndDelete({ key: req.params.key });
    if (!setting) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }
    res.json({ success: true, message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

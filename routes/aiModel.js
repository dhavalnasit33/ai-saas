const express = require("express")
const AIModel = require("../models/AIModel")
const AIProvider = require("../models/AIProvider")
const { protect, authorize } = require("../middleware/auth")
const { validateAIModel, handleValidationErrors } = require("../middleware/validation")

const router = express.Router()


// @desc    Get AI model by provider name and model name
// @route   GET /api/ai-models/provider/:provider_name/model/:model_name
// @access  Private (Admin)
router.get("/provider/:provider_name/model/:model_name", protect, async (req, res) => {
  try {
    const { provider_name, model_name } = req.params
    
    console.log("🚀 ~ provider_name:", provider_name)
    console.log("🚀 ~ model_name:", model_name)

    // Find provider by name
    const provider = await AIProvider.findOne({ name: provider_name })
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "AI provider not found",
      })
    }

    // Find model by provider ID and model name
    const model = await AIModel.findOne({
      ai_provider_id: provider._id,
      model: model_name,
    }).populate("ai_provider_id", "name display_name base_url")

    if (!model) {
      return res.status(404).json({
        success: false,
        message: "AI model not found",
      })
    }

    res.json({
      success: true,
      data: model,
    })
  } catch (error) {
    console.error("Get AI model by provider and model name error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})

// @desc    Get all AI models
// @route   GET /api/ai-models
// @access  Private (Admin)
router.get("/", protect, async (req, res) => {
  try {
    const { provider_id, active_only = false } = req.query

    const query = {}
    if (provider_id) query.ai_provider_id = provider_id
    if (active_only === "true") query.is_active = true

    const models = await AIModel.find(query)
      .populate("ai_provider_id", "name display_name is_active image description")
      .sort({ ai_provider_id: 1, model: 1 })

    res.json({
      success: true,
      data: models,
    })
  } catch (error) {
    console.error("Get AI models error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})

// @desc    Get AI model by ID
// @route   GET /api/ai-models/:id
// @access  Private (Admin)
router.get("/:id", protect, async (req, res) => {
  try {
    const model = await AIModel.findById(req.params.id).populate("ai_provider_id", "name display_name base_url")

    if (!model) {
      return res.status(404).json({
        success: false,
        message: "AI model not found",
      })
    }

    res.json({
      success: true,
      data: model,
    })
  } catch (error) {
    console.error("Get AI model error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})

// @desc    Create AI model
// @route   POST /api/ai-models
// @access  Private (Admin)
router.post("/", protect, validateAIModel, handleValidationErrors, async (req, res) => {
  try {
    // Verify provider exists
    const provider = await AIProvider.findById(req.body.ai_provider_id)
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "AI provider not found",
      })
    }

    const model = await AIModel.create(req.body)

    await model.populate("ai_provider_id", "name display_name")

    res.status(201).json({
      success: true,
      message: "AI model created successfully",
      data: model,
    })
  } catch (error) {
    console.error("Create AI model error:", error)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Model already exists for this provider",
      })
    }
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})

// @desc    Update AI model
// @route   PUT /api/ai-models/:id
// @access  Private (Admin)
router.put("/:id", protect, async (req, res) => {
  try {
    const model = await AIModel.findById(req.params.id)

    if (!model) {
      return res.status(404).json({
        success: false,
        message: "AI model not found",
      })
    }

    // Verify provider exists if being updated
    if (req.body.ai_provider_id) {
      const provider = await AIProvider.findById(req.body.ai_provider_id)
      if (!provider) {
        return res.status(404).json({
          success: false,
          message: "AI provider not found",
        })
      }
    }

    const updatedModel = await AIModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("ai_provider_id", "name display_name")

    res.json({
      success: true,
      message: "AI model updated successfully",
      data: updatedModel,
    })
  } catch (error) {
    console.error("Update AI model error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})

// @desc    Delete AI model
// @route   DELETE /api/ai-models/:id
// @access  Private (Admin)
router.delete("/:id", protect, async (req, res) => {
  try {
    const model = await AIModel.findById(req.params.id)

    if (!model) {
      return res.status(404).json({
        success: false,
        message: "AI model not found",
      })
    }

    await AIModel.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "AI model deleted successfully",
    })
  } catch (error) {
    console.error("Delete AI model error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})

// @desc    Toggle AI model status
// @route   PATCH /api/ai-models/:id/toggle
// @access  Private (Admin)
router.patch("/:id/toggle", protect, async (req, res) => {
  try {
    const model = await AIModel.findById(req.params.id)

    if (!model) {
      return res.status(404).json({
        success: false,
        message: "AI model not found",
      })
    }

    model.is_active = !model.is_active
    await model.save()

    res.json({
      success: true,
      message: `AI model ${model.is_active ? "activated" : "deactivated"} successfully`,
      data: { is_active: model.is_active },
    })
  } catch (error) {
    console.error("Toggle AI model error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})

// @desc    Get models by provider
// @route   GET /api/ai-models/provider/:providerId
// @access  Private (Admin)
router.get("/provider/:providerId", protect, async (req, res) => {
  try {
    const models = await AIModel.find({
      ai_provider_id: req.params.providerId,
      is_active: true,
    }).sort({ display_name: 1 })

    res.json({
      success: true,
      data: models,
    })
  } catch (error) {
    console.error("Get models by provider error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})

module.exports = router

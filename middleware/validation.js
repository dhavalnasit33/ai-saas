// // // // const { body, validationResult } = require('express-validator');

// // // // // Handle validation errors
// // // // exports.handleValidationErrors = (req, res, next) => {
// // // //   const errors = validationResult(req);
// // // //   if (!errors.isEmpty()) {
// // // //     return res.status(400).json({
// // // //       success: false,
// // // //       message: 'Validation failed',
// // // //       errors: errors.array()
// // // //     });
// // // //   }
// // // //   next();
// // // // };

// // // // // User registration validation
// // // // exports.validateRegister = [
// // // //   body('name')
// // // //     .trim()
// // // //     .isLength({ min: 2, max: 50 })
// // // //     .withMessage('Name must be between 2 and 50 characters'),
// // // //   body('email')
// // // //     .isEmail()
// // // //     .normalizeEmail()
// // // //     .withMessage('Please provide a valid email'),
// // // //   body('password')
// // // //     .isLength({ min: 6 })
// // // //     .withMessage('Password must be at least 6 characters')
// // // //     .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
// // // //     .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
// // // // ];

// // // // // User login validation
// // // // exports.validateLogin = [
// // // //   body('email')
// // // //     .isEmail()
// // // //     .normalizeEmail()
// // // //     .withMessage('Please provide a valid email'),
// // // //   body('password')
// // // //     .notEmpty()
// // // //     .withMessage('Password is required')
// // // // ];

// // // // // Tool category validation
// // // // // exports.validateToolCategory = [
// // // // //   body('name')
// // // // //     .trim()
// // // // //     .isLength({ min: 2, max: 100 })
// // // // //     .withMessage('Name must be between 2 and 100 characters'),
// // // // //   body('description')
// // // // //     .optional()
// // // // //     .isLength({ max: 500 })
// // // // //     .withMessage('Description cannot exceed 500 characters'),
// // // // //   body('system_prompt')
// // // // //     .isLength({ min: 10, max: 2000 })
// // // // //     .withMessage('System prompt must be between 10 and 2000 characters'),
// // // // //   body('category')
// // // // //     .isIn(['content', 'code', 'business', 'creative', 'analysis'])
// // // // //     .withMessage('Invalid category'),
// // // // //   body('tokens_per_use')
// // // // //     .optional()
// // // // //     .isInt({ min: 1 })
// // // // //     .withMessage('Tokens per use must be at least 1')
// // // // // ];
// // // // exports.validateToolCategory = [
// // // //   body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Name must be between 1 and 100 characters"),
// // // //   body("description").optional().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
// // // //   body("system_prompt")
// // // //     .isLength({ min: 1, max: 2000 })
// // // //     .withMessage("System prompt must be between 1 and 2000 characters"),
// // // //   body("category").isIn(["content", "code", "business", "creative", "analysis"]).withMessage("Invalid category"),
// // // //   body("tokens_per_use").optional().isInt({ min: 1 }).withMessage("Tokens per use must be at least 1"),
// // // //   body("is_active").optional().isBoolean().withMessage("is_active must be a boolean"),
// // // // ]

// // // // // Tool validation
// // // // exports.validateTool = [
// // // //   body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Name must be between 1 and 100 characters"),
// // // //   body("description").optional().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
// // // //   body("category_id").isMongoId().withMessage("Invalid category ID"),
// // // //   body("system_prompt_template")
// // // //     .isLength({ min: 1, max: 3000 })
// // // //     .withMessage("System prompt template must be between 1 and 3000 characters"),
// // // //   body("tabs").isArray().withMessage("Tabs must be an array"),
// // // //   body("tabs.*.title").isLength({ min: 1 }).withMessage("Tab title is required"),
// // // //   body("tabs.*.fields").isArray().withMessage("Tab fields must be an array"),
// // // //   body("tabs.*.fields.*.key").isLength({ min: 1 }).withMessage("Field key is required"),
// // // //   body("tabs.*.fields.*.label").isLength({ min: 1 }).withMessage("Field label is required"),
// // // //   body("tabs.*.fields.*.type")
// // // //     .isIn(["textbox", "textarea", "dropdown", "radio", "checkbox", "imageupload", "fileupload", "number", "date"])
// // // //     .withMessage("Invalid field type"),
// // // //   body("tokens_per_use").optional().isInt({ min: 1 }).withMessage("Tokens per use must be at least 1"),
// // // //   body("is_active").optional().isBoolean().withMessage("is_active must be a boolean"),
// // // // ]

// // // // // Prompt validation
// // // // // exports.validatePrompt = [
// // // // //   body('prompt')
// // // // //     .trim()
// // // // //     .isLength({ min: 1, max: 5000 })
// // // // //     .withMessage('Prompt must be between 1 and 5000 characters'),
// // // // //   body('tool_category_id')
// // // // //     .isMongoId()
// // // // //     .withMessage('Invalid tool category ID')
// // // // // ];
// // // // // exports.validatePrompt = [
// // // // //   body('prompt')
// // // // //     .isString()
// // // // //     .withMessage('Prompt is required')
// // // // //     .isLength({ min: 3 })
// // // // //     .withMessage('Prompt must be at least 3 characters'),
// // // // // ];
// // // // exports.validatePrompt = [
// // // //   body("prompt").optional().isLength({ min: 1, max: 5000 }).withMessage("Prompt must be between 1 and 5000 characters"),
// // // //   body("formData").optional().isObject().withMessage("Form data must be an object"),
// // // // ]
// // // // // AI Provider validation
// // // // // exports.validateAIProvider = [
// // // // //   body('name')
// // // // //     .isIn(['openai', 'deepseek'])
// // // // //     .withMessage('Invalid provider name'),
// // // // //   body('display_name')
// // // // //     .trim()
// // // // //     .isLength({ min: 2, max: 50 })
// // // // //     .withMessage('Display name must be between 2 and 50 characters'),
// // // // //   body('api_key')
// // // // //     .notEmpty()
// // // // //     .withMessage('API key is required'),
// // // // //   body('model')
// // // // //     .notEmpty()
// // // // //     .withMessage('Model is required'),
// // // // //   body('base_url')
// // // // //     .isURL()
// // // // //     .withMessage('Base URL must be a valid URL'),
// // // // //   body('max_tokens')
// // // // //     .optional()
// // // // //     .isInt({ min: 1 })
// // // // //     .withMessage('Max tokens must be at least 1')
// // // // // ];
// // // // exports.validateAIProvider = [
// // // //   body("name").isIn(["openai", "deepseek"]).withMessage("Invalid provider name"),
// // // //   body("display_name").isLength({ min: 1 }).withMessage("Display name is required"),
// // // //   body("api_key").isLength({ min: 1 }).withMessage("API key is required"),
// // // //   body("model").isLength({ min: 1 }).withMessage("Model is required"),
// // // //   body("base_url").isURL().withMessage("Base URL must be a valid URL"),
// // // //   body("max_tokens").optional().isInt({ min: 1 }).withMessage("Max tokens must be at least 1"),
// // // //   body("is_active").optional().isBoolean().withMessage("is_active must be a boolean"),
// // // // ]

// // // // // const handleValidationErrors = (req, res, next) => {
// // // // //   const errors = validationResult(req)
// // // // //   if (!errors.isEmpty()) {
// // // // //     return res.status(400).json({
// // // // //       success: false,
// // // // //       message: "Validation failed",
// // // // //       errors: errors.array(),
// // // // //     })
// // // // //   }
// // // // //   next()
// // // // // }

// // // // // module.exports = {
// // // // //   handleValidationErrors,
// // // // // }
// // // const { body, validationResult } = require("express-validator")

// // // // Handle validation errors
// // // exports.handleValidationErrors = (req, res, next) => {
// // //   const errors = validationResult(req)
// // //   if (!errors.isEmpty()) {
// // //     return res.status(400).json({
// // //       success: false,
// // //       message: "Validation failed",
// // //       errors: errors.array(),
// // //     })
// // //   }
// // //   next()
// // // }

// // // // Tool category validation
// // // exports.validateToolCategory = [
// // //   body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Name must be between 1 and 100 characters"),
// // //   body("description").optional().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
// // //   body("system_prompt")
// // //     .isLength({ min: 1, max: 2000 })
// // //     .withMessage("System prompt must be between 1 and 2000 characters"),
// // //   body("category").isIn(["content", "code", "business", "creative", "analysis"]).withMessage("Invalid category"),
// // //   body("tokens_per_use").optional().isInt({ min: 1 }).withMessage("Tokens per use must be at least 1"),
// // //   body("is_active").optional().isBoolean().withMessage("is_active must be a boolean"),
// // // ]

// // // // Enhanced Tool validation with tabs and suggested topics
// // // exports.validateTool = [
// // //   body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Name must be between 1 and 100 characters"),
// // //   body("description").optional().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
// // //   body("category_id").isMongoId().withMessage("Invalid category ID"),
// // //   body("system_prompt_template")
// // //     .isLength({ min: 1, max: 3000 })
// // //     .withMessage("System prompt template must be between 1 and 3000 characters"),

// // //   // Tabs validation
// // //   body("tabs")
// // //     .isArray()
// // //     .withMessage("Tabs must be an array"),
// // //   body("tabs.*.title").isLength({ min: 1 }).withMessage("Tab title is required"),
// // //   body("tabs.*.prompt_template")
// // //     .isLength({ min: 1, max: 2000 })
// // //     .withMessage("Tab prompt template is required and cannot exceed 2000 characters"),
// // //   body("tabs.*.fields").isArray().withMessage("Tab fields must be an array"),
// // //   body("tabs.*.fields.*.key").isLength({ min: 1 }).withMessage("Field key is required"),
// // //   body("tabs.*.fields.*.label").isLength({ min: 1 }).withMessage("Field label is required"),
// // //   body("tabs.*.fields.*.description")
// // //     .optional()
// // //     .isLength({ max: 200 })
// // //     .withMessage("Field description cannot exceed 200 characters"),
// // //   body("tabs.*.fields.*.type")
// // //     .isIn(["textbox", "textarea", "dropdown", "radio", "checkbox", "imageupload", "fileupload", "number", "date"])
// // //     .withMessage("Invalid field type"),

// // //   // Suggested topics validation
// // //   body("suggested_topics")
// // //     .optional()
// // //     .isArray()
// // //     .withMessage("Suggested topics must be an array"),
// // //   body("suggested_topics.*.title").isLength({ min: 1 }).withMessage("Suggested topic title is required"),
// // //   body("suggested_topics.*.prompt_template")
// // //     .isLength({ min: 1, max: 1000 })
// // //     .withMessage("Suggested topic prompt template is required and cannot exceed 1000 characters"),
// // //   body("suggested_topics.*.has_input").optional().isBoolean().withMessage("has_input must be a boolean"),
// // //   body("suggested_topics.*.input_placeholder")
// // //     .optional()
// // //     .isLength({ max: 100 })
// // //     .withMessage("Input placeholder cannot exceed 100 characters"),

// // //   body("tokens_per_use").optional().isInt({ min: 1 }).withMessage("Tokens per use must be at least 1"),
// // //   body("is_active").optional().isBoolean().withMessage("is_active must be a boolean"),
// // // ]

// // // // Other existing validations remain the same
// // // exports.validateRegister = [
// // //   body("name").trim().isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
// // //   body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
// // //   body("password")
// // //     .isLength({ min: 6 })
// // //     .withMessage("Password must be at least 6 characters")
// // //     .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
// // //     .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
// // // ]

// // // exports.validateLogin = [
// // //   body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
// // //   body("password").notEmpty().withMessage("Password is required"),
// // // ]

// // // exports.validatePrompt = [
// // //   body("prompt").optional().isLength({ min: 1, max: 5000 }).withMessage("Prompt must be between 1 and 5000 characters"),
// // //   body("formData").optional().isObject().withMessage("Form data must be an object"),
// // // ]

// // // exports.validateAIProvider = [
// // //   body("name").isIn(["openai", "deepseek"]).withMessage("Invalid provider name"),
// // //   body("display_name").isLength({ min: 1 }).withMessage("Display name is required"),
// // //   body("api_key").isLength({ min: 1 }).withMessage("API key is required"),
// // //   body("model").isLength({ min: 1 }).withMessage("Model is required"),
// // //   body("base_url").isURL().withMessage("Base URL must be a valid URL"),
// // //   body("max_tokens").optional().isInt({ min: 1 }).withMessage("Max tokens must be at least 1"),
// // //   body("is_active").optional().isBoolean().withMessage("is_active must be a boolean"),
// // // ]
// // const { body, validationResult } = require("express-validator")

// // // Handle validation errors
// // exports.handleValidationErrors = (req, res, next) => {
// //   const errors = validationResult(req)
// //   if (!errors.isEmpty()) {
// //     return res.status(400).json({
// //       success: false,
// //       message: "Validation failed",
// //       errors: errors.array(),
// //     })
// //   }
// //   next()
// // }

// // // Tool category validation - removed tokens_per_use
// // exports.validateToolCategory = [
// //   body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Name must be between 1 and 100 characters"),
// //   body("description").optional().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
// //   body("system_prompt")
// //     .isLength({ min: 1, max: 2000 })
// //     .withMessage("System prompt must be between 1 and 2000 characters"),
// //   body("category").isIn(["content", "code", "business", "creative", "analysis"]).withMessage("Invalid category"),
// //   body("is_active").optional().isBoolean().withMessage("is_active must be a boolean"),
// // ]

// // // Enhanced Tool validation - removed tokens_per_use, added ai_provider, updated suggested_topics
// // exports.validateTool = [
// //   body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Name must be between 1 and 100 characters"),
// //   body("description").optional().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
// //   body("icon")
// //   .optional()
// //   .isString()
// //   .isLength({ max: 1000 })
// //   .withMessage("Icon must be a string and cannot exceed 1000 characters"),
// //   body("category_id").isMongoId().withMessage("Invalid category ID"),
// //   body("ai_provider").isMongoId().withMessage("Invalid AI provider ID"),
// //   body("system_prompt_template")
// //     .isLength({ min: 1, max: 3000 })
// //     .withMessage("System prompt template must be between 1 and 3000 characters"),

// //   // Tabs validation
// //   body("tabs")
// //     .isArray()
// //     .withMessage("Tabs must be an array"),
// //   body("tabs.*.title").isLength({ min: 1 }).withMessage("Tab title is required"),
// //   body("tabs.*.prompt_template")
// //     .isLength({ min: 1, max: 2000 })
// //     .withMessage("Tab prompt template is required and cannot exceed 2000 characters"),
// //   body("tabs.*.fields").isArray().withMessage("Tab fields must be an array"),
// //   body("tabs.*.fields.*.key").isLength({ min: 1 }).withMessage("Field key is required"),
// //   body("tabs.*.fields.*.label").isLength({ min: 1 }).withMessage("Field label is required"),
// //   body("tabs.*.fields.*.description")
// //     .optional()
// //     .isLength({ max: 200 })
// //     .withMessage("Field description cannot exceed 200 characters"),
// //   body("tabs.*.fields.*.type")
// //     .isIn(["textbox", "textarea", "dropdown", "radio", "checkbox", "imageupload", "fileupload", "number", "date"])
// //     .withMessage("Invalid field type"),

// //   // Updated suggested topics validation - removed prompt_template
// //   body("suggested_topics")
// //   .optional()
// //   .isArray()
// //   .withMessage("Suggested topics must be an array"),
// // body("suggested_topics.*.title")
// //   .isLength({ min: 1, max: 500 })
// //   .withMessage("Suggested topic title is required and cannot exceed 500 characters"),
// // // body("suggested_topics.*.prompt_template")
// // //   .optional() // Make prompt_template optional
// // //   .isLength({ max: 1000 })
// // //   .withMessage("Suggested topic prompt template cannot exceed 1000 characters"),
// // body("suggested_topics.*.has_input")
// //   .optional()
// //   .isBoolean()
// //   .withMessage("has_input must be a boolean"),
// // body("suggested_topics.*.input_placeholder")
// //   .optional()
// //   .isLength({ max: 100 })
// //   .withMessage("Input placeholder cannot exceed 100 characters"),

// //   body("is_active").optional().isBoolean().withMessage("is_active must be a boolean"),
// // ]

// // // Other existing validations
// // exports.validateRegister = [
// //   body("name").trim().isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
// //   body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
// //   body("password")
// //     .isLength({ min: 6 })
// //     .withMessage("Password must be at least 6 characters")
// //     .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
// //     .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
// // ]

// // exports.validateLogin = [
// //   body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
// //   body("password").notEmpty().withMessage("Password is required"),
// // ]

// // exports.validatePrompt = [
// //   body("prompt").optional().isLength({ min: 1, max: 5000 }).withMessage("Prompt must be between 1 and 5000 characters"),
// //   body("formData").optional().isObject().withMessage("Form data must be an object"),
// // ]

// // exports.validateAIProvider = [
// //   body("name").isIn(["openai", "deepseek"]).withMessage("Invalid provider name"),
// //   body("display_name").isLength({ min: 1 }).withMessage("Display name is required"),
// //   body("api_key").isLength({ min: 1 }).withMessage("API key is required"),
// //   body("model").isLength({ min: 1 }).withMessage("Model is required"),
// //   body("base_url").isURL().withMessage("Base URL must be a valid URL"),
// //   body("max_tokens").optional().isInt({ min: 1 }).withMessage("Max tokens must be at least 1"),
// //   body("is_active").optional().isBoolean().withMessage("is_active must be a boolean"),
// // ]
// const { body, validationResult } = require("express-validator")

// // Handle validation errors
// exports.handleValidationErrors = (req, res, next) => {
//   const errors = validationResult(req)
//   if (!errors.isEmpty()) {
//     return res.status(400).json({
//       success: false,
//       message: "Validation failed",
//       errors: errors.array(),
//     })
//   }
//   next()
// }

// // Chat creation validation
// exports.validateChatCreation = [
//   // body("title").optional().isLength({ min: 1, max: 200 }).withMessage("Title must be between 1 and 200 characters"),
//   body("tags").optional().isArray().withMessage("Tags must be an array"),
//   body("tags.*").optional().isLength({ max: 50 }).withMessage("Each tag cannot exceed 50 characters"),
// ]

// // Message addition validation
// exports.validateMessageAdd = [
//   body("type").isIn(["user", "assistant"]).withMessage("Message type must be user or assistant"),
//   body("metadata").optional().isObject().withMessage("Metadata must be an object"),
// ]

// // Chat update validation
// exports.validateChatUpdate = [
//   // body("title").optional().isLength({ min: 1, max: 200 }).withMessage("Title must be between 1 and 200 characters"),
//   body("tags").optional().isArray().withMessage("Tags must be an array"),
//   body("is_favorite").optional().isBoolean().withMessage("is_favorite must be a boolean"),
//   body("is_archived").optional().isBoolean().withMessage("is_archived must be a boolean"),
// ]

// // AI Provider validation (updated)
// exports.validateAIProvider = [
//   body("name")
//     .isIn(["openai", "deepseek", "anthropic", "perplexity", "xai", "groq", "google"])
//     .withMessage("Invalid provider name"),
//   body("display_name").isLength({ min: 1 }).withMessage("Display name is required"),
//   body("api_key").isLength({ min: 1 }).withMessage("API key is required"),
//   body("base_url").isURL().withMessage("Base URL must be a valid URL"),
//   body("max_tokens").optional().isInt({ min: 1 }).withMessage("Max tokens must be at least 1"),
//   body("is_active").optional().isBoolean().withMessage("is_active must be a boolean"),
// ]

// // AI Model validation (new)
// exports.validateAIModel = [
//   body("ai_provider_id").isMongoId().withMessage("Invalid AI Provider ID"),
//   body("model").isLength({ min: 1 }).withMessage("Model name is required"),
//   body("requests_per_minute").optional().isInt({ min: 1 }).withMessage("Requests per minute must be at least 1"),
//   body("tokens_per_minute").optional().isInt({ min: 1 }).withMessage("Tokens per minute must be at least 1"),
//   body("cost_per_token").optional().isFloat({ min: 0 }).withMessage("Cost per token must be non-negative"),
//   body("is_active").optional().isBoolean().withMessage("is_active must be a boolean"),
//   body("capabilities.text_generation").optional().isBoolean().withMessage("text_generation must be a boolean"),
//   body("capabilities.image_input").optional().isBoolean().withMessage("image_input must be a boolean"),
//   body("capabilities.function_calling").optional().isBoolean().withMessage("function_calling must be a boolean"),
//   body("capabilities.streaming").optional().isBoolean().withMessage("streaming must be a boolean"),
// ]

// // Tool validation (updated)
// exports.validateTool = [
//   body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Name must be between 1 and 100 characters"),
//   body("description").optional().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
//   body("icon")
//     .optional()
//     .isString()
//     .isLength({ max: 1000 })
//     .withMessage("Icon must be a string and cannot exceed 1000 characters"),
//   body("category_id").isMongoId().withMessage("Invalid category ID"),
//   body("ai_model_id")
//     .isMongoId()
//     .withMessage("Invalid AI model ID"), // Changed from ai_provider
//   body("system_prompt_template")
//     .isLength({ min: 1, max: 3000 })
//     .withMessage("System prompt template must be between 1 and 3000 characters"),

//   // Tabs validation
//   body("tabs")
//     .isArray()
//     .withMessage("Tabs must be an array"),
//   body("tabs.*.title").isLength({ min: 1 }).withMessage("Tab title is required"),
//   body("tabs.*.prompt_template")
//     .isLength({ min: 1, max: 2000 })
//     .withMessage("Tab prompt template is required and cannot exceed 2000 characters"),
//   body("tabs.*.fields").isArray().withMessage("Tab fields must be an array"),
//   body("tabs.*.fields.*.key").isLength({ min: 1 }).withMessage("Field key is required"),
//   body("tabs.*.fields.*.label").isLength({ min: 1 }).withMessage("Field label is required"),
//   body("tabs.*.fields.*.description")
//     .optional()
//     .isLength({ max: 200 })
//     .withMessage("Field description cannot exceed 200 characters"),
//   body("tabs.*.fields.*.type")
//     .isIn(["textbox", "textarea", "dropdown", "radio", "checkbox", "imageupload", "fileupload", "number", "date"])
//     .withMessage("Invalid field type"),

//   // Suggested topics validation
//   body("suggested_topics")
//     .optional()
//     .isArray()
//     .withMessage("Suggested topics must be an array"),
//   body("suggested_topics.*.title")
//     .isLength({ min: 1, max: 500 })
//     .withMessage("Suggested topic title is required and cannot exceed 500 characters"),
//   body("suggested_topics.*.has_input").optional().isBoolean().withMessage("has_input must be a boolean"),
//   body("suggested_topics.*.input_placeholder")
//     .optional()
//     .isLength({ max: 100 })
//     .withMessage("Input placeholder cannot exceed 100 characters"),

//   body("is_active").optional().isBoolean().withMessage("is_active must be a boolean"),
// ]

// // Other existing validations remain the same
// exports.validateRegister = [

//   body("name").trim().isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
//   body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
//   body("password")
//     .isLength({ min: 6 })
//     .withMessage("Password must be at least 6 characters")
//     .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
//     .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number")
// ]

// exports.validateGoogleAuth = [
//   body("idToken").notEmpty().withMessage("Google ID token is required"),
//   body("deviceInfo").optional().isObject().withMessage("Device info must be an object"),
//   body("deviceInfo.region").optional().isString().withMessage("Region must be a string"),
// ]

// exports.validateLogin = [
//   body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
//   body("password").notEmpty().withMessage("Password is required"),
// ]

// exports.validatePrompt = [
//   body("prompt").optional().isLength({ min: 1, max: 5000 }).withMessage("Prompt must be between 1 and 5000 characters"),
//   body("formData").optional().isObject().withMessage("Form data must be an object"),
// ]

// exports.validateToolCategory = [
//   body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Name must be between 1 and 100 characters"),
//   body("description").optional().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
//   body("system_prompt")
//     .isLength({ min: 1, max: 2000 })
//     .withMessage("System prompt must be between 1 and 2000 characters"),
//   body("category").isIn(["content", "code", "business", "creative", "analysis"]).withMessage("Invalid category"),
//   body("is_active").optional().isBoolean().withMessage("is_active must be a boolean"),
// ]
const { body, validationResult } = require("express-validator");

// Handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Validation for AdminUser role assignment and update
exports.validateAdminUserAssignRole = [
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isMongoId()
    .withMessage("Role must be a valid Mongo ID"),
];

exports.validateAdminUserUpdate = [
  body("role")
    .optional()
    .isMongoId()
    .withMessage("Role must be a valid Mongo ID"),
  body("can_edit_roles")
    .optional()
    .isBoolean()
    .withMessage("can_edit_roles must be a boolean"),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

// Handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Validation for RoleAndPermission POST API
exports.validateRoleAndPermission = [
  body("roleName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Role name must be between 1 and 50 characters"),
  body("permissions")
    .optional()
    .isObject()
    .withMessage("Permissions must be an object"),
  body("created_by_user_id")
    .optional()
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("User ID must be a valid Mongo ID"),
];

exports.validateEditRoleAndPermission = [
  body("roleName").trim(),
  body("permissions")
    .optional()
    .isObject()
    .withMessage("Permissions must be an object"),
  body("role_id")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("User ID must be a valid Mongo ID"),
  body("updated_by_user_id")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("User ID must be a valid Mongo ID"),
];

// Chat creation validation
exports.validateChatCreation = [
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Each tag cannot exceed 50 characters"),
];

// Message addition validation
exports.validateMessageAdd = [
  body("type")
    .isIn(["user", "assistant"])
    .withMessage("Message type must be user or assistant"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
];

// Chat update validation
exports.validateChatUpdate = [
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("is_favorite")
    .optional()
    .isBoolean()
    .withMessage("is_favorite must be a boolean"),
  body("is_archived")
    .optional()
    .isBoolean()
    .withMessage("is_archived must be a boolean"),
];

// AI Provider Comparison validation (new)
exports.validateAiComparison = [
  body("modelId").isMongoId().withMessage("Invalid base model (modelId)"),
  body("firstModel")
    .isMongoId()
    .withMessage("Invalid firstModel AI Provider ID"),
  body("secondModel")
    .isMongoId()
    .withMessage("Invalid secondModel AI Provider ID"),
  body("slug")
    .notEmpty()
    .withMessage("Slug is required")
    .isLength({ max: 200 })
    .withMessage("Slug cannot exceed 200 characters"),
  body("keyPhrase")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Focus keyphrase cannot exceed 200 characters"),
  body("title")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),
  // Add this to your validateAiComparison array
  body("short_description")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Short description must not exceed 200 characters"),
  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),
  body("coverImage")
    .optional()
    .isLength({ max: 1000 })
    .withMessage(
      "Cover image must be a string and cannot exceed 1000 characters",
    ),
  body("metaDescription")
    .optional()
    .isLength({ max: 300 })
    .withMessage("Meta Description cannot exceed 300 characters"),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

// AI Provider validation (updated)
exports.validateAIProvider = [
  body("name")
    .isIn([
      "openai",
      "deepseek",
      "anthropic",
      "perplexity",
      "xai",
      "groq",
      "google",
      "meta",
      "kimi",
      "mistral",
      "qwen",
      "minimax",
      "mimo",
      "glm",
      "nemotron",
      "stability",
      "gpt",
      "nanobanana",
      "nanobananapro",
      "gpt_mini",
      "flux",
      "krea",
      "seedream",
      "runway",
      "veo",
      "kling",
      "pika",
      "seedance",
      "minimax_image",
      "wan",
      "pixverse",
      "ideogram",
      "recraft",
      "bernini",
      "muse"
    ])
    .withMessage("Invalid provider name"),
  body("display_name")
    .isLength({ min: 1 })
    .withMessage("Display name is required"),
  body("api_key").isLength({ min: 1 }).withMessage("API key is required"),
  body("base_url").isURL().withMessage("Base URL must be a valid URL"),
  body("max_tokens")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max tokens must be at least 1"),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

// AI Model validation (new)
exports.validateAIModel = [
  body("ai_provider_id").isMongoId().withMessage("Invalid AI Provider ID"),
  body("model").isLength({ min: 1 }).withMessage("Model name is required"),
  body("requests_per_minute")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Requests per minute must be at least 1"),
  body("tokens_per_minute")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Tokens per minute must be at least 1"),
  body("cost_per_token")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Cost per token must be non-negative"),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
  body("capabilities.text_generation")
    .optional()
    .isBoolean()
    .withMessage("text_generation must be a boolean"),
  body("capabilities.image_input")
    .optional()
    .isBoolean()
    .withMessage("image_input must be a boolean"),
  body("capabilities.function_calling")
    .optional()
    .isBoolean()
    .withMessage("function_calling must be a boolean"),
  body("capabilities.streaming")
    .optional()
    .isBoolean()
    .withMessage("streaming must be a boolean"),
];

// Tool validation (updated)
exports.validateTool = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 characters"),
  body("description")
    .optional()
    .isLength({ max: 50000 })
    .withMessage("Description cannot exceed 50000 characters"),
  body("icon")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Icon must be a string and cannot exceed 1000 characters"),
  body("category_id").isMongoId().withMessage("Invalid category ID"),
  body("ai_model_id").isMongoId().withMessage("Invalid AI model ID"),
  body("system_prompt_template")
    .isLength({ min: 1, max: 3000 })
    .withMessage(
      "System prompt template must be between 1 and 3000 characters",
    ),

  // Tabs validation
  body("tabs").isArray().withMessage("Tabs must be an array"),
  body("tabs.*.title")
    .isLength({ min: 1 })
    .withMessage("Tab title is required"),
  body("tabs.*.prompt_template")
    .isLength({ min: 1, max: 2000 })
    .withMessage(
      "Tab prompt template is required and cannot exceed 2000 characters",
    ),
  body("tabs.*.fields").isArray().withMessage("Tab fields must be an array"),
  body("tabs.*.fields.*.key")
    .isLength({ min: 1 })
    .withMessage("Field key is required"),
  body("tabs.*.fields.*.label")
    .isLength({ min: 1 })
    .withMessage("Field label is required"),
  body("tabs.*.fields.*.description")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Field description cannot exceed 200 characters"),
  body("tabs.*.fields.*.type")
    .isIn([
      "textbox",
      "textarea",
      "dropdown",
      "radio",
      "checkbox",
      "imageupload",
      "fileupload",
      "number",
      "date",
    ])
    .withMessage("Invalid field type"),

  // Suggested topics validation
  body("suggested_topics")
    .optional()
    .isArray()
    .withMessage("Suggested topics must be an array"),
  body("suggested_topics.*.title")
    .isLength({ min: 1, max: 500 })
    .withMessage(
      "Suggested topic title is required and cannot exceed 500 characters",
    ),
  body("suggested_topics.*.has_input")
    .optional()
    .isBoolean()
    .withMessage("has_input must be a boolean"),
  body("suggested_topics.*.input_placeholder")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Input placeholder cannot exceed 100 characters"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
  body("seo_keyphrase")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Focus keyphrase cannot exceed 200 characters"),

  body("seo_title")
    .optional()
    .isLength({ max: 200 })
    .withMessage("SEO title cannot exceed 200 characters"),

  body("meta_description")
    .optional()
    .isLength({ max: 300 })
    .withMessage("Meta description cannot exceed 300 characters"),
  body("cover_image")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage(
      "Cover image must be a string and cannot exceed 1000 characters",
    ),

  body("allternativeTools")
    .optional()
    .isArray()
    .withMessage("allternativeTools must be an array"),
  body("allternativeTools.*")
    .optional()
    .isMongoId()
    .withMessage("Each alternative tool must be a valid Mongo ID"),
  body("whatCanDO")
    .optional()
    .isArray()
    .withMessage("whatCanDO must be an array"),
  body("whatCanDO.*")
    .optional()
    .isString()
    .withMessage("whatCanDO must be a string"),
  body("display_name")
    .optional()
    .isString()
    .withMessage("display_name must be a string"),
];

// Other existing validations remain the same
exports.validateRegister = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
];

exports.validateGoogleAuth = [
  body("idToken").notEmpty().withMessage("Google ID token is required"),
  body("deviceInfo")
    .optional()
    .isObject()
    .withMessage("Device info must be an object"),
  body("deviceInfo.region")
    .optional()
    .isString()
    .withMessage("Region must be a string"),
];

exports.validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Updated prompt validation to include optional imageUrl
exports.validatePrompt = [
  body("prompt")
    .optional()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Prompt must be between 1 and 5000 characters"),
  body("formData")
    .optional()
    .isObject()
    .withMessage("Form data must be an object"),
  body("imageUrl")
    .optional()
    .isURL()
    .withMessage("Image URL must be a valid URL"),
];

exports.validateToolCategory = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 characters"),
  body("description")
    .optional()
    .isLength({ max: 50000 })
    .withMessage("Description cannot exceed 50000 characters"),
  body("system_prompt")
    .isLength({ min: 1, max: 2000 })
    .withMessage("System prompt must be between 1 and 2000 characters"),
  // body("category").isIn(["content", "code", "business", "creative", "analysis"]).withMessage("Invalid category"),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

exports.validateContactUser = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 1 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("issueCategory")
    .isLength({ max: 100 })
    .withMessage("issueCategory cannot exceed 50 characters"),
  body("subject")
    .isLength({ max: 100 })
    .withMessage("Subject cannot exceed 100 characters"),
  body("message")
    .isLength({ max: 500 })
    .withMessage("Message cannot exceed 500 characters"),
];

exports.validateYoastSEO = [
  body("seo_keyphrase")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Focus keyphrase cannot exceed 200 characters"),

  body("seo_title")
    .optional()
    .isLength({ max: 200 })
    .withMessage("SEO title cannot exceed 200 characters"),

  body("meta_description")
    .optional()
    .isLength({ max: 300 })
    .withMessage("Meta description cannot exceed 300 characters"),

  body("cover_image")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage(
      "Cover image must be a string and cannot exceed 1000 characters",
    ),

  body("page_description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Page description cannot exceed 1000 characters"),
];

exports.validatePage = [
  body("page_title")
    .notEmpty()
    .withMessage("Page title is required")
    .isLength({ max: 200 })
    .withMessage("Page title cannot exceed 200 characters"),

  body("slug")
    .notEmpty()
    .withMessage("Slug is required")
    .isLength({ max: 200 })
    .withMessage("Slug cannot exceed 200 characters"),

  body("page_description").optional(),

  body("seo_keyphrase")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Focus keyphrase cannot exceed 200 characters"),

  body("seo_title")
    .optional()
    .isLength({ max: 200 })
    .withMessage("SEO title cannot exceed 200 characters"),

  body("meta_description")
    .optional()
    .isLength({ max: 300 })
    .withMessage("Meta description cannot exceed 300 characters"),

  body("cover_image")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Cover image must be a string and max 1000 characters"),
  body("tab_normal_icon_image").optional().isString(),
  body("tab_active_icon_image").optional().isString(),
];
exports.validateTrendingNews = [
  body("title").notEmpty().withMessage("Title is required"),

  body("image").optional().isURL().withMessage("Image must be a valid URL"),

  body("description").notEmpty(),
  body("category_id").isMongoId().withMessage("Invalid category ID"),
];

exports.validateDiscoverRecipe = [
  body("title").notEmpty().withMessage("Title is required"),

  body("slug")
    .optional()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage("Slug must be lowercase letters, numbers, and hyphens only"),

  body("description").optional(),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

exports.validateDiscoverRecipeCollection = [
  body("title").notEmpty().withMessage("Title is required"),

  body("description").optional(),

  body("image")
    .notEmpty()
    .withMessage("Image is required")
    .matches(/^https?:\/\/.+/)
    .withMessage("Image must start with http:// or https://"),

  body("discover_recipes")
    .isArray()
    .withMessage("Discover recipes must be an array")
    .custom((arr) => arr.every((id) => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage("All discover recipe IDs must be valid MongoDB ObjectIds"),

  body("slug")
    .optional()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage(
      "Slug must be URL-friendly (lowercase letters, numbers, hyphens only)",
    ),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

exports.validateSavedRecipe = [
  body("recipeId")
    .notEmpty()
    .withMessage("Recipe ID is required")
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage("Recipe ID must be a valid MongoDB ObjectId"),

  body("aiResponse")
    .optional()
    .isString()
    .withMessage("AI Response must be a string"),
];

const validFieldTypes = [
  "textbox",
  "textarea",
  "dropdown",
  "radio",
  "checkbox",
  "imageupload",
  "fileupload",
  "number",
  "date",
];

// Validation for a single field object
const fieldValidations = [
  body("fields").optional().isArray().withMessage("Fields must be an array"),

  body("fields.*.key")
    .notEmpty()
    .withMessage("Field key is required")
    .isString()
    .withMessage("Field key must be a string"),

  body("fields.*.label")
    .notEmpty()
    .withMessage("Field label is required")
    .isString()
    .withMessage("Field label must be a string"),

  body("fields.*.type")
    .notEmpty()
    .withMessage("Field type is required")
    .isIn(validFieldTypes)
    .withMessage("Invalid field type"),

  body("fields.*.description").optional().isString(),
  body("fields.*.required").optional().isBoolean(),
  body("fields.*.placeholder").optional().isString(),
  body("fields.*.default_value").optional(),
  body("fields.*.options").optional().isArray(),
  body("fields.*.options.*").optional().isString(),
  body("fields.*.prompt").optional().isString(),
];

const commonToolValidations = [
  body("prompt_template")
    .notEmpty()
    .withMessage("Prompt template is required")
    .isString()
    .withMessage("Prompt template must be a string"),

  ...fieldValidations, // reuse shared field rules
];

// ✅ Validate Saved Destination
exports.validateTab = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string"),

  body("prompt_template")
    .notEmpty()
    .withMessage("Prompt template is required")
    .isString()
    .withMessage("Prompt template must be a string"),

  body("suggested_topics")
    .optional()
    .isArray()
    .withMessage("Suggested topics must be an array"),

  body("suggested_topics.*.title")
    .optional()
    .isLength({ min: 1 })
    .withMessage("Suggested topic title is required"),

  body("suggested_topics.*.has_input")
    .optional()
    .isBoolean()
    .withMessage("has_input must be a boolean"),

  body("suggested_topics.*.image")
    .optional()
    .isString()
    .withMessage("Image must be a string"),

  body("suggested_topics.*.sticky")
    .optional()
    .isBoolean()
    .withMessage("sticky must be a boolean"),

  body("seo_title").optional().isString(),
  body("seo_keyphrase").optional().isString(),
  body("meta_description").optional().isString().isLength({ max: 300 }),
  body("cover_image").optional().isString(),
  body("tool_cover_image").optional().isString(),
  body("tab_normal_icon_image").optional().isString(),
  body("tab_active_icon_image").optional().isString(),
  body("allternativeTools").optional().isArray(),
  body("allternativeTools.*").optional().isMongoId(),
  body("whatCanDO").optional().isArray(),
  body("whatCanDO.*").optional().isString(),
  body("display_name").optional().isString(),
  ...fieldValidations,
];

exports.validateDiscoverDestination = [
  body("title").notEmpty().withMessage("Title is required"),

  body("slug")
    .optional()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage("Slug must be lowercase letters, numbers, and hyphens only"),

  body("description").optional(),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

// ✅ Validate Discover Destination Collection
exports.validateDiscoverDestinationCollection = [
  body("title").notEmpty().withMessage("Title is required"),

  body("description").optional(),

  body("image")
    .notEmpty()
    .withMessage("Image is required")
    .isURL()
    .withMessage("Image must be a valid URL"),

  body("discover_destinations")
    .isArray()
    .withMessage("Discover destinations must be an array")
    .custom((arr) => arr.every((id) => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage(
      "All discover destination IDs must be valid MongoDB ObjectIds",
    ),

  body("slug")
    .optional()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage(
      "Slug must be URL-friendly (lowercase letters, numbers, hyphens only)",
    ),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

exports.validateDestinationTool = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string"),

  body("prompt_template")
    .notEmpty()
    .withMessage("Prompt template is required")
    .isString()
    .withMessage("Prompt template must be a string"),

  body("suggested_topics")
    .optional()
    .isArray()
    .withMessage("Suggested topics must be an array"),

  body("suggested_topics.*.title")
    .optional()
    .isLength({ min: 1 })
    .withMessage("Suggested topic title is required"),

  body("suggested_topics.*.has_input")
    .optional()
    .isBoolean()
    .withMessage("has_input must be a boolean"),

  body("suggested_topics.*.image")
    .optional()
    .isString()
    .withMessage("Image must be a string"),

  body("suggested_topics.*.sticky")
    .optional()
    .isBoolean()
    .withMessage("sticky must be a boolean"),

  body("seo_title").optional().isString(),
  body("seo_keyphrase").optional().isString(),
  body("meta_description").optional().isString().isLength({ max: 300 }),
  body("cover_image").optional().isString(),
  body("tool_cover_image").optional().isString(),
  body("tab_normal_icon_image").optional().isString(),
  body("tab_active_icon_image").optional().isString(),
  body("allternativeTools").optional().isArray(),
  body("allternativeTools.*").optional().isMongoId(),
  body("whatCanDO").optional().isArray(),
  body("whatCanDO.*").optional().isString(),
  body("display_name").optional().isString(),
  ...fieldValidations,
];

// ✅ Validate Saved Destination
exports.validateSavedDestination = [
  body("destinationId")
    .notEmpty()
    .withMessage("Destination ID is required")
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage("Destination ID must be a valid MongoDB ObjectId"),

  body("aiResponse")
    .optional()
    .isString()
    .withMessage("AI Response must be a string"),
];

const ResumeGeneratorTabValidations = [
  body("tabs")
    .isArray({ min: 1 })
    .withMessage("Tabs must be a non-empty array"),

  body("tabs.*.title")
    .notEmpty()
    .withMessage("Tab title is required")
    .isString()
    .withMessage("Tab title must be a string"),

  body("tabs.*.prompt_template")
    .notEmpty()
    .withMessage("Tab prompt template is required")
    .isString()
    .withMessage("Tab prompt template must be a string"),

  body("tabs.*.description").optional().isString(),

  // Nested fields validation inside each tab
  body("tabs.*.fields").optional().isArray(),
  body("tabs.*.fields.*.key").notEmpty().isString(),
  body("tabs.*.fields.*.label").notEmpty().isString(),
  body("tabs.*.fields.*.type")
    .notEmpty()
    .isIn(validFieldTypes)
    .withMessage("Invalid field type in tab"),
];

exports.validateResumeGenerator = [
  body("seo_title").optional().isString(),
  body("seo_keyphrase").optional().isString(),
  body("meta_description").optional().isString().isLength({ max: 300 }),
  body("cover_image").optional().isString(),
  body("tool_cover_image").optional().isString(),
  body("tab_normal_icon_image").optional().isString(),
  body("tab_active_icon_image").optional().isString(),
  body("allternativeTools").optional().isArray(),
  body("allternativeTools.*").optional().isMongoId(),
  body("whatCanDO").optional().isArray(),
  body("whatCanDO.*").optional().isString(),
  body("display_name").optional().isString(),
  ...ResumeGeneratorTabValidations,
];

exports.validateCommonMiddleware = [
  body("seo_title").optional().isString(),
  body("seo_keyphrase").optional().isString(),
  body("meta_description").optional().isString().isLength({ max: 300 }),
  body("cover_image").optional().isString(),
  body("tool_cover_image").optional().isString(),
  body("tab_normal_icon_image").optional().isString(),
  body("tab_active_icon_image").optional().isString(),
  body("allternativeTools").optional().isArray(),
  body("allternativeTools.*").optional().isMongoId(),
  body("whatCanDO").optional().isArray(),
  body("whatCanDO.*").optional().isString(),
  body("display_name").optional().isString(),
  ...commonToolValidations,
];

exports.validatesuggestedTopicMiddleware = [
  // suggested_topics must be an array with at least one element
  body("suggested_topics")
    .isArray({ min: 1 })
    .withMessage("At least one suggested topic is required"),

  // validate fields of each suggested topic
  body("suggested_topics.*.title")
    .notEmpty()
    .withMessage("Topic title is required")
    .isString(),

  body("suggested_topics.*.has_input")
    .optional()
    .isBoolean()
    .withMessage("has_input must be boolean"),

  // SEO & other fields
  body("seo_title").optional().isString(),
  body("seo_keyphrase").optional().isString(),
  body("meta_description")
    .optional()
    .isString()
    .isLength({ max: 300 })
    .withMessage("Meta description cannot exceed 300 characters"),
  body("cover_image").optional().isString(),
  body("tool_cover_image").optional().isString(),
  body("tab_normal_icon_image").optional().isString(),
  body("tab_active_icon_image").optional().isString(),
  body("allternativeTools").optional().isArray(),
  body("allternativeTools.*").optional().isMongoId(),
  body("whatCanDO").optional().isArray(),
  body("whatCanDO.*").optional().isString(),
  body("display_name").optional().isString(),
  body("isActive").optional().isBoolean(),
];

exports.validateDocumentsMiddleware = [
  body("documents")
    .isArray({ min: 1 })
    .withMessage("At least one document entry is required"),

  body("documents.*.title")
    .notEmpty()
    .withMessage("Document title is required"),

  body("documents.*.icon").notEmpty().withMessage("Document icon is required"),

  body("seo_keyphrase").optional().isString(),
  body("seo_title").optional().isString(),
  body("meta_description")
    .optional()
    .isString()
    .isLength({ max: 300 })
    .withMessage("Meta description cannot exceed 300 characters"),
  body("cover_image").optional().isString(),
];

exports.validateSetting = [
  body("key")
    .trim()
    .notEmpty()
    .withMessage("Key is required")
    .isLength({ max: 50 })
    .withMessage("Key cannot exceed 50 characters"),
  body("value").notEmpty().withMessage("Value is required"),
  body("description")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Description cannot exceed 200 characters"),
];

exports.validateMarketingCategory = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Marketing category name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  body("description")
    .optional()
    .isLength({ max: 50000 })
    .withMessage("Description cannot exceed 50000 characters"),
  body("system_prompt")
    .trim()
    .notEmpty()
    .withMessage("System prompt is required")
    .isLength({ max: 2000 })
    .withMessage("System prompt cannot exceed 2000 characters"),
  body("icon")
    .optional()
    .isString()
    .withMessage("Icon must be a string (URL or path)"),
  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn(["content", "code", "business", "creative", "analysis"])
    .withMessage(
      "Category must be one of content, code, business, creative, analysis",
    ),
  body("tab_normal_icon_image").optional().isString(),
  body("tab_active_icon_image").optional().isString(),
  body("parent")
    .optional()
    .isMongoId()
    .withMessage("Parent must be a valid MongoDB ID"),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

// exports.validateBrandedVoice = [
//   body("branded_name")
//     .notEmpty()
//     .withMessage("Branded name is required")
//     .isLength({ max: 200 })
//     .withMessage("Branded name cannot exceed 200 characters"),

//   body("branded_text")
//     .notEmpty()
//     .withMessage("Branded text is required")
//     .isLength({ max: 5000 })
//     .withMessage("Branded text is too long"),

//   body("company_logo")
//     .optional()
//     .isString()
//     .withMessage("Company logo must be a string"),

//   body("company_design")
//     .optional()
//     .isString()
//     .withMessage("Company design must be a string"),
//   // ⭐ Updated validation for multiple docs
//   body("supportive_documents")
//     .optional()
//     .isArray()
//     .withMessage("Supportive documents must be an array"),
// ];

exports.validateSavedContent = [
  body("content_name")
    .notEmpty()
    .withMessage("Content name is required")
    .isLength({ max: 200 })
    .withMessage("Content name cannot exceed 200 characters"),
  body("content_text").notEmpty().withMessage("Content text is required"),
];

exports.validatePageBuilder = [
  // --- Tabs Validation ---
  body("tabs").optional().isArray().withMessage("Tabs must be an array"),
  body("tabs.*.label")
    .optional()
    .notEmpty()
    .withMessage("Tab label is required")
    .isString(),
  body("tabs.*.value")
    .optional()
    .notEmpty()
    .withMessage("Tab value is required")
    .isString(),

  // --- NEW: Hero Sections Validation ---
  body("hero_sections")
    .optional()
    .isArray()
    .withMessage("Hero sections must be an array"),

  body("hero_sections.*.category")
    .notEmpty()
    .withMessage("Hero section category is required")
    .isString(),
  body("hero_sections.*.title")
    .notEmpty()
    .withMessage("Hero section title is required")
    .isString(),
  body("hero_sections.*.sub_title")
    .notEmpty()
    .withMessage("Hero section sub-title is required")
    .isString(),
  body("hero_sections.*.button_text").optional().isString(),
  body("hero_sections.*.hero_image")
    .optional()
    .isString()
    .withMessage("Hero image must be a string (URL)"),

  // Hero Styling Validation
  // body("hero_sections.*.background_type")
  //   .optional()
  //   .isIn(["gradient", "solid"])
  //   .withMessage("Background type must be 'gradient' or 'solid'"),
  // body("hero_sections.*.gradient_colors")
  //   .optional()
  //   .isArray()
  //   .withMessage("Gradient colors must be an array of strings"),
  // body("hero_sections.*.gradient_colors.*")
  //   .optional()
  //   .isString(),
  // body("hero_sections.*.background_color").optional().isString(),
  // body("hero_sections.*.text_color").optional().isString(),
  // body("hero_sections.*.button_color").optional().isString(),
  // body("hero_sections.*.button_text_color").optional().isString(),

  // --- NEW: Grid Features Validation ---
  body("grid_features")
    .optional()
    .isArray()
    .withMessage("Grid features must be an array"),

  body("grid_features.*.category")
    .notEmpty()
    .withMessage("Grid feature category is required")
    .isString(),
  body("grid_features.*.title")
    .notEmpty()
    .withMessage("Grid feature title is required")
    .isString(),
  body("grid_features.*.description")
    .notEmpty()
    .withMessage("Grid feature description is required")
    .isString(),
  body("grid_features.*.image")
    .notEmpty()
    .withMessage("Grid feature image is required")
    .isString(),

  // --- Cards Array Validation ---
  body("cards").optional().isArray().withMessage("Cards must be an array"),
  body("cards.*.category")
    .optional()
    .notEmpty()
    .withMessage("Card category is required")
    .isString(),
  body("cards.*.title")
    .optional()
    .notEmpty()
    .withMessage("Card title is required")
    .isString(),
  body("cards.*.description")
    .optional()
    .notEmpty()
    .withMessage("Card description is required")
    .isString(),
  body("cards.*.image")
    .optional()
    .notEmpty()
    .withMessage("Card image is required")
    .isString(),
  body("cards.*.icon_image").optional().isString(),
  body("cards.*.badge_text").optional().isString(),
  body("cards.*.checklist")
    .optional()
    .isArray()
    .withMessage("Card checklist must be an array"),
  body("cards.*.checklist.*").optional().isString(),
  body("cards.*.custom_url").optional().isString(),
  body("cards.*.button_text").optional().isString(),

  // --- Legacy Features Array ---
  body("features").optional().isArray(),
  body("features.*.name").optional().notEmpty().isString(),
  body("features.*.value").optional().isNumeric(),
  body("features.*.is_active").optional().isBoolean(),
  body("features.*.show_value").optional().isBoolean(),

  // --- General Description Fields ---
  body("short_description")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Short description cannot exceed 200 characters"),
  body("description")
    .optional()
    .isLength({ max: 50000 })
    .withMessage("Description cannot exceed 50000 characters"),

  // --- SEO & Images ---
  body("seo_keyphrase").optional().isString().isLength({ max: 200 }),
  body("seo_title").optional().isString().isLength({ max: 200 }),
  body("meta_description").optional().isString().isLength({ max: 300 }),
  body("cover_image").optional().isString(),
  body("tool_cover_image").optional().isString(),
  body("tab_normal_icon_image").optional().isString(),
  body("tab_active_icon_image").optional().isString(),
  body("tab_image").optional().isString(),
];

// Add this to your validation.js file
exports.validatePromptCategory = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
  body("icon").optional().isString().withMessage("Icon must be a string"),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

// Add this to your validation.js file

exports.validatePromptData = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 200 })
    .withMessage("Name cannot exceed 200 characters"),

  body("category")
    .optional()
    .isArray()
    .withMessage("Category must be an array of IDs"),

  body("category.*")
    .optional()
    .isMongoId()
    .withMessage("Each category must be a valid Mongo ID"),

  body("image").optional().isString(),

  body("short_description")
    .trim()
    .notEmpty()
    .withMessage("Short description is required")
    .isLength({ max: 500 })
    .withMessage("Short description cannot exceed 500 characters"),

  body("description").notEmpty().withMessage("Long description is required"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

exports.validateBusinessProfile = [
  body("business_name")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Business name cannot exceed 200 characters"),

  body("business_description")
    .optional()
    .trim()
    .isLength({ max: 5000 }) // Increased limit for detailed descriptions
    .withMessage("Description cannot exceed 5000 characters"),

  // Validation: Ensure these are arrays, but don't check WHAT is inside them
  body("geo_location")
    .optional()
    .isArray()
    .withMessage("Geographic market must be an array"),
  body("business_goals")
    .optional()
    .isArray()
    .withMessage("Business goals must be an array"),
  body("sales_channels")
    .optional()
    .isArray()
    .withMessage("Sales channels must be an array"),
  body("marketing_channels")
    .optional()
    .isArray()
    .withMessage("Marketing channels must be an array"),
  body("content_types")
    .optional()
    .isArray()
    .withMessage("Content types must be an array"),
  body("team_roles")
    .optional()
    .isArray()
    .withMessage("Team roles must be an array"),

  // Basic string checks for other fields
  body("business_type").optional().isString(),
  body("industry").optional().isString(),
  body("target_market").optional().isString(),
];

// ... existing imports

exports.validateCodingTopic = [
  // 1. Validate Main Topic Fields
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Main topic title is required")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),

  body("icon").optional().isString().withMessage("Icon must be a string"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),

  // 2. Validate Subtopics Array
  body("subtopics")
    .optional()
    .isArray()
    .withMessage("Subtopics must be an array"),

  // 3. Validate Fields inside the Subtopics List
  body("subtopics.*.title")
    .optional()
    .notEmpty()
    .withMessage("Subtopic title is required"),

  body("subtopics.*.prompt_template")
    .optional()
    .isString()
    .withMessage("Prompt template must be a string"),

  body("subtopics.*.icon")
    .optional()
    .isString()
    .withMessage("Subtopic icon must be a string"),
];

exports.validateBrandedVoice = [
  // 1. Summary (Required)
  body("brand_voice_summary")
    .notEmpty()
    .withMessage("Brand voice description is required")
    .isLength({ max: 5000 })
    .withMessage("Description cannot exceed 5000 characters"),

  // 2. Sliders
  body("tone_playful_serious").optional().isInt({ min: 0, max: 100 }),
  body("tone_casual_formal").optional().isInt({ min: 0, max: 100 }),
  body("tone_bold_cautious").optional().isInt({ min: 0, max: 100 }),
  body("tone_friendly_authoritative").optional().isInt({ min: 0, max: 100 }),
  body("tone_emotional_analytical").optional().isInt({ min: 0, max: 100 }),

  // 3. Arrays (Traits & Humor)
  body("personality_traits").optional().isArray(),
  body("humor_style").optional().isArray(),

  // 4. Strings (Dropdowns & Text Areas)
  body("vocabulary_level").optional().isString(),
  body("emoji_usage").optional().isString(),
  body("writing_dos").optional().isString(),
  body("writing_donts").optional().isString(),
];

exports.validateImageStyle = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Style name is required")
    .isLength({ max: 100 }),
  body("image") // <--- Added validation
    .notEmpty()
    .withMessage("Style image is required"),
  body("is_active").optional().isBoolean(),
  body("type")
    .optional()
    .isIn(["image", "video"])
    .withMessage("Type must be either 'image' or 'video'"),
];

exports.validateImagePrompt = [
  body("image").notEmpty().withMessage("Image URL is required"),
  body("style").isMongoId().withMessage("Invalid Style ID"),
  body("image_prompt").notEmpty().withMessage("Prompt text is required"),
  body("is_active").optional().isBoolean(),
];

exports.validateVideoPrompt = [
  body("image").notEmpty().withMessage("Thumbnail image URL is required"),
  body("video").notEmpty().withMessage("Video URL is required"),
  body("style").isMongoId().withMessage("Invalid Style ID"),
  body("short_video_prompt")
    .notEmpty()
    .withMessage("Short video prompt text is required"),
  body("video_prompt").notEmpty().withMessage("Video prompt text is required"),
  body("is_active").optional().isBoolean(),
];

exports.validateAlternativeTools = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Alternative tool name is required")
    .isLength({ max: 100 }),
  body("description").optional().isString(),
  body("price")
    .trim()
    .notEmpty()
    .withMessage("Alternative tool price is required")
    .isLength({ max: 100 }),
  body("image").optional().isString(),
  body("is_active").optional().isBoolean(),
];

exports.validateLeadMagnet = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),

  body("short_description")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Short description cannot exceed 200 characters"),

  body("mini_description")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Mini description cannot exceed 200 characters"),

  body("meta_title")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Meta title cannot exceed 200 characters"),

  body("meta_description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Meta description cannot exceed 500 characters"),

  body("keyphrase")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Keyphrase cannot exceed 200 characters"),

  body("featured_image")
    .optional()
    .isString()
    .withMessage("Featured image must be a string"),

  body("industry")
    .optional()
    .isString()
    .withMessage("Industry must be a string"),

  body("cta_title")
    .optional()
    .isString()
    .withMessage("CTA title must be a string"),

  body("cta_description")
    .optional()
    .isString()
    .withMessage("CTA description must be a string"),

  body("cta_button_text")
    .optional()
    .isString()
    .withMessage("CTA button text must be a string"),

  body("cta_button_link")
    .optional()
    .isString()
    .withMessage("CTA button link must be a string"),

  body("is_indexed")
    .optional()
    .isBoolean()
    .withMessage("is_indexed must be boolean"),

  body("status")
    .optional()
    .isIn(["draft", "published"])
    .withMessage("Invalid status"),

  body("assigned_tools")
    .optional()
    .isArray()
    .withMessage("Assigned tools must be an array"),

  body("category_id").optional().isMongoId().withMessage("Invalid category_id"),

  body("assigned_tools.*.itemId")
    .optional()
    .isMongoId()
    .withMessage("Invalid itemId"),

  body("assigned_tools.*.modelName")
    .optional()
    .isString()
    .withMessage("modelName must be string"),

  body("type")
    .optional()
    .isIn(["standard", "alternative"])
    .withMessage("Invalid type"),
];

exports.validateLeadMagnetCategories = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Category name must be between 2 and 100 characters"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),

  // body("icon_name")
  //   .optional()
  //   .isString()
  //   .withMessage("Icon name must be a string"),

  // body("icon_color")
  //   .optional()
  //   .isString()
  //   .withMessage("Icon color must be a string"),

  body("icon").optional().isString().withMessage("Icon image must be a string"),

  body("related_categories")
    .optional()
    .isArray()
    .withMessage("Related categories must be an array"),

  body("related_categories.*")
    .optional()
    .isMongoId()
    .withMessage("Invalid related category ID"),

  body("display_order")
    .optional()
    .isInt()
    .withMessage("Display order must be an integer"),
  body("is_active").optional().isBoolean(),

  body("type")
    .optional()
    .isIn(["standard", "alternative"])
    .withMessage("Invalid type"),
];

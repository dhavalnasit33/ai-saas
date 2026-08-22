// // const mongoose = require("mongoose")

// // const fieldSchema = new mongoose.Schema(
// //   {
// //     key: {
// //       type: String,
// //       required: true,
// //     },
// //     label: {
// //       type: String,
// //       required: true,
// //     },
// //     type: {
// //       type: String,
// //       enum: ["textbox", "textarea", "dropdown", "radio", "checkbox", "imageupload", "fileupload", "number", "date"],
// //       required: true,
// //     },
// //     required: {
// //       type: Boolean,
// //       default: false,
// //     },
// //     placeholder: {
// //       type: String,
// //       default: "",
// //     },
// //     default_value: {
// //       type: mongoose.Schema.Types.Mixed,
// //       default: "",
// //     },
// //     options: [
// //       {
// //         type: String,
// //       },
// //     ],
// //   },
// //   { _id: false },
// // )

// // const tabSchema = new mongoose.Schema(
// //   {
// //     title: {
// //       type: String,
// //       required: true,
// //     },
// //     fields: [fieldSchema],
// //   },
// //   { _id: false },
// // )

// // const toolSchema = new mongoose.Schema(
// //   {
// //     name: {
// //       type: String,
// //       required: [true, "Tool name is required"],
// //       trim: true,
// //       maxlength: [100, "Name cannot exceed 100 characters"],
// //     },
// //     description: {
// //       type: String,
// //       maxlength: [500, "Description cannot exceed 500 characters"],
// //     },
// //     category_id: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "ToolCategory",
// //       required: true,
// //     },
// //     system_prompt_template: {
// //       type: String,
// //       required: [true, "System prompt template is required"],
// //       maxlength: [3000, "System prompt template cannot exceed 3000 characters"],
// //     },
// //     tabs: [tabSchema],
// //     is_active: {
// //       type: Boolean,
// //       default: true,
// //     },
// //     usage_count: {
// //       type: Number,
// //       default: 0,
// //     },
// //     tokens_per_use: {
// //       type: Number,
// //       default: 1,
// //       min: [1, "Tokens per use must be at least 1"],
// //     },
// //     created_by: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "User",
// //       required: true,
// //     },
// //   },
// //   {
// //     timestamps: true,
// //   },
// // )

// // // Indexes for efficient queries
// // toolSchema.index({ is_active: 1, category_id: 1 })
// // toolSchema.index({ name: "text", description: "text" })

// // module.exports = mongoose.model("Tool", toolSchema)
// const mongoose = require("mongoose")
// const slugify = require("slugify")

// const fieldSchema = new mongoose.Schema(
//   {
//     key: {
//       type: String,
//       required: true,
//     },
//     label: {
//       type: String,
//       required: true,
//     },
//     description: {
//       type: String,
//       default: "",
//     },
//     type: {
//       type: String,
//       enum: ["textbox", "textarea", "dropdown", "radio", "checkbox", "imageupload", "fileupload", "number", "date"],
//       required: true,
//     },
//     required: {
//       type: Boolean,
//       default: false,
//     },
//     placeholder: {
//       type: String,
//       default: "",
//     },
//     default_value: {
//       type: mongoose.Schema.Types.Mixed,
//       default: "",
//     },
//     options: [
//       {
//         type: String,
//       },
//     ],
//   },
//   { _id: false },
// )

// const tabSchema = new mongoose.Schema(
//   {
//     title: {
//       type: String,
//       required: true,
//     },
//     fields: [fieldSchema],
//     prompt_template: {
//       type: String,
//       required: true,
//       maxlength: [2000, "Tab prompt template cannot exceed 2000 characters"],
//     },
//   },
//   { _id: false },
// )

// const suggestedTopicSchema = new mongoose.Schema(
//   {
//     title: {
//       type: String,
//       required: true,
//     },
//     prompt_template: {
//       type: String,
//       required: true,
//       maxlength: [1000, "Suggested topic prompt cannot exceed 1000 characters"],
//     },
//     has_input: {
//       type: Boolean,
//       default: false,
//     },
//     input_placeholder: {
//       type: String,
//       default: "Type anything...",
//     },
//   },
//   { _id: false },
// )

// const toolSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: [true, "Tool name is required"],
//       trim: true,
//       maxlength: [100, "Name cannot exceed 100 characters"],
//     },
//     slug: {
//       type: String,
//       required: true,
//       lowercase: true,
//     },
//     description: {
//       type: String,
//       maxlength: [500, "Description cannot exceed 500 characters"],
//     },
//     category_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "ToolCategory",
//       required: true,
//     },
//     system_prompt_template: {
//       type: String,
//       required: [true, "System prompt template is required"],
//       maxlength: [3000, "System prompt template cannot exceed 3000 characters"],
//     },
//     tabs: [tabSchema],
//     suggested_topics: [suggestedTopicSchema],
//     is_active: {
//       type: Boolean,
//       default: true,
//     },
//     usage_count: {
//       type: Number,
//       default: 0,
//     },
//     tokens_per_use: {
//       type: Number,
//       default: 1,
//       min: [1, "Tokens per use must be at least 1"],
//     },
//     created_by: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//   },
// )

// // Generate slug from name before saving
// toolSchema.pre("validate", function(next) {
//   if (this.name) {
//     // Always generate slug from name
//     this.slug = slugify(this.name, {
//       lower: true,
//       strict: true,
//       trim: true,
//       remove: /[*+~.()'"!:@]/g
//     });
//   }
//   next();
// });

// // Handle slug uniqueness in pre-save
// toolSchema.pre("save", async function(next) {
//   try {
//     if (this.isModified("name") || this.isModified("slug")) {
//       let baseSlug = this.slug;
//       let slug = baseSlug;
//       let counter = 1;

//       // Check for existing slugs
//       while (await this.constructor.findOne({
//         slug,
//         _id: { $ne: this._id }
//       })) {
//         slug = `${baseSlug}-${counter}`;
//         counter++;
//       }

//       this.slug = slug;
//     }
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// // Indexes for efficient queries
// toolSchema.index({ is_active: 1, category_id: 1 })
// toolSchema.index({ name: "text", description: "text" })
// toolSchema.index({ slug: 1 }, { unique: true })

// module.exports = mongoose.model("Tool", toolSchema)
const mongoose = require("mongoose");
const slugify = require("slugify");

const fieldSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: [
        "textbox",
        "textarea",
        "dropdown",
        "radio",
        "checkbox",
        "imageupload",
        "fileupload",
        "number",
        "date",
      ],
      required: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      default: "",
    },
    default_value: {
      type: mongoose.Schema.Types.Mixed,
      default: "",
    },
    options: [
      {
        type: String,
      },
    ],
  },
  { _id: false },
);

const tabSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    fields: [fieldSchema],
    prompt_template: {
      type: String,
      required: true,
      maxlength: [2000, "Tab prompt template cannot exceed 2000 characters"],
    },
    description: {
      type: String,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
  },
  { _id: false },
);

// Updated suggested topic schema - removed prompt_template, title is now the prompt
const suggestedTopicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: [500, "Title cannot exceed 500 characters"],
    },
    has_input: {
      type: Boolean,
      default: true,
    },
    input_placeholder: {
      type: String,
      default: "Type anything...",
    },
  },
  { _id: false },
);

const toolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tool name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    icon: {
      type: String,
      default: null, // Default icon will be null
      maxlength: [1000, "Icon URL/path cannot exceed 1000 characters"],
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
    },
    short_description: {
      type: String,
      maxlength: [200, "Short category cannot exceed 200 characters"],
    },
    mini_description: {
      type: String,
      maxlength: [200, "Mini description cannot exceed 200 characters"],
    },
    description: {
      type: String,
      maxlength: [50000, "Description cannot exceed 50000 characters"],
    },
    category_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ToolCategory",
        required: true,
      },
    ],
    // Added AI provider selection
    ai_model_id: {
      // Changed from ai_provider to ai_model_id
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIModel",
      required: [true, "AI Model is required"],
    },
    system_prompt_template: {
      type: String,
      required: [true, "System prompt template is required"],
      maxlength: [3000, "System prompt template cannot exceed 3000 characters"],
    },
    tabs: [tabSchema],
    suggested_topics: [suggestedTopicSchema],
    is_active: {
      type: Boolean,
      default: true,
    },
    usage_count: {
      type: Number,
      default: 0,
    },
    seo_keyphrase: {
      type: String,
      maxlength: [200, "Focus keyphrase cannot exceed 200 characters"],
    },
    seo_title: {
      type: String,
      maxlength: [200, "SEO title cannot exceed 200 characters"],
    },
    meta_description: {
      type: String,
      maxlength: [300, "Meta description cannot exceed 300 characters"],
    },
    cover_image: {
      type: String,
      default: null,
      maxlength: [1000, "Cover image URL/path cannot exceed 1000 characters"],
    },

    // Removed tokens_per_use field
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Generate slug from name before saving
toolSchema.pre("validate", function (next) {
  if (this.name) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }
  next();
});

// Handle slug uniqueness in pre-save
toolSchema.pre("save", async function (next) {
  try {
    if (this.isModified("name") || this.isModified("slug")) {
      let baseSlug = this.slug;
      let slug = baseSlug;
      let counter = 1;

      while (
        await this.constructor.findOne({
          slug,
          _id: { $ne: this._id },
        })
      ) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      this.slug = slug;
    }
    next();
  } catch (error) {
    next(error);
  }
});

toolSchema.index({ is_active: 1, category_id: 1 });
toolSchema.index({ name: "text", description: "text" });
toolSchema.index({ slug: 1 }, { unique: true });
toolSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("Tool", toolSchema);

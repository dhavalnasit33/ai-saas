// // const mongoose = require('mongoose');

// // const toolCategorySchema = new mongoose.Schema({
// //   name: {
// //     type: String,
// //     required: [true, 'Tool category name is required'],
// //     unique: true,
// //     trim: true,
// //     maxlength: [100, 'Name cannot exceed 100 characters']
// //   },
// //   description: {
// //     type: String,
// //     maxlength: [500, 'Description cannot exceed 500 characters']
// //   },
// //   system_prompt: {
// //     type: String,
// //     required: [true, 'System prompt is required'],
// //     maxlength: [2000, 'System prompt cannot exceed 2000 characters']
// //   },
// //   is_active: {
// //     type: Boolean,
// //     default: true
// //   },
// //   icon: {
// //     type: String,
// //     default: null
// //   },
// //   category: {
// //     type: String,
// //     enum: ['content', 'code', 'business', 'creative', 'analysis'],
// //     required: true
// //   },
// //   tokens_per_use: {
// //     type: Number,
// //     default: 1,
// //     min: [1, 'Tokens per use must be at least 1']
// //   },
// //   usage_count: {
// //     type: Number,
// //     default: 0
// //   },
// //   created_by: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     ref: 'User',
// //     required: true
// //   }
// // }, {
// //   timestamps: true
// // });

// // // Index for efficient queries
// // toolCategorySchema.index({ is_active: 1, category: 1 });
// // toolCategorySchema.index({ name: 'text', description: 'text' });

// // module.exports = mongoose.model('ToolCategory', toolCategorySchema);
// const mongoose = require("mongoose")
// const slugify = require("slugify")

// const toolCategorySchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: [true, "Tool category name is required"],
//       unique: true,
//       trim: true,
//       maxlength: [100, "Name cannot exceed 100 characters"],
//     },
//     slug: {
//       type: String,
//       unique: true,
//       lowercase: true,
//     },
//     description: {
//       type: String,
//       maxlength: [500, "Description cannot exceed 500 characters"],
//     },
//     system_prompt: {
//       type: String,
//       required: [true, "System prompt is required"],
//       maxlength: [2000, "System prompt cannot exceed 2000 characters"],
//     },
//     is_active: {
//       type: Boolean,
//       default: true,
//     },
//     icon: {
//       type: String,
//       default: null,
//     },
//     category: {
//       type: String,
//       enum: ["content", "code", "business", "creative", "analysis"],
//       required: true,
//     },
//     tokens_per_use: {
//       type: Number,
//       default: 1,
//       min: [1, "Tokens per use must be at least 1"],
//     },
//     usage_count: {
//       type: Number,
//       default: 0,
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

// // Generate slug before validation
// toolCategorySchema.pre("validate", function(next) {
//   if (this.name && (!this.slug || this.isModified("name"))) {
//     this.slug = slugify(this.name, {
//       lower: true,
//       strict: true,
//       trim: true,
//       remove: /[*+~.()'"!:@]/g
//     });
//   }
//   next();
// });

// // Then handle uniqueness in pre-save
// toolCategorySchema.pre("save", async function(next) {
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

// // Index for efficient queries
// toolCategorySchema.index({ is_active: 1, category: 1 })
// toolCategorySchema.index({ name: "text", description: "text" })
// toolCategorySchema.index({ slug: 1 }, { unique: true });

// module.exports = mongoose.model("ToolCategory", toolCategorySchema)
const mongoose = require("mongoose")
const slugify = require("slugify")

const toolCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tool category name is required"],

      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: [50000, "Description cannot exceed 50000 characters"],
    },
    system_prompt: {
      type: String,
      required: [true, "System prompt is required"],
      maxlength: [2000, "System prompt cannot exceed 2000 characters"],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    icon: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      enum: ["content", "code", "business", "creative", "analysis"],
      required: true,
    },
      parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ToolCategory",
      default: null,
    },
    // Removed tokens_per_use field
    usage_count: {
      type: Number,
      default: 0,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Generate slug before validation
toolCategorySchema.pre("validate", function(next) {
  if (this.name && (!this.slug || this.isModified("name"))) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  next();
});

// Handle slug uniqueness in pre-save
toolCategorySchema.pre("save", async function(next) {
  try {
    if (this.isModified("name") || this.isModified("slug")) {
      let baseSlug = this.slug;
      let slug = baseSlug;
      let counter = 1;
      
      while (await this.constructor.findOne({ 
        slug, 
        _id: { $ne: this._id } 
      })) {
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

toolCategorySchema.index({ is_active: 1, category: 1 })
toolCategorySchema.index({ name: "text", description: "text" })
toolCategorySchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model("ToolCategory", toolCategorySchema)

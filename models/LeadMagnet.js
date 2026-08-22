const mongoose = require("mongoose");
const slugify = require("slugify");

const leadMagnetSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    short_description: {
      type: String,
      maxlength: [200, "Short description cannot exceed 200 characters"],
    },
    mini_description: {
      type: String,
      maxlength: [200, "Mini description cannot exceed 200 characters"],
    },
    meta_title: {
      type: String,
      maxlength: [200, "Meta title cannot exceed 200 characters"],
    },
    meta_description: {
      type: String,
      maxlength: [500, "Meta description cannot exceed 500 characters"],
    },
    keyphrase: {
      type: String,
      maxlength: [200, "Keyphrase cannot exceed 200 characters"],
    },
    featured_image: {
      type: String,
      default: null,
    },
    tab_normal_icon: {
      type: String,
      default: null,
    },
    tab_active_icon: {
      type: String,
      default: null,
    },
    tab_image: {
      type: String,
      default: null,
    },
    assigned_tools: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        modelName: {
          type: String,
          required: true,
        },
        sort_order: {
          type: Number,
          default: 0,
        },
      },
    ],
    industry: {
      type: String,
      default: "general",
    },

    cta_title: {
      type: String,
      default: "Access 100+ AI tools with OneChat AI",
    },

    cta_description: {
      type: String,
      default: "",
    },

    cta_button_text: {
      type: String,
      default: "Try Free",
    },

    cta_button_link: {
      type: String,
      default: "/register",
    },

    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadMagnetCategories",
      required: false,
    },
    is_indexed: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
    type: {
      type: String,
      enum: ["standard", "alternative"],
      default: "standard",
    },
  },
  {
    timestamps: true,
  },
);

// Generate slug from title before validation
leadMagnetSchema.pre("validate", function (next) {
  if (this.title && !this.slug) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      trim: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }
  next();
});

// // Ensure slug uniqueness
// leadMagnetSchema.pre("save", async function (next) {
//   try {
//     if (this.isModified("title") || this.isModified("slug")) {
//       let baseSlug = this.slug;
//       let slug = baseSlug;
//       let counter = 1;

//       while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
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

leadMagnetSchema.index({ slug: 1 });
leadMagnetSchema.index({ status: 1 });
leadMagnetSchema.index({ industry: 1 });
leadMagnetSchema.index({ type: 1 });
module.exports = mongoose.model("LeadMagnet", leadMagnetSchema);

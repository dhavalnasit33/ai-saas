const mongoose = require("mongoose");
const slugify = require("slugify");

const discoverDestinationCollectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Collection title is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
    },
    image: {
      type: String, // URL or file path
      required: [true, "Collection image is required"],
    },
    discover_destinations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DiscoverDestination", // Links to DiscoverDestination model
      },
    ],
    system_prompt: {
      type: String,
    },
    max_tokens: {
      type: Number,
      default: 4000,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Slug generation before validation
discoverDestinationCollectionSchema.pre("validate", function (next) {
  if (this.title && (!this.slug || this.isModified("title"))) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      trim: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }
  next();
});

// Ensure slug uniqueness before save
discoverDestinationCollectionSchema.pre("save", async function (next) {
  try {
    if (this.isModified("title") || this.isModified("slug")) {
      let baseSlug = this.slug;
      let slug = baseSlug;
      let counter = 1;

      while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
        slug = `${baseSlug}-${counter++}`;
      }

      this.slug = slug;
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Indexes for better performance
discoverDestinationCollectionSchema.index({ is_active: 1 });
discoverDestinationCollectionSchema.index({
  title: "text",
  description: "text",
});
discoverDestinationCollectionSchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model(
  "DiscoverDestinationCollection",
  discoverDestinationCollectionSchema
);

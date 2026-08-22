const mongoose = require("mongoose");
const slugify = require("slugify");

// Subtopic Schema (Simple list item, no further nesting)
const subTopicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Subtopic title is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  icon: {
    type: String, // URL or Icon name
    trim: true,
  },
  prompt_template: {
    type: String, // The specific prompt logic for this subtopic
    trim: true,
  },
});

const codingPromptTopicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Main topic title is required"],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      default: "",
    },
    // Simple list of subtopics
    subtopics: [subTopicSchema],
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Auto-generate slug from title
codingPromptTopicSchema.pre("validate", function (next) {
  if (this.title) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
  next();
});

module.exports = mongoose.model("CodingPromptTopic", codingPromptTopicSchema);
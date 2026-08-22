const mongoose = require("mongoose");
const slugify = require("slugify");


const leadMagnetCategoriesSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            required: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        // icon_name: {
        //     type: String,
        //     default: "",
        // },
        // icon_color: {
        //     type: String,
        //     default: "",
        // },
        icon: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
        },
        related_categories: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "LeadMagnetCategories",
            default: [],
        },
        display_order: {
            type: Number,
            default: 0,
        },
        is_active: {
            type: Boolean,
            default: true,
        },
        type: {
            type: String,
            enum: ["standard", "alternative"],
            default: "standard",
        },
        meta_title: {
            type: String,
            trim: true,
        },
        meta_description: {
            type: String,
            trim: true,
        },
        keyphrase: {
            type: String,
            trim: true,
        },
        featured_image: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true },
);

leadMagnetCategoriesSchema.pre("validate", function (next) {
    if (this.name && !this.slug) {
        this.slug = slugify(this.name, {
            lower: true,
            strict: true,
            trim: true,
            remove: /[*+~.()"!:@]/g,
        });
    }
    next();
});

leadMagnetCategoriesSchema.index({ slug: 1 });
leadMagnetCategoriesSchema.index({ type: 1 });

module.exports = mongoose.model("LeadMagnetCategories", leadMagnetCategoriesSchema);

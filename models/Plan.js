const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    unique: true,
    enum: ['basic', 'lite', 'standard', 'pro', 'pro_max']
  },
  display_name: {
    type: String,
    required: true
  },
  token_limit: {
    type: Number,
    required: [true, 'Token limit is required'],
    min: [1, 'Token limit must be at least 1']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  yearly_price: { 
    type: Number,
    min: [0, 'Yearly price cannot be negative']
  },
  yearly_discount_percent: {
    type: Number,
    default: 20, 
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'INR', 'EUR']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  features: [{
    type: String,
    required: true
  }],
  is_active: {
    type: Boolean,
    default: true
  },
    stripe_monthly_price_id: { type: String },
    stripe_yearly_price_id:{type: String},
  stripe_price_id: String,
  razorpay_plan_id: String,
  popular: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Function to calculate yearly price
function calculateYearlyPrice(price, discountPercent) {
  const discount = discountPercent / 100;
  return parseFloat((price * (1 - discount)).toFixed(2));
}

// For .save()
planSchema.pre('save', function (next) {
  if (this.isModified('price') || this.isModified('yearly_discount_percent')) {
    this.yearly_price = calculateYearlyPrice(this.price, this.yearly_discount_percent);
  }
  next();
});

// For findOneAndUpdate / updateOne
planSchema.pre(['findOneAndUpdate', 'updateOne'], function (next) {
  const update = this.getUpdate();
  if (update.price || update.yearly_discount_percent) {
    const price = update.price ?? this._update.$set?.price;
    const discount = update.yearly_discount_percent ?? this._update.$set?.yearly_discount_percent;
    if (price != null && discount != null) {
      const yearlyPrice = calculateYearlyPrice(price, discount);
      this.set({ yearly_price: yearlyPrice });
    }
  }
  next();
});

module.exports = mongoose.model('Plan', planSchema);

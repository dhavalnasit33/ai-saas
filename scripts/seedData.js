const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");
const Plan = require("../models/Plan");
const ToolCategory = require("../models/ToolCategory");
const AIProvider = require("../models/AIProvider");
const AdminUser = require("../models/AdminUser");

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/ai-saas",
    );
    console.log("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Plan.deleteMany({});
    await ToolCategory.deleteMany({});
    await AIProvider.deleteMany({});
    await AdminUser.deleteMany({});
    console.log("Cleared existing data");

    // Create Plans
    const plans = await Plan.insertMany([
      {
        name: "basic",
        display_name: "Free",
        token_limit: 3000000,
        price: 0,
        currency: "USD",
        description: "Perfect for getting started with AI tools",
        features: [
          "3000000 AI requests per month",
          "Basic tool access",
          "Email support",
          "Standard response time",
          "Limited deep research",
          "Standard response time",
        ],
        is_active: true,
        popular: false,
      },
      {
        name: "lite",
        display_name: "Lite Plan",
        token_limit: 3500000,
        price: 6.99,
        currency: "USD",
        description: "Great for casual users",
        features: [
          "3500000 AI requests per month",
          "Standard tool access",
          "Email support",
          "Standard response time",
        ],
        is_active: true,
        popular: false,
      },
      {
        name: "standard",
        display_name: "Standard Plan",
        token_limit: 4000000,
        price: 9.99,
        currency: "USD",
        description: "Great for regular users",
        features: [
          "4000000 AI requests per month",
          "Standard tool access",
          "Email support",
          "Good response time",
        ],
        is_active: true,
        popular: false,
      },
      {
        name: "pro",
        display_name: "Basic Plan",
        token_limit: 5000000,
        price: 14.99,
        currency: "USD",
        description: "Great for professionals and small teams",
        features: [
          "5000000 AI requests per month",
          "Basic tool access",
          "Priority email support",
          "Faster response time",
          "Usage analytics",
        ],
        is_active: true,
        popular: true,
      },
      {
        name: "pro_max",
        display_name: "Premium Plan",
        token_limit: 10000000,
        price: 24.99,
        currency: "USD",
        description: "Best for power users and large teams",
        features: [
          "10000000 AI requests per month",
          "All tools access",
          "Priority support",
          "Fastest response time",
          "Advanced analytics",
          "API access",
          "Dedicated account manager",
        ],
        is_active: true,
        popular: false,
      },
    ]);
    console.log("Created plans");

    // Create Admin User
    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "admin123",
      plan: "pro_max",
      remaining_tokens: 100,
      roles: ["Admin"],
      status: "active",
      emailVerified: true,
    });
    console.log("Created admin user");

    // Create Sample Users
    const sampleUsers = await User.insertMany([
      {
        name: "John Doe",
        email: "john@example.com",
        password: await bcrypt.hash("password123", 12),
        plan: "basic",
        remaining_tokens: 5,
        roles: ["User"],
        status: "active",
        emailVerified: true,
      },
      {
        name: "Jane Smith",
        email: "jane@example.com",
        password: await bcrypt.hash("password123", 12),
        plan: "pro",
        remaining_tokens: 50,
        roles: ["User"],
        status: "active",
        emailVerified: true,
      },
      {
        name: "SEO Manager",
        email: "seo@example.com",
        password: await bcrypt.hash("password123", 12),
        plan: "pro",
        remaining_tokens: 50,
        roles: ["SEO Manager"],
        status: "active",
        emailVerified: true,
      },
    ]);
    console.log("Created sample users");

    // Create Tool Categories
    const toolCategories = await ToolCategory.insertMany([
      {
        name: "Blog Post Writer",
        description: "Generate high-quality blog posts on any topic",
        system_prompt:
          "You are an expert content writer. Create engaging, well-structured blog posts that are informative and SEO-friendly. Use proper headings, include relevant examples, and maintain a professional yet conversational tone.",
        category: "content",
        tokens_per_use: 2,
        is_active: true,
        created_by: adminUser._id,
      },
      {
        name: "Code Generator",
        description:
          "Generate clean, efficient code in multiple programming languages",
        system_prompt:
          "You are an expert software developer. Generate clean, well-commented, and efficient code. Follow best practices and include proper error handling. Explain complex logic with comments.",
        category: "code",
        tokens_per_use: 3,
        is_active: true,
        created_by: adminUser._id,
      },
      {
        name: "Email Writer",
        description: "Craft professional emails for various purposes",
        system_prompt:
          "You are a professional communication expert. Write clear, concise, and appropriate emails for business and personal use. Maintain proper email etiquette and tone.",
        category: "business",
        tokens_per_use: 1,
        is_active: true,
        created_by: adminUser._id,
      },
      {
        name: "Social Media Post Creator",
        description: "Create engaging social media content",
        system_prompt:
          "You are a social media expert. Create engaging, platform-appropriate content that drives engagement. Include relevant hashtags and call-to-actions when appropriate.",
        category: "content",
        tokens_per_use: 1,
        is_active: true,
        created_by: adminUser._id,
      },
      {
        name: "Business Plan Generator",
        description: "Create comprehensive business plans and strategies",
        system_prompt:
          "You are a business strategy consultant. Create detailed, actionable business plans with market analysis, financial projections, and strategic recommendations.",
        category: "business",
        tokens_per_use: 4,
        is_active: true,
        created_by: adminUser._id,
      },
      {
        name: "Creative Story Writer",
        description: "Generate creative stories and narratives",
        system_prompt:
          "You are a creative writer. Craft engaging stories with compelling characters, interesting plots, and vivid descriptions. Adapt your writing style to the requested genre.",
        category: "creative",
        tokens_per_use: 3,
        is_active: true,
        created_by: adminUser._id,
      },
      {
        name: "Data Analyzer",
        description: "Analyze data and provide insights",
        system_prompt:
          "You are a data analyst. Analyze provided data, identify patterns and trends, and provide actionable insights with clear explanations and recommendations.",
        category: "analysis",
        tokens_per_use: 2,
        is_active: true,
        created_by: adminUser._id,
      },
      {
        name: "SEO Content Optimizer",
        description: "Optimize content for search engines",
        system_prompt:
          "You are an SEO expert. Optimize content for search engines while maintaining readability and user engagement. Include keyword suggestions and SEO best practices.",
        category: "content",
        tokens_per_use: 2,
        is_active: true,
        created_by: adminUser._id,
      },
    ]);
    console.log("Created tool categories");

    // Create AI Providers
    const aiProviders = await AIProvider.insertMany([
      {
        name: "openai",
        display_name: "OpenAI GPT",
        api_key: process.env.OPENAI_API_KEY || "your-openai-api-key",
        is_active: true,
        max_tokens: 4000,
        model: "gpt-4o-mini",
        base_url: "https://api.openai.com/v1",
        rate_limit: {
          requests_per_minute: 60,
          tokens_per_minute: 90000,
        },
        cost_per_token: 0.00001,
      },
      {
        name: "deepseek",
        display_name: "DeepSeek AI",
        api_key: process.env.DEEPSEEK_API_KEY || "your-deepseek-api-key",
        is_active: false,
        max_tokens: 4000,
        model: "deepseek-v4-flash",
        base_url: "https://api.deepseek.com/v1",
        rate_limit: {
          requests_per_minute: 30,
          tokens_per_minute: 60000,
        },
        cost_per_token: 0.000005,
      },
    ]);
    console.log("Created AI providers");

    // Create Admin User Record
    await AdminUser.create({
      user_id: adminUser._id,
      role: "Admin",
      permissions: [
        "view_users",
        "edit_users",
        "delete_users",
        "view_payments",
        "process_refunds",
        "view_analytics",
        "edit_tools",
        "manage_ai_providers",
        "view_all_history",
        "export_data",
        "manage_roles",
        "manage_news",
        "manage_seo",
        "manage_pages",
      ],
      can_edit_roles: true,
      assigned_by: adminUser._id,
      is_active: true,
    });

    // Create SEO Manager Admin Record
    const seoUser = sampleUsers.find(
      (user) => user.email === "seo@example.com",
    );
    await AdminUser.create({
      user_id: seoUser._id,
      role: "SEO Manager",
      permissions: [
        "view_users",
        "view_all_history",
        "view_analytics",
        "export_data",
      ],
      can_edit_roles: false,
      assigned_by: adminUser._id,
      is_active: true,
    });

    console.log("✅ Database seeded successfully!");
    console.log("\n📋 Login Credentials:");
    console.log("Admin: admin@example.com / admin123");
    console.log("User: john@example.com / password123");
    console.log("Pro User: jane@example.com / password123");
    console.log("SEO Manager: seo@example.com / password123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedData();

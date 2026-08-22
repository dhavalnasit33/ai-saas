// utils/seoHelper.js
const SeoRecord = require("../models/SeoRecord");
const slugify = require("slugify");

async function upsertSeoRecord({ refId, modelName, seo }) {
  const slug = seo.slug
    ? slugify(seo.slug, { lower: true, strict: true })
    : slugify(modelName, { lower: true, strict: true });
  const updateData = {
    slug,
    seo_keyphrase: seo.seo_keyphrase || "",
    seo_title: seo.seo_title || "",
    meta_description: seo.meta_description || "",
    cover_image: seo.cover_image || "",
  };

  return SeoRecord.findOneAndUpdate(
    { ref_id: refId, model_name: modelName },
    { $set: updateData },
    { new: true, upsert: true },
  );
}

const modelNameToSlugMap = {
  Marketing: "business-development",
  Solutions: "brainstorm-business-ideas",
  Research: "market-research",
  Email: "email-generator",
  PageBuilder: "email-builder",
  Paraphrase: "content-paraphraser",
  CheckGrammar: "ai-grammar-checker",
  BlogPost: "ai-writer",
  SocialMedia: "social-media-generator",
  SaveMoney: "saving-strategies",
  Wellness: "health-wellness",
  InterviewPrep: "job-interview-prep",
  Therapy: "Therapist",
  NutritionPlanner: "Nutritionist",
  Investing: "stock-market-tracker",
  CoverLetterGenerator: "cover-letter-generator",
  ResumeGenerator: "resume-generator",
  SmallBusinessIdeaGenerator: "small-business-idea-generator",
  FinancialAdvisor: "financial-advisor",
  "ContentTranslator ": "content-translator",
  AiJobAutomationChecker: "ai-job-automation-checker",
  RetirementCalculator: "retirement-calculator",
  BudgetCalculator: "budget-calculator",
  DebtRelief: "debt-relief",
  BusinessNameGenerator: "business-name-generator",
  AiJobProtectionPlan: "ai-job-protection-plan",
};

const modelNameToTitleMap = {
  Marketing: "Business Development Assistant",
  Solutions: "Brainstorm Business Ideas",
  Research: "Market Research Tool",
  Email: "Email Writer",
  CheckGrammar: "Grammar Checker",
  BlogPost: "Content Writer",
  SocialMedia: "Social Media Writer",
  SaveMoney: "Saving Strategies",
  Wellness: "Health & Wellness",
  InterviewPrep: "Job Interview Prep",
  Therapy: "Therapist",
  NutritionPlanner: "Nutritionist",
  Investing: "Stock Market Tracker",
  CoverLetterGenerator: "Cover Letter Writer",
  ResumeGenerator: "Resume Builder",
  "Landing Page Copy Generator": "Landing Page Writer",
  Paraphrase: "Paraphraser",
  "Product Description Generator": "Product Description Writer",
  "Facebook Post Generator": "Facebook Post Writer",
  "Product Description Generator": "Product Description Writer",
  "Campaign Brief Generator": "Campaign Brief Builder",
  "Product Bullets Generator": "Product Bullet Points Writer",
  "White Paper Outline Generator": "White Paper Builder",
  "User Guide Manual Generator": "User Guide Writer",
  "LinkedIn Post Generator": "LinkedIn Post Writer",
  "Social Media Ad Generator": "Social Media Ad Writer",
  "Pinterest Caption Generator": "Pinterest Caption Writer",
  "LinkedIn Ad Generator": "LinkedIn Ad Writer",
  "LinkedIn Article Generator": "LinkedIn Article Writer",
  "Quora Answer Generator": "Quora Answer Writer",
  // "Content Calendar Generator": "Content Calendar Planner",
  "SEO Keywords Generator": "SEO Keyword Generator",
  "Amazon Product Listing Generator": "Amazon Listing Writer",
  AiJobAutomationChecker: "Job Automation Checker",
  FinancialAdvisor: "AI Financial Advisor",
  SmallBusinessIdeaGenerator: "Business Ideas Generator",
  "Generate Image": "Compare AI Image Models",
  "Remove Background": "Background Remover",
  "Remove Object": "Object Remover",
  "Replace Background": "Background Replacer",
  "Upscale Image": "Image Upscaler",
  "ContentTranslator ": "Translator",
  "Content Translator": "Translator",
  "WebP to PNG converter": "WebP to PNG",
  "WebP to JPG converter": "WebP to JPG",
  "JPG to WebP converter": "JPG to WebP",
  "PNG to WebP converter": "PNG to WebP",
  "PNG to JPG converter": "PNG to JPG",
  "JPG to PNG converter": "JPG to PNG",
  "Convert JPG to PNG": "JPG to PNG",
  "Convert PNG to JPG": "PNG to JPG",
  "Convert PNG to WebP": "PNG to WebP",
  "Convert JPG to WebP": "JPG to WebP",
  "Convert WebP to JPG": "WebP to JPG",
  "Convert WebP to PNG": "WebP to PNG",
  RetirementCalculator: "Retirement Calculator",
  BudgetCalculator: "Budget Calculator",
  DebtRelief: "Debt Relief",
  BusinessNameGenerator: "Business Name Generator",
  AiJobProtectionPlan: "AI Job Protection Plan",
};

/**
 * Format camelCase or PascalCase model name to readable title
 */
function formatTitle(name) {
  if (!name) return "";
  const spaced = name.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

module.exports = {
  upsertSeoRecord,
  modelNameToSlugMap,
  modelNameToTitleMap,
  formatTitle,
};

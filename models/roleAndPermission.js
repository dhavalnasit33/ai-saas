const mongoose = require("mongoose");

const permissionUserMenuSchema = new mongoose.Schema(
  {
    CreateNew: { type: Boolean, default: false },
    Edit: { type: Boolean, default: false },
    ViewMenu: { type: Boolean, default: false },
    Delete: { type: Boolean, default: false },
    AddToken: { type: Boolean, default: false },
    UpdateStatus: { type: Boolean, default: false },
  },
  { _id: false },
);

const permissionToolCategoriesMenuSchema = new mongoose.Schema(
  {
    CreateNew: { type: Boolean, default: false },
    Edit: { type: Boolean, default: false },
    ViewMenu: { type: Boolean, default: false },
    Delete: { type: Boolean, default: false },
    StatusChange: { type: Boolean, default: false },
  },
  { _id: false },
);

const permissionPagesMenuSchema = new mongoose.Schema(
  {
    CreateNew: { type: Boolean, default: false },
    Edit: { type: Boolean, default: false },
    ViewMenu: { type: Boolean, default: false },
    Delete: { type: Boolean, default: false },
  },
  { _id: false },
);

const permissionCategorySchema = new mongoose.Schema(
  {
    UserMenu: { type: permissionUserMenuSchema, default: () => ({}) },
    ToolCategoriesMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    ToolsManagementMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    MarketingToolCategoriesMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    MarketingToolsManagementMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    HomeToolCategoriesMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    HomeToolTagMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    WritingCommonOtherToolsManageMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    CareerCommonOtherToolsManageMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    TravelCommonOtherToolsManageMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    FoodCommonOtherToolsManageMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    HealthCommonOtherToolsManageMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    BusinessCommonOtherToolsManageMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    FinanceCommonOtherToolsManageMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    // ExtraCommonOtherToolsManageMenu: {
    //   type: permissionToolCategoriesMenuSchema,
    //   default: () => ({}),
    // },
    // NewsMenu: { type: permissionToolCategoriesMenuSchema, default: () => ({}) },
    NewsCategoryMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    PagesMenu: { type: permissionPagesMenuSchema, default: () => ({}) },
    PageBuilderMenu: {
      Edit: { type: Boolean, default: false },
    },
    SystemLogsMenu: {
      ViewAllData: { type: Boolean, default: false },
    },
    ContactMenu: {
      ViewOnly: { type: Boolean, default: false },
      DeleteData: { type: Boolean, default: false },
    },
    SeoMenu: {
      Edit: { type: Boolean, default: false },
    },
    FaviconSettingMenu: {
      Edit: { type: Boolean, default: false },
    },
    DiscoverRecipesCategoriesMenu: {
      type: permissionPagesMenuSchema,
      default: () => ({}),
    },
    DiscoverRecipesCollectionsMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    DiscoverRecipesToolsMenu: {
      ViewMenu: { type: Boolean, default: false },
      Edit: { type: Boolean, default: false },
    },
    DiscoverDestinationsCategoriesMenu: {
      type: permissionPagesMenuSchema,
      default: () => ({}),
    },
    DiscoverDestinationsCollectionsMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    DiscoverDestinationsToolsMenu: {
      ViewMenu: { type: Boolean, default: false },
      Edit: { type: Boolean, default: false },
    },
    FindCompaniesMenu: {
      Edit: { type: Boolean, default: false },
    },
    CoverLetterGeneratorMenu: {
      Edit: { type: Boolean, default: false },
    },
    ResumeGeneratorMenu: {
      Edit: { type: Boolean, default: false },
    },
    JobProtectionMenu: {
      Edit: { type: Boolean, default: false },
    },
    JobAutomationCheckerMenu: {
      Edit: { type: Boolean, default: false },
    },
    OnlineIncomeMenu: {},
    BusinessNameGenerator: {
      Edit: { type: Boolean, default: false },
    },
    BusinessIdeasGenerator: {
      Edit: { type: Boolean, default: false },
    },
    InterviewPreparationMenu: {
      Edit: { type: Boolean, default: false },
    },
    EmailMenu: {
      Edit: { type: Boolean, default: false },
    },
    ParaphraseMenu: {
      Edit: { type: Boolean, default: false },
    },
    MessageMenu: {
      Edit: { type: Boolean, default: false },
    },
    CheckGrammarMenu: {
      Edit: { type: Boolean, default: false },
    },
    BlogPostMenu: {
      Edit: { type: Boolean, default: false },
    },
    SocialMediaMenu: {
      Edit: { type: Boolean, default: false },
    },
    TranslateContentMenu: {
      Edit: { type: Boolean, default: false },
    },
    WellnessMenu: {
      Edit: { type: Boolean, default: false },
    },
    TherapyMenu: {
      Edit: { type: Boolean, default: false },
    },
    WeightLossMenu: {
      Edit: { type: Boolean, default: false },
    },
    NutritionPlannerMenu: {
      Edit: { type: Boolean, default: false },
    },
    CalorieCalculatorMenu: {
      Edit: { type: Boolean, default: false },
    },
    SymptomCheckerMenu: {
      Edit: { type: Boolean, default: false },
    },
    SolutionsMenu: {
      Edit: { type: Boolean, default: false },
    },
    DocumentsMenu: {
      Edit: { type: Boolean, default: false },
    },
    ResearchMenu: {
      Edit: { type: Boolean, default: false },
    },
    MarketingMenu: {
      Edit: { type: Boolean, default: false },
    },
    FundingMenu: {
      Edit: { type: Boolean, default: false },
    },
    FinancialAdvisorMenu: {
      Edit: { type: Boolean, default: false },
    },
    SaveMoneyMenu: {
      Edit: { type: Boolean, default: false },
    },
    BudgetCalculatorMenu: {
      Edit: { type: Boolean, default: false },
    },
    RetirementCalculatorMenu: {
      Edit: { type: Boolean, default: false },
    },
    DebtReliefMenu: {
      Edit: { type: Boolean, default: false },
    },
    InvestingMenu: {
      Edit: { type: Boolean, default: false },
    },
    VisionBoardGeneratorMenu: {
      Edit: { type: Boolean, default: false },
    },
    LifeGoalsGeneratorMenu: {
      Edit: { type: Boolean, default: false },
    },
    NewYearsResolutionGeneratorMenu: {
      Edit: { type: Boolean, default: false },
    },
    KeywordSearchMenu: {
      Edit: { type: Boolean, default: false },
    },
    WebsiteSearchMenu: {
      Edit: { type: Boolean, default: false },
    },
    promptCategoryMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    promptDataMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    codingPromptTopicMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    imageStyleMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    imagePromptMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    videoPromptMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    alternativeToolsMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    LeadMagnetsMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    LeadMagnetCategoriesMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
    aiFilterMenu: {
      type: permissionToolCategoriesMenuSchema,
      default: () => ({}),
    },
  },
  { _id: false },
);

const roleAndPermissionSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: [50, "Role name cannot exceed 50 characters"],
    },
    permissions: {
      type: permissionCategorySchema,
      required: true,
      default: () => ({
        UserMenu: {},
        ToolCategoriesMenu: {},
        ToolsManagementMenu: {},
        // NewsMenu: {},
        NewsCategoryMenu: {},
        MarketingToolCategoriesMenu: {},
        MarketingToolsManagementMenu: {},
        HomeToolCategoriesMenu: {},
        HomeToolTagMenu: {},
        WritingCommonOtherToolsManageMenu: {},
        CareerCommonOtherToolsManageMenu: {},
        TravelCommonOtherToolsManageMenu: {},
        FoodCommonOtherToolsManageMenu: {},
        HealthCommonOtherToolsManageMenu: {},
        BusinessCommonOtherToolsManageMenu: {},
        FinanceCommonOtherToolsManageMenu: {},
        // ExtraCommonOtherToolsManageMenu: {},
        PagesMenu: {},
        PageBuilderMenu: {},
        SystemLogsMenu: {},
        ContactMenu: {},
        SeoMenu: {},
        FaviconSettingMenu: {},
        DiscoverRecipesCategoriesMenu: {},
        DiscoverRecipesCollectionsMenu: {},
        DiscoverRecipesToolsMenu: {},
        DiscoverDestinationsCategoriesMenu: {},
        DiscoverDestinationsCollectionsMenu: {},
        DiscoverDestinationsToolsMenu: {},
        FindCompaniesMenu: {},
        CoverLetterGeneratorMenu: {},
        ResumeGeneratorMenu: {},
        JobProtectionMenu: {},
        JobAutomationCheckerMenu: {},
        OnlineIncomeMenu: {},
        BusinessNameGeneratorMenu: {},
        BusinessIdeasGeneratorMenu: {},
        InterviewPreparationMenu: {},
        EmailMenu: {},
        ParaphraseMenu: {},
        MessageMenu: {},
        CheckGrammarMenu: {},
        BlogPostMenu: {},
        SocialMediaMenu: {},
        TranslateContentMenu: {},
        WellnessMenu: {},
        TherapyMenu: {},
        WeightLossMenu: {},
        NutritionPlannerMenu: {},
        CalorieCalculatorMenu: {},
        SymptomCheckerMenu: {},
        SolutionsMenu: {},
        DocumentsMenu: {},
        ResearchMenu: {},
        MarketingMenu: {},
        FundingMenu: {},
        FinancialAdvisorMenu: {},
        SaveMoneyMenu: {},
        BudgetCalculatorMenu: {},
        RetirementCalculatorMenu: {},
        DebtReliefMenu: {},
        InvestingMenu: {},
        VisionBoardGeneratorMenu: {},
        LifeGoalsGeneratorMenu: {},
        NewYearsResolutionGeneratorMenu: {},
        KeywordSearchMenu: {},
        WebsiteSearchMenu: {},
        promptCategoryMenu: {},
        promptDataMenu: {},
        codingPromptTopicMenu: {},
        imageStyleMenu: {},
        imagePromptMenu: {},
        videoPromptMenu: {},
        alternativeToolsMenu: {},
        LeadMagnetsMenu: {},
        LeadMagnetCategoriesMenu: {},
        aiFilterMenu: {},
      }),
    },
    created_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updated_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("RoleAndPermission", roleAndPermissionSchema);

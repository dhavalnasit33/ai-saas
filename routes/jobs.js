const express = require("express");
const Job = require("../models/Job");
const { protect } = require("../middleware/auth");
const User = require("../models/User");
const Location = require("../models/Location");

const router = express.Router();

// router.get("/", protect, async (req, res) => {
//   try {
//     const {
//       country,
//       employment_type,
//       search,
//       page = 1,
//       limit = 30,
//       is_favorite,
//       workplace,
//       seniority,
//       token, // <-- new: Rapid API pagination token
//     } = req.query;

//     console.log("Query params:", req.query);

//     // --- Step 0: Determine if we should call Rapid API ---
//     const shouldCallApi =
//       country || employment_type || search || workplace || seniority;
//     console.log("Should call Rapid API:", shouldCallApi);

//     let jobsData = [];

//     const seniorityMap = {
//       Intern: "intern",
//       "Entry-level": "entry",
//       "Mid-level": "midSenior",
//       Senior: "associate",
//       Manager: "director",
//     };

//     if (shouldCallApi) {
//       // --- Step 1: Prepare API params ---
//       let employmentTypesParam = "fulltime";
//       if (employment_type) {
//         employmentTypesParam = employment_type.split(",").join(";");
//       }

//       let experienceLevelsParam = "";
//       if (seniority) {
//         experienceLevelsParam = seniority
//           .split(",")
//           .map((s) => seniorityMap[s.trim()])
//           .filter(Boolean)
//           .join(";");
//       }

//       let workplaceTypesParam = "";
//       if (workplace) {
//         workplaceTypesParam = workplace.split(",").join(";");
//       }

//       console.log("Employment types:", employmentTypesParam);
//       console.log("Experience levels:", experienceLevelsParam);
//       console.log("Workplace types:", workplaceTypesParam);

//       const apiParams = {
//         location: country || "new york",
//         query: search || "",
//         employmentTypes: employmentTypesParam,
//         workplaceTypes: workplaceTypesParam,
//         token: token || undefined, // <-- add token to API call
//         limit: Number(limit), // optional, if API supports
//       };

//       if (experienceLevelsParam) {
//         apiParams.experienceLevels = experienceLevelsParam;
//       }

//       // --- Step 2: Call Rapid API ---
//       const response = await axios.get(`${process.env.RAPID_API_URL}/search`, {
//         params: apiParams,
//         headers: {
//           "x-rapidapi-key": process.env.RAPID_API_KEY,
//           "x-rapidapi-host": "jobs-api14.p.rapidapi.com",
//         },
//       });

//       console.log("Rapid API response status:", response.status);
//       jobsData = response.data?.data || response.data?.jobs || [];
//       const nextToken = response.data?.meta?.nextToken; // <-- save nextToken
//       console.log("Jobs fetched from API:", jobsData.length);

//       // --- Step 3: Map & Save jobs in DB ---
//       const mappedJobs = jobsData.map((job) => {
//         let workplaceValue = "ONSITE";
//         if (workplaceTypesParam.includes("remote")) workplaceValue = "REMOTE";
//         else if (workplaceTypesParam.includes("hybrid"))
//           workplaceValue = "HYBRID";

//         return {
//           job_id: job.id,
//           job_title: job.title || "",
//           employer_name: job.companyName || job.linkedinCompanyName || "",
//           employer_logo: job.image || "",
//           job_publisher: job.jobProvider || "",
//           job_posted_at: job.postedTimeAgo || "",
//           job_location: job.location || "",
//           country: country || "",
//           job_employment_type:
//             job.employmentType || employment_type || "fulltime",
//           workplace: workplaceValue,
//           seniority: job.seniorityLevel?.toUpperCase() || "ENTRY-LEVEL",
//         };
//       });

//       console.log("Mapped jobs count:", mappedJobs.length);

//       for (let job of mappedJobs) {
//         const updated = await Job.findOneAndUpdate(
//           { job_id: job.job_id },
//           job,
//           {
//             upsert: true,
//             new: true,
//           }
//         );
//         console.log("Job saved/updated in DB:", updated.job_id);
//       }

//       // --- Step 8: Response ---
//       res.json({
//         success: true,
//         page: Number(page),
//         limit: Number(limit),
//         total_jobs: await Job.countDocuments({}), // total jobs in DB
//         total_pages: Math.ceil((await Job.countDocuments({})) / limit),
//         jobs: mappedJobs,
//         nextToken: nextToken || null, // <-- send nextToken to frontend
//       });
//     } else {
//       console.log("Skipping Rapid API call, fetching from DB only");

//       // --- DB fetch with pagination ---
//       const filters = {};

//       // --- Favorites filter ---
//       let favoriteIds = [];
//       if (req.user) {
//         const user = await User.findById(req.user.id).select("favorites");
//         favoriteIds = user?.favorites?.map((id) => id.toString()) || [];

//         if (is_favorite === "true") {
//           filters._id = { $in: favoriteIds };
//         }
//       }

//       const skip = (Number(page) - 1) * Number(limit);
//       const jobsCount = jobsData.length;

//       const jobs = await Job.find(filters)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(Number(limit));

//       const jobsWithExtra = jobs.map((job) => ({
//         ...job.toObject(),
//         is_favorite: favoriteIds.includes(job._id.toString()),
//       }));

//       res.json({
//         success: true,
//         page: Number(page),
//         limit: Number(limit),
//         total_jobs: jobsCount,
//         total_pages: Math.ceil(jobsCount / limit),
//         jobs: jobsWithExtra,
//         nextToken: null, // no token for DB-only fetch
//       });
//     }
//   } catch (error) {
//     console.error("Error fetching jobs:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching jobs",
//       error: error.response?.data || error.message,
//     });
//   }
// });

// router.get("/", async (req, res) => {
//   try {
//     const { search, page = 1, limit = 30, country, employment_type, workplace, seniority } = req.query;
//     console.log("Query params:", req.query);

//     let jobsData = [];
//     const shouldCallApi = search || country || employment_type || workplace || seniority;
//     console.log("Should call Rapid API:", shouldCallApi);

//     if (shouldCallApi) {
//       const apiParams = {
//         location: country || "",
//         query: search || "developer",
//         employmentTypes: employment_type ? employment_type.split(",").join(";") : "fulltime",
//         workplaceTypes: workplace ? workplace.split(",").join(";") : "",
//       };

//       if (seniority) {
//         const seniorityMap = { Intern: "intern", "Entry-level": "entry", "Mid-level": "midSenior", Senior: "associate", Manager: "director" };
//         apiParams.experienceLevels = seniority.split(",").map(s => seniorityMap[s.trim()]).filter(Boolean).join(";");
//       }

//       console.log("Rapid API params:", apiParams);

//       const response = await axios.get(`${process.env.RAPID_API_URL}/search`, {
//         params: apiParams,
//         headers: {
//           "x-rapidapi-key": process.env.RAPID_API_KEY,
//           "x-rapidapi-host": "jobs-api14.p.rapidapi.com",
//         },
//       });

//       console.log("Rapid API response status:", response.status);
//       jobsData = response.data?.jobs || response.data?.data || [];
//       console.log("Jobs fetched from Rapid API:", jobsData);

//       // Save jobs exactly as returned
//       for (let job of jobsData) {
//         await Job.findOneAndUpdate(
//           { job_id: job.id },
//           {
//             job_id: job.id,
//             job_title: job.title || "",
//             employer_name: job.companyName || "",
//             employer_logo: job.companyLogo || job.image ||  "",
//             employer_website: job.companyWebsite || "",
//             job_publisher: job.jobProvider || "",
//             job_employment_type: job.employmentType ||employment_type|| "",
//             job_apply_link: job.linkedinUrl || "",
//             job_apply_is_direct: job.isDirectApply || false,
//             apply_options: job.applyOptions || [],
//             job_posted_at: job.datePosted || "",
//             job_posted_at_timestamp: job.timestamp || 0,
//             job_location: job.location || "",
//             job_city: job.city || "",
//             job_state: job.state || "",
//             job_latitude: job.latitude || 0,
//             job_longitude: job.longitude || 0,
//             job_benefits: job.benefits || [],
//             job_google_link: job.googleLink || "",
//             job_salary: job.salary || "",
//             job_onet_soc: job.onetSoc || "",
//             employment_type: job.employmentTypes || [],
//             workplace: job.workplace || workplace ||"ONSITE",
//             seniority: job.seniority || seniority ||"ENTRY-LEVEL",
//             salary: job.salaryDetails || { min: 0, max: 0, period: "YEAR" },
//             country: job.country || country ||"",
//             job_post_date: job.postDate || new Date(),
//             description: job.description || "",
//             job_highlights_computed: job.highlights || { qualifications: [], responsibilities: [], benefits: [] },
//             is_favorite: false,
//           },
//           { upsert: true, new: true }
//         );
//       }
//     }

//     // Fetch all jobs from DB, no filters
//     const skip = (Number(page) - 1) * Number(limit);
//     const totalJobs = await Job.countDocuments();
//     const jobs = await Job.find().sort({ createdAt: -1 }).skip(skip).limit(Number(limit));

//     console.log("Total jobs in DB:", totalJobs);
//     console.log("Jobs fetched for page:", jobs.length);

//     res.json({
//       success: true,
//       page: Number(page),
//       limit: Number(limit),
//       total_jobs: totalJobs,
//       total_pages: Math.ceil(totalJobs / limit),
//       jobs,
//     });

//   } catch (err) {
//     console.error("Error fetching jobs:", err);
//     res.status(500).json({ success: false, message: "Error fetching jobs", error: err.message });
//   }
// });

// router.get("/", protect, async (req, res) => {
//   try {
//     const {
//       country,
//       employment_type,
//       search,
//       page = 1,
//       limit = 30,
//       is_favorite,
//       workplace,
//       seniority,
//       token, // <-- new: Rapid API pagination token
//     } = req.query;

//     console.log("Query params:", req.query);

//     // --- Step 0: Determine if we should call Rapid API ---
//     const shouldCallApi =
//       country || employment_type || search || workplace || seniority;
//     console.log("Should call Rapid API:", shouldCallApi);

//     let jobsData = [];

//     const seniorityMap = {
//       Intern: "intern",
//       "Entry-level": "entry",
//       "Mid-level": "midSenior",
//       Senior: "associate",
//       Manager: "director",
//     };

//     if (shouldCallApi) {
//       // --- Step 1: Prepare API params ---
//       let employmentTypesParam = "fulltime";
//       if (employment_type) {
//         employmentTypesParam = employment_type.split(",").join(";");
//       }

//       let experienceLevelsParam = "";
//       if (seniority) {
//         experienceLevelsParam = seniority
//           .split(",")
//           .map((s) => seniorityMap[s.trim()])
//           .filter(Boolean)
//           .join(";");
//       }

//       let workplaceTypesParam = "";
//       if (workplace) {
//         workplaceTypesParam = workplace.split(",").join(";");
//       }

//       console.log("Employment types:", employmentTypesParam);
//       console.log("Experience levels:", experienceLevelsParam);
//       console.log("Workplace types:", workplaceTypesParam);

//       const apiParams = {
//         location: country || "new york",
//         query: search || "",
//         employmentTypes: employmentTypesParam,
//         workplaceTypes: workplaceTypesParam,
//         token: token || undefined, // <-- add token to API call
//         limit: Number(limit), // optional, if API supports
//       };

//       if (experienceLevelsParam) {
//         apiParams.experienceLevels = experienceLevelsParam;
//       }

//       // --- Step 2: Call Rapid API ---
//       const response = await axios.get(`${process.env.RAPID_API_URL}/search`, {
//         params: apiParams,
//         headers: {
//           "x-rapidapi-key": process.env.RAPID_API_KEY,
//           "x-rapidapi-host": "jobs-api14.p.rapidapi.com",
//         },
//       });

//       console.log("Rapid API response status:", response.status);
//       jobsData = response.data?.data || response.data?.jobs || [];
//       const nextToken = response.data?.meta?.nextToken; // <-- save nextToken
//       console.log("Jobs fetched from API:", jobsData.length);

//       // --- Step 3: Map & Save jobs in DB ---
//       const mappedJobs = jobsData.map((job) => {
//         let workplaceValue = "ONSITE";
//         if (workplaceTypesParam.includes("remote")) workplaceValue = "REMOTE";
//         else if (workplaceTypesParam.includes("hybrid"))
//           workplaceValue = "HYBRID";

//         return {
//             ...job,
//           job_id: job.id,
//           job_title: job.title || "",
//           employer_name: job.companyName || job.linkedinCompanyName || "",
//           employer_logo: job.image || "",
//           job_publisher: job.jobProvider || "",
//           job_posted_at: job.postedTimeAgo || "",
//           job_location: job.location || "",
//           country: country || "",
//           job_employment_type:
//             job.employmentType || employment_type || "fulltime",
//           workplace: workplaceValue,
//           seniority: job.seniorityLevel?.toUpperCase() || "ENTRY-LEVEL",
//         };
//       });

//       console.log("Mapped jobs count:", mappedJobs.length);

//      const savedJobs = [];
//       for (let job of mappedJobs) {
//         const updated = await Job.findOneAndUpdate(
//           { job_id: job.job_id }, // match by RapidAPI id
//           job,
//           { upsert: true, new: true }
//         );
//         console.log("Job saved/updated in DB:", updated.job_id);
//         savedJobs.push(updated);
//       }

//       // --- Step 5: Response ---
//       const totalJobs = await Job.countDocuments({});

//       // --- Step 8: Response ---
//     res.json({
//         success: true,
//         page: Number(page),
//         limit: Number(limit),
//         total_jobs: totalJobs,
//         total_pages: Math.ceil(totalJobs / limit),
//         jobs: savedJobs, // MongoDB docs with _id
//         nextToken,
//       });
//     } else {
//       console.log("Skipping Rapid API call, fetching from DB only");

//       // --- DB fetch with pagination ---
//       const filters = {};

//       // --- Favorites filter ---
//       let favoriteIds = [];
//       if (req.user) {
//         const user = await User.findById(req.user.id).select("favorites");
//         favoriteIds = user?.favorites?.map((id) => id.toString()) || [];

//         if (is_favorite === "true") {
//           filters._id = { $in: favoriteIds };
//         }
//       }

//       const skip = (Number(page) - 1) * Number(limit);

//       const jobs = await Job.find(filters)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(Number(limit));

//       const jobsWithExtra = jobs.map((job) => ({
//         ...job.toObject(),
//         is_favorite: favoriteIds.includes(job._id.toString()),
//       }));

//       const totalJobs = await Job.countDocuments(filters);
//       res.json({
//         success: true,
//         page: Number(page),
//         limit: Number(limit),
//         total_jobs:totalJobs,
//         total_pages: Math.ceil(totalJobs / limit),
//         jobs: jobsWithExtra,
//         nextToken: null, // no token for DB-only fetch
//       });
//     }
//   } catch (error) {
//     console.error("Error fetching jobs:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching jobs",
//       error: error.response?.data || error.message,
//     });
//   }
// });

const seniorityToRequirementMap = {
  "Entry-level": "no_experience",
  Junior: "under_3_years_experience",
  "Mid-level": "more_than_3_years_experience",
  Senior: "more_than_3_years_experience",
  Manager: "more_than_3_years_experience",
};

const employmentTypeMap = {
  fulltime: "FULLTIME",
  parttime: "PARTTIME",
  contractor: "CONTRACTOR",
  internship: "INTERN",
};

router.get("/", protect, async (req, res) => {
  try {
    let {
      page = 1,
      num_pages = 1,
      country,
      date_posted = "all",
      employment_type,
      workplace,
      seniority,
      limit = 10,
      search,
      is_favorite,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
     
    // --- Get user's favorite job IDs ---
    let favoriteIds = [];
    if (req.user) {
      const user = await User.findById(req.user.id).select("favorites");
      favoriteIds = user?.favorites?.map((id) => id.toString()) || [];
    }

    // --- If only favorites requested ---
    if (is_favorite === "true") {
      const jobsFromDB = await Job.find({
        job_id: { $in: favoriteIds },
        employer_logo: { $ne: null },
      })
        .sort({ job_post_date: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total_jobs = await Job.countDocuments({
        job_id: { $in: favoriteIds },
        employer_logo: { $ne: null },
      });

      return res.json({
        success: true,
        page,
        limit,
        total_jobs,
        total_pages: Math.ceil(total_jobs / limit),
        jobs: jobsFromDB.map((job) => ({
          ...job.toObject(),
          is_favorite: favoriteIds.includes(job.job_id),
        })),
      });
    }

    // ✅ Check if no filters/search are provided
    const noFilters =
      (!employment_type || employment_type.trim() === "") &&
      (!workplace || workplace.trim() === "") &&
      (!country || country.trim() === "") &&
      (!search || search.trim() === "") &&
      (!seniority || seniority.trim() === "");

    if (noFilters) {
      
      search = "Manager";
      country = "United States";
       seniority = "Manager";

      let countryCode = "us";
      const locationDoc = await Location.findOne({
        country: { $regex: `^${country}$`, $options: "i" },
      });
      if (locationDoc) countryCode = locationDoc.short_code.toLowerCase();

      // Fetch jobs from DB or RapidAPI with these defaults
      const jobsFromDB = await Job.find({
        employer_logo: { $ne: null },
        country: countryCode,
         job_title: { $regex: "Manager", $options: "i" },
      })
        .sort({ job_post_date: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total_jobs = await Job.countDocuments({
        employer_logo: { $ne: null },
        country: countryCode,
         job_title: { $regex: "Manager", $options: "i" },
      });

      return res.json({
        success: true,
        total_jobs,
        page,
        limit,
        total_pages: Math.ceil(total_jobs / limit),
        jobs: jobsFromDB.map((job) => ({
          ...job.toObject(),
          is_favorite: favoriteIds.includes(job.job_id),
        })),
      });
    }

    // ✅ --- If there are filters, continue as before ---
    if (!search || search.trim() === "") search = "Manager";

    let countryCode = "us";
    if (country && country.trim() !== "") {
      const locationQuery = country.trim();
      let locationDoc = await Location.findOne({
        country: { $regex: `^${locationQuery}$`, $options: "i" },
      });

      if (!locationDoc) {
        locationDoc = await Location.findOne({
          $or: [
            { state: { $regex: locationQuery, $options: "i" } },
            { city: { $regex: locationQuery, $options: "i" } },
          ],
        });
      }

      if (locationDoc) countryCode = locationDoc.short_code.toLowerCase();
      else search = `${search} in ${locationQuery}`;
    }

    // --- Build RapidAPI query params ---
    const params = new URLSearchParams({
      query: search,
      page,
      num_pages,
      country: countryCode,
      date_posted,
    });
    if (limit) params.append("limit", limit);

    let employmentTypesValues = [];
    if (employment_type) {
      const types = employment_type
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .map((t) => employmentTypeMap[t])
        .filter(Boolean);
      if (types.length > 0) {
        params.append("employment_types", [...new Set(types)].join(","));
        employmentTypesValues = types;
      }
    }

    let workplaceValues = [];
    if (workplace) {
      const types = workplace.split(",").map((t) => t.trim().toLowerCase());
      if (types.includes("remote")) {
        params.append("work_from_home", "true");
        workplaceValues.push("REMOTE");
      }
      if (types.includes("onsite")) workplaceValues.push("ONSITE");
      if (types.includes("hybrid")) workplaceValues.push("HYBRID");
    }

    let seniorityValues = ["ENTRY-LEVEL"];
    if (seniority) {
      const seniorityList = seniority.split(",").map((s) => s.trim());
      const requirementValues = seniorityList
        .map((s) => seniorityToRequirementMap[s])
        .filter(Boolean);
      if (requirementValues.length > 0)
        params.append(
          "job_requirements",
          [...new Set(requirementValues)].join(",")
        );
      seniorityValues = seniorityList.map((s) => s.toUpperCase());
    }

    const apiUrl = `${process.env.RAPID_API_URL}/search?${params.toString()}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
        "x-rapidapi-key": process.env.RAPID_API_KEY,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        total_jobs: 0,
        page,
        limit,
        total_pages: 0,
        jobs: [],
        error: data,
      });
    }

    let jobs = [];
    if (data.data && Array.isArray(data.data)) {
      const bulkOps = data.data.map((job) => {
        const jobDoc = {
          job_id: job.job_id,
          job_title: job.job_title,
          employer_name: job.employer_name,
          employer_logo: job.employer_logo,
          employer_website: job.employer_website,
          job_publisher: job.job_publisher,
          job_employment_type: job.job_employment_type,
          job_apply_link: job.job_apply_link,
          job_apply_is_direct: job.job_apply_is_direct,
          apply_options: job.apply_options || [],
          job_posted_at: job.job_posted_at || "",
          job_posted_at_timestamp: job.job_posted_at_timestamp,
          job_location: job.job_location,
          job_city: job.job_city,
          job_state: job.job_state,
          job_latitude: job.job_latitude,
          job_longitude: job.job_longitude,
          job_benefits: job.job_benefits || [],
          job_google_link: job.job_google_link,
          job_salary: job.job_salary,
          job_onet_soc: job.job_onet_soc,
          employment_type: employmentTypesValues || [],
          workplace:
            workplaceValues.length > 0
              ? workplaceValues
              : job.job_is_remote
              ? ["REMOTE"]
              : job.job_location
              ? ["ONSITE"]
              : [],
          seniority: seniorityValues,
          country: job.job_country || countryCode,
          salary: {
            min: job.job_min_salary || 0,
            max: job.job_max_salary || 0,
            period: job.job_salary_period || "YEAR",
          },
          job_post_date: job.job_posted_at_datetime_utc
            ? new Date(job.job_posted_at_datetime_utc)
            : new Date(),
          description: job.job_description || "",
          job_highlights_computed: {
            qualifications: job.job_highlights?.Qualifications || [],
            responsibilities: job.job_highlights?.Responsibilities || [],
            benefits: job.job_highlights?.Benefits || [],
          },
        };

        jobs.push({
          ...jobDoc,
          is_favorite: favoriteIds.includes(job.job_id),
        });

        return {
          updateOne: {
            filter: { job_id: job.job_id },
            update: { $setOnInsert: jobDoc },
            upsert: true,
          },
        };
      });

      if (bulkOps.length > 0) await Job.bulkWrite(bulkOps);
    }

    jobs.sort((a, b) => new Date(b.job_post_date) - new Date(a.job_post_date));

    const total_jobs = data.total_jobs || jobs.length;
    const total_pages = Math.ceil(total_jobs / limit);

    res.json({
      success: true,
      total_jobs,
      page,
      limit,
      total_pages,
      jobs,
    });
  } catch (err) {
    console.error("❌ Error fetching or saving jobs:", err);
    res.status(500).json({
      success: false,
      total_jobs: 0,
      page: 1,
      limit: 10,
      total_pages: 0,
      jobs: [],
      error: "Something went wrong",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 🔍 Find job by job_id field in MongoDB
    const job = await Job.findOne({ job_id: id });

    if (!job) {
      return res
        .status(404)
        .json({ success: false, message: "Job not found in DB" });
    }

    res.json({ success: true, job });
  } catch (error) {
    console.error("Error fetching job:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/favorite-jobs", protect, async (req, res) => {
  try {
    const { favoriteJobIds } = req.body; // <-- these should be job_id values (strings)

    if (
      !favoriteJobIds ||
      !Array.isArray(favoriteJobIds) ||
      favoriteJobIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "favoriteJobIds must be a non-empty array of job_id",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // make sure user.favorites is storing job_id strings
    if (!Array.isArray(user.favorites)) {
      user.favorites = [];
    }

    let added = [];
    let removed = [];

    favoriteJobIds.forEach((jobId) => {
      const index = user.favorites.indexOf(jobId);

      if (index === -1) {
        user.favorites.push(jobId); // save job_id instead of _id
        added.push(jobId);
      } else {
        user.favorites.splice(index, 1); // remove by job_id
        removed.push(jobId);
      }
    });

    await user.save();

    res.json({
      success: true,
      message: "Favorite jobs updated",
      added,
      removed,
      totalFavorites: user.favorites.length,
    });
  } catch (err) {
    console.error("❌ Error updating favorite jobs:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;

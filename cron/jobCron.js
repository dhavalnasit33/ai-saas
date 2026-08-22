// const axios = require("axios");
// const cron = require("node-cron");
// const Job = require("../models/Job");

// const jobQueries = ["remote developer jobs"];
// const countries = [
//   "us",
//   "gb",
//   "de",
//   "fr",
//   "se",
//   "in",
//   "cn",
//   "au",
//   "ca",
//   "nz",
//   "br",
//   "za",
//   "ar",
//   "ie",
//   "mx",
// ];

// // Utility: chunk an array into smaller arrays
// const chunkArray = (arr, size) => {
//   const result = [];
//   for (let i = 0; i < arr.length; i += size) {
//     result.push(arr.slice(i, i + size));
//   }
//   return result;
// };

// const fetchAndSaveJobs = async () => {
//   try {
//     console.log("🚀 Job cron started...");

//     for (const query of jobQueries) {
//       for (const country of countries) {
//         const response = await axios.get(
//           "https://jsearch.p.rapidapi.com/search",
//           {
//             params: {
//               query,
//               page: "1",
//               num_pages: "1",
//               date_posted: "all",
//               country,
//             },
//             headers: {
//               "x-rapidapi-host": "jsearch.p.rapidapi.com",
//               "x-rapidapi-key": process.env.RAPID_API_KEY,
//             },
//           }
//         );

//         const jobs = response.data.data || [];
//         const chunks = chunkArray(jobs, 50);

//         for (const chunk of chunks) {
//           const bulkOps = chunk.map((job) => ({
//             updateOne: {
//               filter: { job_id: job.job_id },
//               update: {
//                 $set: {
//                   job_title: job.job_title || "",
//                   employer_name: job.employer_name || "",
//                   employer_logo: job.employer_logo || "",
//                   employer_website: job.employer_website || "",
//                   job_publisher: job.job_publisher || "",
//                   job_employment_type: job.job_employment_type || "",
//                   job_apply_link: job.job_apply_link || "",
//                   job_apply_is_direct: job.job_apply_is_direct || false,
//                   apply_options: job.apply_options || [],
//                   job_posted_at: job.job_posted_at || "",
//                   job_posted_at_timestamp: job.job_posted_at_timestamp || 0,
//                   job_location: job.job_location || "",
//                   job_city: job.job_city || "",
//                   job_state: job.job_state || "",
//                   job_latitude: job.job_latitude || 0,
//                   job_longitude: job.job_longitude || 0,
//                   job_benefits: job.job_benefits || [],
//                   job_google_link: job.job_google_link || "",
//                   job_salary: job.job_salary || "",
//                   job_onet_soc: job.job_onet_soc || "",
//                   employment_type: job.job_employment_types?.map((t) =>
//                     t.toUpperCase()
//                   ) || ["FULLTIME"],
//                   workplace: "REMOTE",
//                   seniority:
//                     job.job_onet_job_zone === 1
//                       ? "ENTRY-LEVEL"
//                       : job.job_onet_job_zone === 2
//                       ? "MID-LEVEL"
//                       : job.job_onet_job_zone === 3
//                       ? "SENIOR"
//                       : job.job_onet_job_zone >= 4
//                       ? "MANAGER"
//                       : "ENTRY-LEVEL",
//                   salary: {
//                     min: job.job_min_salary || 0,
//                     max: job.job_max_salary || 0,
//                     period: job.job_salary_period || "YEAR",
//                   },
//                   country:
//                     job.job_country?.toUpperCase() || country.toUpperCase(),
//                   job_post_date: job.job_posted_at_datetime_utc
//                     ? new Date(job.job_posted_at_datetime_utc)
//                     : new Date(),
//                   description: job.job_description,
//                   job_highlights_computed: {
//                     qualifications: job.job_highlights?.Qualifications || [],
//                     responsibilities:
//                       job.job_highlights?.Responsibilities || [],
//                     benefits: job.job_highlights?.Benefits || [],
//                   },
//                 },
//               },
//               upsert: true,
//             },
//           }));

//           if (bulkOps.length > 0) {
//             await Job.bulkWrite(bulkOps);
//             console.log(
//               `✅ Inserted/updated ${bulkOps.length} jobs [${query} - ${country}]`
//             );
//           }
//         }
//       }
//     }

//     console.log("🎉 Job cron finished!");
//   } catch (err) {
//     console.error("❌ Error in job cron:", err.message);
//   }
// };

// cron.schedule("0 0 * * *", fetchAndSaveJobs);

// module.exports = fetchAndSaveJobs;

const axios = require("axios");
const Job = require("../models/Job");

const chunkArray = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

const fetchAndSaveJobsOnce = async (search, country, employment_type) => {
  console.log("🚀 Fetching jobs from RapidAPI...");
  console.log(
    "Search:",
    search,
    "Country:",
    country,
    "Employment_type:",
    employment_type
  );

  const rapidApiUrl = "https://jsearch.p.rapidapi.com/search";
  const params = {
    query: `${search}`,
    page: "1",
    num_pages: "1",
    date_posted: "all",
  };

  if (country) params.country = country.toUpperCase();

  let mappedTypes = [];
  if (employment_type) {
    const mapTypes = {
      "FULL-TIME": "FULLTIME",
      FULLTIME: "FULLTIME",
      "PART-TIME": "PARTTIME",
      PARTTIME: "PARTTIME",
      INTERNSHIP: "INTERN",
      INTERN: "INTERN",
      CONTRACT: "CONTRACTOR",
      CONTRACTOR: "CONTRACTOR",
    };

    mappedTypes = employment_type
      .split(",")
      .map((t) => t.trim().toUpperCase().replace(/\s+/g, "-"))
      .map((t) => mapTypes[t])
      .filter(Boolean);

    if (mappedTypes.length) params.employment_types = mappedTypes.join(",");
  }

  const response = await axios.get(rapidApiUrl, {
    params,
    headers: {
      "x-rapidapi-host": "jsearch.p.rapidapi.com",
      "x-rapidapi-key": process.env.RAPID_API_KEY,
    },
  });

  const jobs = response.data.data || [];

  const chunks = chunkArray(jobs, 50);

  for (const chunk of chunks) {
    const bulkOps = chunk.map((job) => {
      const employmentTypesArray = job.job_employment_types
        ? Array.isArray(job.job_employment_types)
          ? job.job_employment_types.map((t) => t.toUpperCase())
          : [job.job_employment_types.toUpperCase()]
        : mappedTypes.length > 0
        ? mappedTypes
        : ["FULLTIME"];

      return {
        updateOne: {
          filter: { job_id: job.job_id },
          update: {
            $set: {
              job_title: job.job_title || "",
              employer_name: job.employer_name || "",
              employer_logo: job.employer_logo || "",
              employer_website: job.employer_website || "",
              job_publisher: job.job_publisher || "",
              job_apply_link: job.job_apply_link || "",
              job_apply_is_direct: job.job_apply_is_direct || false,
              apply_options: job.apply_options || [],
              job_posted_at: job.job_posted_at || "",
              job_posted_at_timestamp: job.job_posted_at_timestamp || 0,
              job_location: job.job_location || "",
              job_city: job.job_city || "",
              job_state: job.job_state || "",
              job_latitude: job.job_latitude || 0,
              job_longitude: job.job_longitude || 0,
              job_benefits: job.job_benefits || [],
              job_google_link: job.job_google_link || "",
              job_salary: job.job_salary || "",
              job_onet_soc: job.job_onet_soc || "",
              employment_type: employmentTypesArray,
              job_employment_type:
                job.job_employment_type || employmentTypesArray[0],
              workplace:
                job.job_is_remote === true
                  ? "REMOTE"
                  : job.job_is_remote === false
                  ? "ONSITE"
                  : "HYBRID",
              seniority:
                job.job_onet_job_zone === 1
                  ? "ENTRY-LEVEL"
                  : job.job_onet_job_zone === 2
                  ? "MID-LEVEL"
                  : job.job_onet_job_zone === 3
                  ? "SENIOR"
                  : job.job_onet_job_zone >= 4
                  ? "MANAGER"
                  : undefined,
              salary: {
                min: job.job_min_salary || 0,
                max: job.job_max_salary || 0,
                period: job.job_salary_period || "YEAR",
              },
              country: job.job_country?.toUpperCase() || country.toUpperCase(),
              job_post_date: job.job_posted_at_datetime_utc
                ? new Date(job.job_posted_at_datetime_utc)
                : new Date(),
              description: job.job_description || "",
              job_highlights_computed: {
                qualifications: job.job_highlights?.Qualifications || [],
                responsibilities: job.job_highlights?.Responsibilities || [],
                benefits: job.job_highlights?.Benefits || [],
              },
            },
          },
          upsert: true,
        },
      };
    });

    if (bulkOps.length > 0) {
    const result = await Job.bulkWrite(bulkOps);
    console.log(`🔹 Saved ${bulkOps.length} jobs to DB (matched: ${result.matchedCount}, upserted: ${result.upsertedCount})`);
  } else {
    console.log("⚠️ No jobs in this chunk to save");
  }
}
};

module.exports = fetchAndSaveJobsOnce;

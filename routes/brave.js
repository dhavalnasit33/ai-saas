const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

const BRAVE_BASE_URL = 'https://api.search.brave.com/res/v1';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY || 'BSA7mwV9jUSxANF3b2Vgn9JbDZC2eEz';
const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY || 'BSArynF5_ybwo_NAliAJfLg4wfDsJuK';
const BRAVE_SUGGEST_API_KEY = process.env.BRAVE_SUGGEST_API_KEY || 'BSAH4k894X199Ih-vEemfFBFaTdefXw';

// Utility function (unchanged)
const fetchBraveResults = async (type, q) => {
  const response = await axios.get(`${BRAVE_BASE_URL}/${type}/search`, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
    params: { q },
  });
  return response.data;
};

// Main search (web/images/news/videos)
router.get('/search/:type', async (req, res) => {
  const { type } = req.params;
  const { q } = req.query;

  if (!['web', 'images', 'news', 'videos'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  try {
    const result = await fetchBraveResults(type, q);
     if (type === 'news' && Array.isArray(result.results)) {
      result.results.sort((a, b) => {
        const dateA = new Date(a.page_age || 0);
        const dateB = new Date(b.page_age || 0);
        return dateB - dateA; 
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spellcheck
router.get('/spellcheck', async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const response = await axios.get(`${BRAVE_BASE_URL}/spellcheck/search`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_SEARCH_API_KEY,
      },
      params: { q },
    });

    res.json(response.data);
  } catch (err) {
    console.error('❌ Brave spellcheck error:', err.message);
    res.status(500).json({ error: 'Failed to fetch spellcheck suggestions' });
  }
});

// Suggestions
router.get('/suggestions', async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const response = await axios.get(`${BRAVE_BASE_URL}/suggest/search`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_SUGGEST_API_KEY,
      },
      params: { q },
    });

    res.json(response.data);
  } catch (err) {
    console.error('❌ Brave suggestions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch search suggestions' });
  }
});

module.exports = router;

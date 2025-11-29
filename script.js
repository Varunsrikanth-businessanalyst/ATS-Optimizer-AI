// ========= TEXT HELPERS ========= //

function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function splitWords(text) {
  return normalizeText(text)
    .split(/\s+/)
    .filter(Boolean);
}

// Base stopwords + extra common words we NEVER want as "keywords"
const STOPWORDS = new Set([
  // articles, conjunctions, prepositions
  "and", "or", "the", "a", "an", "to", "for", "of", "in", "on", "at",
  "with", "by", "is", "are", "was", "were", "as", "that", "this",
  "from", "be", "have", "has", "had", "it", "its", "will", "can",
  "but", "if", "than", "then", "so", "because", "while", "when",
  "about", "into", "over", "under", "up", "down", "out", "off",
  "also", "just", "very", "more", "most", "such",

  // pronouns
  "i", "me", "my", "mine",
  "you", "your", "yours",
  "he", "him", "his",
  "she", "her", "hers",
  "we", "us", "our", "ours",
  "they", "them", "their", "theirs",
  "someone", "everyone", "anyone", "everyone",

  // generic nouns / verbs we don't want as keywords
  "team", "teams", "work", "working", "works",
  "role", "roles",
  "customer", "customers", // often too generic, we still pick "customer" via curated list if needed
  "people", "person",
  "user", "users", // same – handled via curated lists when needed
  "time", "day", "days",
  "year", "years",
  "way", "ways",
  "thing", "things",
  "part", "parts",

  // generic verbs / adjectives that don't help ATS
  "ensure", "ensures", "ensured",
  "use", "uses", "using", "used",
  "own", "owned", "owning",
  "build", "builds", "building", "built",
  "help", "helps", "helping", "helped",
  "make", "makes", "making", "made",
  "take", "takes", "taking", "taken",
  "drive", "drives", "driving", "driven",
  "closely", "every", "each", "many", "few",
  "strong", "great", "good", "better", "best",
  "high", "low", "new", "old"
]);

// Curated keyword lists to classify JD terms
const TOOL_KEYWORDS = new Set([
  "sql", "python", "r", "tableau", "powerbi", "excel", "looker",
  "jira", "confluence", "figma", "miro",
  "aws", "azure", "gcp", "snowflake", "databricks",
  "airflow", "dbt",
  "java", "javascript", "typescript", "react", "node",
  "spark", "hadoop",
  "kanban", "salesforce",
  "kubernetes", "docker",
  "api", "apis",
  "postman", "git", "github"
]);

const SKILL_KEYWORDS = new Set([
  "roadmap", "backlog", "prioritization", "prioritize",
  "discovery", "experimentation", "experiment", "experiments",
  "testing", "a/b", "ab", "hypothesis",
  "analytics", "analysis", "insights",
  "metrics", "kpis", "okr", "okrs",
  "stakeholder", "stakeholders",
  "research", "ux", "design",
  "agile", "scrum", "sprint",
  "requirements", "stories", "story",
  "estimation", "grooming",
  "optimization", "optimize", "optimizaton",
  "segmentation",
  "automation", "automations",
  "risk", "compliance",
  "leadership", "communication"
]);

// domain / context words that are reasonable to show
const DOMAIN_SEED_KEYWORDS = new Set([
  "product", "platform", "platforms",
  "payment", "payments",
  "billing", "claims",
  "credit", "debit",
  "card", "cards",
  "fraud", "chargeback", "dispute", "disputes",
  "fintech", "banking", "lending",
  "saas", "b2b", "b2c",
  "growth", "retention", "acquisition",
  "churn",
  "healthcare", "medical", "clinical",
  "travel", "booking", "bookings",
  "inventory", "orders", "order",
  "logistics", "supply", "supplychain",
  "ai", "ml", "llm", "models",
  "agents", "agent",
  "experience", "experiences",
  "features", "launch", "launches",
  "data", "datasets",
  "workflow", "workflows",
  "enterprise", "enterprises"
]);

// ========== KEYWORD EXTRACTION FROM JD ========== //

function extractKeywordsFromJD(jdText) {
  const words = splitWords(jdText);
  const freq = {};

  for (const w of words) {
    if (STOPWORDS.has(w)) continue;
    if (w.length < 3) continue;
    freq[w] = (freq[w] || 0) + 1;
  }

  // sort by frequency
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  const tools = [];
  const skills = [];
  const domain = [];

  for (const w of sorted) {
    if (TOOL_KEYWORDS.has(w)) {
      tools.push(w);
    } else if (SKILL_KEYWORDS.has(w)) {
      skills.push(w);
    } else if (DOMAIN_SEED_KEYWORDS.has(w)) {
      domain.push(w);
    } else {
      // fallback: treat frequent, non-stop, longer words as domain-ish,
      // but only if they appear at least 2 times and are 5+ chars.
      if (freq[w] >= 2 && w.length >= 5) {
        domain.push(w);
      }
    }
  }

  return {
    tools: [...new Set(tools)],
    skills: [...new Set(skills)],
    domain: [...new Set(domain)]
  };
}

// ========== MATCH JD KEYWORDS AGAINST RESUME ========== //

function matchKeywords(jdKeywords, resumeText) {
  const resumeWords = new Set(splitWords(resumeText));
  const matched = [];
  const missing = [];

  const allKeywords = [
    ...jdKeywords.tools,
    ...jdKeywords.skills,
    ...jdKeywords.domain
  ];

  const seen = new Set();

  allKeywords.forEach((kw) => {
    if (seen.has(kw)) return;
    seen.add(kw);

    if (resumeWords.has(kw)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  });

  const total = matched.length + missing.length;
  const matchScore = total ? Math.round((matched.length / total) * 100) : 0;

  return {
    matched,
    missing,
    score: matchScore
  };
}

// ========== BULLET ANALYSIS ========== //

const STRONG_VERBS = [
  "led", "owned", "drove", "built", "created", "launched", "shipped",
  "improved", "increased", "reduced", "designed", "optimized", "managed",
  "delivered", "implemented", "developed", "scaled"
];

function analyzeBullets(resumeText) {
  const lines = resumeText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const bulletLines = lines.filter((l) =>
    l.startsWith("•") || l.startsWith("-") || l.startsWith("*")
  );

  let strong = 0;
  let weak = 0;
  const weakExamples = [];

  bulletLines.forEach((line) => {
    const plain = line.replace(/^[-•*]\s*/, "");
    const lower = plain.toLowerCase();
    const hasMetric = /\d/.test(plain);
    const startsWithVerb = STRONG_VERBS.some((v) => lower.startsWith(v + " "));
    const startsWeak =
      lower.startsWith("responsible for") ||
      lower.startsWith("worked on") ||
      lower.startsWith("helped");

    if ((startsWithVerb && hasMetric) || (hasMetric && !startsWeak)) {
      strong += 1;
    } else {
      weak += 1;
      if (weakExamples.length < 3) weakExamples.push(plain);
    }
  });

  return { total: bulletLines.length, strong, weak, weakExamples };
}

// ========== ATS FORMATTING CHECKS ========== //

function checkFormatting(resumeText) {
  const lower = resumeText.toLowerCase();
  const issues = [];

  if (!lower.includes("experience")) {
    issues.push("Could not find an Experience section. Use a clear heading like Experience or Work Experience.");
  }
  if (!lower.includes("education")) {
    issues.push("Could not find an Education section. Use a clear heading like Education.");
  }
  if (!lower.includes("skills")) {
    issues.push("Could not find a Skills section. Consider adding a Skills section with tools and tech.");
  }

  const wordCount = splitWords(resumeText).length;
  if (wordCount > 900) {
    issues.push("Resume may be too long. Try to keep it closer to one page for early / mid level roles.");
  }

  const hasEmail = /@/.test(resumeText);
  if (!hasEmail) {
    issues.push("Email address not detected. Make sure your contact info is in plain text.");
  }

  return { issues, wordCount };
}

// ========== SCORE MY RESUME HANDLER ========== //

function handleScoreMyResume() {
  const input = document.getElementById("score-resume-input").value.trim();
  const resultsDiv = document.getElementById("score-results");

  if (!input) {
    resultsDiv.innerHTML = "<p>Please paste your resume first.</p>";
    return;
  }

  const bulletInfo = analyzeBullets(input);
  const formatInfo = checkFormatting(input);

  let score = 50;
  const sectionPenalty = Math.min(15, formatInfo.issues.length * 4);
  score -= sectionPenalty;

  if (bulletInfo.total > 0) {
    const strongRatio = bulletInfo.strong / bulletInfo.total;
    score += Math.round(strongRatio * 35); // up to 35 points
  }

  if (formatInfo.wordCount < 400 || formatInfo.wordCount > 1100) {
    score -= 5;
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  const bulletSummary = `
    <p><span class="badge badge-good">Bullets</span>
    Strong: ${bulletInfo.strong} • Weak: ${bulletInfo.weak} • Total: ${bulletInfo.total}</p>
  `;

  let weakList = "";
  if (bulletInfo.weakExamples.length) {
    weakList =
      "<h4>Examples to rewrite:</h4><ul>" +
      bulletInfo.weakExamples.map((ex) => `<li>${ex}</li>`).join("") +
      "</ul><p>Try using action + impact + metric. For example: " +
      `"Led X to achieve Y percent improvement in Z."</p>`;
  }

  let issueList = "";
  if (formatInfo.issues.length) {
    issueList =
      "<h4>ATS formatting warnings:</h4><ul>" +
      formatInfo.issues.map((i) => `<li>${i}</li>`).join("") +
      "</ul>";
  }

  resultsDiv.innerHTML = `
    <h3>Overall Resume Score: ${score} / 100</h3>
    <p>Estimated word count: ${formatInfo.wordCount}</p>
    ${bulletSummary}
    ${weakList}
    ${issueList}
  `;
}

// ========== TARGETED RESUME HANDLER ========== //

function handleTargetedResume() {
  const jd = document.getElementById("target-jd-input").value.trim();
  const resume = document.getElementById("target-resume-input").value.trim();
  const resultsDiv = document.getElementById("target-results");

  if (!jd || !resume) {
    resultsDiv.innerHTML = "<p>Please paste both the job description and your resume.</p>";
    return;
  }

  const jdKeywords = extractKeywordsFromJD(jd);
  const matchInfo = matchKeywords(jdKeywords, resume);
  const bulletInfo = analyzeBullets(resume);

  resultsDiv.innerHTML = `
    <h3>Match Score: ${matchInfo.score} / 100</h3>
    <p>This is a rough alignment score based on keyword coverage. Higher is better.</p>

    <h4>Matched keywords:</h4>
    <p>${matchInfo.matched
      .map((k) => `<span class="badge badge-good">${k}</span>`)
      .join(" ") || "None yet."}</p>

    <h4>Missing or weak keywords:</h4>
    <p>${matchInfo.missing
      .map((k) => `<span class="badge badge-bad">${k}</span>`)
      .join(" ") || "You cover most of the key terms in this JD."}</p>

    <h4>Bullet strength check:</h4>
    <p><span class="badge badge-good">Bullets</span>
    Strong: ${bulletInfo.strong} • Weak: ${bulletInfo.weak} • Total: ${bulletInfo.total}</p>
    <p>Consider rewriting weak bullets to include some of the missing keywords where they are true for your experience.</p>
  `;
}

// ========== KEYWORD SCANNER HANDLER ========== //

function handleKeywordScanner() {
  const jd = document.getElementById("keyword-jd-input").value.trim();
  const resultsDiv = document.getElementById("keyword-results");

  if (!jd) {
    resultsDiv.innerHTML = "<p>Please paste a job description first.</p>";
    return;
  }

  const jdKeywords = extractKeywordsFromJD(jd);

  resultsDiv.innerHTML = `
    <h3>Extracted keywords from JD</h3>

    <h4>Tools and technologies:</h4>
    <p>${jdKeywords.tools
      .map((k) => `<span class="badge badge-good">${k}</span>`)
      .join(" ") || "No specific tools detected."}</p>

    <h4>Product and skill keywords:</h4>
    <p>${jdKeywords.skills
      .map((k) => `<span class="badge badge-good">${k}</span>`)
      .join(" ") || "No specific product skills detected."}</p>

    <h4>Domain and context words:</h4>
    <p>${jdKeywords.domain
      .map((k) => `<span class="badge badge-warn">${k}</span>`)
      .join(" ") || "No domain related keywords detected."}</p>

    <p>You can copy these into your Skills section and bullet points where they truthfully match your experience.</p>
  `;
}

// ========== NAVIGATION SETUP ========== //

function setupNavigation() {
  const buttons = document.querySelectorAll(".nav-btn");
  const sections = document.querySelectorAll(".tool-section");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      sections.forEach((sec) => {
        if (sec.id === targetId) {
          sec.classList.add("active");
        } else {
          sec.classList.remove("active");
        }
      });
    });
  });
}

// ========== BOOTSTRAP ========== //

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();

  document
    .getElementById("score-resume-btn")
    .addEventListener("click", handleScoreMyResume);

  document
    .getElementById("target-scan-btn")
    .addEventListener("click", handleTargetedResume);

  document
    .getElementById("keyword-scan-btn")
    .addEventListener("click", handleKeywordScanner);
});

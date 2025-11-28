// Utility helpers
function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function splitWords(text) {
  return normalizeText(text)
    .split(/\s+/)
    .filter(Boolean);
}

const STOPWORDS = new Set([
  "and", "or", "the", "a", "an", "to", "for", "of", "in", "on", "at",
  "with", "by", "is", "are", "was", "were", "as", "that", "this",
  "from", "be", "have", "has", "had", "it", "its", "will", "can"
]);

// Simple keyword extractor from JD
function extractKeywordsFromJD(jdText) {
  const words = splitWords(jdText);
  const freq = {};
  for (const w of words) {
    if (STOPWORDS.has(w)) continue;
    if (w.length < 3) continue;
    freq[w] = (freq[w] || 0) + 1;
  }

  // Keep most frequent words
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  // Limit to top N for sanity
  const top = sorted.slice(0, 40);

  // Separate into rough categories
  const tools = [];
  const skills = [];
  const domain = [];

  top.forEach((w) => {
    if (["sql", "python", "tableau", "powerbi", "jira", "figma", "aws", "azure", "gcp"].includes(w)) {
      tools.push(w);
    } else if (["roadmap", "backlog", "experiment", "testing", "design", "analytics", "stakeholder", "agile", "scrum", "metrics", "hypothesis"].includes(w)) {
      skills.push(w);
    } else {
      domain.push(w);
    }
  });

  return {
    tools: [...new Set(tools)],
    skills: [...new Set(skills)],
    domain: [...new Set(domain)]
  };
}

// Match JD keywords against resume
function matchKeywords(jdKeywords, resumeText) {
  const resumeWords = new Set(splitWords(resumeText));
  const matched = [];
  const missing = [];

  const allKeywords = [
    ...jdKeywords.tools,
    ...jdKeywords.skills,
    ...jdKeywords.domain
  ];

  allKeywords.forEach((kw) => {
    if (resumeWords.has(kw)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  });

  const uniqueAll = [...new Set(allKeywords)];
  const matchScore = uniqueAll.length
    ? Math.round((matched.length / uniqueAll.length) * 100)
    : 0;

  return { matched: [...new Set(matched)], missing: [...new Set(missing)], score: matchScore };
}

// Bullet analysis
const STRONG_VERBS = [
  "led", "owned", "drove", "built", "created", "launched", "shipped",
  "improved", "increased", "reduced", "designed", "optimized", "managed"
];

function analyzeBullets(resumeText) {
  const lines = resumeText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bulletLines = lines.filter((l) => l.startsWith("•") || l.startsWith("-") || l.startsWith("*"));
  let strong = 0;
  let weak = 0;
  const weakExamples = [];

  bulletLines.forEach((line) => {
    const plain = line.replace(/^[-•*]\s*/, "");
    const lower = plain.toLowerCase();
    const hasMetric = /\d/.test(plain);
    const startsWithVerb = STRONG_VERBS.some((v) => lower.startsWith(v + " "));
    const startsWeak = lower.startsWith("responsible for") || lower.startsWith("worked on") || lower.startsWith("helped");

    if ((startsWithVerb && hasMetric) || (hasMetric && !startsWeak)) {
      strong += 1;
    } else {
      weak += 1;
      if (weakExamples.length < 3) weakExamples.push(plain);
    }
  });

  return { total: bulletLines.length, strong, weak, weakExamples };
}

// Basic ATS formatting checks
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
    issues.push("Resume may be too long. Try to keep it closer to one page, especially for early or mid level roles.");
  }

  const hasEmail = /@/.test(resumeText);
  if (!hasEmail) {
    issues.push("Email address not detected. Make sure your contact info is in plain text.");
  }

  return { issues, wordCount };
}

// SCORE MY RESUME handler
function handleScoreMyResume() {
  const input = document.getElementById("score-resume-input").value.trim();
  const resultsDiv = document.getElementById("score-results");

  if (!input) {
    resultsDiv.innerHTML = "<p>Please paste your resume first.</p>";
    return;
  }

  const bulletInfo = analyzeBullets(input);
  const formatInfo = checkFormatting(input);

  // Simple scoring logic
  let score = 50;
  const sectionBonus = 10 - Math.min(10, formatInfo.issues.length * 3);
  score += sectionBonus;

  if (bulletInfo.total > 0) {
    const strongRatio = bulletInfo.strong / bulletInfo.total;
    score += Math.round(strongRatio * 30); // up to 30 points
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
    weakList = "<h4>Examples to rewrite:</h4><ul>" +
      bulletInfo.weakExamples.map((ex) => `<li>${ex}</li>`).join("") +
      "</ul><p>Try using action + impact + metric. For example: " +
      `"Led X to achieve Y percent improvement in Z."</p>`;
  }

  let issueList = "";
  if (formatInfo.issues.length) {
    issueList = "<h4>ATS formatting warnings:</h4><ul>" +
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

// TARGETED RESUME handler
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
    <p>${matchInfo.matched.map((k) => `<span class="badge badge-good">${k}</span>`).join(" ") || "None yet."}</p>

    <h4>Missing or weak keywords:</h4>
    <p>${matchInfo.missing.map((k) => `<span class="badge badge-bad">${k}</span>`).join(" ") || "You cover most of the key terms in this JD."}</p>

    <h4>Bullet strength check:</h4>
    <p><span class="badge badge-good">Bullets</span>
    Strong: ${bulletInfo.strong} • Weak: ${bulletInfo.weak} • Total: ${bulletInfo.total}</p>
    <p>Consider rewriting weak bullets to include some of the missing keywords where they are true for your experience.</p>
  `;
}

// KEYWORD SCANNER handler
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
    <p>${jdKeywords.tools.map((k) => `<span class="badge badge-good">${k}</span>`).join(" ") || "None detected yet. Try adding more technical detail to this JD."}</p>

    <h4>Product and skill keywords:</h4>
    <p>${jdKeywords.skills.map((k) => `<span class="badge badge-good">${k}</span>`).join(" ") || "No specific product skills detected."}</p>

    <h4>Domain and context words:</h4>
    <p>${jdKeywords.domain.map((k) => `<span class="badge badge-warn">${k}</span>`).join(" ") || "No domain related keywords detected."}</p>

    <p>You can copy these into your Skills section and bullet points where they truthfully match your experience.</p>
  `;
}

// Navigation handling
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

// Wire up everything
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

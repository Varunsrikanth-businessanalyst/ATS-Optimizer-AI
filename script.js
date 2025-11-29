// ATS Optimizer AI - Frontend logic

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupScoreMyResume();
  setupTargetedResume();
  setupKeywordScanner();
});

/* ---------------- TAB NAVIGATION ---------------- */

function setupTabs() {
  const navButtons = document.querySelectorAll(".nav-btn");
  const sections = document.querySelectorAll(".tool-section");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");

      navButtons.forEach((b) => b.classList.remove("active"));
      sections.forEach((sec) => sec.classList.remove("active"));

      btn.classList.add("active");
      const targetSection = document.getElementById(targetId);
      if (targetSection) targetSection.classList.add("active");
    });
  });
}

/* ---------------- SHARED KEYWORD LOGIC ---------------- */

/*
  STOPWORDS: common English + job-posting fluff words we NEVER want
  to show as "ATS keywords".
*/
const STOPWORDS = new Set([
  // basic English
  "the","and","for","with","from","that","this","have","has","had",
  "was","were","are","is","been","being","will","would","can","could",
  "should","into","over","under","about","above","more","most","much",
  "many","some","any","each","other","every","across","such","very",
  "your","you","our","their","they","them","we","us","his","her",
  "its","who","whom","which","what","when","where","why","how",
  "while","than","then","there","here","also","just","like","well",

  // job / HR fluff
  "benefit","benefits",
  "employee","employees",
  "owner","owners",
  "company","companies",
  "salary","salaries",
  "result","results",
  "experience","experiences",
  "including","include","includes",
  "small","large",
  "first","range","entire","everything",
  "independent","starting","dependent",
  "role","team","teams",
  "environment","environments",
  "across","throughout",

  // very generic words from earlier bad lists
  "ability","able","accomplish","accountability",
  "action","actions","actionable","actively",
  "adapt","admins","adopt","affirmative",
  "agency","agreement",
  "ambitious","applicant","applicants",
  "approved","attendance","attention",
  "balancing","base","beauty","become","before",
  "behavior","believe","best","bets","beyond",
  "blockers","bonding","bonds","both",
  "brand","brings"
]);

/*
  SKILL_WHITELIST: words that are often real ATS keywords even if
  they only appear once in the JD (skills, tools, domains).
*/
const SKILL_WHITELIST = new Set([
  // product / growth / experimentation
  "product","products","roadmap","roadmaps","backlog","backlogs",
  "experiment","experiments","experimentation","hypothesis",
  "conversion","conversions","retention","activation",
  "acquisition","funnel","funnels","pricing","monetization",

  // analytics / data
  "analytics","analyst","analysis","sql","python","tableau",
  "powerbi","looker","dashboards","dashboard","metrics","kpis",
  "dataset","datasets","statistics","statistical","models","modeling",
  "segmentation","forecasting","prediction","predictive",

  // pm / delivery
  "stakeholder","stakeholders","requirements","personas","journeys",
  "workflow","workflows","prioritize","prioritization",
  "agile","scrum","kanban","sprints","grooming",
  "delivery","execution","discovery","initiative","initiatives",

  // domains
  "fintech","platform","platforms","saas","b2b","b2c",
  "booking","bookings","payment","payments","wallet",
  "subscription","subscriptions","marketplace","marketplaces",

  // misc tech / tools
  "aws","azure","gcp","api","apis","microservices",
  "kubernetes","docker","airflow","dbt","snowflake"
]);

/*
  Extract keywords from text:
    - lowercases
    - keeps only alphabetic chunks
    - builds frequency map
    - keeps word if:
        length >= 4
        NOT in STOPWORDS
        AND (freq >= 2 OR in SKILL_WHITELIST)
*/
function extractKeywords(text) {
  if (!text) return new Set();

  const rawWords = text
    .toLowerCase()
    .split(/[^a-z]+/g)
    .filter(Boolean);

  const freq = {};
  rawWords.forEach((w) => {
    freq[w] = (freq[w] || 0) + 1;
  });

  const keywords = new Set();

  Object.entries(freq).forEach(([word, count]) => {
    if (word.length < 4) return;
    if (STOPWORDS.has(word)) return;

    if (count >= 2 || SKILL_WHITELIST.has(word)) {
      keywords.add(word);
    }
  });

  return keywords;
}

/* ---------------- SCORE MY RESUME ---------------- */

function setupScoreMyResume() {
  const btn = document.getElementById("score-resume-btn");
  const input = document.getElementById("score-resume-input");
  const fileInput = document.getElementById("score-resume-file");
  const resultsDiv = document.getElementById("score-results");

  if (!btn || !input || !resultsDiv) return;

  // When a file is chosen, read it and drop text into the textarea
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      const maxSize = 2 * 1024 * 1024; // 2 MB
      if (file.size > maxSize) {
        alert("File is a bit large. Please upload a resume under 2 MB.");
        fileInput.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        input.value = text || "";
        resultsDiv.innerHTML = "";
      };
      // For demo purposes we just try to read as text.
      reader.readAsText(file);
    });
  }

  btn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) {
      resultsDiv.innerHTML = "<p>Please upload or paste your resume first.</p>";
      return;
    }

    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const lines = text.split(/\n+/);
    const bulletLines = lines.filter((l) =>
      l.trim().startsWith("-") ||
      l.trim().startsWith("•") ||
      l.trim().startsWith("*")
    );
    const bulletCount = bulletLines.length;

    const actionVerbs = [
      "led","own","owned","drive","drove","launched",
      "built","created","designed","improved","optimized",
      "delivered","managed","implemented","increased",
      "reduced","grew","shipped","scaled"
    ];

    let strongBullets = 0;
    bulletLines.forEach((line) => {
      const lower = line.toLowerCase();
      if (actionVerbs.some((v) => lower.includes(v))) strongBullets += 1;
    });

    const impactScore = Math.min(
      100,
      Math.round((strongBullets / Math.max(1, bulletCount)) * 100) || 40
    );
    const brevityScore = estimateBrevityScore(lines);
    const atsHealthScore = estimateAtsHealthScore(text);

    const overall = Math.round((impactScore + brevityScore + atsHealthScore) / 3);

    resultsDiv.innerHTML = `
      <h3>Resume score: ${overall} / 100</h3>
      <p>This is a rough score based on bullet strength, brevity, and ATS-friendly formatting.</p>
      <ul>
        <li><strong>Word count:</strong> ${wordCount.toLocaleString()} words</li>
        <li><strong>Bullets:</strong> ${bulletCount} (strong action bullets: ${strongBullets})</li>
        <li><strong>Impact:</strong> ${impactScore} / 100</li>
        <li><strong>Brevity:</strong> ${brevityScore} / 100</li>
        <li><strong>ATS health:</strong> ${atsHealthScore} / 100</li>
      </ul>
      <p class="hint">
        Tip: Make sure each bullet starts with a strong verb and ends with a clear metric or business impact.
      </p>
    `;
  });
}

function estimateBrevityScore(lines) {
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return 50;

  const avgLength =
    nonEmpty.reduce((sum, l) => sum + l.trim().length, 0) / nonEmpty.length;

  if (avgLength < 60) return 65;
  if (avgLength > 160) return 55;
  return 85;
}

function estimateAtsHealthScore(text) {
  let score = 80;

  if (text.includes("\t")) score -= 10;
  if (text.match(/●|■|□|▢|▣|▪|▫/)) score -= 5;
  if (text.match(/\.(png|jpg|jpeg|gif)/i)) score -= 10;

  return Math.max(40, Math.min(100, score));
}

/* ---------------- TARGETED RESUME (JD vs RESUME) ---------------- */

function setupTargetedResume() {
  const btn = document.getElementById("target-scan-btn");
  const jdInput = document.getElementById("target-jd-input");
  const resumeInput = document.getElementById("target-resume-input");
  const resultsDiv = document.getElementById("target-results");

  if (!btn || !jdInput || !resumeInput || !resultsDiv) return;

  btn.addEventListener("click", () => {
    const jdText = jdInput.value.trim();
    const resumeText = resumeInput.value.trim();

    if (!jdText || !resumeText) {
      resultsDiv.innerHTML = "<p>Please paste both the job description and your resume.</p>";
      return;
    }

    const jdKeywords = extractKeywords(jdText);
    const resumeKeywords = extractKeywords(resumeText);

    const matched = [];
    const missing = [];

    jdKeywords.forEach((word) => {
      if (resumeKeywords.has(word)) matched.push(word);
      else missing.push(word);
    });

    matched.sort();
    missing.sort();

    const total = matched.length + missing.length || 1;
    const matchScore = Math.round((matched.length / total) * 100);

    resultsDiv.innerHTML = renderTargetedMatchResult(matchScore, matched, missing);
  });
}

function renderTargetedMatchResult(score, matched, missing) {
  const matchedBadges = matched
    .slice(0, 40)
    .map((w) => `<span class="badge badge-good">${w}</span>`)
    .join(" ");

  const missingBadges = missing
    .slice(0, 40)
    .map((w) => `<span class="badge badge-bad">${w}</span>`)
    .join(" ");

  return `
    <h3>Match Score: ${score} / 100</h3>
    <p>This is a rough alignment score based on keyword coverage. Higher is better.</p>

    <div style="margin-top:0.75rem;">
      <h4>Matched keywords:</h4>
      <p>${matchedBadges || "No strong matches detected yet."}</p>
    </div>

    <div style="margin-top:0.75rem;">
      <h4>Missing or weak keywords:</h4>
      <p>${missingBadges || "Great — your resume already covers most of the important keywords in this JD."}</p>
    </div>

    <p style="margin-top:0.75rem; font-size:0.85rem; color:#6b7280;">
      Tip: Only add keywords that are genuinely true for your experience. Focus on skill, tool, and domain
      keywords from the JD – not random filler words.
    </p>
  `;
}

/* ---------------- KEYWORD SCANNER ---------------- */

function setupKeywordScanner() {
  const btn = document.getElementById("keyword-scan-btn");
  const jdInput = document.getElementById("keyword-jd-input");
  const resultsDiv = document.getElementById("keyword-results");

  if (!btn || !jdInput || !resultsDiv) return;

  btn.addEventListener("click", () => {
    const jdText = jdInput.value.trim();
    if (!jdText) {
      resultsDiv.innerHTML = "<p>Please paste a job description first.</p>";
      return;
    }

    const keywords = Array.from(extractKeywords(jdText)).sort();

    resultsDiv.innerHTML = `
      <h3>Extracted role keywords</h3>
      <p>These are the main skill / domain words the ATS is likely to care about.</p>
      <p>
        ${keywords
          .map((w) => `<span class="badge badge-good">${w}</span>`)
          .join(" ") || "No strong keywords detected."}
      </p>
    `;
  });
}

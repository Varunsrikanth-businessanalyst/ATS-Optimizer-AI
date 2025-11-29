<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ATS Optimizer AI - Resume Toolkit</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <!-- TOP BAR + HERO -->
  <header class="site-header">
    <div class="topbar">
      <!-- Logo button: refreshes page / goes "home" -->
      <button class="logo-btn" onclick="window.location.href = window.location.pathname;">
        ATS Optimizer AI
      </button>
    </div>

    <div class="hero">
      <div class="hero-content">
        <h1>
          Supercharge your resume with AI.<br />
          Optimise your resume for ATS.<br />
          Get&nbsp;interviews.
        </h1>
        <p class="hero-subtitle">
          ATS Optimizer AI scores your resume, matches it to any job and shows missing
          keywords so you can reach a human instead of a filter.
        </p>

        <ul class="hero-bullets">
          <li>Instant resume score on a 100 point scale</li>
          <li>Job match score for any pasted JD</li>
          <li>Keyword and ATS formatting insights</li>
        </ul>

        <div class="hero-ctas">
          <button class="btn-primary" onclick="document.getElementById('score-tool').scrollIntoView({behavior: 'smooth'});">
            Start scoring my resume
          </button>
          <button class="btn-secondary" onclick="document.getElementById('target-tool').scrollIntoView({behavior: 'smooth'});">
            Try targeted match
          </button>
        </div>

        <p class="hero-footnote">
          No login. No upload to a server. Everything runs in your browser.
        </p>
      </div>

      <div class="hero-preview">
        <div class="preview-card">
          <p class="preview-label">Sample report</p>

          <div class="preview-score-row">
            <div class="preview-score-circle">
              <span class="preview-score-number">78</span>
              <span class="preview-score-text">Overall score</span>
            </div>
            <div class="preview-score-copy">
              <p>Your resume is strong but missing a few key skills for this role.</p>
              <p class="preview-highlight">
                Add 4 keywords and rewrite 2 bullets to improve your match.
              </p>
            </div>
          </div>

          <div class="preview-breakdown">
            <div class="preview-chip">
              <span class="preview-chip-label">Impact</span>
              <span class="preview-chip-value">90 / 100</span>
              <span class="preview-chip-tag tag-good">Excellent</span>
            </div>
            <div class="preview-chip">
              <span class="preview-chip-label">Brevity</span>
              <span class="preview-chip-value">65 / 100</span>
              <span class="preview-chip-tag tag-warn">Can be tighter</span>
            </div>
            <div class="preview-chip">
              <span class="preview-chip-label">ATS health</span>
              <span class="preview-chip-value">72 / 100</span>
              <span class="preview-chip-tag tag-ok">Safe</span>
            </div>
          </div>

          <ul class="preview-checklist">
            <li>✓ Strong action verbs in most bullets</li>
            <li>✓ Clear sections for Experience, Education, Skills</li>
            <li>✗ Missing SQL and stakeholder keywords from the JD</li>
            <li>✗ Two bullets have no numbers or business impact</li>
          </ul>
        </div>
      </div>
    </div>
  </header>

  <!-- TOOL TABS -->
  <nav class="nav">
    <button class="nav-btn active" data-target="score-tool">Score My Resume</button>
    <button class="nav-btn" data-target="target-tool">Targeted Resume</button>
    <button class="nav-btn" data-target="keyword-tool">Keyword Scanner</button>
  </nav>

  <main class="container">
    <!-- Score My Resume -->
    <section id="score-tool" class="tool-section active">
      <h2>Score My Resume</h2>
      <p>Upload or paste your resume and get an overall score, bullet strength, and ATS formatting checks.</p>

      <div class="tool-layout">
        <div class="tool-input">
          <label class="field-label" for="score-resume-file">Upload your resume (PDF, Word or text)</label>
          <input
            type="file"
            id="score-resume-file"
            class="file-input"
            accept=".pdf,.doc,.docx,.txt"
          />
          <p class="field-help">
            Your file is read locally in the browser. It is not sent to any server.
          </p>

          <label class="field-label" for="score-resume-input">Or paste your resume below</label>
          <textarea id="score-resume-input" placeholder="Paste your resume here..."></textarea>

          <button id="score-resume-btn">Score My Resume</button>
        </div>

        <aside class="tool-sidebar">
          <h3>What this score looks at</h3>
          <ul>
            <li>Are your bullets using strong action verbs</li>
            <li>Do you quantify impact with numbers</li>
            <li>Is the formatting friendly for ATS parsing</li>
          </ul>
          <p class="sidebar-note">
            This is a lightweight, educational score. It won’t be perfect, but it will highlight obvious fixes
            before you apply.
          </p>
        </aside>
      </div>

      <div id="score-results" class="results-card"></div>
    </section>

    <!-- Targeted Resume -->
    <section id="target-tool" class="tool-section">
      <h2>Targeted Resume</h2>
      <p>Paste a job description and your resume to see how well they match.</p>
      <div class="split">
        <div class="split-column">
          <h3>Job Description</h3>
          <textarea id="target-jd-input" placeholder="Paste job description here..."></textarea>
        </div>
        <div class="split-column">
          <h3>Your Resume</h3>
          <textarea id="target-resume-input" placeholder="Paste your resume here..."></textarea>
        </div>
      </div>
      <button id="target-scan-btn">Scan Match</button>

      <div id="target-results" class="results-card"></div>
    </section>

    <!-- Keyword Scanner -->
    <section id="keyword-tool" class="tool-section">
      <h2>Keyword Scanner</h2>
      <p>Extract important skills, tools, and domain keywords from a job description.</p>
      <textarea id="keyword-jd-input" placeholder="Paste job description here..."></textarea>
      <button id="keyword-scan-btn">Scan Keywords</button>

      <div id="keyword-results" class="results-card"></div>
    </section>
  </main>

  <footer class="footer">
    <p>Built by Varun - where AI products meet job search.</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>

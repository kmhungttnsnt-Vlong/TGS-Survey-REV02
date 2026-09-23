/* ==========================================================
   TGS PLATFORM GENESIS 2.0
   TGS-SURVEY-REV02
   style.css
   REV01

   FOUNDATION UI BASELINE
   ----------------------------------------------------------
   Contract:
   - index.html REV01
   - Mobile First
   - Responsive
   - Material 3 inspired
   - Field Engineering UX
   - Safe Area
   - Touch First
   - No JavaScript dependency
========================================================== */


/* ==========================================================
   01. DESIGN TOKENS
========================================================== */

:root {

  /* --------------------------------------------------------
     COLOR
  -------------------------------------------------------- */

  --tgs-primary: #1565C0;
  --tgs-primary-dark: #0D47A1;
  --tgs-primary-light: #E3F2FD;

  --tgs-secondary: #455A64;
  --tgs-secondary-light: #ECEFF1;

  --tgs-success: #2E7D32;
  --tgs-success-light: #E8F5E9;

  --tgs-warning: #EF6C00;
  --tgs-warning-light: #FFF3E0;

  --tgs-danger: #C62828;
  --tgs-danger-light: #FFEBEE;

  --tgs-info: #0277BD;
  --tgs-info-light: #E1F5FE;

  --tgs-text: #17202A;
  --tgs-text-secondary: #5F6B76;
  --tgs-text-muted: #87919A;

  --tgs-border: #D9E0E6;
  --tgs-border-light: #E8EDF1;

  --tgs-background: #F5F7FA;
  --tgs-surface: #FFFFFF;
  --tgs-surface-soft: #F8FAFC;

  --tgs-overlay: rgba(15, 23, 42, 0.48);


  /* --------------------------------------------------------
     TYPOGRAPHY
  -------------------------------------------------------- */

  --font-family:
    Inter,
    "Noto Sans",
    "Segoe UI",
    Roboto,
    Arial,
    sans-serif;

  --font-size-xs: 0.72rem;
  --font-size-sm: 0.82rem;
  --font-size-md: 0.95rem;
  --font-size-lg: 1.08rem;
  --font-size-xl: 1.35rem;
  --font-size-2xl: 1.75rem;
  --font-size-3xl: 2.2rem;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;


  /* --------------------------------------------------------
     SPACING
  -------------------------------------------------------- */

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-7: 1.75rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;


  /* --------------------------------------------------------
     RADIUS
  -------------------------------------------------------- */

  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.25rem;
  --radius-2xl: 1.5rem;
  --radius-pill: 999px;


  /* --------------------------------------------------------
     SHADOW
  -------------------------------------------------------- */

  --shadow-sm:
    0 1px 3px rgba(15, 23, 42, 0.08);

  --shadow-md:
    0 6px 20px rgba(15, 23, 42, 0.10);

  --shadow-lg:
    0 14px 40px rgba(15, 23, 42, 0.14);

  --shadow-primary:
    0 10px 24px rgba(21, 101, 192, 0.22);


  /* --------------------------------------------------------
     LAYOUT
  -------------------------------------------------------- */

  --header-height: 64px;
  --bottom-panel-height: 152px;

  --content-max-width: 720px;
  --wide-content-max-width: 1100px;

  --touch-target: 48px;


  /* --------------------------------------------------------
     SAFE AREA
  -------------------------------------------------------- */

  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);

}


/* ==========================================================
   02. RESET
========================================================== */

*,
*::before,
*::after {
  box-sizing: border-box;
}


html {
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 0;

  font-size: 16px;

  background: var(--tgs-background);

  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;

  scroll-behavior: smooth;
}


body {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;

  margin: 0;
  padding: 0;

  font-family: var(--font-family);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-regular);

  line-height: 1.5;

  color: var(--tgs-text);
  background: var(--tgs-background);

  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  overflow-x: hidden;
}


button,
input,
textarea,
select {
  font: inherit;
}


button {
  border: 0;
  margin: 0;
  padding: 0;

  cursor: pointer;

  -webkit-tap-highlight-color: transparent;
}


button:disabled {
  cursor: not-allowed;
}


input,
textarea,
select {
  color: var(--tgs-text);
}


img,
svg {
  display: block;
  max-width: 100%;
}


h1,
h2,
h3,
h4,
p {
  margin-top: 0;
}


h1,
h2,
h3,
h4 {
  line-height: 1.2;
}


a {
  color: inherit;
}


/* ==========================================================
   03. APP ROOT
========================================================== */

.app-root {
  position: relative;

  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;

  overflow: hidden;
}


/* ==========================================================
   04. SCREEN SYSTEM
========================================================== */

.screen {
  position: relative;

  display: none;

  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;

  background: var(--tgs-background);

  overflow-x: hidden;
}


.screen.active {
  display: flex;
  flex-direction: column;
}


.screen[hidden] {
  display: none !important;
}


/* ==========================================================
   05. COMMON CONTENT
========================================================== */

.screen-content {

  width: 100%;
  max-width: var(--content-max-width);

  margin: 0 auto;

  padding:
    var(--space-6)
    var(--space-4)
    calc(
      var(--space-8) +
      var(--safe-bottom)
    );

  flex: 1;
}


.page-heading {
  margin-bottom: var(--space-6);
}


.page-heading.compact {
  margin-top: var(--space-2);
  margin-bottom: var(--space-4);
}


.page-heading .eyebrow {
  margin-bottom: var(--space-2);
}


.page-heading h1 {
  margin-bottom: var(--space-2);

  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);

  letter-spacing: -0.02em;
}


.page-heading h2 {
  margin-bottom: 0;

  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}


.page-heading p {
  margin-bottom: 0;

  color: var(--tgs-text-secondary);

  font-size: var(--font-size-md);
}


.eyebrow {

  color: var(--tgs-primary);

  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);

  letter-spacing: 0.12em;
  text-transform: uppercase;
}


/* ==========================================================
   06. SPLASH SCREEN
========================================================== */

.screen-splash {

  align-items: center;
  justify-content: center;

  min-height: 100vh;
  min-height: 100dvh;

  padding:
    calc(var(--space-8) + var(--safe-top))
    calc(var(--space-5) + var(--safe-right))
    calc(var(--space-8) + var(--safe-bottom))
    calc(var(--space-5) + var(--safe-left));

  background:
    radial-gradient(
      circle at 50% 20%,
      rgba(227, 242, 253, 0.95),
      rgba(245, 247, 250, 1) 48%
    );
}


.splash-content {

  display: flex;
  flex-direction: column;
  align-items: center;

  width: 100%;
  max-width: 420px;

  text-align: center;
}


.brand-mark {

  display: flex;
  align-items: center;
  justify-content: center;

  width: 92px;
  height: 92px;

  margin-bottom: var(--space-5);

  border-radius: var(--radius-2xl);

  color: #FFFFFF;
  background:
    linear-gradient(
      145deg,
      var(--tgs-primary),
      var(--tgs-primary-dark)
    );

  box-shadow: var(--shadow-primary);

  font-size: 2rem;
  font-weight: var(--font-weight-bold);

  letter-spacing: -0.04em;
}


.brand-title {

  margin-bottom: var(--space-1);

  color: var(--tgs-text);

  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);

  letter-spacing: -0.025em;
}


.brand-subtitle {

  margin-bottom: var(--space-2);

  color: var(--tgs-primary);

  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}


.splash-status {

  margin-bottom: var(--space-8);

  color: var(--tgs-text-secondary);

  font-size: var(--font-size-sm);
}


.splash-start-btn {
  width: 100%;
  max-width: 360px;
}


/* ==========================================================
   07. HEADER
========================================================== */

.app-header {

  position: relative;
  z-index: 20;

  display: flex;
  align-items: center;

  width: 100%;
  min-height: var(--header-height);

  padding:
    var(--space-2)
    calc(var(--space-4) + var(--safe-right))
    var(--space-2)
    calc(var(--space-4) + var(--safe-left));

  background:
    rgba(255, 255, 255, 0.94);

  border-bottom: 1px solid var(--tgs-border-light);

  box-shadow:
    0 1px 6px rgba(15, 23, 42, 0.04);

  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}


.header-brand {

  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}


.header-brand-main {

  color: var(--tgs-primary);

  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);

  letter-spacing: -0.03em;
}


.header-brand-sub {

  color: var(--tgs-text-secondary);

  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}


.header-status {

  margin-left: auto;

  color: var(--tgs-text-muted);

  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}


.header-title {

  flex: 1;

  color: var(--tgs-text);

  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);

  text-align: center;
}


.header-spacer {
  width: var(--touch-target);
  min-width: var(--touch-target);
}


/* ==========================================================
   08. BUTTON SYSTEM
========================================================== */

.primary-btn,
.secondary-btn {

  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-height: var(--touch-target);

  padding:
    0
    var(--space-5);

  border-radius: var(--radius-md);

  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);

  line-height: 1;

  transition:
    transform 140ms ease,
    box-shadow 140ms ease,
    background 140ms ease,
    opacity 140ms ease;
}


.primary-btn {

  color: #FFFFFF;

  background:
    linear-gradient(
      145deg,
      #1976D2,
      var(--tgs-primary)
    );

  box-shadow: var(--shadow-primary);
}


.primary-btn:hover {
  box-shadow:
    0 12px 28px rgba(21, 101, 192, 0.28);
}


.primary-btn:active,
.secondary-btn:active {
  transform: translateY(1px);
}


.primary-btn:disabled {
  opacity: 0.5;
  box-shadow: none;
}


.secondary-btn {

  color: var(--tgs-primary);

  background: var(--tgs-primary-light);

  border: 1px solid rgba(21, 101, 192, 0.12);
}


.secondary-btn:hover {
  background: #D7ECFC;
}


.form-submit-btn {
  width: 100%;
  margin-top: var(--space-2);
}


/* ==========================================================
   09. ICON BUTTON
========================================================== */

.icon-btn {

  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: var(--touch-target);
  height: var(--touch-target);
  min-width: var(--touch-target);

  border-radius: 50%;

  color: var(--tgs-text);

  background: transparent;

  font-size: 1.8rem;
  line-height: 1;

  transition:
    background 140ms ease;
}


.icon-btn:hover {
  background: var(--tgs-secondary-light);
}


.icon-btn:active {
  background: var(--tgs-border-light);
}


.back-btn {
  margin-right: var(--space-2);
}


/* ==========================================================
   10. ACTION CARDS
========================================================== */

.action-stack {

  display: flex;
  flex-direction: column;

  gap: var(--space-3);

  margin-bottom: var(--space-6);
}


.action-card {

  display: flex;
  align-items: center;

  width: 100%;
  min-height: 82px;

  padding: var(--space-4);

  text-align: left;

  border: 1px solid var(--tgs-border);

  border-radius: var(--radius-xl);

  color: var(--tgs-text);

  background: var(--tgs-surface);

  box-shadow: var(--shadow-sm);

  transition:
    transform 140ms ease,
    box-shadow 140ms ease,
    border-color 140ms ease;
}


.action-card:hover {

  border-color: rgba(21, 101, 192, 0.25);

  box-shadow: var(--shadow-md);
}


.action-card:active {
  transform: translateY(1px);
}


.action-card.primary-action {

  border-color: rgba(21, 101, 192, 0.18);

  background:
    linear-gradient(
      135deg,
      #FFFFFF,
      #F3F8FE
    );
}


.action-icon {

  display: flex;
  align-items: center;
  justify-content: center;

  width: 50px;
  height: 50px;
  min-width: 50px;

  margin-right: var(--space-4);

  border-radius: var(--radius-lg);

  color: var(--tgs-primary);

  background: var(--tgs-primary-light);

  font-size: 1.6rem;
  font-weight: var(--font-weight-medium);
}


.action-text {

  display: flex;
  flex-direction: column;

  gap: var(--space-1);

  min-width: 0;
}


.action-text strong {

  color: var(--tgs-text);

  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}


.action-text small {

  color: var(--tgs-text-secondary);

  font-size: var(--font-size-sm);
}


/* ==========================================================
   11. PROJECT CARD
========================================================== */

.project-card {

  margin-bottom: var(--space-5);

  padding: var(--space-5);

  border: 1px solid var(--tgs-border);

  border-radius: var(--radius-xl);

  background: var(--tgs-surface);

  box-shadow: var(--shadow-md);
}


.project-card[hidden] {
  display: none !important;
}


.draft-card {

  border-color: rgba(239, 108, 0, 0.25);

  background:
    linear-gradient(
      145deg,
      #FFFFFF,
      #FFF9F3
    );
}


.card-badge {

  display: inline-flex;
  align-items: center;

  min-height: 28px;

  margin-bottom: var(--space-3);

  padding:
    0
    var(--space-3);

  border-radius: var(--radius-pill);

  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}


.card-badge.warning {

  color: var(--tgs-warning);

  background: var(--tgs-warning-light);
}


.card-label {

  margin-bottom: var(--space-1);

  color: var(--tgs-text-muted);

  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);

  text-transform: uppercase;
  letter-spacing: 0.08em;
}


.project-card-title {

  margin-bottom: var(--space-1);

  color: var(--tgs-text);

  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}


.project-card-meta {

  margin-bottom: var(--space-4);

  color: var(--tgs-text-secondary);

  font-size: var(--font-size-sm);
}


/* ==========================================================
   12. SYSTEM STATUS
========================================================== */

.system-status-card {

  padding: var(--space-4);

  border: 1px solid var(--tgs-border-light);

  border-radius: var(--radius-lg);

  background: var(--tgs-surface-soft);
}


.status-row {

  display: flex;
  align-items: center;
  justify-content: space-between;

  min-height: 38px;

  border-bottom: 1px solid var(--tgs-border-light);

  color: var(--tgs-text-secondary);

  font-size: var(--font-size-sm);
}


.status-row:last-child {
  border-bottom: 0;
}


.status-value {

  color: var(--tgs-success);

  font-weight: var(--font-weight-semibold);
}


/* ==========================================================
   13. MODAL / SAVED PROJECTS
========================================================== */

.modal-panel {

  position: fixed;

  inset: 0;

  z-index: 100;

  display: none;

  align-items: flex-end;

  padding:
    var(--safe-top)
    var(--safe-right)
    var(--safe-bottom)
    var(--safe-left);
}


.modal-panel.active {
  display: flex;
}


.modal-backdrop {

  position: absolute;
  inset: 0;

  background: var(--tgs-overlay);

  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}


.modal-sheet {

  position: relative;
  z-index: 1;

  width: 100%;
  max-height: 82vh;
  max-height: 82dvh;

  padding: var(--space-5);

  border-radius:
    var(--radius-xl)
    var(--radius-xl)
    0
    0;

  background: var(--tgs-surface);

  box-shadow: var(--shadow-lg);

  overflow-y: auto;
}


.modal-header {

  display: flex;
  align-items: center;

  margin-bottom: var(--space-5);
}


.modal-header h2 {

  margin-bottom: 0;

  font-size: var(--font-size-xl);
}


.modal-header .icon-btn {
  margin-left: auto;
}


.saved-project-list {

  display: flex;
  flex-direction: column;

  gap: var(--space-3);
}


.saved-card {

  padding: var(--space-4);

  border: 1px solid var(--tgs-border);

  border-radius: var(--radius-lg);

  background: var(--tgs-surface-soft);
}


.saved-card h4 {

  margin-bottom: var(--space-1);

  font-size: var(--font-size-md);
}


.saved-card p {

  margin-bottom: var(--space-1);

  color: var(--tgs-text-secondary);

  font-size: var(--font-size-sm);
}


.saved-card .open-project {

  width: 100%;

  margin-top: var(--space-3);
}


.empty-project {

  padding: var(--space-8) var(--space-4);

  border: 1px dashed var(--tgs-border);

  border-radius: var(--radius-lg);

  color: var(--tgs-text-muted);

  background: var(--tgs-surface-soft);

  text-align: center;

  font-size: var(--font-size-sm);
}


/* ==========================================================
   14. FORM
========================================================== */

.form-stack {

  display: flex;
  flex-direction: column;

  gap: var(--space-5);
}


.field-group {

  display: flex;
  flex-direction: column;

  gap: var(--space-2);
}


.field-group label {

  color: var(--tgs-text);

  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}


.field-group input,
.field-group textarea,
.field-group select {

  width: 100%;
  min-height: 52px;

  padding:
    0
    var(--space-4);

  border: 1px solid var(--tgs-border);

  border-radius: var(--radius-md);

  outline: none;

  color: var(--tgs-text);

  background: var(--tgs-surface);

  font-size: var(--font-size-md);

  transition:
    border-color 140ms ease,
    box-shadow 140ms ease;
}


.field-group textarea {

  min-height: 120px;

  padding-top: var(--space-3);
  padding-bottom: var(--space-3);

  resize: vertical;
}


.field-group input::placeholder,
.field-group textarea::placeholder {
  color: var(--tgs-text-muted);
}


.field-group input:focus,
.field-group textarea:focus,
.field-group select:focus {

  border-color: var(--tgs-primary);

  box-shadow:
    0 0 0 3px rgba(21, 101, 192, 0.12);
}


.form-info-card {

  padding: var(--space-4);

  border: 1px solid rgba(2, 119, 189, 0.12);

  border-radius: var(--radius-lg);

  background: var(--tgs-info-light);
}


.form-info-card strong {

  display: block;

  margin-bottom: var(--space-1);

  color: var(--tgs-info);

  font-size: var(--font-size-sm);
}


.form-info-card p {

  margin-bottom: 0;

  color: var(--tgs-text-secondary);

  font-size: var(--font-size-sm);
}


/* ==========================================================
   15. PROJECT SUMMARY
========================================================== */

.project-summary-card {

  margin-bottom: var(--space-6);

  padding: var(--space-5);

  border-radius: var(--radius-xl);

  color: #FFFFFF;

  background:
    linear-gradient(
      145deg,
      var(--tgs-primary),
      var(--tgs-primary-dark)
    );

  box-shadow: var(--shadow-primary);
}


.project-summary-card .eyebrow {

  color: rgba(255, 255, 255, 0.72);

  margin-bottom: var(--space-2);
}


.project-summary-card h1 {

  margin-bottom: var(--space-2);

  color: #FFFFFF;

  font-size: var(--font-size-xl);
}


.project-summary-meta {

  display: flex;
  flex-wrap: wrap;
  align-items: center;

  gap: var(--space-2);

  color: rgba(255, 255, 255, 0.78);

  font-size: var(--font-size-sm);
}


.separator {
  opacity: 0.5;
}


/* ==========================================================
   16. SURVEY MODE
========================================================== */

.survey-mode-grid {

  display: grid;

  grid-template-columns: 1fr;

  gap: var(--space-4);

  margin-bottom: var(--space-6);
}


.survey-mode-card {

  display: flex;
  flex-direction: column;
  align-items: flex-start;

  min-height: 180px;

  padding: var(--space-5);

  border: 1px solid var(--tgs-border);

  border-radius: var(--radius-xl);

  color: var(--tgs-text);

  background: var(--tgs-surface);

  box-shadow: var(--shadow-sm);

  text-align: left;

  transition:
    transform 140ms ease,
    box-shadow 140ms ease,
    border-color 140ms ease;
}


.survey-mode-card:hover {

  border-color: rgba(21, 101, 192, 0.3);

  box-shadow: var(--shadow-md);
}


.survey-mode-card:active {
  transform: translateY(1px);
}


.survey-mode-icon {

  display: flex;
  align-items: center;
  justify-content: center;

  width: 56px;
  height: 56px;

  margin-bottom: var(--space-4);

  border-radius: var(--radius-lg);

  color: var(--tgs-primary);

  background: var(--tgs-primary-light);

  font-size: 1.8rem;
}


.survey-mode-title {

  margin-bottom: var(--space-2);

  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}


.survey-mode-description {

  color: var(--tgs-text-secondary);

  font-size: var(--font-size-sm);

  line-height: 1.55;
}


/* ==========================================================
   17. COMPLETION CARD
========================================================== */

.completion-card {

  display: flex;
  align-items: center;

  gap: var(--space-3);

  padding: var(--space-4);

  border: 1px solid rgba(46, 125, 50, 0.15);

  border-radius: var(--radius-xl);

  background: var(--tgs-success-light);
}


.completion-icon {

  display: flex;
  align-items: center;
  justify-content: center;

  width: 44px;
  height: 44px;
  min-width: 44px;

  border-radius: 50%;

  color: #FFFFFF;

  background: var(--tgs-success);

  font-weight: var(--font-weight-bold);
}


.completion-content {

  display: flex;
  flex-direction: column;

  flex: 1;

  min-width: 0;
}


.completion-content strong {

  margin-bottom: var(--space-1);

  color: var(--tgs-text);

  font-size: var(--font-size-sm);
}


.completion-content span {

  color: var(--tgs-text-secondary);

  font-size: var(--font-size-xs);
}


.completion-card .secondary-btn {

  flex-shrink: 0;

  min-height: 42px;

  padding: 0 var(--space-3);

  font-size: var(--font-size-sm);
}


/* ==========================================================
   18. POINT SURVEY PLACEHOLDER
========================================================== */

.survey-screen {

  background: #101820;
}


.survey-header {

  position: relative;
  z-index: 20;

  display: flex;
  align-items: center;

  min-height: var(--header-height);

  padding:
    var(--space-2)
    calc(var(--space-4) + var(--safe-right))
    var(--space-2)
    calc(var(--space-4) + var(--safe-left));

  color: #FFFFFF;

  background:
    rgba(16, 24, 32, 0.94);

  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}


.survey-header-title {

  display: flex;
  flex-direction: column;

  flex: 1;

  min-width: 0;

  text-align: center;
}


.survey-header-title strong {

  color: #FFFFFF;

  font-size: var(--font-size-md);
}


.survey-header-title span {

  color: rgba(255, 255, 255, 0.58);

  font-size: var(--font-size-xs);

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


.dark-icon {
  color: #FFFFFF;
}


.dark-icon:hover {
  background: rgba(255, 255, 255, 0.1);
}


.survey-placeholder {

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  flex: 1;

  padding:
    var(--space-8)
    var(--space-5)
    calc(var(--space-8) + var(--safe-bottom));

  color: #FFFFFF;

  text-align: center;
}


.survey-placeholder-icon {

  display: flex;
  align-items: center;
  justify-content: center;

  width: 72px;
  height: 72px;

  margin-bottom: var(--space-5);

  border-radius: 50%;

  color: #FFFFFF;

  background: rgba(21, 101, 192, 0.7);

  font-size: 2rem;
}


.survey-placeholder h1 {

  margin-bottom: var(--space-3);

  font-size: var(--font-size-2xl);
}


.survey-placeholder p {

  max-width: 420px;

  margin-bottom: var(--space-5);

  color: rgba(255, 255, 255, 0.68);

  font-size: var(--font-size-sm);
}


.placeholder-status {

  display: inline-flex;
  align-items: center;

  min-height: 32px;

  padding: 0 var(--space-3);

  border-radius: var(--radius-pill);

  color: #90CAF9;

  background: rgba(144, 202, 249, 0.12);

  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);

  letter-spacing: 0.05em;
}


/* ==========================================================
   19. LINEAR SURVEY
========================================================== */

.linear-screen {

  position: relative;

  min-height: 100vh;
  min-height: 100dvh;

  background: #E9EEF2;

  overflow: hidden;
}


.linear-header {

  position: absolute;
  top: 0;
  left: 0;
  right: 0;

  z-index: 1000;

  display: flex;
  align-items: center;

  min-height: var(--header-height);

  padding:
    calc(var(--space-2) + var(--safe-top))
    calc(var(--space-4) + var(--safe-right))
    var(--space-2)
    calc(var(--space-4) + var(--safe-left));

  color: #FFFFFF;

  background:
    linear-gradient(
      180deg,
      rgba(15, 23, 42, 0.88),
      rgba(15, 23, 42, 0.68)
    );

  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}


.linear-header-title {

  display: flex;
  flex-direction: column;

  flex: 1;

  min-width: 0;

  text-align: center;
}


.linear-header-title strong {

  color: #FFFFFF;

  font-size: var(--font-size-md);
}


.linear-header-title span {

  color: rgba(255, 255, 255, 0.64);

  font-size: var(--font-size-xs);

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


.linear-back-btn {
  color: #FFFFFF;
}


.linear-back-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}


/* ==========================================================
   20. MAP
========================================================== */

.survey-map {

  position: absolute;
  inset: 0;

  z-index: 1;

  width: 100%;
  height: 100%;

  background: #DCE3E8;
}


.survey-map .leaflet-control-attribution {

  margin-right: 4px;
  margin-bottom: 4px;

  font-size: 9px;

  opacity: 0.8;
}


.survey-map .leaflet-control-zoom {
  display: none;
}


/* ==========================================================
   21. GPS HUD
========================================================== */

.gps-hud {

  position: absolute;

  top:
    calc(
      var(--header-height) +
      var(--safe-top) +
      var(--space-3)
    );

  left:
    calc(
      var(--space-3) +
      var(--safe-left)
    );

  z-index: 900;

  display: flex;
  align-items: center;

  max-width: calc(100% - 6rem);

  padding:
    var(--space-2)
    var(--space-3);

  border:
    1px solid rgba(255, 255, 255, 0.22);

  border-radius: var(--radius-pill);

  color: #FFFFFF;

  background:
    rgba(15, 23, 42, 0.78);

  box-shadow:
    0 6px 18px rgba(15, 23, 42, 0.18);

  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}


.gps-indicator {

  width: 9px;
  height: 9px;
  min-width: 9px;

  margin-right: var(--space-2);

  border-radius: 50%;

  background: #90CAF9;

  box-shadow:
    0 0 0 4px rgba(144, 202, 249, 0.14);
}


.gps-hud-content {

  display: flex;
  align-items: center;

  gap: var(--space-2);

  min-width: 0;
}


.gps-hud-content strong {

  color: #FFFFFF;

  font-size: var(--font-size-xs);
}


.gps-hud-content span {

  max-width: 230px;

  color: rgba(255, 255, 255, 0.76);

  font-size: 10px;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


/* ==========================================================
   22. MAP CONTROLS
========================================================== */

.map-controls {

  position: absolute;

  right:
    calc(
      var(--space-3) +
      var(--safe-right)
    );

  top:
    calc(
      var(--header-height) +
      var(--safe-top) +
      var(--space-3)
    );

  z-index: 900;

  display: flex;
  flex-direction: column;

  gap: var(--space-2);
}


.map-control-btn {

  display: flex;
  align-items: center;
  justify-content: center;

  width: 46px;
  height: 46px;

  border: 1px solid rgba(15, 23, 42, 0.08);

  border-radius: var(--radius-md);

  color: var(--tgs-text);

  background:
    rgba(255, 255, 255, 0.94);

  box-shadow: var(--shadow-md);

  font-size: 1.35rem;

  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  transition:
    transform 120ms ease,
    background 120ms ease;
}


.map-control-btn:hover {
  background: #FFFFFF;
}


.map-control-btn:active {
  transform: scale(0.96);
}


/* ==========================================================
   23. BASEMAP CONTROL
========================================================== */

.map-top-controls {

  position: absolute;

  top:
    calc(
      var(--header-height) +
      var(--safe-top) +
      var(--space-3)
    );

  left: 50%;

  z-index: 950;

  transform: translateX(-50%);
}


.map-tool-btn {

  min-height: 42px;

  padding:
    0
    var(--space-4);

  border:
    1px solid rgba(15, 23, 42, 0.08);

  border-radius: var(--radius-pill);

  color: var(--tgs-text);

  background:
    rgba(255, 255, 255, 0.94);

  box-shadow: var(--shadow-md);

  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);

  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}


.map-panel {

  position: absolute;

  top: calc(100% + var(--space-2));
  left: 50%;

  display: none;

  width: 230px;

  padding: var(--space-3);

  transform: translateX(-50%);

  border: 1px solid var(--tgs-border);

  border-radius: var(--radius-lg);

  background: rgba(255, 255, 255, 0.97);

  box-shadow: var(--shadow-lg);

  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}


.map-panel.active {
  display: block;
}


.map-panel-title {

  margin-bottom: var(--space-2);

  color: var(--tgs-text-muted);

  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);

  letter-spacing: 0.08em;
  text-transform: uppercase;
}


.map-option {

  display: flex;
  align-items: center;
  justify-content: space-between;

  width: 100%;
  min-height: 44px;

  padding:
    0
    var(--space-3);

  border-radius: var(--radius-md);

  color: var(--tgs-text);

  background: transparent;

  text-align: left;

  font-size: var(--font-size-sm);
}


.map-option:hover {
  background: var(--tgs-secondary-light);
}


.map-option.active {

  color: var(--tgs-primary);

  background: var(--tgs-primary-light);

  font-weight: var(--font-weight-semibold);
}


.map-option.disabled {

  color: var(--tgs-text-muted);

  opacity: 0.55;
}


.map-option-status {

  font-size: var(--font-size-xs);
}


/* ==========================================================
   24. GIS LAYER PANEL
========================================================== */

.gis-layer-panel {

  position: absolute;

  top:
    calc(
      var(--header-height) +
      var(--safe-top) +
      72px
    );

  left:
    calc(
      var(--space-3) +
      var(--safe-left)
    );

  z-index: 850;

  width: 190px;

  padding: var(--space-3);

  border:
    1px solid rgba(15, 23, 42, 0.08);

  border-radius: var(--radius-lg);

  background:
    rgba(255, 255, 255, 0.94);

  box-shadow: var(--shadow-md);

  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}


.gis-panel-header {

  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: var(--space-2);
  padding-bottom: var(--space-2);

  border-bottom: 1px solid var(--tgs-border-light);
}


.gis-panel-header strong {

  color: var(--tgs-text);

  font-size: var(--font-size-sm);
}


.gis-panel-header span {

  color: var(--tgs-primary);

  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}


.layer-toggle {

  display: flex;
  align-items: center;

  min-height: 34px;

  gap: var(--space-2);

  color: var(--tgs-text-secondary);

  font-size: var(--font-size-xs);

  cursor: pointer;
}


.layer-toggle input {

  width: 16px;
  height: 16px;

  margin: 0;

  accent-color: var(--tgs-primary);
}


.layer-toggle span {
  flex: 1;
}


/* ==========================================================
   25. SURVEY BOTTOM PANEL
========================================================== */

.survey-bottom-panel {

  position: absolute;

  left: 0;
  right: 0;
  bottom: 0;

  z-index: 900;

  padding:
    var(--space-3)
    calc(var(--space-3) + var(--safe-right))
    calc(var(--space-3) + var(--safe-bottom))
    calc(var(--space-3) + var(--safe-left));

  background:
    linear-gradient(
      180deg,
      rgba(15, 23, 42, 0.10),
      rgba(15, 23, 42, 0.92) 24%
    );

  pointer-events: none;
}


.survey-stats {

  display: grid;

  grid-template-columns:
    repeat(4, minmax(0, 1fr));

  gap: var(--space-2);

  max-width: 1000px;

  margin:
    0
    auto
    var(--space-3);
}


.survey-stat {

  display: flex;
  flex-direction: column;

  min-width: 0;

  padding:
    var(--space-2)
    var(--space-2);

  border:
    1px solid rgba(255, 255, 255, 0.10);

  border-radius: var(--radius-md);

  background:
    rgba(15, 23, 42, 0.70);

  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  text-align: center;
}


.survey-stat span {

  margin-bottom: 2px;

  color: rgba(255, 255, 255, 0.58);

  font-size: 9px;
}


.survey-stat strong {

  color: #FFFFFF;

  font-size: 10px;
  font-weight: var(--font-weight-semibold);

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


.survey-action-row {

  display: flex;
  justify-content: center;

  max-width: 1000px;

  margin: 0 auto;

  pointer-events: auto;
}


.survey-gps-btn {

  width: min(100%, 360px);

  min-height: 48px;
}


/* ==========================================================
   26. COMPLETION PAGE
========================================================== */

.completion-page {

  display: flex;
  flex-direction: column;
  align-items: center;

  padding:
    var(--space-6)
    0
    calc(var(--space-8) + var(--safe-bottom));

  text-align: center;
}


.completion-success-icon {

  display: flex;
  align-items: center;
  justify-content: center;

  width: 76px;
  height: 76px;

  margin-bottom: var(--space-5);

  border-radius: 50%;

  color: #FFFFFF;

  background: var(--tgs-success);

  box-shadow:
    0 12px 30px rgba(46, 125, 50, 0.20);

  font-size: 2rem;
  font-weight: var(--font-weight-bold);
}


.completion-page .eyebrow {
  margin-bottom: var(--space-2);
}


.completion-page h1 {

  margin-bottom: var(--space-3);

  font-size: var(--font-size-2xl);
}


.completion-page > p {

  max-width: 520px;

  margin-bottom: var(--space-6);

  color: var(--tgs-text-secondary);

  font-size: var(--font-size-md);
}


.completion-project-card {

  width: 100%;

  margin-bottom: var(--space-6);

  padding: var(--space-5);

  border: 1px solid var(--tgs-border);

  border-radius: var(--radius-xl);

  background: var(--tgs-surface);

  box-shadow: var(--shadow-sm);

  text-align: left;
}


.completion-field {

  display: flex;
  flex-direction: column;

  gap: var(--space-1);

  padding: var(--space-3) 0;

  border-bottom: 1px solid var(--tgs-border-light);
}


.completion-field:first-child {
  padding-top: 0;
}


.completion-field:last-child {

  padding-bottom: 0;

  border-bottom: 0;
}


.completion-field span {

  color: var(--tgs-text-muted);

  font-size: var(--font-size-xs);

  text-transform: uppercase;
  letter-spacing: 0.06em;
}


.completion-field strong {

  color: var(--tgs-text);

  font-size: var(--font-size-md);
}


.completion-actions {

  display: flex;
  flex-direction: column;

  width: 100%;

  gap: var(--space-3);
}


.completion-actions .primary-btn,
.completion-actions .secondary-btn {
  width: 100%;
}


/* ==========================================================
   27. FOCUS / ACCESSIBILITY
========================================================== */

button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {

  outline: 3px solid rgba(21, 101, 192, 0.28);

  outline-offset: 2px;
}


/* ==========================================================
   28. LEAFLET TOUCH OPTIMIZATION
========================================================== */

.leaflet-container {

  position: relative;

  font-family: var(--font-family);

  -webkit-tap-highlight-color: transparent;
}


/* ----------------------------------------------------------
   LEAFLET TILE ISOLATION

   Global image rules must never resize Leaflet map tiles.
   Leaflet positions each 256px tile precisely in its own
   tile grid. A global `img { max-width: 100%; }` rule can
   override that geometry and produce shifted tiles, gaps,
   or incorrect map composition.
---------------------------------------------------------- */

.leaflet-container .leaflet-pane,
.leaflet-container .leaflet-tile-pane,
.leaflet-container .leaflet-overlay-pane,
.leaflet-container .leaflet-shadow-pane,
.leaflet-container .leaflet-marker-pane,
.leaflet-container .leaflet-tooltip-pane,
.leaflet-container .leaflet-popup-pane {

  position: absolute;
}


.leaflet-container .leaflet-tile-container {

  position: absolute;

  left: 0;
  top: 0;

  width: 256px;
  height: 256px;
}


.leaflet-container .leaflet-tile {

  display: block;

  width: 256px !important;
  height: 256px !important;

  max-width: none !important;
  max-height: none !important;

  object-fit: fill;

  border: 0;

  margin: 0;
  padding: 0;
}


.leaflet-container .leaflet-tile-container img {

  max-width: none !important;
  max-height: none !important;
}


.leaflet-container img.leaflet-tile {

  max-width: none !important;
  max-height: none !important;
}


/* Do not let the global SVG/image reset interfere with
   Leaflet vector rendering or controls. */

.leaflet-container svg {

  max-width: none;
}


.leaflet-control {

  box-shadow: none;
}


.leaflet-control-attribution {

  background:
    rgba(255, 255, 255, 0.80) !important;

  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}


/* ==========================================================
   29. TABLET
========================================================== */

@media (min-width: 600px) {

  .screen-content {

    padding-left: var(--space-6);
    padding-right: var(--space-6);
  }


  .survey-mode-grid {

    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }


  .action-stack {

    gap: var(--space-4);
  }


  .modal-panel {

    align-items: center;

    justify-content: center;
  }


  .modal-sheet {

    width: min(
      640px,
      calc(100% - 48px)
    );

    max-height: 80vh;

    border-radius: var(--radius-xl);
  }


  .completion-actions {

    flex-direction: row;
  }


  .completion-actions .primary-btn,
  .completion-actions .secondary-btn {
    width: auto;
    flex: 1;
  }

}


/* ==========================================================
   30. LARGE TABLET / DESKTOP
========================================================== */

@media (min-width: 900px) {

  .screen-content {

    max-width: var(--wide-content-max-width);

    padding:
      var(--space-8)
      var(--space-8)
      calc(
        var(--space-10) +
        var(--safe-bottom)
      );
  }


  .page-heading h1 {
    font-size: var(--font-size-3xl);
  }


  .survey-mode-card {
    min-height: 220px;
  }


  .action-card {
    min-height: 92px;
  }


  .linear-header-title {
    max-width: 500px;
  }


  .gis-layer-panel {
    width: 220px;
  }

}


/* ==========================================================
   31. SMALL MOBILE
========================================================== */

@media (max-width: 380px) {

  :root {

    --space-5: 1rem;
    --space-6: 1.25rem;

  }


  .screen-content {

    padding-left: var(--space-3);
    padding-right: var(--space-3);
  }


  .brand-mark {

    width: 78px;
    height: 78px;

    font-size: 1.7rem;
  }


  .brand-title {
    font-size: var(--font-size-xl);
  }


  .survey-stats {
    gap: 4px;
  }


  .survey-stat {
    padding-left: 3px;
    padding-right: 3px;
  }


  .survey-stat span {
    font-size: 8px;
  }


  .survey-stat strong {
    font-size: 9px;
  }


  .gis-layer-panel {

    width: 166px;

    padding: var(--space-2);
  }


  .layer-toggle {
    min-height: 30px;

    font-size: 10px;
  }


  .gps-hud {
    max-width: 68%;
  }

}


/* ==========================================================
   32. REDUCED MOTION
========================================================== */

@media (prefers-reduced-motion: reduce) {

  html {
    scroll-behavior: auto;
  }


  *,
  *::before,
  *::after {

    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;

    transition-duration: 0.01ms !important;
  }

}


/* ==========================================================
   33. LANDSCAPE MOBILE
========================================================== */

@media (
  orientation: landscape
) and (
  max-height: 560px
) {

  .screen-content {

    padding-top: var(--space-4);
    padding-bottom: var(--space-5);
  }


  .screen-splash {

    justify-content: center;

    padding-top:
      calc(var(--space-4) + var(--safe-top));

    padding-bottom:
      calc(var(--space-4) + var(--safe-bottom));
  }


  .brand-mark {

    width: 64px;
    height: 64px;

    margin-bottom: var(--space-2);

    font-size: 1.4rem;
  }


  .brand-title {
    font-size: var(--font-size-lg);
  }


  .splash-status {
    margin-bottom: var(--space-4);
  }


  .survey-bottom-panel {
    padding-top: var(--space-2);
  }


  .gis-layer-panel {
    max-height: 52vh;

    overflow-y: auto;
  }

}


/* ==========================================================
   34. PRINT
========================================================== */

@media print {

  body {
    background: #FFFFFF;
  }


  .screen {
    display: none !important;
  }


  #screenProjectHome {
    display: block !important;
  }

}


/* ==========================================================
   END — TGS WEBAPP GENESIS 2.0
========================================================== */

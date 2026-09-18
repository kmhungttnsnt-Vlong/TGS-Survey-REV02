// ======================================================
// TGS Platform Genesis 2.0
// REV03-004A (Hotfix)
// Application Controller
// ======================================================

let currentProject = null;

const SCREENS = {
  splash: "screenSplash",
  project: "screenProject",
  home: "screenSurveyHome",
  point: "screenPoint",
  linear: "screenLinear"
};

const $ = (id) => document.getElementById(id);

function showScreen(name) {
  Object.values(SCREENS).forEach((id) => {
    $(id).classList.remove("active");
  });

  $(SCREENS[name]).classList.add("active");
}

function updateProjectUI() {
  if (!currentProject) return;

  $("projectTitle").textContent =
    `${currentProject.projectName} (${currentProject.projectCode})`;

  const recent = $("recentSurvey");

  recent.classList.remove("empty");

  recent.innerHTML = `
    <div style="padding:8px 0">
      <strong>${currentProject.projectName}</strong><br>
      <small>${currentProject.location || "Chưa có địa điểm"}</small>
    </div>`;
}

// ======================================================
// Boot
// ======================================================

window.addEventListener("DOMContentLoaded", async () => {

  await DB.initDatabase();

  showScreen("splash");

  // Splash
  $("btnStart").addEventListener("click", async () => {

    const latest = await DB.getLatestProject();

    if (latest) {
      currentProject = latest;
      updateProjectUI();
      showScreen("home");
    } else {
      showScreen("project");
    }

  });

  // Create Project
  $("btnCreateProject").addEventListener("click", async () => {

    const name = $("projectName").value.trim();
    const code = $("projectCode").value.trim();
    const location = $("projectLocation").value.trim();
    const org = $("organization").value.trim();

    if (name === "" || code === "") {
      alert("Vui lòng nhập Tên và Mã công trình.");
      return;
    }

    currentProject = await DB.createProject({
      projectName: name,
      projectCode: code,
      location,
      organization: org
    });

    updateProjectUI();

    showScreen("home");

  });

  // Survey Point
  $("btnPoint").addEventListener("click", async () => {

    currentProject.surveyMode = "POINT";

    await DB.updateProject(currentProject);

    showScreen("point");

  });

  // Survey Linear
  $("btnLinear").addEventListener("click", async () => {

    currentProject.surveyMode = "LINEAR";

    await DB.updateProject(currentProject);

    showScreen("linear");

  });

  // Back
  document.querySelectorAll(".back-btn").forEach((btn) => {

    btn.addEventListener("click", () => {

      showScreen("home");

    });

  });

});

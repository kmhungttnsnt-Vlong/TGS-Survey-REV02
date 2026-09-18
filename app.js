// ======================================================
// TGS Platform Genesis 2.0
// REV03 - Application Controller
// File: app.js
// ======================================================

let currentProject = null;

const SCREENS = {
  splash: "screenSplash",
  project: "screenProject",
  home: "screenSurveyHome",
  point: "screenPoint",
  linear: "screenLinear"
};

// ---------------------------
// Helpers
// ---------------------------

function $(id) {
  return document.getElementById(id);
}

function showScreen(name) {

  Object.values(SCREENS).forEach(id => {
    $(id).classList.remove("active");
  });

  $(SCREENS[name]).classList.add("active");
}

// ---------------------------
// Splash
// ---------------------------

$("btnStart").onclick = async () => {

  const latest = await DB.getLatestProject();

  if (latest) {
    currentProject = latest;
    updateProjectUI();
    showScreen("home");
  } else {
    showScreen("project");
  }

};

// ---------------------------
// Create Project
// ---------------------------

$("btnCreateProject").onclick = async () => {

  const name = $("projectName").value.trim();
  const code = $("projectCode").value.trim();
  const location = $("projectLocation").value.trim();
  const org = $("organization").value.trim();

  if (!name || !code) {
    alert("Vui lòng nhập Tên và Mã công trình.");
    return;
  }

  currentProject = await DB.createProject({
    projectName: name,
    projectCode: code,
    location: location,
    organization: org
  });

  updateProjectUI();

  showScreen("home");

};

// ---------------------------
// Update Home
// ---------------------------

function updateProjectUI() {

  if (!currentProject) return;

  $("projectTitle").innerText =
    `${currentProject.projectName} (${currentProject.projectCode})`;

  const recent = $("recentSurvey");

  recent.classList.remove("empty");

  recent.innerHTML = `
      <div style="padding:10px 0">
        <strong>${currentProject.projectName}</strong><br>
        <small>${currentProject.location || "Chưa có địa điểm"}</small>
      </div>
  `;

}

// ---------------------------
// Select Survey Mode
// ---------------------------

$("btnPoint").onclick = async () => {

  currentProject.surveyMode = "POINT";

  await DB.updateProject(currentProject);

  showScreen("point");

};

$("btnLinear").onclick = async () => {

  currentProject.surveyMode = "LINEAR";

  await DB.updateProject(currentProject);

  showScreen("linear");

};

// ---------------------------
// Back Button
// ---------------------------

document.querySelectorAll(".back-btn").forEach(btn => {

  btn.onclick = () => {

    showScreen("home");

  };

});

// ---------------------------
// Auto Boot
// ---------------------------

window.addEventListener("load", async () => {

  await DB.initDatabase();

  showScreen("splash");

});

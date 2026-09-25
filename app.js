/* =========================================================
   CORE SYSTEM
   A1 — CORE BOOTSTRAP REV01
   Status : LOCKED
   ========================================================= */

'use strict';

/* ---------- DOM Helper ---------- */
const $ = (id) => document.getElementById(id);

/* ---------- Screen Registry ---------- */
const SCREENS = [
  "screenSplash",
  "screenProjectHome",
  "screenProject",
  "screenSurveyHome",
  "screenLinear",
  "screenPoint"
];

/* ---------- Global App State ---------- */
const AppState = {

  currentScreen : "screenSplash",

  project : {
    id        : null,
    name      : "",
    code      : "",
    location  : "",
    status    : "draft"
  },

  survey : {
    type      : null,
    pointCount: 0,
    length    : 0
  },

  gps : {
    latitude  : null,
    longitude : null,
    accuracy  : null,
    active    : false
  }

};

/* ---------- Screen Controller ---------- */
function showScreen(screenId){

  SCREENS.forEach(id=>{
    $(id)?.classList.remove("active");
  });

  $(screenId)?.classList.add("active");

  AppState.currentScreen = screenId;
}

/* ---------- App Ready ---------- */
console.log("TGS Platform Genesis 2.0");
console.log("A1 Core Bootstrap Ready");
/* =========================================================
   CORE SYSTEM
   A2 — NAVIGATION ENGINE REV01
   Status : LOCKED
   ========================================================= */

/* ---------- Navigation API ---------- */

function goHome() {
  showScreen("screenProjectHome");
}

function goSplash() {
  showScreen("screenSplash");
}

function goProjectForm() {
  showScreen("screenProject");
}

function goSurveyHome() {
  showScreen("screenSurveyHome");
}

function goLinearSurvey() {
  showScreen("screenLinear");
}

function goPointSurvey() {
  showScreen("screenPoint");
}

/* ---------- Event Binding ---------- */

$("btnStart")?.addEventListener("click", goHome);

$("btnBackHome")?.addEventListener("click", goHome);

$("btnBackProject")?.addEventListener("click", goProjectForm);

$("btnExitLinear")?.addEventListener("click", goSurveyHome);

$("btnExitPoint")?.addEventListener("click", goSurveyHome);

console.log("A2 Navigation Ready");
/* =========================================================
 * BASELINE WEBAPP 2.0
 * GROUP 1 — CORE SYSTEM
 * A3 — PROJECT WORKFLOW
 * Status: REV02
 * ========================================================= */

let currentProject = null;

/* ---------- Draft Banner ---------- */

async function refreshDraftBanner(){

    const draft = await DB.getDraftProject();

    const banner = $("draftBanner");

    if(!banner) return;

    if(draft){
        banner.classList.remove("hidden");
        currentProject = draft;
    }else{
        banner.classList.add("hidden");
    }
}

/* ---------- Create New ---------- */

function createNewProject(){

    currentProject = null;

    $("projectName").value = "";
    $("projectCode").value = "";
    $("projectLocation").value = "";

    showScreen("screenProject");
}

/* ---------- Continue Draft ---------- */

async function continueDraft(){

    const draft = await DB.getDraftProject();

    if(!draft){
        alert("Không có công trình chưa hoàn thành");
        return;
    }

    currentProject = draft;

    $("surveyProjectTitle").textContent = draft.name;
    $("linearProjectName").textContent = draft.name;

    showScreen("screenSurveyHome");
}

/* ---------- Save Project ---------- */

async function saveProject(){

    const name = $("projectName").value.trim();
    const code = $("projectCode").value.trim();
    const location = $("projectLocation").value.trim();

    if(!name){
        alert("Nhập tên công trình");
        return;
    }

    const project = {
        id: currentProject?.id || crypto.randomUUID(),
        name,
        code,
        location,
        status : "draft",
        createdAt : Date.now(),
        updatedAt : Date.now()
    };

    await DB.saveProject(project);

    currentProject = project;

    $("surveyProjectTitle").textContent = name;
    $("linearProjectName").textContent = name;

    await refreshDraftBanner();

    showScreen("screenSurveyHome");
}

/* ---------- Back Home ---------- */

async function goHome(){

    await refreshDraftBanner();

    showScreen("screenProjectHome");
}

/* ---------- Events ---------- */

$("btnNewProject")?.addEventListener("click", createNewProject);

$("btnContinueDraft")?.addEventListener("click", continueDraft);

$("btnSaveProject")?.addEventListener("click", saveProject);

$("btnBackHome")?.addEventListener("click", goHome);

$("btnBackProject")?.addEventListener("click", goHome);

console.log("A3 Project Ready");

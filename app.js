/* ==========================================================
   TGS Platform Genesis 2.0
   TGS02-WEB-LINEAR-004
   app.js
   REV01
========================================================== */

let currentProject = null;
let dbReady = false;

const $ = (id) => document.getElementById(id);

/* ==========================================================
   SCREEN MANAGER
========================================================== */

const screens = [
  "screenSplash",
  "screenProject",
  "screenSurveyHome",
  "screenPoint",
  "screenLinear"
];

function show(screenId) {

  screens.forEach(id => {
    const el = $(id);
    if (el) el.classList.remove("active");
  });

  $(screenId).classList.add("active");

  if (screenId === "screenLinear") {
    setTimeout(() => {
      MapEngine.initialize();
    }, 250);
  }
}

/* ==========================================================
   MAP ENGINE
========================================================== */

const MapEngine = {

  map: null,
  marker: null,

  defaultLocation: [10.762622, 106.660172],

  initialize() {

    if (this.map) {
      this.map.invalidateSize();
      return;
    }

    this.map = L.map("map", {
      zoomControl: false
    }).setView(this.defaultLocation, 18);

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 22,
        attribution: "© OpenStreetMap"
      }
    ).addTo(this.map);

    this.marker = L.marker(this.defaultLocation)
      .addTo(this.map)
      .bindPopup("D001 - Điểm đầu tuyến");

    this.marker.openPopup();

  },

  zoomIn() {
    if (this.map) this.map.zoomIn();
  },

  zoomOut() {
    if (this.map) this.map.zoomOut();
  },

  locateDefault() {
    if (!this.map) return;

    this.map.flyTo(this.defaultLocation, 19, {
      duration: 1.2
    });
  }

};

/* ==========================================================
   PROJECT
========================================================== */

function updateHome() {

  if (!currentProject) return;

  $("projectTitle").textContent =
    currentProject.projectName;

  $("linearProject").textContent =
    currentProject.projectName;

}

async function createProject() {

  if (!dbReady) {
    alert("Offline Database chưa sẵn sàng.");
    return;
  }

  const projectName = $("projectName").value.trim();
  const projectCode = $("projectCode").value.trim();

  if (projectName === "" || projectCode === "") {
    alert("Vui lòng nhập Tên và Mã công trình.");
    return;
  }

  currentProject = await DB.createProject({
    projectName,
    projectCode,
    location: $("projectLocation").value.trim(),
    organization: $("organization").value.trim()
  });

  updateHome();

  show("screenSurveyHome");

}

/* ==========================================================
   BUTTONS
========================================================== */

function bindButtons() {

  $("btnStart").onclick = () => {

    if (currentProject) {
      updateHome();
      show("screenSurveyHome");
    } else {
      show("screenProject");
    }

  };

  $("btnCreateProject").onclick = createProject;

  $("btnPoint").onclick = () => {
    show("screenPoint");
  };

  $("btnLinear").onclick = () => {
    show("screenLinear");
  };

  document.querySelectorAll(".back-btn").forEach(btn => {
    btn.onclick = () => show("screenSurveyHome");
  });

  $("btnZoomIn").onclick = () => MapEngine.zoomIn();

  $("btnZoomOut").onclick = () => MapEngine.zoomOut();

  $("btnLocate").onclick = () => MapEngine.locateDefault();

  $("btnFirstGPS").onclick = () => {
    alert("REV05 sẽ lấy GPS thật của thiết bị.");
  };

}

/* ==========================================================
   BOOT
========================================================== */

window.addEventListener("load", async () => {

  show("screenSplash");

  bindButtons();

  try {

    await DB.initDatabase();

    dbReady = true;

    currentProject = await DB.getLatestProject();

  } catch (err) {

    console.error(err);

    alert("Không thể khởi tạo bộ nhớ Offline.");

  }

});

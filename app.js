// ======================================================
// TGS Platform Genesis 2.0
// REV03-004B
// UI First + Async Database
// ======================================================

let currentProject = null;
let dbReady = false;

const $ = (id) => document.getElementById(id);

const screens = [
  "screenSplash",
  "screenProject",
  "screenSurveyHome",
  "screenPoint",
  "screenLinear"
];

function show(id){
  screens.forEach(s => $(s).classList.remove("active"));
  $(id).classList.add("active");
}

function updateHome(){

  if(!currentProject) return;

  $("projectTitle").textContent =
    currentProject.projectName + " (" + currentProject.projectCode + ")";

  $("recentSurvey").classList.remove("empty");

  $("recentSurvey").innerHTML = `
    <div style="padding:8px 0">
      <strong>${currentProject.projectName}</strong><br>
      <small>${currentProject.location || "Chưa có địa điểm"}</small>
    </div>`;
}

// ======================================================
// Khởi động
// ======================================================

window.onload = function(){

  show("screenSplash");

  // Khởi tạo DB nền
  DB.initDatabase()
    .then(async ()=>{
      dbReady = true;
      currentProject = await DB.getLatestProject();
    })
    .catch(err=>{
      console.error(err);
      alert("Không thể khởi tạo bộ nhớ Offline.");
    });

  // Splash
  $("btnStart").onclick = function(){

    if(currentProject){
      updateHome();
      show("screenSurveyHome");
    }else{
      show("screenProject");
    }

  };

  // Tạo công trình
  $("btnCreateProject").onclick = async function(){

    if(!dbReady){
      alert("Hệ thống đang khởi tạo, vui lòng thử lại.");
      return;
    }

    const name = $("projectName").value.trim();
    const code = $("projectCode").value.trim();

    if(name==="" || code===""){
      alert("Nhập Tên và Mã công trình.");
      return;
    }

    currentProject = await DB.createProject({
      projectName:name,
      projectCode:code,
      location:$("projectLocation").value.trim(),
      organization:$("organization").value.trim()
    });

    updateHome();
    show("screenSurveyHome");

  };

  // Chọn khảo sát
  $("btnPoint").onclick = async function(){

    currentProject.surveyMode = "POINT";

    if(dbReady) await DB.updateProject(currentProject);

    show("screenPoint");

  };

  $("btnLinear").onclick = async function(){

    currentProject.surveyMode = "LINEAR";

    if(dbReady) await DB.updateProject(currentProject);

    show("screenLinear");

  };

  document.querySelectorAll(".back-btn").forEach(btn=>{

    btn.onclick = ()=>show("screenSurveyHome");

  });

};

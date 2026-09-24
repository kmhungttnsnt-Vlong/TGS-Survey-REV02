# TGS-HO-301 — WEBAPP BASELINE CERTIFICATE

**Document ID:** TGS-HO-301
**Revision:** REV01
**Project:** TGS Platform Genesis 2.0
**Status:** LOCKED BASELINE
**Date:** 2026-09-24

---

# Mục tiêu

Khóa cấu trúc chuẩn của WebApp trước khi tiếp tục phát triển chức năng GPS, GIS và VN-2000.

Tài liệu này là Baseline duy nhất dùng để QA.

---

# Baseline Files

| File | Vai trò | Trạng thái |
|------|----------|-----------|
| index.html | UI Structure | LOCKED |
| style.css | Design System | LOCKED |
| app.js | Business Logic | LOCKED |
| db.js | Offline Database | LOCKED |

---

# 1. index.html

Chỉ chịu trách nhiệm:

- Khai báo màn hình
- Layout
- ID Component
- Nạp CSS
- Nạp JS

## Không được phép

- Viết Business Logic
- Xử lý GPS
- Xử lý Database
- Vẽ GIS

---

## Screen ID (LOCKED)

- screenSplash
- screenProjectHome
- screenProject
- screenSurveyHome
- screenPoint
- screenLinear
- screenProjectComplete

## Button ID (LOCKED)

- btnStart
- btnNewProject
- btnOpenProject
- btnCreateProject
- btnLinearSurvey
- btnPointSurvey
- btnCaptureGPS

Mọi ID phải viết đúng tuyệt đối.

---

# 2. style.css

Chỉ quản lý giao diện.

## Bao gồm

- Color Token
- Typography
- Grid
- Card
- Button
- Responsive
- Map Layout

## Không được

- querySelector()
- addEventListener()
- JavaScript

---

# 3. app.js

Chịu trách nhiệm toàn bộ Logic.

## Module

### A. Startup

- initializeApp()
- bindButtons()
- show()

### B. Project Lifecycle

- loadProjectState()
- createProject()
- renderProjectHome()

### C. Survey

- startPointSurvey()
- startLinearSurvey()

### D. Smart GNSS

- GPSManager
- startSmartGPS()
- updateGPSUI()

### E. GIS

- MapEngine
- Layer Control
- Marker
- Polyline

---

## Quy tắc đặt tên

| Đúng | Sai |
|------|------|
| btnStart | btnstart |
| screenLinear | ScreenLinear |
| currentProject | CurrentProject |
| gpsAccuracy | GPSaccuracy |

CamelCase bắt buộc.

---

# 4. db.js

Chỉ quản lý IndexedDB.

## Database

TGS_SURVEY_DB

Version 4

## Object Store

- projects
- surveys
- gisObjects
- evidence
- timeline

Không chứa UI.

---

# Dependency

index.html

↓

style.css

↓

db.js

↓

app.js

app.js luôn được load cuối cùng.

---

# QA Rule

## QA-01 Startup

- Splash
- Nút Bắt đầu
- Project Home

## QA-02 Project

- Tạo mới
- Mở công trình
- Lưu Draft

## QA-03 Smart GPS

- 20 mẫu GNSS
- Accuracy
- Marker
- Circle

## QA-04 GIS

- ArcGIS Tile
- Zoom
- Layer
- Polyline

## QA-05 Database

- IndexedDB
- Export
- Recovery

---

# Revision History

| REV | Nội dung |
|------|----------|
| REV01 | Khóa Baseline chuẩn của index.html, style.css, app.js và db.js |

---

# LOCK STATEMENT

Kể từ REV01, mọi thay đổi đều phải tạo Revision mới.

Không chỉnh trực tiếp Baseline.

**ENTERPRISE STATUS: LOCKED**

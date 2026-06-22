// ponytail: Vanilla JS routing, in-memory caching, and textContent rendering for security.
// Fallback mock data allows instant local previews if GAS API_BASE is not configured.

// --- CONFIGURATION ---
// Replace with your Google Apps Script Web App Deployment URL
const API_BASE = "https://script.google.com/macros/s/<DEPLOY_ID>/exec";

// In-memory cache for API requests
const apiCache = {};

// --- SYSTEM INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  initSystemTime();
  populateYearDropdown();
  setupEventListeners();
  
  // Load initial route
  handleRoute();
});

// Watch route changes
window.addEventListener("hashchange", handleRoute);

function initSystemTime() {
  const display = document.getElementById("system-time-display");
  if (display) {
    const now = new Date();
    display.textContent = `วันที่ตรวจสอบ: ${now.toLocaleDateString("th-TH")}`;
  }
}

function populateYearDropdown() {
  const yearSelect = document.getElementById("year-select");
  if (!yearSelect) return;
  
  const currentYearBE = new Date().getFullYear() + 543;
  // Populate from currentYear-3 to currentYear+5
  for (let y = currentYearBE - 3; y <= currentYearBE + 3; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = `พ.ศ. ${y}`;
    if (y === currentYearBE) {
      opt.selected = true;
    }
    yearSelect.appendChild(opt);
  }
}

function setupEventListeners() {
  const coopSelect = document.getElementById("coop-select");
  const yearSelect = document.getElementById("year-select");
  const btnRefresh = document.getElementById("btn-refresh");
  const btnPrintMemo = document.getElementById("btn-print-memo");
  
  const handleFilterChange = () => {
    const coop = coopSelect.value;
    const year = yearSelect.value;
    if (coop && year) {
      window.location.hash = `#/board?coop=${encodeURIComponent(coop)}&year=${encodeURIComponent(year)}`;
    } else {
      window.location.hash = "#/";
    }
  };
  
  coopSelect.addEventListener("change", handleFilterChange);
  yearSelect.addEventListener("change", handleFilterChange);
  
  btnRefresh.addEventListener("click", () => {
    // Clear cache
    for (const key in apiCache) delete apiCache[key];
    handleRoute();
  });
  
  if (btnPrintMemo) {
    btnPrintMemo.addEventListener("click", () => {
      window.print();
    });
  }
}

// --- ROUTER & ROUTE HANDLERS ---
function handleRoute() {
  const { route, params } = parseHash();
  const viewBoard = document.getElementById("view-board");
  const viewMember = document.getElementById("view-member");
  const coopSelect = document.getElementById("coop-select");
  const yearSelect = document.getElementById("year-select");
  
  // Ensure cooperatives dropdown is loaded
  loadCooperatives().then(coops => {
    populateCooperativeDropdown(coops, params.coop);
    
    if (route === "#/" || route === "#/board") {
      viewBoard.style.display = "block";
      viewMember.style.display = "none";
      
      if (params.coop && params.year) {
        coopSelect.value = params.coop;
        yearSelect.value = params.year;
        loadBoardData(params.coop, params.year);
      } else {
        renderEmptyBoard();
      }
    } else if (route === "#/member") {
      viewBoard.style.display = "none";
      viewMember.style.display = "block";
      if (params.id && params.coop) {
        loadMemberData(params.id, params.coop, yearSelect.value);
      }
    }
  });
}

function parseHash() {
  const hash = window.location.hash || "#/";
  const parts = hash.split("?");
  const route = parts[0];
  const params = {};
  if (parts[1]) {
    parts[1].split("&").forEach(p => {
      const kv = p.split("=");
      params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
    });
  }
  return { route, params };
}

// --- DATA ACCESS LAYER (FETCH + CACHE + MOCK) ---
function fetchApi(action, params = {}) {
  const isMockMode = API_BASE.includes("<DEPLOY_ID>");
  const queryStr = Object.keys(params)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");
  const url = `${API_BASE}?action=${action}&${queryStr}`;
  const cacheKey = action + JSON.stringify(params);
  
  if (apiCache[cacheKey]) {
    return Promise.resolve(apiCache[cacheKey]);
  }
  
  showSpinner(true);
  
  if (isMockMode) {
    // Return mock data for testing
    return new Promise(resolve => {
      setTimeout(() => {
        const mockData = getMockData(action, params);
        showSpinner(false);
        apiCache[cacheKey] = mockData;
        resolve(mockData);
      }, 300);
    });
  }
  
  return fetch(url)
    .then(res => res.json())
    .then(json => {
      showSpinner(false);
      if (json.success) {
        apiCache[cacheKey] = json.data;
        return json.data;
      } else {
        throw new Error(json.error || "Unknown API error");
      }
    })
    .catch(err => {
      showSpinner(false);
      alert(`API Error: ${err.message}`);
      return null;
    });
}

function loadCooperatives() {
  return fetchApi("getCooperatives").then(data => data || []);
}

function loadBoardData(cooperativeId, year) {
  const tableBody = document.getElementById("board-table-body");
  tableBody.innerHTML = "";
  
  fetchApi("getBoard", { cooperative_id: cooperativeId, year }).then(board => {
    if (!board || board.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.style.textAlign = "center";
      td.textContent = "ไม่พบรายชื่อกรรมการในปีหรือสหกรณ์ที่เลือก";
      tr.appendChild(td);
      tableBody.appendChild(tr);
      updateStats({ valid: 0, warning: 0, invalid: 0 });
      return;
    }
    
    let stats = { valid: 0, warning: 0, invalid: 0 };
    
    board.forEach(member => {
      stats[member.status]++;
      
      const tr = document.createElement("tr");
      
      const tdId = document.createElement("td");
      tdId.textContent = member.member_id;
      tdId.style.fontFamily = "var(--font-mono)";
      
      const tdName = document.createElement("td");
      tdName.textContent = member.full_name;
      
      const tdPos = document.createElement("td");
      tdPos.textContent = member.position;
      
      const tdLabel = document.createElement("td");
      tdLabel.textContent = member.current_label;
      tdLabel.style.fontFamily = "var(--font-mono)";
      
      const tdStatus = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `badge ${member.status}`;
      badge.textContent = member.status === "valid" ? "🟢 ปกติ" : member.status === "warning" ? "🟡 ควรระวัง" : "🔴 ผิดปกติ";
      tdStatus.appendChild(badge);
      
      const tdAction = document.createElement("td");
      const link = document.createElement("a");
      link.href = `#/member?coop=${encodeURIComponent(cooperativeId)}&id=${encodeURIComponent(member.member_id)}`;
      link.className = "link-action";
      link.textContent = "[ตรวจสอบประวัติ]";
      tdAction.appendChild(link);
      
      tr.appendChild(tdId);
      tr.appendChild(tdName);
      tr.appendChild(tdPos);
      tr.appendChild(tdLabel);
      tr.appendChild(tdStatus);
      tr.appendChild(tdAction);
      
      tableBody.appendChild(tr);
    });
    
    updateStats(stats);
    
    // Set descriptive label
    const coopSelect = document.getElementById("coop-select");
    const selectedCoopName = coopSelect.options[coopSelect.selectedIndex]?.text || "";
    document.getElementById("board-title-label").textContent = `${selectedCoopName} ประจำปี พ.ศ. ${year}`;
  });
}

function loadMemberData(memberId, cooperativeId, targetYear) {
  Promise.all([
    fetchApi("getMember", { member_id: memberId, cooperative_id: cooperativeId }),
    fetchApi("validate", { member_id: memberId, cooperative_id: cooperativeId, evaluation_date: `${targetYear - 543}-12-31` }),
    loadCooperatives()
  ]).then(([memberDetails, validation, coops]) => {
    if (!memberDetails || !memberDetails.member) return;
    
    const member = memberDetails.member;
    const records = memberDetails.term_records || [];
    const coop = coops.find(c => c.cooperative_id === cooperativeId) || {};
    
    // Render Profile UI
    document.getElementById("detail-full-name").textContent = member.full_name;
    document.getElementById("detail-position").textContent = member.position;
    document.getElementById("detail-member-id").textContent = member.member_id;
    document.getElementById("detail-status").textContent = member.membership_status === "active" ? "ยังคงสมาชิกภาพอยู่ (Active)" : "สิ้นสุดสมาชิกภาพ (Inactive)";
    
    const overallBadge = document.getElementById("member-overall-status");
    overallBadge.className = `badge ${validation.status}`;
    overallBadge.textContent = validation.status === "valid" ? "🟢 ผ่านการตรวจสอบ" : validation.status === "warning" ? "🟡 ควรระวัง / วาระสุดท้าย" : "🔴 ผิดเงื่อนไขข้อบังคับ";
    
    document.getElementById("detail-validation-summary").textContent = validation.summary;
    document.getElementById("detail-validation-recommendation").textContent = validation.recommendation;
    
    // Render Timeline UI
    renderTimeline(records);
    
    // Render Rules List UI
    renderRulesList(validation.rules, validation.warnings);
    
    // Render hidden printable memo details
    populatePrintMemo(member, coop, records, validation, targetYear);
  });
}

// --- DOM RENDERERS (textContent-only for safety) ---
function populateCooperativeDropdown(coops, selectedCoop) {
  const coopSelect = document.getElementById("coop-select");
  // Keep first default option
  while (coopSelect.options.length > 1) {
    coopSelect.remove(1);
  }
  coops.forEach(coop => {
    const opt = document.createElement("option");
    opt.value = coop.cooperative_id;
    opt.textContent = coop.name;
    if (coop.cooperative_id === selectedCoop) {
      opt.selected = true;
    }
    coopSelect.appendChild(opt);
  });
}

function renderEmptyBoard() {
  const tableBody = document.getElementById("board-table-body");
  tableBody.innerHTML = "";
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 6;
  td.style.textAlign = "center";
  td.textContent = "กรุณาเลือกสหกรณ์และปีงบประมาณที่ต้องการตรวจสอบข้อมูล";
  tr.appendChild(td);
  tableBody.appendChild(tr);
  updateStats({ valid: 0, warning: 0, invalid: 0 });
  document.getElementById("board-title-label").textContent = "";
}

function updateStats(stats) {
  document.getElementById("stat-valid-count").textContent = stats.valid;
  document.getElementById("stat-warning-count").textContent = stats.warning;
  document.getElementById("stat-invalid-count").textContent = stats.invalid;
}

function renderTimeline(records) {
  const timeline = document.getElementById("member-timeline");
  timeline.innerHTML = "";
  
  if (records.length === 0) {
    timeline.textContent = "ไม่มีประวัติการดำรงตำแหน่ง";
    return;
  }
  
  records.forEach((rec, index) => {
    const step = document.createElement("div");
    step.className = "timeline-step";
    if (index === records.length - 1) {
      step.classList.add("active");
    }
    if (!rec.elected) {
      step.classList.add("unelected");
    }
    
    const dot = document.createElement("div");
    dot.className = "timeline-dot";
    dot.textContent = rec.label;
    
    const label = document.createElement("div");
    label.className = "timeline-label";
    label.textContent = rec.position;
    
    const date = document.createElement("span");
    date.className = "timeline-date";
    // Show start year (converted to BE for display)
    const startDate = new Date(rec.period_start);
    const startYearBE = isNaN(startDate.getFullYear()) ? "-" : startDate.getFullYear() + 543;
    date.textContent = `พ.ศ. ${startYearBE}`;
    
    step.appendChild(dot);
    step.appendChild(label);
    step.appendChild(date);
    timeline.appendChild(step);
  });
}

function renderRulesList(rules, warnings) {
  const container = document.getElementById("member-rules-list");
  container.innerHTML = "";
  
  // Base legal rule labels map
  const ruleMeta = {
    "R-01": "ตรวจขีดจำกัดจำนวนวาระติดต่อกัน (ต้องไม่เกินที่กำหนด)",
    "R-02": "ตรวจความถูกต้องของลำดับปีในวาระ (ต้องเรียงกัน)",
    "R-03": "ตรวจการข้ามปีในวาระ (ต้องไม่มีปี 2 โดยไม่มีปี 1)",
    "R-04": "ตรวจสถานะสมาชิกภาพ (ต้องมีสถานะเป็น Active)",
    "R-05": "ตรวจการพักและเว้นวรรค (Cooling-off) เมื่อครบวาระสูงสุด",
    "R-06": "ตรวจอายุขัยวาระปัจจุบันของปีงบประมาณปฏิทิน"
  };
  
  rules.forEach(rule => {
    const item = document.createElement("div");
    item.className = `rule-item ${rule.passed ? "passed" : "failed"}`;
    
    const icon = document.createElement("div");
    icon.className = "rule-icon";
    icon.textContent = rule.passed ? "✅" : "❌";
    
    const info = document.createElement("div");
    info.className = "rule-info";
    
    const code = document.createElement("div");
    code.className = "rule-code";
    code.textContent = `${rule.id} · ${rule.passed ? "PASSED" : "FAILED"}`;
    
    const desc = document.createElement("div");
    desc.className = "rule-desc";
    desc.textContent = `${ruleMeta[rule.id] || "กฎอื่น ๆ"}: ${rule.detail}`;
    
    info.appendChild(code);
    info.appendChild(desc);
    item.appendChild(icon);
    item.appendChild(info);
    container.appendChild(item);
  });
  
  // Append warnings as items
  warnings.forEach(warn => {
    const item = document.createElement("div");
    item.className = "rule-item warn";
    
    const icon = document.createElement("div");
    icon.className = "rule-icon";
    icon.textContent = "⚠️";
    
    const info = document.createElement("div");
    info.className = "rule-info";
    
    const code = document.createElement("div");
    code.className = "rule-code";
    code.textContent = `${warn.id} · WARNING`;
    
    const desc = document.createElement("div");
    desc.className = "rule-desc";
    desc.textContent = warn.detail;
    
    info.appendChild(code);
    info.appendChild(desc);
    item.appendChild(icon);
    item.appendChild(info);
    container.appendChild(item);
  });
}

function populatePrintMemo(member, coop, records, validation, targetYear) {
  document.getElementById("print-check-date").textContent = new Date().toLocaleDateString("th-TH");
  document.getElementById("print-target-year").textContent = targetYear;
  
  document.getElementById("print-member-name").textContent = member.full_name;
  document.getElementById("print-member-id-val").textContent = member.member_id;
  document.getElementById("print-coop-name").textContent = coop.name || "-";
  document.getElementById("print-member-position").textContent = member.position;
  
  const currentRecord = records[records.length - 1];
  document.getElementById("print-member-label").textContent = currentRecord ? currentRecord.label : "-";
  document.getElementById("print-member-status").textContent = member.membership_status === "active" ? "เป็นสมาชิก" : "พ้นสมาชิกภาพ";
  
  // Memo Status and Recommendations
  const statusSpan = document.getElementById("print-memo-status");
  if (validation.status === "valid") {
    statusSpan.textContent = "ถูกต้องตามหลักเกณฑ์ทางกฎหมาย";
    statusSpan.style.color = "black";
  } else if (validation.status === "warning") {
    statusSpan.textContent = "อยู่ในเกณฑ์ควรระมัดระวัง (ใกล้หมดวาระ / วาระสุดท้าย)";
    statusSpan.style.color = "black";
  } else {
    statusSpan.textContent = "ขัดต่อระเบียบข้อบังคับทางกฎหมาย (ไม่ผ่านการตรวจสอบ)";
    statusSpan.style.color = "black";
  }
  
  document.getElementById("print-memo-summary").textContent = `สรุปผล: ${validation.summary}`;
  document.getElementById("print-memo-recommendation").textContent = `คำสั่งปฏิบัติการ: ${validation.recommendation}`;
  
  // Rules table for print
  const printBody = document.getElementById("print-rules-table-body");
  printBody.innerHTML = "";
  
  const ruleMeta = {
    "R-01": "ตรวจจำกัดวาระต่อเนื่องสูงสุด",
    "R-02": "ตรวจความถูกต้องของลำดับปีในวาระ",
    "R-03": "ตรวจการข้ามปีในวาระเดียวกัน",
    "R-04": "ตรวจความถูกต้องของสถานะสมาชิกภาพ",
    "R-05": "ตรวจการพักเว้นวรรค (Cooling-off) หลังครบวาระ",
    "R-06": "ตรวจอายุขัยวาระในงบปีตรวจสอบ"
  };
  
  validation.rules.forEach(rule => {
    const tr = document.createElement("tr");
    
    const tdCode = document.createElement("td");
    tdCode.textContent = rule.id;
    tdCode.style.textAlign = "center";
    
    const tdDesc = document.createElement("td");
    tdDesc.textContent = ruleMeta[rule.id] || "กฎตรวจสอบข้อบังคับ";
    
    const tdPassed = document.createElement("td");
    tdPassed.textContent = rule.passed ? "ผ่านเกณฑ์ (Passed)" : `ไม่ผ่านเกณฑ์: ${rule.detail}`;
    
    tr.appendChild(tdCode);
    tr.appendChild(tdDesc);
    tr.appendChild(tdPassed);
    
    printBody.appendChild(tr);
  });
  
  validation.warnings.forEach(warn => {
    const tr = document.createElement("tr");
    
    const tdCode = document.createElement("td");
    tdCode.textContent = warn.id;
    tdCode.style.textAlign = "center";
    
    const tdDesc = document.createElement("td");
    tdDesc.textContent = "ข้อควรระวัง/แจ้งเตือน";
    
    const tdPassed = document.createElement("td");
    tdPassed.textContent = warn.detail;
    
    tr.appendChild(tdCode);
    tr.appendChild(tdDesc);
    tr.appendChild(tdPassed);
    
    printBody.appendChild(tr);
  });
}

function showSpinner(show) {
  const spinner = document.getElementById("loading-spinner");
  if (spinner) {
    spinner.style.display = show ? "flex" : "none";
  }
}

// --- MOCK DATA GENERATOR ---
function getMockData(action, params) {
  const mockCoops = [
    { cooperative_id: "coop-001", name: "สหกรณ์ออมทรัพย์ครู ระยอง จำกัด", type: "ออมทรัพย์", registration_number: "ส.012345", term_duration_years: 2, max_consecutive_terms: 2, cooling_off_terms: 1 },
    { cooperative_id: "coop-002", name: "สหกรณ์การเกษตรแกลง จำกัด", type: "การเกษตร", registration_number: "ส.054321", term_duration_years: 2, max_consecutive_terms: 2, cooling_off_terms: 1 }
  ];
  
  if (action === "getCooperatives") {
    return mockCoops;
  }
  
  if (action === "getBoard") {
    return [
      { member_id: "M-0042", full_name: "นายสมชาย รักสหกรณ์", position: "ประธานกรรมการ", current_label: "2/2", status: "warning", summary: "มีข้อควรระวัง: กำลังอยู่ในวาระสุดท้ายและปีสุดท้ายที่ดำรงตำแหน่งต่อเนื่องได้" },
      { member_id: "M-0088", full_name: "นางใจดี มีสุข", position: "เลขานุการ", current_label: "1/2", status: "valid", summary: "การดำรงตำแหน่งปกติถูกต้องในวาระ 1/2" },
      { member_id: "M-0100", full_name: "นายวีระ กล้าหาญ", position: "กรรมการ", current_label: "3/1", status: "invalid", summary: "ตรวจพบเงื่อนไขไม่ถูกต้อง: ดำรงตำแหน่งต่อเนื่องเกินกำหนด (3 วาระ)" }
    ];
  }
  
  if (action === "getMember") {
    if (params.member_id === "M-0042") {
      return {
        member: { member_id: "M-0042", cooperative_id: "coop-001", full_name: "นายสมชาย รักสหกรณ์", position: "ประธานกรรมการ", membership_status: "active" },
        term_records: [
          { member_id: "M-0042", term_number: 1, year_in_term: 1, label: "1/1", period_start: "2022-01-01", period_end_expected: "2022-12-31", elected: true, exit_reason: null },
          { member_id: "M-0042", term_number: 1, year_in_term: 2, label: "1/2", period_start: "2023-01-01", period_end_expected: "2023-12-31", elected: true, exit_reason: null },
          { member_id: "M-0042", term_number: 2, year_in_term: 1, label: "2/1", period_start: "2024-01-01", period_end_expected: "2024-12-31", elected: true, exit_reason: null },
          { member_id: "M-0042", term_number: 2, year_in_term: 2, label: "2/2", period_start: "2025-01-01", period_end_expected: "2025-12-31", elected: true, exit_reason: null }
        ]
      };
    }
    if (params.member_id === "M-0088") {
      return {
        member: { member_id: "M-0088", cooperative_id: "coop-001", full_name: "นางใจดี มีสุข", position: "เลขานุการ", membership_status: "active" },
        term_records: [
          { member_id: "M-0088", term_number: 1, year_in_term: 1, label: "1/1", period_start: "2024-01-01", period_end_expected: "2024-12-31", elected: true },
          { member_id: "M-0088", term_number: 1, year_in_term: 2, label: "1/2", period_start: "2025-01-01", period_end_expected: "2025-12-31", elected: true }
        ]
      };
    }
    return {
      member: { member_id: "M-0100", cooperative_id: "coop-001", full_name: "นายวีระ กล้าหาญ", position: "กรรมการ", membership_status: "active" },
      term_records: [
        { member_id: "M-0100", term_number: 1, year_in_term: 1, label: "1/1", period_start: "2022-01-01", period_end_expected: "2022-12-31", elected: true },
        { member_id: "M-0100", term_number: 1, year_in_term: 2, label: "1/2", period_start: "2023-01-01", period_end_expected: "2023-12-31", elected: true },
        { member_id: "M-0100", term_number: 2, year_in_term: 1, label: "2/1", period_start: "2024-01-01", period_end_expected: "2024-12-31", elected: true },
        { member_id: "M-0100", term_number: 2, year_in_term: 2, label: "2/2", period_start: "2025-01-01", period_end_expected: "2025-12-31", elected: true },
        { member_id: "M-0100", term_number: 3, year_in_term: 1, label: "3/1", period_start: "2026-01-01", period_end_expected: "2026-12-31", elected: true }
      ]
    };
  }
  
  if (action === "validate") {
    if (params.member_id === "M-0042") {
      return {
        status: "warning",
        rules: [
          { id: "R-01", passed: true, detail: "ดำรงตำแหน่งต่อเนื่องไม่เกินกำหนด" },
          { id: "R-02", passed: true, detail: "ลำดับปีในวาระถูกต้อง" },
          { id: "R-03", passed: true, detail: "ไม่มีการข้ามปีกลางวาระ" },
          { id: "R-04", passed: true, detail: "ยังคงสมาชิกภาพอยู่" },
          { id: "R-05", passed: true, detail: "เคารพการเว้นวรรค (Cooling-off) ถูกต้อง" },
          { id: "R-06", passed: true, detail: "วาระยังไม่หมดอายุ" }
        ],
        warnings: [
          { id: "W-01", detail: "กำลังอยู่ในวาระสุดท้ายและปีสุดท้ายที่ดำรงตำแหน่งต่อเนื่องได้" }
        ],
        summary: "มีข้อควรระวัง: กำลังอยู่ในวาระสุดท้ายและปีสุดท้ายที่ดำรงตำแหน่งต่อเนื่องได้",
        recommendation: "หากต้องการดำรงตำแหน่งต่อในอนาคต ต้องพัก 2 ปีหลังสิ้นวาระนี้"
      };
    }
    if (params.member_id === "M-0088") {
      return {
        status: "valid",
        rules: [
          { id: "R-01", passed: true, detail: "ดำรงตำแหน่งต่อเนื่องไม่เกินกำหนด" },
          { id: "R-02", passed: true, detail: "ลำดับปีในวาระถูกต้อง" },
          { id: "R-03", passed: true, detail: "ไม่มีการข้ามปีกลางวาระ" },
          { id: "R-04", passed: true, detail: "ยังคงสมาชิกภาพอยู่" },
          { id: "R-05", passed: true, detail: "เคารพการเว้นวรรค (Cooling-off) ถูกต้อง" },
          { id: "R-06", passed: true, detail: "วาระยังไม่หมดอายุ" }
        ],
        warnings: [],
        summary: "การดำรงตำแหน่งปกติถูกต้องในวาระ 1/2",
        recommendation: "ดำรงตำแหน่งต่อไปจนครบกำหนดวาระปกติ"
      };
    }
    return {
      status: "invalid",
      rules: [
        { id: "R-01", passed: false, detail: "ดำรงตำแหน่งต่อเนื่องเกินกำหนด (3 วาระ)" },
        { id: "R-02", passed: true, detail: "ลำดับปีในวาระถูกต้อง" },
        { id: "R-03", passed: true, detail: "ไม่มีการข้ามปีกลางวาระ" },
        { id: "R-04", passed: true, detail: "ยังคงสมาชิกภาพอยู่" },
        { id: "R-05", passed: true, detail: "เคารพการเว้นวรรค (Cooling-off) ถูกต้อง" },
        { id: "R-06", passed: true, detail: "วาระยังไม่หมดอายุ" }
      ],
      warnings: [],
      summary: "ตรวจพบเงื่อนไขไม่ถูกต้อง: ดำรงตำแหน่งต่อเนื่องเกินกำหนด (3 วาระ)",
      recommendation: "ควรตรวจสอบประวัติการดำรงตำแหน่งหรือการแต่งตั้งตามพ.ร.บ. สหกรณ์"
    };
  }
  
  return null;
}

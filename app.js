// ponytail: Vanilla JS routing, in-memory caching, and textContent rendering for security.
// Fallback mock data allows instant local previews if GAS API_BASE is not configured.

// --- CONFIGURATION ---
// Use centralized config from config.js
const API_BASE = CONFIG.API_BASE;

// In-memory cache for API requests
const apiCache = {};

// Toast notification system
const toast = {
  _queue: [],
  _visible: 0,

  show(message, type = "info", duration = null) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.display = "none";
    document.body.appendChild(toast);

    const dur = duration || CONFIG.TOAST_DURATION_MS;

    requestAnimationFrame(() => {
      toast.style.display = "flex";
      this._visible++;
    });

    setTimeout(() => {
      toast.style.display = "none";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        this._visible--;
        this._processQueue();
      }, 300);
    }, dur);
  },

  _processQueue() {
    if (this._queue.length > 0 && this._visible < CONFIG.TOAST_MAX_VISIBLE) {
      const next = this._queue.shift();
      this.show(next.message, next.type, next.duration);
    }
  },

  info(msg, dur) { this.show(msg, "info", dur); },
  success(msg, dur) { this.show(msg, "success", dur); },
  error(msg, dur) { this.show(msg, "error", dur); },
  warn(msg, dur) { this.show(msg, "warning", dur); }
};

// In-memory mock cooperatives (global so it persists across calls in Mock mode)
let mockCooperatives = [
  { cooperative_id: "coop-001", name: "สหกรณ์ออมทรัพย์ครู ระยอง จำกัด", type: "ออมทรัพย์", registration_number: "ส.012345", term_duration_years: 2, max_consecutive_terms: 2, cooling_off_terms: 1, board_size: 4 },
  { cooperative_id: "coop-002", name: "สหกรณ์การเกษตรแกลง จำกัด", type: "การเกษตร", registration_number: "ส.054321", term_duration_years: 2, max_consecutive_terms: 2, cooling_off_terms: 1, board_size: 15 }
];

let mockMembers = [
  { member_id: "M-0042", cooperative_id: "coop-001", full_name: "นายสมชาย รักสหกรณ์", membership_status: "active" },
  { member_id: "M-0088", cooperative_id: "coop-001", full_name: "นางใจดี มีสุข", membership_status: "active" },
  { member_id: "M-0100", cooperative_id: "coop-001", full_name: "นายวีระ กล้าหาญ", membership_status: "active" },
  { member_id: "M-0120", cooperative_id: "coop-001", full_name: "นางสาวสมหญิง ยิ่งรวย", membership_status: "active" }
];

let mockTermRecords = [
  { member_id: "M-0042", cooperative_id: "coop-001", term_number: 1, year_in_term: 1, label: "1/1", period_start: "2022-01-01", period_end_expected: "2022-12-31", elected: true, position: "ประธานกรรมการ", is_by_election: false },
  { member_id: "M-0042", cooperative_id: "coop-001", term_number: 1, year_in_term: 2, label: "1/2", period_start: "2023-01-01", period_end_expected: "2023-12-31", elected: true, position: "ประธานกรรมการ", is_by_election: false },
  { member_id: "M-0042", cooperative_id: "coop-001", term_number: 2, year_in_term: 1, label: "2/1", period_start: "2024-01-01", period_end_expected: "2024-12-31", elected: true, position: "ประธานกรรมการ", is_by_election: false },
  { member_id: "M-0042", cooperative_id: "coop-001", term_number: 2, year_in_term: 2, label: "2/2", period_start: "2025-01-01", period_end_expected: "2025-12-31", elected: true, position: "ประธานกรรมการ", is_by_election: false },
  { member_id: "M-0088", cooperative_id: "coop-001", term_number: 1, year_in_term: 1, label: "1/1", period_start: "2024-01-01", period_end_expected: "2024-12-31", elected: true, position: "เลขานุการ", is_by_election: false },
  { member_id: "M-0088", cooperative_id: "coop-001", term_number: 1, year_in_term: 2, label: "1/2", period_start: "2025-01-01", period_end_expected: "2025-12-31", elected: true, position: "เลขานุการ", is_by_election: false },
  { member_id: "M-0100", cooperative_id: "coop-001", term_number: 1, year_in_term: 1, label: "1/1", period_start: "2022-01-01", period_end_expected: "2022-12-31", elected: true, position: "รองประธานกรรมการ", is_by_election: false },
  { member_id: "M-0100", cooperative_id: "coop-001", term_number: 1, year_in_term: 2, label: "1/2", period_start: "2023-01-01", period_end_expected: "2023-12-31", elected: true, position: "รองประธานกรรมการ", is_by_election: false },
  { member_id: "M-0100", cooperative_id: "coop-001", term_number: 2, year_in_term: 1, label: "2/1", period_start: "2024-01-01", period_end_expected: "2024-12-31", elected: true, position: "รองประธานกรรมการ", is_by_election: false },
  { member_id: "M-0100", cooperative_id: "coop-001", term_number: 2, year_in_term: 2, label: "2/2", period_start: "2025-01-01", period_end_expected: "2025-12-31", elected: true, position: "รองประธานกรรมการ", is_by_election: false },
  { member_id: "M-0100", cooperative_id: "coop-001", term_number: 3, year_in_term: 1, label: "3/1", period_start: "2026-01-01", period_end_expected: "2026-12-31", elected: true, position: "รองประธานกรรมการ", is_by_election: false },
  { member_id: "M-0120", cooperative_id: "coop-001", term_number: 1, year_in_term: 1, label: "1/1", period_start: "2024-01-01", period_end_expected: "2024-12-31", elected: true, position: "เหรัญญิก", is_by_election: false },
  { member_id: "M-0120", cooperative_id: "coop-001", term_number: 1, year_in_term: 2, label: "1/2", period_start: "2025-01-01", period_end_expected: "2025-12-31", elected: true, position: "เหรัญญิก", is_by_election: false }
];

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

  const btnToggleAddCoop = document.getElementById("btn-toggle-add-coop");
  const addCoopCard = document.getElementById("add-coop-card");
  const addCoopForm = document.getElementById("add-coop-form");

  if (btnToggleAddCoop && addCoopCard) {
    btnToggleAddCoop.addEventListener("click", () => {
      const isHidden = addCoopCard.style.display === "none";
      addCoopCard.style.display = isHidden ? "block" : "none";
      btnToggleAddCoop.textContent = isHidden ? "ปิดฟอร์ม" : "เพิ่มสหกรณ์";
    });
  }

  if (addCoopForm) {
    addCoopForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const submitBtn = addCoopForm.querySelector("button[type='submit']");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "กำลังบันทึก...";
      }
      
      const params = {
        cooperative_id: document.getElementById("new-coop-id").value.trim(),
        name: document.getElementById("new-coop-name").value.trim(),
        type: document.getElementById("new-coop-type").value.trim(),
        registration_number: document.getElementById("new-coop-reg").value.trim(),
        term_duration_years: document.getElementById("new-coop-duration").value,
        max_consecutive_terms: document.getElementById("new-coop-max-terms").value,
        cooling_off_terms: document.getElementById("new-coop-cooling").value,
        board_size: document.getElementById("new-coop-size").value,
        fiscal_year_end_month: document.getElementById("new-coop-fiscal-month").value
      };

      fetchApi("addCooperative", params).then(newCoop => {
        if (newCoop) {
          toast.success("เพิ่่มข้อมูลสหกรณ์สำเร็จ!");
          addCoopForm.reset();
          addCoopCard.style.display = "none";
          if (btnToggleAddCoop) {
            btnToggleAddCoop.textContent = "เพิ่่มสหกรณ์";
          }
          
          // Clear API cache
          for (const key in apiCache) delete apiCache[key];
          
          // Reload route to update dropdown list and select new coop
          loadCooperatives().then(coops => {
            populateCooperativeDropdown(coops, newCoop.cooperative_id);
            const year = yearSelect.value;
            window.location.hash = `#/board?coop=${encodeURIComponent(newCoop.cooperative_id)}&year=${encodeURIComponent(year)}`;
          });
        }
      }).catch(err => {
        toast.error(`เกิดข้อมูลผิดพลาด: ${err.message}`);
      }).finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "บันทึ่ข้อมูลสหกรณ์";
        }
      });
    });
  }

  const btnToggleAddMember = document.getElementById("btn-toggle-add-member");
  const addMemberCard = document.getElementById("add-member-card");
  const addMemberForm = document.getElementById("add-member-form");

  if (btnToggleAddMember && addMemberCard) {
    btnToggleAddMember.addEventListener("click", () => {
      const isHidden = addMemberCard.style.display === "none";
      addMemberCard.style.display = isHidden ? "block" : "none";
      btnToggleAddMember.textContent = isHidden ? "ปิดฟอร์ม" : "เพิ่มกรรมการ";
    });
  }

  if (addMemberForm) {
    addMemberForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const submitBtn = addMemberForm.querySelector("button[type='submit']");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "กำลังบันทึก...";
      }
      
      const currentCoop = coopSelect.value;
      if (!currentCoop) {
        alert("กรุณาเลือกสหกรณ์ก่อนเพิ่มกรรมการ");
        return;
      }
      
      const startYearVal = parseInt(document.getElementById("new-member-start").value, 10);
      const endYearVal = parseInt(document.getElementById("new-member-end").value, 10);
      const params = {
        cooperative_id: currentCoop,
        member_id: document.getElementById("new-member-id").value.trim() || undefined,
        full_name: document.getElementById("new-member-name").value.trim(),
        position: document.getElementById("new-member-position").value,
        term_number: document.getElementById("new-member-term").value,
        year_in_term: document.getElementById("new-member-year-in-term").value,
        period_start: isNaN(startYearVal) ? "" : `${startYearVal - 543}-01-01`,
        period_end_expected: isNaN(endYearVal) ? "" : `${endYearVal - 543}-12-31`,
        is_by_election: document.getElementById("new-member-by-election").checked
      };

      fetchApi("addMember", params).then(result => {
        if (result) {
          toast.success("เพิ่่ملรายชื่่อคณะกรรมการสำเร็จ!");
          addMemberForm.reset();
          document.getElementById("new-member-by-election").checked = false;
          addMemberCard.style.display = "none";
          if (btnToggleAddMember) {
            btnToggleAddMember.textContent = "เพิ่่ลกรรมการ";
          }
          
          // Clear API cache
          for (const key in apiCache) delete apiCache[key];
          
          // Reload board data
          loadBoardData(currentCoop, yearSelect.value);
        }
      }).catch(err => {
        toast.error(`เกิดข้อมูลผิดพลาด: ${err.message}`);
      }).finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "บันทึ่รายชื่่กรรมการ";
        }
      });
    });
  }

  const newMemberStart = document.getElementById("new-member-start");
  const newMemberEnd = document.getElementById("new-member-end");
  
  if (newMemberStart && newMemberEnd) {
    newMemberStart.addEventListener("change", () => {
      const startYearVal = parseInt(newMemberStart.value, 10);
      if (isNaN(startYearVal)) return;
      
      const selectedCoopId = coopSelect.value;
      if (!selectedCoopId) return;
      
      loadCooperatives().then(coops => {
        const coop = coops.find(c => String(c.cooperative_id) === String(selectedCoopId));
        if (coop && coop.term_duration_years) {
          const durationYears = parseInt(coop.term_duration_years, 10);
          newMemberEnd.value = startYearVal + durationYears - 1;
        }
      });
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
        const btnToggleAddMem = document.getElementById("btn-toggle-add-member");
        if (btnToggleAddMem) btnToggleAddMem.style.display = "inline-block";
      } else {
        renderEmptyBoard();
        const btnToggleAddMem = document.getElementById("btn-toggle-add-member");
        const addMemCard = document.getElementById("add-member-card");
        if (btnToggleAddMem) {
          btnToggleAddMem.style.display = "none";
          btnToggleAddMem.textContent = "เพิ่มกรรมการ";
        }
        if (addMemCard) addMemCard.style.display = "none";
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
      toast.error(`API Error: ${err.message}`);
      throw err;
    });
}

function loadCooperatives() {
  return fetchApi("getCooperatives").then(data => data || []);
}

function loadBoardData(cooperativeId, year) {
  const tableBody = document.getElementById("board-table-body");
  tableBody.innerHTML = "";
  
  fetchApi("getBoard", { cooperative_id: cooperativeId, year }).then(boardData => {
    if (!boardData) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.style.textAlign = "center";
      td.textContent = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
      tr.appendChild(td);
      tableBody.appendChild(tr);
      updateStats({ valid: 0, warning: 0, invalid: 0 });
      return;
    }
    
    let boardStatus = [];
    let members = [];
    
    if (boardData && boardData.members) {
      members = boardData.members;
      boardStatus = boardData.board_status || [];
    } else if (Array.isArray(boardData)) {
      members = boardData;
    }

    // Handle board-level validations UI
    const boardValidationCard = document.getElementById("board-validation-card");
    const boardRulesList = document.getElementById("board-rules-list");
    
    if (boardRulesList) boardRulesList.innerHTML = "";
    
    if (boardStatus && boardStatus.length > 0) {
      if (boardValidationCard) boardValidationCard.style.display = "block";
      boardStatus.forEach(rule => {
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
        desc.textContent = rule.detail;
        
        info.appendChild(code);
        info.appendChild(desc);
        item.appendChild(icon);
        item.appendChild(info);
        boardRulesList.appendChild(item);
      });
    } else {
      if (boardValidationCard) boardValidationCard.style.display = "none";
    }

    if (!members || members.length === 0) {
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
    
    members.forEach(member => {
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
    if (!memberDetails || !memberDetails.member || !validation) return;
    
    const member = memberDetails.member;
    const records = memberDetails.term_records || [];
    const coop = coops.find(c => c.cooperative_id === cooperativeId) || {};
    
    // Render Profile UI
    const currentRecord = records[records.length - 1];
    const currentPosition = (currentRecord && currentRecord.position) || member.position || "-";

    document.getElementById("detail-full-name").textContent = member.full_name;
    document.getElementById("detail-position").textContent = currentPosition;
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
  
  const currentRecord = records[records.length - 1];
  document.getElementById("print-member-position").textContent = (currentRecord && currentRecord.position) || member.position || "-";
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
  if (action === "getCooperatives") {
    return mockCooperatives;
  }
  
  if (action === "addCooperative") {
    const newCoop = {
      cooperative_id: params.cooperative_id,
      name: params.name,
      type: params.type,
      registration_number: params.registration_number,
      term_duration_years: parseInt(params.term_duration_years, 10) || 2,
      max_consecutive_terms: parseInt(params.max_consecutive_terms, 10) || 2,
      cooling_off_terms: parseInt(params.cooling_off_terms, 10) || 1,
      board_size: parseInt(params.board_size, 10) || 15,
      fiscal_year_end_month: parseInt(params.fiscal_year_end_month, 10) || 12
    };
    mockCooperatives.push(newCoop);
    return newCoop;
  }
  
  if (action === "addMember") {
    let memberId = params.member_id ? params.member_id.trim() : "";
    if (!memberId) {
      let maxNum = 0;
      mockMembers.forEach(m => {
        if (m.cooperative_id === params.cooperative_id) {
          const match = m.member_id.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      });
      memberId = "M-" + (maxNum + 1).toString().padStart(4, '0');
    }

    const newMember = {
      cooperative_id: params.cooperative_id,
      member_id: memberId,
      full_name: params.full_name,
      membership_status: "active"
    };
    
    const label = `${params.term_number}/${params.year_in_term}`;
    const newRecord = {
      member_id: memberId,
      cooperative_id: params.cooperative_id,
      term_number: parseInt(params.term_number, 10),
      year_in_term: parseInt(params.year_in_term, 10),
      label: label,
      position: params.position,
      is_by_election: (params.is_by_election === true || params.is_by_election === "true" || params.is_by_election === "TRUE"),
      period_start: params.period_start,
      period_end_expected: params.period_end_expected,
      elected: true
    };
    
    mockMembers.push(newMember);
    mockTermRecords.push(newRecord);
    return { member: newMember, term_record: newRecord };
  }
  
  if (action === "getBoard") {
    const coopId = params.cooperative_id;
    const targetYear = parseInt(params.year, 10);
    const targetYearInt = targetYear > 2400 ? targetYear - 543 : targetYear;
    
    const coopConf = mockCooperatives.find(c => String(c.cooperative_id) === String(coopId));
    const expectedSize = coopConf ? (parseInt(coopConf.board_size, 10) || 3) : 3;
    
    const coopMembers = mockMembers.filter(m => m.cooperative_id === coopId);
    const results = [];
    
    coopMembers.forEach(member => {
      const records = mockTermRecords.filter(r => r.member_id === member.member_id && r.cooperative_id === coopId);
      const activeRecord = records.find(r => {
        if (!r.elected) return false;
        const startYear = new Date(r.period_start).getFullYear();
        const endYear = new Date(r.period_end_expected).getFullYear();
        return (targetYearInt >= startYear && targetYearInt <= endYear);
      });
      
      if (activeRecord) {
        let status = "valid";
        let summary = `การดำรงตำแหน่งปกติถูกต้องในวาระ ${activeRecord.label}`;
        
        if (member.member_id === "M-0042") {
          status = "warning";
          summary = "มีข้อควรระวัง: กำลังอยู่ในวาระสุดท้ายและปีสุดท้ายที่ดำรงตำแหน่งต่อเนื่องได้";
        } else if (member.member_id === "M-0100") {
          status = "invalid";
          summary = "ตรวจพบเงื่อนไขไม่ถูกต้อง: ดำรงตำแหน่งต่อเนื่องเกินกำหนด (3 วาระ)";
        }
        
        results.push({
          member_id: member.member_id,
          full_name: member.full_name,
          position: activeRecord.position || member.position || "",
          current_label: activeRecord.label,
          status: status,
          summary: summary
        });
      }
    });

    const actualSize = results.length;
    const boardStatus = [
      {
        id: "B-01",
        passed: actualSize === expectedSize,
        detail: actualSize === expectedSize 
          ? `จำนวนกรรมการจริง (${actualSize} คน) ตรงตามข้อบังคับสหกรณ์ (${expectedSize} คน)`
          : `จำนวนกรรมการจริง (${actualSize} คน) ไม่ตรงกับข้อบังคับ (${expectedSize} คน)`
      }
    ];

    let numPresident = 0;
    let numVicePresident = 0;
    let numSecretary = 0;
    let numTreasurer = 0;

    results.forEach(m => {
      const pos = (m.position || "").toString().trim();
      if (pos.indexOf("ประธาน") !== -1 && pos.indexOf("รอง") === -1) {
        numPresident++;
      } else if (pos.indexOf("รองประธาน") !== -1) {
        numVicePresident++;
      } else if (pos.indexOf("เลขานุการ") !== -1 || pos === "เลขา" || pos === "เลขาฯ") {
        numSecretary++;
      } else if (pos.indexOf("เหรัญญิก") !== -1) {
        numTreasurer++;
      }
    });

    const b02Passed = (numPresident === 1 && numSecretary === 1 && numTreasurer === 1 && numVicePresident >= 1);
    if (b02Passed) {
      boardStatus.push({
        id: "B-02",
        passed: true,
        detail: "ตำแหน่งบังคับครบถ้วนและถูกต้อง (ประธาน 1, รองประธานอย่างน้อย 1, เลขานุการ 1, เหรัญญิก 1)"
      });
    } else {
      let missingOrDup = [];
      if (numPresident !== 1) missingOrDup.push(`ประธาน (${numPresident})`);
      if (numVicePresident < 1) missingOrDup.push(`รองประธาน (${numVicePresident})`);
      if (numSecretary !== 1) missingOrDup.push(`เลขานุการ (${numSecretary})`);
      if (numTreasurer !== 1) missingOrDup.push(`เหรัญญิก (${numTreasurer})`);
      boardStatus.push({
        id: "B-02",
        passed: false,
        detail: `ขาดหรือซ้ำซ้อนตำแหน่งหน้าที่บังคับ: ${missingOrDup.join(", ")}`
      });
    }

    return {
      board_status: boardStatus,
      members: results
    };
  }
  
  if (action === "getMember") {
    const member = mockMembers.find(m => m.member_id === params.member_id && m.cooperative_id === params.cooperative_id);
    const records = mockTermRecords.filter(r => r.member_id === params.member_id && r.cooperative_id === params.cooperative_id);
    return {
      member: member || null,
      term_records: records.sort((a, b) => new Date(a.period_start).getTime() - new Date(b.period_start).getTime())
    };
  }
  
  if (action === "validate") {
    const member = mockMembers.find(m => m.member_id === params.member_id && m.cooperative_id === params.cooperative_id);
    const records = mockTermRecords.filter(r => r.member_id === params.member_id && r.cooperative_id === params.cooperative_id);
    
    let status = "valid";
    let summary = "ดำรงตำแหน่งถูกต้องตามข้อบังคับ";
    let recommendation = "ดำรงตำแหน่งต่อไปจนครบกำหนดวาระปกติ";
    let rules = [
      { id: "R-01", passed: true, detail: "ดำรงตำแหน่งต่อเนื่องไม่เกินกำหนด" },
      { id: "R-02", passed: true, detail: "ลำดับปีในวาระถูกต้อง" },
      { id: "R-03", passed: true, detail: "ไม่มีการข้ามปีกลางวาระ" },
      { id: "R-04", passed: true, detail: "ยังคงสมาชิกภาพอยู่" },
      { id: "R-05", passed: true, detail: "เคารพการเว้นวรรค (Cooling-off) ถูกต้อง" },
      { id: "R-06", passed: true, detail: "วาระยังไม่หมดอายุ" }
    ];
    let warnings = [];

    if (params.member_id === "M-0042") {
      status = "warning";
      summary = "มีข้อควรระวัง: กำลังอยู่ในวาระสุดท้ายและปีสุดท้ายที่ดำรงตำแหน่งต่อเนื่องได้";
      recommendation = "หากต้องการดำรงตำแหน่งต่อในอนาคต ต้องพัก 2 ปีหลังสิ้นวาระนี้";
      warnings.push({ id: "W-01", detail: "กำลังอยู่ในวาระสุดท้ายและปีสุดท้ายที่ดำรงตำแหน่งต่อเนื่องได้" });
    } else if (params.member_id === "M-0100") {
      status = "invalid";
      summary = "ตรวจพบเงื่อนไขไม่ถูกต้อง: ดำรงตำแหน่งต่อเนื่องเกินกำหนด (3 วาระ)";
      recommendation = "ควรตรวจสอบประวัติการดำรงตำแหน่งหรือการแต่งตั้งตามพ.ร.บ. สหกรณ์";
      rules[0] = { id: "R-01", passed: false, detail: "ดำรงตำแหน่งต่อเนื่องเกินกำหนด (3 วาระ)" };
    }

    return { status, rules, warnings, summary, recommendation };
  }
  
  return null;
}

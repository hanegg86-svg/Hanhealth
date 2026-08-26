function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[m];
    });
}

function getFullMenuDb() { 
    return { ...defaultMenuDb, ...(localData.customMenu || {}) }; 
}

function switchMainTab(tabId) {
    ['hq', 'calendar', 'health', 'diet', 'graph'].forEach(id => {
        document.getElementById(id + '-section').classList.add('hidden');
        document.getElementById('nav-' + id).classList.remove('active-nav');
    });
    document.getElementById(tabId + '-section').classList.remove('hidden');
    document.getElementById('nav-' + tabId).classList.add('active-nav');
    
    if (tabId === 'calendar') {
        renderCalendarWidget(); 
        showEventOfDay(calendarSelectedDay);
    }
    if (tabId === 'health') {
        initCalorieModeUI(); setWeightDefaultValues(); renderWeightHistory();
    }
    if (tabId === 'diet') {
        let now = new Date();
        let localISODate = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        document.getElementById('diet-log-date').value = localISODate;
        calculateHealth();
    }
    if (tabId === 'graph') renderStatsGraph('day');
}

function getThaiDateString(dateObj) {
    const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    return dateObj.getDate() + " " + months[dateObj.getMonth()] + " " + (dateObj.getFullYear() + 543);
}

function setHqFilter(filterType) {
    hqActiveFilter = filterType;
    ['all', 'today', 'tomorrow'].forEach(id => {
        const btn = document.getElementById(`filter-${id}`); if(btn) btn.className = "flex-1 text-slate-600 py-2.5 rounded-xl transition-all";
    });
    let labelText = "📂 แผนงานตั้งแต่ปัจจุบันเป็นต้นไป";
    if(filterType === 'today') labelText = "☀️ รายการนัดหมายเฉพาะวันนี้";
    if(filterType === 'tomorrow') labelText = "🌅 รายการนัดหมายเฉพาะวันพรุ่งนี้";
    
    document.getElementById(`filter-${filterType}`).className = "flex-1 bg-white text-slate-900 py-2.5 rounded-xl shadow-sm transition-all font-bold";
    document.getElementById('hq-list-title').innerHTML = `<i class="fa-solid fa-list-check text-slate-400"></i> ` + labelText;
    displayData();
}

function setWeightDefaultValues() {
    let now = new Date();
    let localISODate = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    document.getElementById('weight-log-date').value = localISODate;

    if (localData.weightLog && localData.weightLog.length > 0) {
        let sortedLogs = [...localData.weightLog].sort((a,b) => b.timestamp - a.timestamp);
        document.getElementById('weight-input').value = sortedLogs[0].weight;
    } else {
        document.getElementById('weight-input').value = 85;
    }

    if (localData.userProfile) {
        if(document.getElementById('user-gender')) document.getElementById('user-gender').value = localData.userProfile.gender || 'male';
        if(document.getElementById('user-age')) document.getElementById('user-age').value = localData.userProfile.age || 42;
        if(document.getElementById('user-activity')) document.getElementById('user-activity').value = localData.userProfile.activity || 1.55;
    }
}

function saveCurrentWeight() {
    const wInput = document.getElementById('weight-input').value.trim();
    const dateInput = document.getElementById('weight-log-date').value;

    if(!wInput || isNaN(wInput)) return alert("กรุณาระบุตัวเลขน้ำหนักที่ถูกต้องครับ");
    if(!dateInput) return alert("กรุณาเลือกวันที่บันทึกน้ำหนักครับ");

    let targetDate = new Date(dateInput);
    let thaiDateStr = getThaiDateString(targetDate);
    
    localData.weightLog.push({ 
        id: Date.now(), date: thaiDateStr, iso_date: dateInput, weight: parseFloat(wInput), timestamp: targetDate.getTime() 
    });

    saveData(); renderWeightHistory(); calculateHealth();
    confetti({ particleCount: 15, spread: 30, colors: ['#059669'] });
    alert(`💾 บันทึกน้ำหนัก ${wInput} กก. ประจำวันที่ ${thaiDateStr} เรียบร้อยครับ!`);
}

function renderWeightHistory() {
    const listEl = document.getElementById('weight-history-list'); listEl.innerHTML = "";
    let history = [...(localData.weightLog || [])].sort((a, b) => b.timestamp - a.timestamp);
    
    if(history.length === 0) { listEl.innerHTML = `<li class="py-4 text-slate-400 text-center font-light text-xs">ยังไม่มีประวัติการบันทึกน้ำหนักตัวในระบบ</li>`; return; }
    
    history.forEach(item => {
        listEl.innerHTML += `
        <li class="py-3 flex justify-between items-center bg-slate-50/80 px-3.5 rounded-xl my-1.5 border border-slate-100">
            <span class="font-medium text-slate-700 text-xs">📅 ${escapeHtml(item.date)}</span>
            <div class="flex items-center gap-3">
                <span class="font-bold text-emerald-600 text-xs">${item.weight} kg</span>
                <button onclick="openWeightEditModal(${item.id})" class="text-slate-400 hover:text-emerald-600 transition-colors text-xs p-1"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteWeightLog(${item.id})" class="text-slate-300 hover:text-rose-500 transition-colors text-xs p-1"><i class="fa-solid fa-trash"></i></button>
            </div>
        </li>`;
    });
}

function deleteWeightLog(id) {
    if(confirm("ต้องการลบบันทึกน้ำหนักรายการนี้ใช่ไหมครับ?")) {
        localData.weightLog = localData.weightLog.filter(i => i.id !== id);
        saveData(); renderWeightHistory(); calculateHealth();
    }
}

function openWeightEditModal(id) {
    let item = localData.weightLog.find(i => i.id === id); if (!item) return;
    document.getElementById('edit-weight-id').value = item.id;
    document.getElementById('edit-weight-value').value = item.weight;
    
    let iso = item.iso_date;
    if(!iso) {
        let d = new Date(item.timestamp);
        iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    document.getElementById('edit-weight-date').value = iso;
    document.getElementById('weight-edit-modal').classList.remove('hidden');
}

function closeWeightEditModal() { document.getElementById('weight-edit-modal').classList.add('hidden'); }

function saveEditedWeight() {
    let id = parseFloat(document.getElementById('edit-weight-id').value);
    let item = localData.weightLog.find(i => i.id === id); if (!item) return;

    let weightVal = document.getElementById('edit-weight-value').value.trim();
    let dateVal = document.getElementById('edit-weight-date').value;

    if(!weightVal || isNaN(weightVal) || !dateVal) return alert("กรุณากรอกข้อมูลให้ถูกต้องครบถ้วนครับ");

    let targetDate = new Date(dateVal);
    item.weight = parseFloat(weightVal);
    item.iso_date = dateVal;
    item.date = getThaiDateString(targetDate);
    item.timestamp = targetDate.getTime();

    saveData(); closeWeightEditModal(); renderWeightHistory(); calculateHealth();
    confetti({ particleCount: 10, spread: 20, colors: ['#059669'] });
}

function initCalorieModeUI() {
    let mode = localData.calorieTargetMode || 'bmi';
    document.getElementById('custom-cal-input').value = localData.customCalorieTarget || 2000;
    setCalorieMode(mode, false);
}

function setCalorieMode(mode, triggerSave = true) {
    localData.calorieTargetMode = mode;
    const bmiBtn = document.getElementById('mode-bmi-btn');
    const customBtn = document.getElementById('mode-custom-btn');
    const customBox = document.getElementById('custom-cal-box');

    if (mode === 'bmi') {
        bmiBtn.className = "bg-white text-slate-900 py-2 rounded-lg shadow-sm transition-all font-bold";
        customBtn.className = "bg-transparent text-white border border-slate-700 py-2 rounded-lg transition-all font-normal";
        customBox.classList.add('hidden');
    } else {
        customBtn.className = "bg-white text-slate-900 py-2 rounded-lg shadow-sm transition-all font-bold";
        bmiBtn.className = "bg-transparent text-white border border-slate-700 py-2 rounded-lg transition-all font-normal";
        customBox.classList.remove('hidden');
    }
    if (triggerSave) saveData();
    calculateHealth();
}

function saveCustomCalorieTarget(val) {
    let num = parseInt(val) || 0;
    if (num > 0) { localData.customCalorieTarget = num; saveData(); calculateHealth(); }
}

function calculateHealth() {
    let weight = parseFloat(document.getElementById('weight-input').value) || 85;
    
    if(localData.weightLog && localData.weightLog.length > 0) {
        let sorted = [...localData.weightLog].sort((a,b) => b.timestamp - a.timestamp);
        weight = sorted[0].weight;
    }

    const height = parseFloat(document.getElementById('height-input').value) || 176;
    const gender = document.getElementById('user-gender') ? document.getElementById('user-gender').value : 'male';
    const age = parseInt(document.getElementById('user-age') ? document.getElementById('user-age').value : 42) || 42;
    const activity = parseFloat(document.getElementById('user-activity') ? document.getElementById('user-activity').value : 1.55) || 1.55;

    localData.userProfile = { gender, age, height, activity };
    saveData();

    if (weight > 0 && height > 0) {
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        document.getElementById('bmi-value').innerText = bmi;
        let status = 'สมส่วน'; let statusColor = 'bg-emerald-500'; let suggestion = '';

        if (bmi < 18.5) { status = 'น้ำหนักน้อย'; statusColor = 'bg-amber-500'; suggestion = `<p>• แนะนำโปรแกรมสร้างกล้ามเนื้อ เพิ่มสารอาหารกลุ่มคาร์โบไฮเดรตและโปรตีนคุณภาพสูง</p>`; } 
        else if (bmi >= 23) { status = 'น้ำหนักเกิน'; statusColor = 'bg-rose-500'; suggestion = `<p>• แนะนำโปรแกรมวิ่งโซน 2 เพื่อลีนไขมันส่วนเกินอย่างยั่งยืนและกระตุ้นการเผาผลาญ</p>`; } 
        else { suggestion = `<p>• ระดับร่างกายฟิตสมบูรณ์แบบ ลุยซ้อมออกกำลังกายและควบคุมวินัยต่อเนื่องได้เลยครับ</p>`; }
        
        document.getElementById('bmi-status').innerText = status;
        document.getElementById('bmi-status').className = `text-xs font-bold ${statusColor} text-white px-2.5 py-1 rounded-lg inline-block mt-1`;
        document.getElementById('workout-suggestion').innerHTML = suggestion;
        
        let bmr = (gender === 'male') ? ((10 * weight) + (6.25 * height) - (5 * age) + 5) : ((10 * weight) + (6.25 * height) - (5 * age) - 161);
        let tdee = Math.round(bmr * activity);

        if(document.getElementById('bmr-display')) document.getElementById('bmr-display').innerText = Math.round(bmr).toLocaleString();
        if(document.getElementById('tdee-display')) document.getElementById('tdee-display').innerText = tdee.toLocaleString();

        let finalTarget = (localData.calorieTargetMode === 'bmi') ? tdee : (localData.customCalorieTarget || 2000);
        
        let targetEl = document.getElementById('target-cal');
        let limitEl = document.getElementById('limit-cal');
        if (targetEl) targetEl.innerText = finalTarget;
        if (limitEl) limitEl.innerText = finalTarget;
        
        let dateInput = document.getElementById('diet-log-date').value;
        if(dateInput) renderFoods();
    }
}

function applyTdeeAsTarget() {
    let tdeeText = document.getElementById('tdee-display').innerText.replace(/,/g, '');
    let tdeeVal = parseInt(tdeeText) || 2000;
    localData.customCalorieTarget = tdeeVal;
    document.getElementById('custom-cal-input').value = tdeeVal;
    setCalorieMode('custom', true);
    alert(`🎯 ตั้งเป้าหมายแคลอรีตาม TDEE แนะนำ (${tdeeVal.toLocaleString()} kcal) เรียบร้อยครับ!`);
}

function generateLineGraphSVG(labels, data, strokeColor, isKcal = false) {
    if (!data || data.length === 0) return `<div class="text-center text-slate-400 text-xs py-10 font-light">ไม่มีสถิติถูกบันทึกไว้ประมวลผลในช่วงเวลานี้ครับ 🔍</div>`;
    const width = 340; const height = 160; const padding = 32;
    let maxVal = Math.max(...data); let minVal = Math.min(...data);
    
    let sum = data.reduce((s,v) => s+v, 0);
    let avgVal = parseFloat((sum / data.length).toFixed(1));

    if (maxVal === minVal) { maxVal += isKcal ? 500 : 5; minVal = Math.max(0, minVal - (isKcal ? 500 : 5)); }
    if(avgVal > maxVal) maxVal = avgVal + (isKcal ? 100 : 1);
    if(avgVal < minVal) minVal = Math.max(0, avgVal - (isKcal ? 100 : 1));

    const graphWidth = width - (padding * 2); const graphHeight = height - (padding * 2);
    const stepX = data.length > 1 ? graphWidth / (data.length - 1) : 0;
    
    let points = []; let pointsData = [];
    data.forEach((val, index) => {
        const x = data.length === 1 ? width / 2 : padding + (index * stepX);
        const ratio = (val - minVal) / (maxVal - minVal);
        const y = height - padding - (ratio * graphHeight);
        points.push(`${x},${y}`); pointsData.push({x, y, val, label: labels[index]});
    });
    
    const avgRatio = (avgVal - minVal) / (maxVal - minVal);
    const avgY = height - padding - (avgRatio * graphHeight);

    let pathD = `M ${points.join(' L ')}`;
    
    let textLabelsHtml = pointsData.map((p) => `
        <text x="${p.x}" y="${height - 6}" font-size="10" font-weight="bold" fill="#64748b" text-anchor="middle">${escapeHtml(p.label)}</text>
        <text x="${p.x}" y="${p.y - 10}" font-size="11" font-weight="800" fill="${strokeColor}" text-anchor="middle">${isKcal ? p.val.toLocaleString() : p.val}</text>
    `).join('');
    
    let circlesHtml = pointsData.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#ffffff" stroke="${strokeColor}" stroke-width="3" />`).join('');

    return `
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="overflow-visible">
            <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />
            <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />
            
            <line x1="${padding}" y1="${avgY}" x2="${width - padding}" y2="${avgY}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.85"/>
            <text x="${width - padding + 4}" y="${avgY + 3}" font-size="10" font-weight="bold" fill="#ef4444" text-anchor="start">${isKcal ? avgVal.toLocaleString() : avgVal}</text>

            ${data.length > 1 ? `<path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />` : ''}
            ${circlesHtml} ${textLabelsHtml}
        </svg>`;
}

function generateMultiMacroGraphSVG(labels, pData, cData, fData, targetCal = 2000) {
    if (!labels || labels.length === 0) return `<div class="text-center text-slate-400 text-xs py-10 font-light">ไม่มีสถิติสารอาหารบันทึกไว้ครับ 🔍</div>`;
    const width = 340; const height = 200; const padding = 32;

    const targetP = Math.round(targetCal * 0.30);
    const targetC = Math.round(targetCal * 0.45);
    const targetF = Math.round(targetCal * 0.25);

    let allVals = [...pData, ...cData, ...fData, targetP, targetC, targetF];
    let maxVal = Math.max(...allVals, 100); 
    let minVal = 0;

    const graphWidth = width - (padding * 2); 
    const graphHeight = height - (padding * 2);
    const stepX = labels.length > 1 ? graphWidth / (labels.length - 1) : 0;

    let buildLine = (data, color) => {
        let points = [];
        data.forEach((val, idx) => {
            const x = labels.length === 1 ? width / 2 : padding + (idx * stepX);
            const ratio = (val - minVal) / (maxVal - minVal);
            const y = height - padding - (ratio * graphHeight);
            points.push({x, y, val});
        });
        let pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
        let circles = points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#ffffff" stroke="${color}" stroke-width="2.5" />`).join('');
        return `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />${circles}`;
    };

    let buildTargetLine = (tVal, color) => {
        const ratio = (tVal - minVal) / (maxVal - minVal);
        const y = height - padding - (ratio * graphHeight);
        return `
            <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="${color}" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.8" />
            <text x="${width - padding + 2}" y="${y + 3}" font-size="9" font-weight="bold" fill="${color}" text-anchor="start">${tVal}</text>
        `;
    };

    let xLabelsHtml = labels.map((lbl, idx) => {
        const x = labels.length === 1 ? width / 2 : padding + (idx * stepX);
        return `<text x="${x}" y="${height - 6}" font-size="10" font-weight="bold" fill="#64748b" text-anchor="middle">${escapeHtml(lbl)}</text>`;
    }).join('');

    return `
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="overflow-visible">
            <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#e2e8f0" stroke-width="1" />
            
            ${buildTargetLine(targetP, '#2563eb')}
            ${buildTargetLine(targetC, '#ea580c')}
            ${buildTargetLine(targetF, '#ca8a04')}

            ${buildLine(pData, '#3b82f6')}
            ${buildLine(cData, '#f97316')}
            ${buildLine(fData, '#eab308')}

            ${xLabelsHtml}
        </svg>`;
}

function getWeekNumber(dateStr) {
    let d = new Date(dateStr);
    let oneJan = new Date(d.getFullYear(), 0, 1);
    let numberOfDays = Math.floor((d - oneJan) / (24 * 60 * 60 * 1000));
    let resultWeek = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
    return `${d.getFullYear()}-W${resultWeek}`;
}

function getThaiMonthLabel(monthIndex) {
    const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    return months[monthIndex] || '';
}

function renderStatsGraph(period) {
    ['day', 'week', 'month'].forEach(id => {
        const btn = document.getElementById(`btn-period-${id}`); if(btn) { btn.className = "flex-1 text-slate-500 py-2 rounded-lg transition-all text-center font-medium"; }
    });
    document.getElementById(`btn-period-${period}`).className = "flex-1 bg-white text-slate-900 py-2 rounded-lg shadow-sm font-bold text-center";

    const weightContainer = document.getElementById('weight-line-graph-container');
    const kcalContainer = document.getElementById('kcal-line-graph-container');
    const macroContainer = document.getElementById('macro-line-graph-container');

    let labelsW = []; let weightData = [];
    let labelsK = []; let kcalData = [];
    let labelsM = []; let pData = []; let cData = []; let fData = [];

    if (period === 'day') {
        let dayWGroup = {};
        localData.weightLog.forEach(item => {
            let iso = item.iso_date || new Date(item.timestamp).toISOString().split('T')[0];
            if(!dayWGroup[iso]) dayWGroup[iso] = [];
            dayWGroup[iso].push(item.weight);
        });
        let sortedWDates = Object.keys(dayWGroup).sort().slice(-5);
        sortedWDates.forEach(d => {
            let p = d.split('-'); labelsW.push(`${parseInt(p[2])}/${parseInt(p[1])}`);
            let sum = dayWGroup[d].reduce((s,v)=>s+v, 0);
            weightData.push(parseFloat((sum / dayWGroup[d].length).toFixed(1)));
        });

        let dayKGroup = {};
        let dayPGroup = {}, dayCGroup = {}, dayFGroup = {};
        localData.foods.forEach(item => {
            let iso = item.date || new Date().toISOString().split('T')[0];
            if(!dayKGroup[iso]) { dayKGroup[iso] = 0; dayPGroup[iso] = 0; dayCGroup[iso] = 0; dayFGroup[iso] = 0; }
            dayKGroup[iso] += item.cal;
            dayPGroup[iso] += (item.proteinCal !== undefined) ? item.proteinCal : Math.round(item.cal * 0.25);
            dayCGroup[iso] += (item.carbsCal !== undefined) ? item.carbsCal : Math.round(item.cal * 0.50);
            dayFGroup[iso] += (item.fatCal !== undefined) ? item.fatCal : Math.round(item.cal * 0.25);
        });
        let sortedKDates = Object.keys(dayKGroup).sort().slice(-5);
        sortedKDates.forEach(d => {
            let p = d.split('-'); 
            let lbl = `${parseInt(p[2])}/${parseInt(p[1])}`;
            labelsK.push(lbl); labelsM.push(lbl);
            kcalData.push(Math.round(dayKGroup[d]));
            pData.push(Math.round(dayPGroup[d]));
            cData.push(Math.round(dayCGroup[d]));
            fData.push(Math.round(dayFGroup[d]));
        });

    } else if (period === 'week') {
        let weekWGroup = {};
        localData.weightLog.forEach(item => {
            let iso = item.iso_date || new Date(item.timestamp).toISOString().split('T')[0];
            let wKey = getWeekNumber(iso);
            if(!weekWGroup[wKey]) weekWGroup[wKey] = [];
            weekWGroup[wKey].push(item.weight);
        });
        let sortedWeeksW = Object.keys(weekWGroup).sort().slice(-5);
        sortedWeeksW.forEach(w => {
            labelsW.push(`สัปดาห์ ${w.split('-W')[1]}`);
            let sum = weekWGroup[w].reduce((s,v)=>s+v, 0);
            weightData.push(parseFloat((sum / weekWGroup[w].length).toFixed(1)));
        });

        let weekKDayGroup = {};
        let weekPDayGroup = {}, weekCDayGroup = {}, weekFDayGroup = {};
        localData.foods.forEach(item => {
            let iso = item.date || new Date().toISOString().split('T')[0];
            let wKey = getWeekNumber(iso);
            if(!weekKDayGroup[wKey]) { weekKDayGroup[wKey] = {}; weekPDayGroup[wKey] = {}; weekCDayGroup[wKey] = {}; weekFDayGroup[wKey] = {}; }
            if(!weekKDayGroup[wKey][iso]) { weekKDayGroup[wKey][iso] = 0; weekPDayGroup[wKey][iso] = 0; weekCDayGroup[wKey][iso] = 0; weekFDayGroup[wKey][iso] = 0; }
            weekKDayGroup[wKey][iso] += item.cal;
            weekPDayGroup[wKey][iso] += (item.proteinCal !== undefined) ? item.proteinCal : Math.round(item.cal * 0.25);
            weekCDayGroup[wKey][iso] += (item.carbsCal !== undefined) ? item.carbsCal : Math.round(item.cal * 0.50);
            weekFDayGroup[wKey][iso] += (item.fatCal !== undefined) ? item.fatCal : Math.round(item.cal * 0.25);
        });
        let sortedWeeksK = Object.keys(weekKDayGroup).sort().slice(-5);
        sortedWeeksK.forEach(w => {
            let lbl = `สัปดาห์ ${w.split('-W')[1]}`;
            labelsK.push(lbl); labelsM.push(lbl);
            let daysCount = Object.keys(weekKDayGroup[w]).length;
            kcalData.push(daysCount > 0 ? Math.round(Object.values(weekKDayGroup[w]).reduce((a,b)=>a+b,0) / daysCount) : 0);
            pData.push(daysCount > 0 ? Math.round(Object.values(weekPDayGroup[w]).reduce((a,b)=>a+b,0) / daysCount) : 0);
            cData.push(daysCount > 0 ? Math.round(Object.values(weekCDayGroup[w]).reduce((a,b)=>a+b,0) / daysCount) : 0);
            fData.push(daysCount > 0 ? Math.round(Object.values(weekFDayGroup[w]).reduce((a,b)=>a+b,0) / daysCount) : 0);
        });

    } else if (period === 'month') {
        let monthWGroup = {};
        localData.weightLog.forEach(item => {
            let iso = item.iso_date || new Date(item.timestamp).toISOString().split('T')[0];
            let p = iso.split('-'); let mKey = `${p[0]}-${p[1]}`;
            if(!monthWGroup[mKey]) monthWGroup[mKey] = [];
            monthWGroup[mKey].push(item.weight);
        });
        let sortedMonthsW = Object.keys(monthWGroup).sort().slice(-5);
        sortedMonthsW.forEach(m => {
            labelsW.push(getThaiMonthLabel(parseInt(m.split('-')[1]) - 1));
            let sum = monthWGroup[m].reduce((s,v)=>s+v, 0);
            weightData.push(parseFloat((sum / monthWGroup[m].length).toFixed(1)));
        });

        let monthKDayGroup = {};
        let monthPDayGroup = {}, monthCDayGroup = {}, monthFDayGroup = {};
        localData.foods.forEach(item => {
            let iso = item.date || new Date().toISOString().split('T')[0];
            let p = iso.split('-'); let mKey = `${p[0]}-${p[1]}`;
            if(!monthKDayGroup[mKey]) { monthKDayGroup[mKey] = {}; monthPDayGroup[mKey] = {}; monthCDayGroup[mKey] = {}; monthFDayGroup[mKey] = {}; }
            if(!monthKDayGroup[mKey][iso]) { monthKDayGroup[mKey][iso] = 0; monthPDayGroup[mKey][iso] = 0; monthCDayGroup[mKey][iso] = 0; monthFDayGroup[mKey][iso] = 0; }
            monthKDayGroup[mKey][iso] += item.cal;
            monthPDayGroup[mKey][iso] += (item.proteinCal !== undefined) ? item.proteinCal : Math.round(item.cal * 0.25);
            monthCDayGroup[mKey][iso] += (item.carbsCal !== undefined) ? item.carbsCal : Math.round(item.cal * 0.50);
            monthFDayGroup[mKey][iso] += (item.fatCal !== undefined) ? item.fatCal : Math.round(item.cal * 0.25);
        });
        let sortedMonthsK = Object.keys(monthKDayGroup).sort().slice(-5);
        sortedMonthsK.forEach(m => {
            let lbl = getThaiMonthLabel(parseInt(m.split('-')[1]) - 1);
            labelsK.push(lbl); labelsM.push(lbl);
            let daysCount = Object.keys(monthKDayGroup[m]).length;
            kcalData.push(daysCount > 0 ? Math.round(Object.values(monthKDayGroup[m]).reduce((a,b)=>a+b,0) / daysCount) : 0);
            pData.push(daysCount > 0 ? Math.round(Object.values(monthPDayGroup[m]).reduce((a,b)=>a+b,0) / daysCount) : 0);
            cData.push(daysCount > 0 ? Math.round(Object.values(monthCDayGroup[m]).reduce((a,b)=>a+b,0) / daysCount) : 0);
            fData.push(daysCount > 0 ? Math.round(Object.values(monthFDayGroup[m]).reduce((a,b)=>a+b,0) / daysCount) : 0);
        });
    }

    let targetCal = localData.customCalorieTarget || 2000;

    weightContainer.innerHTML = generateLineGraphSVG(labelsW, weightData, '#0ea5e9', false);
    kcalContainer.innerHTML = generateLineGraphSVG(labelsK, kcalData, '#f59e0b', true);
    if(macroContainer) macroContainer.innerHTML = generateMultiMacroGraphSVG(labelsM, pData, cData, fData, targetCal);
}

function parseTimeString(timeInput) {
    let match = timeInput.match(/([0-1]?[0-9]|2[0-3])[:.][0-5][0-9]/);
    if (match) {
        let parts = match[0].replace('.', ':').split(':');
        return { hours: parseInt(parts[0]), minutes: parseInt(parts[1]), string: match[0].replace('.', ':') + " น." };
    }
    return null;
}

function extractTimeString(text) {
    let timeMatch = text.match(/([0-1]?[0-9]|2[0-3])[:.][0-5][0-9]\s*(น\.?|นาฬิกา)?/);
    if (timeMatch) { 
        let cleanTime = timeMatch[0].replace('.', ':').replace(/\s*(น\.?|นาฬิกา)/g, "").trim(); 
        let parts = cleanTime.split(':'); 
        return { string: cleanTime + " น.", hours: parseInt(parts[0]), minutes: parseInt(parts[1]), rawMatch: timeMatch[0] }; 
    }

    let textClean = text.replace(/\s+/g, "");
    let hour = null; let minute = 0; let rawMatchStr = ""; let isHalf = textClean.includes("ครึ่ง");

    let thumMatch = textClean.match(/([1-6]|หนึ่ง|สอง|สาม|สี่|ห้า|หก)ทุ่ม/);
    if (thumMatch) {
        let mapper = {'1':19, 'หนึ่ง':19, '2':20, 'สอง':20, '3':21, 'สาม':21, '4':22, 'สี่':22, '5':23, 'ห้า':23, '6':0, 'หก':0};
        hour = mapper[thumMatch[1]]; rawMatchStr = thumMatch[0];
    } else if (textClean.includes("ตี")) {
        let teeMatch = textClean.match(/ตี([1-5]|หนึ่ง|สอง|สาม|สี่|ห้า)/);
        if (teeMatch) {
            let mapper = {'1':1, 'หนึ่ง':1, '2':2, 'สอง':2, '3':3, 'สาม':3, '4':4, 'สี่':4, '5':5, 'ห้า':5};
            hour = mapper[teeMatch[1]]; rawMatchStr = teeMatch[0];
        }
    } else if (textClean.includes("บ่าย")) {
        if (textClean.includes("บ่ายโมงครึ่ง")) { hour = 13; minute = 30; rawMatchStr = "บ่ายโมงครึ่ง"; } 
        else if (textClean.includes("บ่ายโมง")) { hour = 13; rawMatchStr = "บ่ายโมง"; } 
        else {
            let baiMatch = textClean.match(/บ่าย([2-4]|สอง|สาม|สี่)/);
            if (baiMatch) {
                let mapper = {'2':14, 'สอง':14, '3':15, 'สาม':15, '4':16, 'สี่':16};
                hour = mapper[baiMatch[1]]; rawMatchStr = baiMatch[0];
            }
        }
    } else {
        let mongMatch = textClean.match(/([7-9]|1[0-1])โมง/);
        if (mongMatch) { hour = parseInt(mongMatch[1]); rawMatchStr = mongMatch[0]; } 
        else if (textClean.includes("เที่ยงคืน")) { hour = 0; rawMatchStr = "เที่ยงคืน"; } 
        else if (textClean.includes("เที่ยง")) { hour = 12; rawMatchStr = "เที่ยง"; }
    }

    if (hour !== null) {
        if (isHalf && !rawMatchStr.includes("ครึ่ง")) { minute = 30; rawMatchStr += "ครึ่ง"; }
        let regexEscaped = rawMatchStr.split('').join('\\s*');
        let originalMatch = text.match(new RegExp(regexEscaped));
        return { string: String(hour).padStart(2, '0') + ":" + String(minute).padStart(2, '0') + " น.", hours: hour, minutes: minute, rawMatch: originalMatch ? originalMatch[0] : rawMatchStr };
    }
    return null;
}

function extractAppointmentDate(text) {
    const dayMap = {"อาทิตย์": 0, "จันทร์": 1, "อังคาร": 2, "พุธ": 3, "พฤหัส": 4, "ศุกร์": 5, "เสาร์": 6};
    const mList = [
        ["มค", "มกรา", "มกราคม"], ["กพ", "กุมภา", "กุมภาพันธ์"], ["มีค", "มีนา", "มีนาคม"],
        ["เมย", "เมษา", "เมษายน"], ["พค", "พฤษภา", "พฤษภาคม"], ["มิย", "มิถุนา", "มิถุนายน"],
        ["กค", "กรกฎา", "กรกฎาคม"], ["สค", "สิงหา", "สิงหาคม"], ["กย", "กันยา", "กันยายน"],
        ["ตค", "ตุลา", "ตุลาคม"], ["พย", "พฤศจิกา", "พฤศจิกายน"], ["ธค", "ธันวา", "ธันวาคม"]
    ];

    let dayRangeMatch = text.match(/(?:วัน)?(อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัส|ศุกร์|เสาร์)\s*(?:ถึง|-|จนถึง)\s*(?:วัน)?(อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัส|ศุกร์|เสาร์)/);
    if (dayRangeMatch) {
        let startDayIdx = dayMap[dayRangeMatch[1]];
        let endDayIdx = dayMap[dayRangeMatch[2]];
        let now = new Date();
        let currentDay = now.getDay();

        let startDiff = (startDayIdx + 7 - currentDay) % 7;
        let startDate = new Date();
        startDate.setDate(now.getDate() + startDiff);

        let daysSpan = (endDayIdx + 7 - startDayIdx) % 7;
        if (daysSpan === 0) daysSpan = 7;

        let datesArray = [];
        for (let i = 0; i <= daysSpan; i++) {
            let d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            datesArray.push(d);
        }

        return { dates: datesArray, date: datesArray[0], rawMatch: dayRangeMatch[0] };
    }

    let numRangeMatch = text.match(/(?:วันที่|ที่)?\s*(\d{1,2})\s*(?:ถึง|-|จนถึง)\s*(?:วันที่|ที่)?\s*(\d{1,2})\s*(?:เดือน)?\s*(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|มกรา|กุมภา|มีนา|เมษา|พฤษภา|มิถุนา|กรกฎา|สิงหา|กันยา|ตุลา|พฤศจิกา|ธันวา)?/i);
    
    if (numRangeMatch) {
        let startNum = parseInt(numRangeMatch[1]);
        let endNum = parseInt(numRangeMatch[2]);
        let mIndex = new Date().getMonth();

        if (numRangeMatch[3]) {
            let mStr = numRangeMatch[3].replace(/\./g, "").toLowerCase();
            for (let i = 0; i < mList.length; i++) {
                if (mList[i].some(k => mStr.includes(k))) {
                    mIndex = i;
                    break;
                }
            }
        }

        if (startNum >= 1 && startNum <= 31 && endNum >= 1 && endNum <= 31 && startNum <= endNum) {
            let datesArray = [];
            let now = new Date();
            let targetYear = now.getFullYear();

            for (let day = startNum; day <= endNum; day++) {
                datesArray.push(new Date(targetYear, mIndex, day));
            }

            return { dates: datesArray, date: datesArray[0], rawMatch: numRangeMatch[0] };
        }
    }

    let targetDate = new Date();
    if (text.includes("วันนี้")) { return { dates: [targetDate], date: targetDate, rawMatch: "วันนี้" }; }
    if (text.includes("พรุ่งนี้")) { targetDate.setDate(targetDate.getDate() + 1); return { dates: [targetDate], date: targetDate, rawMatch: "พรุ่งนี้" }; }
    
    let dateMonthMatch = text.match(/(?:วันที่|ที่)?\s*(\d{1,2})\s*(?:เดือน)?\s*(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|มกรา|กุมภา|มีนา|เมษา|พฤษภา|มิถุนา|กรกฎา|สิงหา|กันยา|ตุลา|พฤศจิกา|ธันวา)/i);
    if (dateMonthMatch) {
        let dayNum = parseInt(dateMonthMatch[1]); 
        let mStr = dateMonthMatch[2].replace(/\./g, "").toLowerCase(); 
        let mIndex = -1;

        for(let i = 0; i < mList.length; i++) { 
            if(mList[i].some(k => mStr.includes(k))) { 
                mIndex = i; 
                break; 
            } 
        }

        if (mIndex !== -1 && dayNum >= 1 && dayNum <= 31) { 
            targetDate.setDate(dayNum); 
            targetDate.setMonth(mIndex); 
            if(targetDate.getTime() < new Date().setHours(0,0,0,0)) targetDate.setFullYear(targetDate.getFullYear() + 1); 
            return { dates: [targetDate], date: targetDate, rawMatch: dateMonthMatch[0] }; 
        }
    }

    for (let dayName in dayMap) {
        if (text.includes(dayName + "หน้า")) {
            let currentDay = targetDate.getDay(); let targetDayIndex = dayMap[dayName];
            let daysAhead = (targetDayIndex + 7 - currentDay) % 7; if (daysAhead === 0) daysAhead = 7;
            targetDate.setDate(targetDate.getDate() + daysAhead); return { dates: [targetDate], date: targetDate, rawMatch: dayName + "หน้า" };
        }
        if (text.includes("วัน" + dayName)) {
            let currentDay = targetDate.getDay(); let targetDayIndex = dayMap[dayName];
            let daysAhead = (targetDayIndex + 7 - currentDay) % 7; targetDate.setDate(targetDate.getDate() + daysAhead); return { dates: [targetDate], date: targetDate, rawMatch: "วัน" + dayName };
        }
    }
    let dateMatch = text.match(/(?:วันที่|ที่)\s*(\d+)/);
    if (dateMatch) { let dayNum = parseInt(dateMatch[1]); if (dayNum >= 1 && dayNum <= 31) { targetDate.setDate(dayNum); return { dates: [targetDate], date: targetDate, rawMatch: dateMatch[0] }; } }
    return { dates: [targetDate], date: targetDate, rawMatch: "" };
}

async function submitData() {
    const inputEl = document.getElementById('raw-input'); 
    const text = inputEl.value.trim();
    if(!text) return alert("กรุณาพิมพ์หรือสั่งงานด้วยเสียงก่อนครับ");

    const apiKey = getStoredApiKey();

    if (apiKey) {
        const btnAdd = document.getElementById('btn-add-hq');
        const originalBtnText = btnAdd ? btnAdd.innerHTML : '';
        if(btnAdd) btnAdd.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังวิเคราะห์...`;

        try {
            const todayISO = new Date().toISOString().split('T')[0];
            const prompt = `คุณคือระบบช่วยสกัดข้อมูลนัดหมายและบันทึกส่วนตัว
ข้อความของผู้ใช้: "${text}"
วันนี้คือวันที่: ${todayISO}

กรุณาวิเคราะห์ข้อความแล้วตอบกลับมาเป็น JSON ตามรูปแบบนี้เท่านั้น (ไม่ต้องมี markdown code block):
{
  "type": "weight" หรือ "event",
  "weight": เลขน้ำหนักที่เป็น float (ถ้า type="weight" เช่น 68.5),
  "detail": "รายละเอียดงานหรือนัดหมายที่ตัดวันที่/เวลา/สถานที่ออกแล้ว",
  "location": "สถานที่หรือห้องประชุม (ถ้าไม่ระบุให้เป็น "")",
  "dates": ["YYYY-MM-DD"] (อาร์เรย์ของวันที่ที่มีในข้อความ ถ้าไม่ระบุให้ใช้ "${todayISO}"),
  "time_str": "HH:mm น." (เช่น "09:00 น." หรือ "14:30 น." ถ้าไม่ระบุเวลาให้เป็น "-"),
  "hours": เลขชั่วโมง 0-23 (ถ้าไม่ระบุให้ใช้ 9),
  "minutes": เลขนาที 0-59 (ถ้าไม่ระบุให้ใช้ 0)
}`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            const data = await response.json();
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                const aiResult = JSON.parse(data.candidates[0].content.parts[0].text);

                if (aiResult.type === 'weight' && aiResult.weight) {
                    let dateStr = getThaiDateString(new Date());
                    let isoStr = new Date().toISOString().split('T')[0];
                    localData.weightLog.push({ id: Date.now(), date: dateStr, iso_date: isoStr, weight: aiResult.weight, timestamp: Date.now() });
                    saveData(); renderWeightHistory(); calculateHealth();
                    alert(`💾 Gemini บันทึกน้ำหนัก ${aiResult.weight} kg เรียบร้อยครับ`);
                } else {
                    const targetDateStrs = (aiResult.dates && aiResult.dates.length > 0) ? aiResult.dates : [todayISO];
                    const sort_time = (aiResult.hours * 60) + aiResult.minutes;

                    targetDateStrs.forEach((dStr, idx) => {
                        let targetDate = new Date(dStr);
                        if (isNaN(targetDate.getTime())) targetDate = new Date();
                        targetDate.setHours(aiResult.hours, aiResult.minutes, 0, 0);

                        localData.brain_dump.push({ 
                            id: Date.now() + idx, 
                            cat: "Calendar", 
                            detail: aiResult.detail || text,
                            location: aiResult.location || "",
                            notes: targetDateStrs.length > 1 ? `(นัดหมายต่อเนื่อง ${getThaiDateString(new Date(targetDateStrs[0]))} - ${getThaiDateString(new Date(targetDateStrs[targetDateStrs.length - 1]))})` : "", 
                            time: aiResult.time_str || "-", 
                            iso_date: targetDate.toISOString(), 
                            appointment_date_str: getThaiDateString(targetDate), 
                            sort_time: sort_time, 
                            mile_start: 0, mile_end: 0, distance: 0 
                        });
                    });
                    saveData();
                }

                inputEl.value = '';
                if(btnAdd) btnAdd.innerHTML = originalBtnText;
                confetti({ particleCount: 20, spread: 40, colors: ['#059669', '#0f172a'] });
                displayData(); checkTodayAppointments();
                if(!document.getElementById('calendar-section').classList.contains('hidden')) renderCalendarWidget();
                return;
            }
        } catch (err) {
            console.warn("Gemini HQ Parse Failed, Falling back to local logic:", err);
            if(btnAdd) btnAdd.innerHTML = originalBtnText;
        }
    }

    let dateInfo = extractAppointmentDate(text); 
    let timeData = extractTimeString(text); 
    let time_str = "-"; 
    let sort_time = 9999;

    if (timeData) { 
        time_str = timeData.string; 
        sort_time = (timeData.hours * 60) + timeData.minutes; 
    }

    let cleanDetail = text;
    if (dateInfo.rawMatch) cleanDetail = cleanDetail.replace(dateInfo.rawMatch, "");
    if (timeData && timeData.rawMatch) cleanDetail = cleanDetail.replace(timeData.rawMatch, "");
    
    cleanDetail = cleanDetail
        .replace(/([0-1]?[0-9]|2[0-3])[:.][0-5][0-9]\s*(น\.?|นาฬิกา)?/g, "")
        .replace(/\s+น\.\s*$/, "")
        .replace(/(⏰|📌|เวลา|วัน|ที่|เดือน|ถึง|ถึงวันที่|ถึงวัน|ช่วง|โมง|ทุ่ม|ตี)\s*$/g, "")
        .replace(/\s+/g, " ")
        .trim();

    let isWeightLog = text.toLowerCase().includes("น้ำหนัก") || text.toLowerCase().includes("กก.");

    if (isWeightLog) {
        let wMatch = text.match(/\d+(\.\d+)?/);
        if(wMatch) {
            let dateStr = getThaiDateString(new Date());
            let isoStr = new Date().toISOString().split('T')[0];
            localData.weightLog.push({ id: Date.now(), date: dateStr, iso_date: isoStr, weight: parseFloat(wMatch[0]), timestamp: Date.now() });
            saveData(); renderWeightHistory(); calculateHealth();
            alert(`💾 บันทึกน้ำหนัก ${wMatch[0]} kg สำเร็จ`);
        }
    } else {
        let targetDates = dateInfo.dates || [dateInfo.date];
        targetDates.forEach((targetDate, idx) => {
            if (timeData) {
                targetDate.setHours(timeData.hours, timeData.minutes, 0, 0);
            } else {
                targetDate.setHours(9, 0, 0, 0);
            }

            localData.brain_dump.push({ 
                id: Date.now() + idx, 
                cat: "Calendar", 
                detail: cleanDetail || text, 
                location: "",
                notes: targetDates.length > 1 ? `(นัดหมายต่อเนื่อง ${getThaiDateString(targetDates[0])} - ${getThaiDateString(targetDates[targetDates.length - 1])})` : "", 
                time: time_str, 
                iso_date: targetDate.toISOString(), 
                appointment_date_str: getThaiDateString(targetDate), 
                sort_time: sort_time, 
                mile_start: 0, mile_end: 0, distance: 0 
            });
        });
        saveData();
    }

    inputEl.value = ''; 
    confetti({ particleCount: 20, spread: 40, colors: ['#059669', '#0f172a'] });
    displayData(); 
    checkTodayAppointments();
    if(!document.getElementById('calendar-section').classList.contains('hidden')) renderCalendarWidget();
}

function calculateLiveDistance() {
    let start = parseFloat(document.getElementById('edit-mile-start').value) || 0;
    let end = parseFloat(document.getElementById('edit-mile-end').value) || 0;
    let diff = end - start; if (diff < 0) diff = 0; 
    document.getElementById('edit-live-distance').innerText = diff.toLocaleString();
}

function openEditModal(id) {
    let item = localData.brain_dump.find(i => i.id === id); if (!item) return;
    document.getElementById('edit-item-id').value = item.id;
    document.getElementById('edit-detail').value = item.detail;
    document.getElementById('edit-location').value = item.location || '';
    document.getElementById('edit-notes').value = item.notes || ''; 
    document.getElementById('edit-time').value = item.time === '-' ? '' : item.time.replace(" น.", "");
    document.getElementById('edit-mile-start').value = item.mile_start || '';
    document.getElementById('edit-mile-end').value = item.mile_end || '';
    document.getElementById('edit-live-distance').innerText = item.distance || 0;
    if (item.iso_date) {
        let d = new Date(item.iso_date);
        let localISODate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        document.getElementById('edit-date').value = localISODate;
    }
    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); }

function saveEditedAppointment() {
    let id = parseFloat(document.getElementById('edit-item-id').value);
    let item = localData.brain_dump.find(i => i.id === id); if (!item) return;
    let detailInput = document.getElementById('edit-detail').value.trim();
    let locationInput = document.getElementById('edit-location').value.trim();
    let notesInput = document.getElementById('edit-notes').value.trim(); 
    let dateInput = document.getElementById('edit-date').value;
    let timeInput = document.getElementById('edit-time').value.trim();
    let mileStart = parseFloat(document.getElementById('edit-mile-start').value) || 0;
    let mileEnd = parseFloat(document.getElementById('edit-mile-end').value) || 0;
    let totalDistance = mileEnd - mileStart; if (totalDistance < 0) totalDistance = 0;

    if (!detailInput || !dateInput) return alert("กรุณากรอกหัวข้อนัดหมายและเลือกวันที่ครับ");
    let targetDate = new Date(dateInput); let time_str = "-"; let sort_time = 9999;
    if (timeInput) {
        let timeData = parseTimeString(timeInput);
        if (timeData) { targetDate.setHours(timeData.hours, timeData.minutes, 0, 0); time_str = timeData.string; sort_time = (timeData.hours * 60) + timeData.minutes; } 
        else { targetDate.setHours(9, 0, 0, 0); }
    } else { targetDate.setHours(9, 0, 0, 0); }

    item.detail = detailInput; 
    item.location = locationInput;
    item.notes = notesInput; 
    item.iso_date = targetDate.toISOString(); 
    item.appointment_date_str = getThaiDateString(targetDate);
    item.time = time_str; item.sort_time = sort_time; item.mile_start = mileStart; item.mile_end = mileEnd; item.distance = totalDistance;
    
    saveData(); closeEditModal(); displayData(); checkTodayAppointments();
    if(document.getElementById('calendar-section').classList.contains('hidden') === false) { renderCalendarWidget(); showEventOfDay(calendarSelectedDay); }
    confetti({ particleCount: 15, spread: 30, colors: ['#059669'] });
}

function getGoogleCalendarUrl(item) { 
    const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE"; 
    if(!item.iso_date) return baseUrl; 
    let startD = new Date(item.iso_date); 
    let endD = new Date(startD.getTime() + 60*60*1000); 
    let formatT = (d) => d.toISOString().replace(/[-:]/g, "").split('.')[0] + "Z"; 
    let detailsParam = item.notes ? `&details=${encodeURIComponent(item.notes)}` : '';
    let locationParam = item.location ? `&location=${encodeURIComponent(item.location)}` : '';
    return `${baseUrl}&text=${encodeURIComponent(item.detail)}&dates=${formatT(startD)}/${formatT(endD)}${detailsParam}${locationParam}`; 
}

function getGoogleMapsUrl(locationName) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`; }

function deletePlan(id) { 
    if(confirm("ต้องการลบแผนงานนี้ใช่ไหมครับ?")) { 
        localData.brain_dump = localData.brain_dump.filter(i => i.id !== id); 
        saveData(); displayData(); checkTodayAppointments(); 
        if(document.getElementById('calendar-section').classList.contains('hidden') === false) { 
            renderCalendarWidget(); showEventOfDay(calendarSelectedDay); 
        } 
    } 
}

function displayData() {
    const container = document.getElementById('list-container'); container.innerHTML = '';
    let safeData = localData.brain_dump || []; let activePlans = safeData.filter(i => i.cat === 'Calendar');
    let todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
    activePlans = activePlans.filter(item => { if(!item.iso_date) return true; return new Date(item.iso_date).getTime() >= todayMidnight.getTime(); });
    let todayStr = getThaiDateString(new Date()); let tom = new Date(); tom.setDate(tom.getDate() + 1); let tomorrowStr = getThaiDateString(tom);

    if (hqActiveFilter === 'today') { activePlans = activePlans.filter(i => i.appointment_date_str === todayStr); } 
    else if (hqActiveFilter === 'tomorrow') { activePlans = activePlans.filter(i => i.appointment_date_str === tomorrowStr); }
    activePlans.sort((a, b) => { let dateA = new Date(a.iso_date).setHours(0,0,0,0); let dateB = new Date(b.iso_date).setHours(0,0,0,0); if(dateA !== dateB) return dateA - dateB; return (a.sort_time || 9999) - (b.sort_time || 9999); });

    if(activePlans.length === 0) { container.innerHTML = `<div class="text-center text-slate-400 text-xs py-8 font-light bg-white rounded-2xl border border-slate-100">ไม่มีรายการข้อมูลนัดหมายค้างอยู่ในระบบ</div>`; return; }
    activePlans.forEach(item => {
        let mileBadgeHtml = ''; if (item.distance && item.distance > 0) { mileBadgeHtml = `<p class="inline-block text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg mt-1 border border-slate-200"><i class="fa-solid fa-road mr-1 text-emerald-600"></i>ไมล์คัดกรอง: ${item.mile_start} -> ${item.mile_end} (${item.distance} กม.)</p>`; }
        
        let locationHtml = '';
        if (item.location) {
            locationHtml = `<p class="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1"><i class="fa-solid fa-location-dot text-rose-500"></i> ${escapeHtml(item.location)}</p>`;
        }

        let notesHtml = '';
        if (item.notes) {
            notesHtml = `<div class="mt-2.5 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-600 whitespace-pre-line leading-relaxed"><i class="fa-regular fa-note-sticky text-amber-500 mr-1.5"></i>${escapeHtml(item.notes)}</div>`;
        }

        let navTarget = item.location || item.detail;

        container.innerHTML += `
            <div class="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col gap-2 relative hover:border-slate-300 transition-all">
                <div class="absolute top-4 right-3.5 flex gap-3">
                    <button onclick="openEditModal(${item.id})" class="text-slate-400 hover:text-emerald-600 text-sm transition-colors p-1" title="แก้ไข / ใส่โน้ต"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deletePlan(${item.id})" class="text-slate-300 hover:text-rose-500 text-sm transition-colors p-1"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div class="flex items-start gap-1">
                    <div class="flex-1 pr-12">
                        <p class="font-bold text-slate-900 text-sm leading-snug">${escapeHtml(item.detail)}</p>
                        <p class="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><span>📅 ${escapeHtml(item.appointment_date_str)}</span> <span>•</span> <span>⏰ ${item.time !== '-' ? escapeHtml(item.time) : 'ไม่ระบุเวลา'}</span></p>
                        ${locationHtml}
                        ${notesHtml}
                        ${mileBadgeHtml}
                        <div class="mt-3.5 flex gap-2 flex-wrap">
                            <a href="${getGoogleCalendarUrl(item)}" target="_blank" class="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-colors inline-flex items-center gap-1"><i class="fa-solid fa-calendar-plus text-emerald-400"></i>ลงปฏิทิน</a>
                            <a href="${getGoogleMapsUrl(navTarget)}" target="_blank" class="bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1"><i class="fa-solid fa-location-dot text-emerald-600"></i>นำทาง</a>
                        </div>
                    </div>
                </div>
            </div>`;
    });
}

function showSuggestions(val) { 
    const box = document.getElementById('suggestion-box'); 
    if (!val.trim()) { box.classList.add('hidden'); return; } 
    const currentDb = getFullMenuDb(); 
    let matches = Object.keys(currentDb).filter(menu => menu.toLowerCase().includes(val.toLowerCase())); 
    if (matches.length > 0) { 
        box.innerHTML = matches.map(menu => {
            let item = currentDb[menu];
            let cal = typeof item === 'object' ? item.cal : item;
            let pCal = typeof item === 'object' ? item.proteinCal : Math.round(cal*0.25);
            let cCal = typeof item === 'object' ? item.carbsCal : Math.round(cal*0.50);
            let fCal = typeof item === 'object' ? item.fatCal : Math.round(cal*0.25);
            return `<div onclick="selectSuggestion('${escapeHtml(menu)}', ${cal}, ${pCal}, ${cCal}, ${fCal})" class="p-3 text-xs text-slate-800 cursor-pointer hover:bg-slate-50 font-medium border-b border-slate-50 last:border-0">✨ ${escapeHtml(menu)} <span class="text-emerald-600 font-bold float-right">${cal} kcal</span></div>`;
        }).join(''); 
        box.classList.remove('hidden'); 
    } else { box.classList.add('hidden'); } 
}

function selectSuggestion(name, cal, pCal, cCal, fCal) { 
    document.getElementById('food-input').value = name; 
    document.getElementById('cal-input').value = cal;
    document.getElementById('protein-cal-input').value = pCal;
    document.getElementById('carbs-cal-input').value = cCal;
    document.getElementById('fat-cal-input').value = fCal;
    document.getElementById('suggestion-box').classList.add('hidden'); 
}

function autoSplitMacrosByCal() {
    let cal = parseInt(document.getElementById('cal-input').value) || 0;
    if(cal > 0) {
        document.getElementById('protein-cal-input').value = Math.round(cal * 0.25);
        document.getElementById('carbs-cal-input').value = Math.round(cal * 0.50);
        document.getElementById('fat-cal-input').value = Math.round(cal * 0.25);
    }
}

function addNewMenuToSystem() { 
    const foodInput = document.getElementById('food-input').value.trim(); 
    const calInput = parseInt(document.getElementById('cal-input').value) || 0; 
    const pCal = parseInt(document.getElementById('protein-cal-input').value) || Math.round(calInput * 0.25);
    const cCal = parseInt(document.getElementById('carbs-cal-input').value) || Math.round(calInput * 0.50);
    const fCal = parseInt(document.getElementById('fat-cal-input').value) || Math.round(calInput * 0.25);

    if (!foodInput || calInput <= 0) return alert("กรอกข้อมูลให้ครบก่อนครับ"); 
    if(!localData.customMenu) localData.customMenu = {}; 
    
    localData.customMenu[foodInput] = { cal: calInput, proteinCal: pCal, carbsCal: cCal, fatCal: fCal }; 
    saveData(); alert("เพิ่มเมนูโภชนาการเข้าคลังเรียบร้อย!"); 
}

window.openMenuModal = function() { 
    const modal = document.getElementById('menu-modal'); 
    const listEl = document.getElementById('modal-menu-list'); 
    listEl.innerHTML = ""; 
    const currentDb = getFullMenuDb(); 
    for (let menu in currentDb) { 
        let item = currentDb[menu];
        let cal = typeof item === 'object' ? item.cal : item;
        listEl.innerHTML += `<div class="flex justify-between py-2.5 border-b border-slate-100 text-xs font-medium"><span>${escapeHtml(menu)}</span><span class="font-bold text-emerald-600">${cal} kcal</span></div>`; 
    } 
    modal.classList.remove('hidden'); 
}

window.closeMenuModal = function() { document.getElementById('menu-modal').classList.add('hidden'); }

function addFoodDirect() { 
    const f = document.getElementById('food-input'); 
    const c = document.getElementById('cal-input'); 
    const pCal = parseInt(document.getElementById('protein-cal-input').value) || 0;
    const cCal = parseInt(document.getElementById('carbs-cal-input').value) || 0;
    const fCal = parseInt(document.getElementById('fat-cal-input').value) || 0;
    const d = document.getElementById('diet-log-date').value; 

    if(!f.value || !c.value || !d) return alert("ระบุข้อมูลอาหารและวันที่บันทึกให้ครบก่อนครับ"); 
    let calVal = parseInt(c.value) || 0;

    localData.foods.push({ 
        id: Date.now(), 
        name: f.value.trim(), 
        cal: calVal, 
        proteinCal: pCal || Math.round(calVal * 0.25),
        carbsCal: cCal || Math.round(calVal * 0.50),
        fatCal: fCal || Math.round(calVal * 0.25),
        date: d 
    }); 

    f.value = ''; c.value = ''; 
    document.getElementById('protein-cal-input').value = '';
    document.getElementById('carbs-cal-input').value = '';
    document.getElementById('fat-cal-input').value = '';
    clearImagePreview(); saveData(); renderFoods(); confetti({ particleCount: 10, spread: 20, colors: ['#059669'] }); 
}

window.deleteFood = function(id) { localData.foods = localData.foods.filter(i => i.id !== id); saveData(); renderFoods(); }

function renderFoods() {
    const list = document.getElementById('food-list'); const targetDate = document.getElementById('diet-log-date').value; if(!targetDate) return;
    let safeFoods = localData.foods || []; 
    let filteredFoods = safeFoods.filter(food => { if(!food.date) { let todayStr = new Date().toISOString().split('T')[0]; return todayStr === targetDate; } return food.date === targetDate; });
    
    let total = 0; let totalP = 0; let totalC = 0; let totalF = 0;
    filteredFoods.forEach(item => {
        total += item.cal;
        totalP += (item.proteinCal !== undefined) ? item.proteinCal : Math.round(item.cal * 0.25);
        totalC += (item.carbsCal !== undefined) ? item.carbsCal : Math.round(item.cal * 0.50);
        totalF += (item.fatCal !== undefined) ? item.fatCal : Math.round(item.cal * 0.25);
    });

    list.innerHTML = filteredFoods.map(food => `<li class="flex justify-between items-center py-3 border-b border-slate-100"><span class="text-slate-800 text-xs font-medium">${escapeHtml(food.name)} <span class="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md ml-1.5">${food.cal} kcal</span></span><button onclick="deleteFood(${food.id})" class="text-rose-500 font-bold px-2 py-1 hover:text-rose-700 text-sm">✕</button></li>`).join('');
    if (filteredFoods.length === 0) { list.innerHTML = `<li class="py-5 text-slate-400 text-center text-xs font-light">ไม่มีประวัติการบริโภคอาหารในวันนี้</li>`; }
    
    updateCalorieDisplay(total, totalP, totalC, totalF);
}

function updateCalorieDisplay(total, totalP, totalC, totalF) { 
    let finalTarget = 2000; 
    const targetEl = document.getElementById('target-cal'); 
    if (targetEl) finalTarget = parseInt(targetEl.innerText) || finalTarget; 
    const totalEl = document.getElementById('total-cal'); 
    if (totalEl) { totalEl.innerText = total; totalEl.className = total > finalTarget ? "text-rose-500 font-black text-base" : "text-emerald-600 font-black text-base"; } 

    let targetP = Math.round(finalTarget * 0.30);
    let targetC = Math.round(finalTarget * 0.45);
    let targetF = Math.round(finalTarget * 0.25);

    if(document.getElementById('p-cal-val')) document.getElementById('p-cal-val').innerText = `${totalP} / ${targetP}`;
    if(document.getElementById('c-cal-val')) document.getElementById('c-cal-val').innerText = `${totalC} / ${targetC}`;
    if(document.getElementById('f-cal-val')) document.getElementById('f-cal-val').innerText = `${totalF} / ${targetF}`;

    if(document.getElementById('p-progress')) document.getElementById('p-progress').style.width = `${Math.min(100, Math.round((totalP/targetP)*100))}%`;
    if(document.getElementById('c-progress')) document.getElementById('c-progress').style.width = `${Math.min(100, Math.round((totalC/targetC)*100))}%`;
    if(document.getElementById('f-progress')) document.getElementById('f-progress').style.width = `${Math.min(100, Math.round((totalF/targetF)*100))}%`;
}

function renderCalendarWidget() {
    const container = document.getElementById('calendar-widget-container'); 
    const currentYear = calendarCurrentDate.getFullYear(); 
    const currentMonth = calendarCurrentDate.getMonth(); 
    
    const now = new Date(); 
    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); 
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    let activeEventDays = new Set(); 
    let safeData = localData.brain_dump || [];
    
    safeData.forEach(item => { 
        if (item.cat === 'Calendar' && item.iso_date) { 
            let eventDate = new Date(item.iso_date); 
            if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) { 
                activeEventDays.add(eventDate.getDate()); 
            } 
        } 
    });

    let html = `
    <div class="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm text-center">
        <div class="flex justify-between items-center mb-3.5 px-1">
            <button onclick="changeCalendarMonth(-1)" class="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all text-xs">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            
            <div class="flex items-center gap-1.5">
                <p class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <i class="fa-regular fa-calendar-days text-emerald-600"></i> 
                    ${monthNames[currentMonth]} ${(currentYear + 543)}
                </p>
                <button onclick="resetCalendarToToday()" title="กลับไปเดือนปัจจุบัน" class="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold hover:bg-emerald-100 transition-all">
                    วันนี้
                </button>
            </div>

            <button onclick="changeCalendarMonth(1)" class="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all text-xs">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>

        <div class="grid grid-cols-7 gap-1 text-xs font-bold text-slate-400 bg-slate-50 py-2 rounded-xl mb-2.5 border border-slate-100">
            <div class="text-rose-500">อา</div>
            <div>จ</div>
            <div>อ</div>
            <div>พ</div>
            <div>พฤ</div>
            <div>ศ</div>
            <div class="text-sky-600">ส</div>
        </div>
        <div class="grid grid-cols-7 gap-1.5 text-xs font-medium">`;

    for (let i = 0; i < firstDayIndex; i++) { html += `<div></div>`; }
    
    for (let day = 1; day <= totalDays; day++) {
        let isToday = (day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear()); 
        let hasEvent = activeEventDays.has(day); 
        let isSelected = (day === calendarSelectedDay);
        
        let classes = "p-2 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all border text-xs h-10 font-medium ";
        if (isSelected) { 
            classes += "bg-slate-900 text-white font-bold border-slate-900 shadow-sm scale-105"; 
        } else if (isToday && hasEvent) { 
            classes += "bg-emerald-600 text-white font-bold border-emerald-600"; 
        } else if (isToday) { 
            classes += "bg-slate-200 text-slate-900 font-bold border-slate-300"; 
        } else if (hasEvent) { 
            classes += "font-bold text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50/60"; 
        } else { 
            classes += "hover:bg-slate-50 text-slate-700 border-transparent"; 
        }
        
        html += `<div onclick="selectCalendarDay(${day})" class="${classes}"><span>${day}</span></div>`;
    }
    html += `</div></div>`; 
    container.innerHTML = html;
}

function changeCalendarMonth(delta) {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + delta);
    renderCalendarWidget();
    if (calendarSelectedDay) {
        showEventOfDay(calendarSelectedDay);
    }
}

function resetCalendarToToday() {
    calendarCurrentDate = new Date();
    calendarSelectedDay = new Date().getDate();
    renderCalendarWidget();
    showEventOfDay(calendarSelectedDay);
}

window.selectCalendarDay = function(day) { 
    calendarSelectedDay = day; 
    renderCalendarWidget(); 
    showEventOfDay(day); 
}

function showEventOfDay(day) {
    const previewContainer = document.getElementById('calendar-day-events-container'); 
    const currentYear = calendarCurrentDate.getFullYear(); 
    const currentMonth = calendarCurrentDate.getMonth(); 
    
    let queryDate = new Date(currentYear, currentMonth, day);
    document.getElementById('selected-date-label').innerText = queryDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric'});
    
    let safeData = localData.brain_dump || []; 
    let dayEvents = safeData.filter(item => { 
        if (item.cat !== 'Calendar' || !item.iso_date) return false; 
        let d = new Date(item.iso_date); 
        return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear; 
    });
    
    dayEvents.sort((a, b) => (a.sort_time || 9999) - (b.sort_time || 9999));
    if (dayEvents.length === 0) { previewContainer.innerHTML = `<p class="text-slate-400 text-center py-6 font-light text-xs">ไม่มีวาระงานในวันดังกล่าว 👍</p>`; return; }
    
    previewContainer.innerHTML = dayEvents.map(item => { 
        let mileBadgeHtml = ''; if (item.distance && item.distance > 0) { mileBadgeHtml = `<p class="text-xs text-emerald-700 font-bold mt-1"><i class="fa-solid fa-road mr-1"></i>ระยะรวม: ${item.distance} กม.</p>`; }
        let locationHtml = item.location ? `<p class="text-xs text-emerald-700 font-semibold mt-1"><i class="fa-solid fa-location-dot text-rose-500 mr-1"></i>${escapeHtml(item.location)}</p>` : '';
        let notesHtml = item.notes ? `<p class="text-xs text-slate-600 mt-1.5 bg-white p-2 rounded-lg border border-slate-200/80 whitespace-pre-line leading-relaxed"><i class="fa-regular fa-note-sticky text-amber-500 mr-1"></i>${escapeHtml(item.notes)}</p>` : '';
        return `<div class="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex items-start justify-between shadow-xs"><div><p class="font-bold text-slate-900 text-sm leading-snug">${escapeHtml(item.detail)}</p><p class="text-xs text-slate-500 mt-1"><i class="fa-regular fa-clock mr-1"></i>เวลา: ${item.time !== '-' ? escapeHtml(item.time) : 'ไม่ระบุเวลา'}</p>${locationHtml}${notesHtml}${mileBadgeHtml}</div><div class="flex gap-2.5 items-center pl-2 pt-0.5"><button onclick="openEditModal(${item.id})" class="text-slate-400 hover:text-emerald-600 text-sm transition-colors p-1"><i class="fa-solid fa-pen"></i></button><button onclick="deletePlan(${item.id})" class="text-slate-300 hover:text-rose-500 text-sm transition-colors p-1"><i class="fa-solid fa-trash"></i></button></div></div>` 
    }).join('');
}

function checkTodayAppointments() { 
    const alertBox = document.getElementById('today-alert'); 
    let todayStr = getThaiDateString(new Date()); 
    let todayEvents = localData.brain_dump.filter(i => i.cat === 'Calendar' && i.appointment_date_str === todayStr); 
    if(todayEvents.length > 0) { 
        alertBox.innerHTML = `💼 <b>วาระงานวันนี้:</b> ${todayEvents.map(i => escapeHtml(i.detail)).join(', ')}`; 
        alertBox.classList.remove('hidden'); 
    } else { 
        alertBox.classList.add('hidden'); 
    } 
}

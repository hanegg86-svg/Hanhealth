// ==========================================
// 📸 GEMINI IMAGE SCHEDULE EXTRACTOR ENGINE
// ==========================================
async function handleImageScheduleEstimate(event) {
    const file = event.target.files[0];
    if (!file) return;

    const apiKey = getStoredApiKey();
    if (!apiKey) {
        alert("🔑 กรุณาตั้งค่า Gemini API Key ก่อนใช้งานระบบอ่านรูปภาพครับ");
        openApiKeyModal();
        event.target.value = '';
        return;
    }

    const previewBox = document.getElementById('schedule-img-preview-box');
    const imgPreview = document.getElementById('schedule-img-preview');
    const statusText = document.getElementById('schedule-status-text');

    const reader = new FileReader();
    reader.onload = async function(e) {
        imgPreview.src = e.target.result;
        previewBox.classList.remove('hidden');
        statusText.innerText = "🤖 กำลังใช้ Gemini 3.5 Flash-Lite วิเคราะห์สกัดตารางประชุม...";

        const base64Data = e.target.result.split(',')[1];
        const mimeType = file.type || "image/jpeg";

        const prompt = `วิเคราะห์รูปภาพแคปหน้าจอตารางงาน/ตารางนัดหมายนี้ สกัดรายการนัดหมายทั้งหมดออกมา ตอบกลับเป็น JSON Array ของออบเจกต์เท่านั้น ในรูปแบบ:
[
  {
    "detail": "ชื่อนัดหมาย/วาระงาน",
    "location": "สถานที่ หรือ ห้องประชุม (ถ้ามี)",
    "iso_date": "YYYY-MM-DD",
    "time_str": "HH:mm น.",
    "hours": 9,
    "minutes": 0
  }
]
หมายเหตุ:
- ถ้าในภาพระบุปีพุทธศักราช (เช่น 2569) ให้แปลงเป็น ค.ศ. (2026)
- ถ้าเวลาเป็นช่วง เช่น 09:00-11:00 น. ให้ใช้เวลาเริ่มต้นคือ 09:00 น.
- ตอบกลับเฉพาะ JSON Array บริสุทธิ์ (ไม่ต้องใส่ markdown code block)`;

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { inline_data: { mime_type: mimeType, data: base64Data } },
                            { text: prompt }
                        ]
                    }]
                })
            });

            if (!response.ok) {
                alert(`❌ เกิดข้อผิดพลาดจาก Gemini API (HTTP Status: ${response.status})`);
                statusText.innerText = "❌ เกิดข้อผิดพลาดในการวิเคราะห์ภาพ";
                return;
            }

            const data = await response.json();
            if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
                const rawText = data.candidates[0].content.parts[0].text.trim();
                const cleanJsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                const eventsList = JSON.parse(cleanJsonStr);

                if (Array.isArray(eventsList) && eventsList.length > 0) {
                    let addedCount = 0;
                    eventsList.forEach((evt, idx) => {
                        let targetDate = new Date(evt.iso_date);
                        if (isNaN(targetDate.getTime())) targetDate = new Date();
                        targetDate.setHours(evt.hours || 9, evt.minutes || 0, 0, 0);

                        let sortTime = ((evt.hours || 9) * 60) + (evt.minutes || 0);

                        localData.brain_dump.push({
                            id: Date.now() + idx + Math.floor(Math.random() * 1000),
                            cat: "Calendar",
                            detail: evt.detail || "นัดหมายจากภาพ",
                            location: evt.location || "",
                            notes: "บันทึกอัตโนมัติจากการสแกนรูปภาพตารางงานด้วย Gemini AI",
                            time: evt.time_str || "-",
                            iso_date: targetDate.toISOString(),
                            appointment_date_str: getThaiDateString(targetDate),
                            sort_time: sortTime,
                            mile_start: 0, mile_end: 0, distance: 0
                        });
                        addedCount++;
                    });

                    saveData();
                    displayData();
                    checkTodayAppointments();
                    if(!document.getElementById('calendar-section').classList.contains('hidden')) {
                        renderCalendarWidget();
                    }
                    statusText.innerText = `✨ เพิ่มนัดหมายจากภาพเรียบร้อยแล้ว ${addedCount} รายการ!`;
                    confetti({ particleCount: 25, spread: 50, colors: ['#f59e0b', '#059669'] });
                    alert(`📸 Gemini แสกนและดึงนัดหมายสำเร็จ ${addedCount} รายการแล้วครับ!`);
                } else {
                    statusText.innerText = "⚠️ ไม่พบนัดหมายในภาพครับ";
                }
            }
        } catch (err) {
            console.error("Gemini Image Extraction Error:", err);
            statusText.innerText = "❌ อ่านข้อมูลตารางจากภาพไม่สำเร็จ โปรดลองรูปที่ชัดเจนขึ้นครับ";
        }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function clearScheduleImagePreview() {
    document.getElementById('schedule-img-preview-box').classList.add('hidden');
    document.getElementById('schedule-camera-input').value = '';
}

function importIcsCalendar(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jcalData = ICAL.parse(e.target.result);
            const comp = new ICAL.Component(jcalData);
            const vevents = comp.getAllSubcomponents('vevent');

            let importedCount = 0;

            vevents.forEach(vevent => {
                const evt = new ICAL.Event(vevent);
                
                let startDate = evt.startDate.toJSDate();
                let hours = startDate.getHours();
                let minutes = startDate.getMinutes();
                let timeStr = (hours || minutes) ? `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')} น.` : "-";
                let sortTime = (hours * 60) + minutes;

                let isDuplicate = localData.brain_dump.some(item => 
                    item.detail === evt.summary && 
                    item.iso_date === startDate.toISOString()
                );

                if (!isDuplicate) {
                    localData.brain_dump.push({
                        id: Date.now() + Math.floor(Math.random() * 1000),
                        cat: "Calendar",
                        detail: evt.summary || "นัดหมายจาก MS Teams",
                        location: evt.location || "",
                        notes: evt.description || "",
                        time: timeStr,
                        iso_date: startDate.toISOString(),
                        appointment_date_str: getThaiDateString(startDate),
                        sort_time: sortTime,
                        mile_start: 0, mile_end: 0, distance: 0
                    });
                    importedCount++;
                }
            });

            if (importedCount > 0) {
                saveData();
                displayData();
                checkTodayAppointments();
                if(!document.getElementById('calendar-section').classList.contains('hidden')) {
                    renderCalendarWidget();
                }
                confetti({ particleCount: 25, spread: 50, colors: ['#0284c7', '#059669'] });
                alert(`📥 นำเข้าปฏิทิน MS Teams เรียบร้อยแล้ว ${importedCount} รายการ!`);
            } else {
                alert("ℹ️ ไม่พบนัดหมายใหม่ หรือนัดหมายทั้งหมดมีอยู่ในระบบแล้วครับ");
            }

        } catch (err) {
            console.error(err);
            alert("❌ ไม่สามารถอ่านไฟล์ .ics ได้ กรุณาตรวจสอบความถูกต้องของไฟล์ครับ");
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

// ==========================================
// 🍳 GEMINI FOOD & MACRO EXTRACTOR ENGINE
// ==========================================
async function fetchCalorieFromGemini(foodName, base64Image = null, mimeType = null) {
    const apiKey = getStoredApiKey();
    if (!apiKey) {
        alert("🔑 ยังไม่ได้ตั้งค่า API Key ครับ\nกรุณาคลิกที่รูปแม่กุญแจ ด้านบนขวาเพื่อใส่ API Key ก่อนครับ");
        openApiKeyModal();
        return null;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    let partsPayload = [];
    
    if (base64Image) {
        partsPayload.push({ inline_data: { mime_type: mimeType, data: base64Image } });
        partsPayload.push({ text: `วิเคราะห์รูปอาหารนี้ ตอบกลับในรูปแบบ JSON สั้นๆ เท่านั้น ตัวอย่าง: {"name": "ข้าวมันไก่", "cal": 596, "protein_cal": 96, "carbs_cal": 276, "fat_cal": 224}` });
    } else {
        partsPayload.push({ text: `ประเมินโภชนาการของเมนูอาหารต่อไปนี้: "${foodName}" ตอบกลับในรูปแบบ JSON เท่านั้น ตัวอย่าง: {"name": "${foodName}", "cal": 550, "protein_cal": 100, "carbs_cal": 250, "fat_cal": 200}` });
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: partsPayload }] })
        });

        if (!response.ok) {
            if (response.status === 400 || response.status === 403) alert("❌ API Key ไม่ถูกต้อง หรือคัดลอกมาไม่ครบครับ");
            else if (response.status === 404) alert("❌ ไม่พบโมเดล API (HTTP Status: 404)");
            else if (response.status === 429) alert("⚠️ โควต้าการใช้งาน Gemini API เต็มแล้ว (Quota Exceeded)");
            else alert(`❌ เกิดข้อผิดพลาดในการเชื่อมต่อ API (HTTP Status: ${response.status})`);
            return null;
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
            const textResult = data.candidates[0].content.parts[0].text.trim();
            try {
                const cleanJson = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleanJson);
            } catch(e) {
                const calMatch = textResult.match(/\d+/);
                let cal = calMatch ? parseInt(calMatch[0]) : 500;
                return { 
                    name: foodName || "อาหารในภาพ", 
                    cal: cal,
                    protein_cal: Math.round(cal * 0.25),
                    carbs_cal: Math.round(cal * 0.50),
                    fat_cal: Math.round(cal * 0.25)
                };
            }
        }
        return null;
    } catch (error) {
        console.error("Gemini API Error:", error);
        alert("🌐 ไม่สามารถเชื่อมต่ออินเทอร์เน็ต โปรดเช็กการเชื่อมต่อของคุณครับ");
        return null;
    }
}

async function handleImageCalorieEstimate(event) {
    const file = event.target.files[0];
    if (!file) return;

    const previewBox = document.getElementById('image-preview-box');
    const imgPreview = document.getElementById('food-img-preview');
    const statusText = document.getElementById('img-status-text');
    const foodInput = document.getElementById('food-input');
    const calInput = document.getElementById('cal-input');

    const reader = new FileReader();
    reader.onload = async function(e) {
        imgPreview.src = e.target.result;
        previewBox.classList.remove('hidden');
        statusText.innerText = "🤖 กำลังวิเคราะห์รูปภาพอาหารด้วย AI...";

        const base64Data = e.target.result.split(',')[1];
        const mimeType = file.type || "image/jpeg";

        const result = await fetchCalorieFromGemini(null, base64Data, mimeType);

        if (result && result.cal) {
            if(result.name) foodInput.value = result.name;
            calInput.value = result.cal;
            
            let pCal = result.protein_cal || Math.round(result.cal * 0.25);
            let cCal = result.carbs_cal || Math.round(result.cal * 0.50);
            let fCal = result.fat_cal || Math.round(result.cal * 0.25);

            if(document.getElementById('protein-cal-input')) document.getElementById('protein-cal-input').value = pCal;
            if(document.getElementById('carbs-cal-input')) document.getElementById('carbs-cal-input').value = cCal;
            if(document.getElementById('fat-cal-input')) document.getElementById('fat-cal-input').value = fCal;

            statusText.innerText = `✨ วิเคราะห์เสร็จสิ้น: ${escapeHtml(result.name || 'จานนี้')} (~${result.cal} kcal)`;
            confetti({ particleCount: 15, spread: 30, colors: ['#059669'] });
            
            if (result.name && result.cal) {
                if (!localData.customMenu) localData.customMenu = {};
                localData.customMenu[result.name] = {
                    cal: result.cal,
                    proteinCal: pCal,
                    carbsCal: cCal,
                    fatCal: fCal
                };
                saveData();
            }
        } else {
            statusText.innerText = "❌ ไม่สามารถประเมินแคลอรีจากภาพได้ โปรดกรอกเองครับ";
        }
    };
    reader.readAsDataURL(file);
}

function clearImagePreview() {
    document.getElementById('image-preview-box').classList.add('hidden');
    document.getElementById('food-camera-input').value = '';
    document.getElementById('food-gallery-input').value = '';
}

async function manualCalculateCalorie() {
    const foodInput = document.getElementById('food-input').value.trim();
    const calInput = document.getElementById('cal-input');
    
    if (!foodInput) return alert("กรุณาพิมพ์ชื่อเมนูอาหารก่อนครับ");

    const currentDb = getFullMenuDb();
    let foundItem = currentDb[foodInput] || null;

    if (foundItem) {
        let cal = typeof foundItem === 'object' ? foundItem.cal : foundItem;
        calInput.value = cal;
        if(document.getElementById('protein-cal-input')) document.getElementById('protein-cal-input').value = typeof foundItem === 'object' ? foundItem.proteinCal : Math.round(cal * 0.25);
        if(document.getElementById('carbs-cal-input')) document.getElementById('carbs-cal-input').value = typeof foundItem === 'object' ? foundItem.carbsCal : Math.round(cal * 0.50);
        if(document.getElementById('fat-cal-input')) document.getElementById('fat-cal-input').value = typeof foundItem === 'object' ? foundItem.fatCal : Math.round(cal * 0.25);
        return;
    }

    calInput.placeholder = "🤖 กำลังประเมินด้วย Gemini AI...";
    calInput.value = "";
    
    const result = await fetchCalorieFromGemini(foodInput);

    if (result && result.cal) {
        calInput.value = result.cal;
        calInput.placeholder = "กรอกเองหรือระบบคำนวณ...";

        let pCal = result.protein_cal || Math.round(result.cal * 0.25);
        let cCal = result.carbs_cal || Math.round(result.cal * 0.50);
        let fCal = result.fat_cal || Math.round(result.cal * 0.25);

        if(document.getElementById('protein-cal-input')) document.getElementById('protein-cal-input').value = pCal;
        if(document.getElementById('carbs-cal-input')) document.getElementById('carbs-cal-input').value = cCal;
        if(document.getElementById('fat-cal-input')) document.getElementById('fat-cal-input').value = fCal;
        
        if (!localData.customMenu) localData.customMenu = {};
        localData.customMenu[foodInput] = {
            cal: result.cal,
            proteinCal: pCal,
            carbsCal: cCal,
            fatCal: fCal
        };
        saveData();
        confetti({ particleCount: 10, spread: 20, colors: ['#059669'] });
    } else {
        calInput.placeholder = "กรอกเองหรือระบบคำนวณ...";
    }
}

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
                    const eventDetail = (aiResult.detail || text).trim();

                    let addedCount = 0;
                    let skippedCount = 0;

                    targetDateStrs.forEach((dStr, idx) => {
                        let targetDate = new Date(dStr);
                        if (isNaN(targetDate.getTime())) targetDate = new Date();
                        targetDate.setHours(aiResult.hours, aiResult.minutes, 0, 0);
                        let targetIso = targetDate.toISOString();

                        // ตรวจสอบความซ้ำซ้อน
                        let isDuplicate = localData.brain_dump.some(item => 
                            item.cat === "Calendar" &&
                            item.detail.trim().toLowerCase() === eventDetail.toLowerCase() &&
                            item.iso_date === targetIso
                        );

                        if (!isDuplicate) {
                            localData.brain_dump.push({ 
                                id: Date.now() + idx, 
                                cat: "Calendar", 
                                detail: eventDetail,
                                location: aiResult.location || "",
                                notes: targetDateStrs.length > 1 ? `(นัดหมายต่อเนื่อง ${getThaiDateString(new Date(targetDateStrs[0]))} - ${getThaiDateString(new Date(targetDateStrs[targetDateStrs.length - 1]))})` : "", 
                                time: aiResult.time_str || "-", 
                                iso_date: targetIso, 
                                appointment_date_str: getThaiDateString(targetDate), 
                                sort_time: sort_time, 
                                mile_start: 0, mile_end: 0, distance: 0 
                            });
                            addedCount++;
                        } else {
                            skippedCount++;
                        }
                    });

                    if (addedCount > 0) {
                        saveData();
                        if (skippedCount > 0) {
                            alert(`✨ บันทึกนัดหมายสำเร็จ ${addedCount} รายการ (ข้ามรายการที่ซ้ำ ${skippedCount} รายการ)`);
                        }
                    } else if (skippedCount > 0) {
                        alert("ℹ️ นัดหมายนี้มีอยู่ในระบบเรียบร้อยแล้วครับ");
                    }
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
        let eventDetail = (cleanDetail || text).trim();
        let addedCount = 0;
        let skippedCount = 0;

        targetDates.forEach((targetDate, idx) => {
            if (timeData) {
                targetDate.setHours(timeData.hours, timeData.minutes, 0, 0);
            } else {
                targetDate.setHours(9, 0, 0, 0);
            }
            let targetIso = targetDate.toISOString();

            // ตรวจสอบความซ้ำซ้อน
            let isDuplicate = localData.brain_dump.some(item => 
                item.cat === "Calendar" &&
                item.detail.trim().toLowerCase() === eventDetail.toLowerCase() &&
                item.iso_date === targetIso
            );

            if (!isDuplicate) {
                localData.brain_dump.push({ 
                    id: Date.now() + idx, 
                    cat: "Calendar", 
                    detail: eventDetail, 
                    location: "",
                    notes: targetDates.length > 1 ? `(นัดหมายต่อเนื่อง ${getThaiDateString(targetDates[0])} - ${getThaiDateString(targetDates[targetDates.length - 1])})` : "", 
                    time: time_str, 
                    iso_date: targetIso, 
                    appointment_date_str: getThaiDateString(targetDate), 
                    sort_time: sort_time, 
                    mile_start: 0, mile_end: 0, distance: 0 
                });
                addedCount++;
            } else {
                skippedCount++;
            }
        });

        if (addedCount > 0) {
            saveData();
            if (skippedCount > 0) {
                alert(`✨ บันทึกนัดหมายสำเร็จ ${addedCount} รายการ (ข้ามรายการที่ซ้ำ ${skippedCount} รายการ)`);
            }
        } else if (skippedCount > 0) {
            alert("ℹ️ นัดหมายนี้มีอยู่ในระบบเรียบร้อยแล้วครับ");
        }
    }

    inputEl.value = ''; 
    confetti({ particleCount: 20, spread: 40, colors: ['#059669', '#0f172a'] });
    displayData(); 
    checkTodayAppointments();
    if(!document.getElementById('calendar-section').classList.contains('hidden')) renderCalendarWidget();
}

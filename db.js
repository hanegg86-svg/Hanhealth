function saveData() { 
    localStorage.setItem(DB_KEY, JSON.stringify(localData)); 
}

// ระบบ Migration ข้อมูลเก่าเป็นแคลอรีสารอาหารแยกประเภทอัตโนมัติ
function migrateOldDataToKcalMacros() {
    let updated = false;

    // 1. แปลงคลังอาหารผู้ใช้เก่า (customMenu)
    if (localData.customMenu) {
        for (let menu in localData.customMenu) {
            let item = localData.customMenu[menu];
            if (typeof item === 'number') {
                let cal = item;
                localData.customMenu[menu] = {
                    cal: cal,
                    proteinCal: Math.round(cal * 0.25),
                    carbsCal: Math.round(cal * 0.50),
                    fatCal: Math.round(cal * 0.25)
                };
                updated = true;
            }
        }
    }

    // 2. แปลงประวัติการกินอาหารย้อนหลัง (foods)
    if (localData.foods && localData.foods.length > 0) {
        localData.foods.forEach(food => {
            if (food.proteinCal === undefined || food.carbsCal === undefined || food.fatCal === undefined) {
                let currentDb = { ...defaultMenuDb, ...(localData.customMenu || {}) };
                if (currentDb[food.name] && typeof currentDb[food.name] === 'object') {
                    food.proteinCal = currentDb[food.name].proteinCal || Math.round(food.cal * 0.25);
                    food.carbsCal = currentDb[food.name].carbsCal || Math.round(food.cal * 0.50);
                    food.fatCal = currentDb[food.name].fatCal || Math.round(food.cal * 0.25);
                } else {
                    food.proteinCal = Math.round(food.cal * 0.25);
                    food.carbsCal = Math.round(food.cal * 0.50);
                    food.fatCal = Math.round(food.cal * 0.25);
                }
                updated = true;
            }
        });
    }

    if (updated) {
        saveData();
    }
}

// เรียกรัน Migration เมื่อโหลดไฟล์ db.js
migrateOldDataToKcalMacros();

function getStoredApiKey() { 
    return localStorage.getItem('GEMINI_USER_API_KEY') || ""; 
}

function openApiKeyModal() {
    document.getElementById('api-key-input').value = getStoredApiKey();
    document.getElementById('apikey-modal').classList.remove('hidden');
}

function closeApiKeyModal() { 
    document.getElementById('apikey-modal').classList.add('hidden'); 
}

function saveApiKey() {
    const key = document.getElementById('api-key-input').value.trim();
    if (key) {
        localStorage.setItem('GEMINI_USER_API_KEY', key);
        confetti({ particleCount: 15, spread: 30, colors: ['#059669'] });
        alert("💾 บันทึก Gemini API Key เรียบร้อยแล้วครับ!");
        closeApiKeyModal();
    } else {
        alert("กรุณากรอก API Key ก่อนบันทึกครับ");
    }
}

function clearApiKey() {
    if (confirm("ต้องการลบ API Key ออกจากเครื่องนี้ใช่ไหมครับ?")) {
        localStorage.removeItem('GEMINI_USER_API_KEY');
        document.getElementById('api-key-input').value = "";
        alert("ลบ API Key เรียบร้อยแล้วครับ");
        closeApiKeyModal();
    }
}

function backupData() {
    let today = new Date().toISOString().split('T')[0];
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localData));
    let downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr); 
    downloadAnchor.setAttribute("download", `Dads_HQ_Backup_${today}.json`);
    document.body.appendChild(downloadAnchor); 
    downloadAnchor.click(); 
    downloadAnchor.remove();
    confetti({ particleCount: 15, spread: 30, colors: ['#059669'] });
}

function triggerImport() { 
    document.getElementById('import-file-input').click(); 
}

function importData(event) {
    const file = event.target.files[0]; 
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let importedObj = JSON.parse(e.target.result);
            if (importedObj.brain_dump || importedObj.foods || importedObj.weightLog) {
                localData = { 
                    brain_dump: importedObj.brain_dump || [], 
                    foods: importedObj.foods || [], 
                    customMenu: importedObj.customMenu || {}, 
                    weightLog: importedObj.weightLog || [],
                    calorieTargetMode: importedObj.calorieTargetMode || 'bmi', 
                    customCalorieTarget: importedObj.customCalorieTarget || 2000,
                    userProfile: importedObj.userProfile || { gender: 'male', age: 42, height: 176, activity: 1.55 }
                };
                saveData(); 
                migrateOldDataToKcalMacros();
                alert("📥 นำเข้าข้อมูลสำรองเรียบร้อยแล้วครับ! ระบบกำลังรีโหลด..."); 
                window.location.reload();
            } else { 
                alert("❌ ไฟล์ข้อมูลไม่ถูกต้อง ไม่สามารถใช้งานได้ครับ"); 
            }
        } catch (err) { 
            alert("❌ เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาเช็กความถูกต้องอีกครั้งครับ"); 
        }
    };
    reader.readAsText(file);
}

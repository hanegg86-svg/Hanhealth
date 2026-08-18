function saveData() { 
    localStorage.setItem(DB_KEY, JSON.stringify(localData)); 
}

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
                    customCalorieTarget: importedObj.customCalorieTarget || 2000
                };
                saveData(); 
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

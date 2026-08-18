let defaultMenuDb = {
    "ข้าวมันไก่": 596, "ข้าวมันไก่ต้ม": 596, "ข้าวมันไก่ทอด": 695,
    "ข้าวหมูแดง": 540, "ข้าวหมูกรอบ": 670, "ข้าวขาหมู": 438,
    "ข้าวผัดกะเพราหมูสับ": 580, "ข้าวผัดกะเพราหมู": 580, "ข้าวผัดกะเพราไก่": 554, "ข้าวผัดกะเพราเนื้อ": 622, "ผัดกะเพราไข่ดาว": 680,
    "ข้าวผัดหมู": 557, "ข้าวผัดไก่": 550, "ข้าวผัดกุ้ง": 530, "ข้าวผัดปู": 520,
    "ข้าวไข่เจียว": 445, "ข้าวราดคะน้าหมูกรอบ": 620,
    "ผัดไทย": 545, "ผัดไทยกุ้งสด": 585, "ผัดซีอิ๊วเส้นใหญ่หมู": 679, "ราดหน้าเส้นใหญ่หมู": 405,
    "ก๋วยเตี๋ยวเรือน้ำตกหมู": 180, "ก๋วยเตี๋ยวต้มยำ": 320, "บะหมี่แห้งหมูแดง": 345,
    "ส้มตำไทย": 60, "ส้มตำปูปลาร้า": 45, "ไก่ย่าง": 165, "ลาบหมู": 130, "ข้าวเหนียว": 160,
    "ต้มยำกุ้ง": 85, "แกงเขียวหวานไก่": 240, "แกงจืดเต้าหู้หมูสับ": 90,
    "เวย์โปรตีน": 120, "อกไก่ต้ม": 165, "สลัดผัก": 100, "อเมริกาโน่": 15, "กาแฟดำ": 15
};

let DB_KEY = 'dad_hq_fitlife_db_v21';
let localData = { brain_dump: [], foods: [], customMenu: {}, weightLog: [], calorieTargetMode: 'bmi', customCalorieTarget: 2000 };

let rawData = localStorage.getItem(DB_KEY);
if (rawData) {
    try {
        localData = JSON.parse(rawData);
        if (!localData.foods) localData.foods = [];
        if (!localData.brain_dump) localData.brain_dump = [];
        if (!localData.customMenu) localData.customMenu = {};
        if (!localData.weightLog) localData.weightLog = [];
        if (!localData.calorieTargetMode) localData.calorieTargetMode = 'bmi';
        if (!localData.customCalorieTarget) localData.customCalorieTarget = 2000;
    } catch (e) { console.error(e); }
}

let hqActiveFilter = 'all'; 
let calendarSelectedDay = new Date().getDate(); 
let calendarCurrentDate = new Date();

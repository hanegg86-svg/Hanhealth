// คลังเมนูมาตรฐาน (เก็บค่าแคลอรีสารอาหารแยกประเภทเป็นหน่วย kcal)
let defaultMenuDb = {
    "ข้าวมันไก่": { cal: 596, proteinCal: 96, carbsCal: 276, fatCal: 224 },
    "ข้าวมันไก่ต้ม": { cal: 596, proteinCal: 96, carbsCal: 276, fatCal: 224 },
    "ข้าวมันไก่ทอด": { cal: 695, proteinCal: 80, carbsCal: 320, fatCal: 295 },
    "ข้าวหมูแดง": { cal: 540, proteinCal: 80, carbsCal: 280, fatCal: 180 },
    "ข้าวหมูกรอบ": { cal: 670, proteinCal: 72, carbsCal: 280, fatCal: 318 },
    "ข้าวขาหมู": { cal: 438, proteinCal: 80, carbsCal: 200, fatCal: 158 },
    "ข้าวผัดกะเพราหมูสับ": { cal: 580, proteinCal: 96, carbsCal: 260, fatCal: 224 },
    "ข้าวผัดกะเพราไก่": { cal: 554, proteinCal: 112, carbsCal: 260, fatCal: 182 },
    "ข้าวผัดกะเพราเนื้อ": { cal: 622, proteinCal: 104, carbsCal: 260, fatCal: 258 },
    "ข้าวผัดหมู": { cal: 557, proteinCal: 80, carbsCal: 280, fatCal: 197 },
    "ข้าวผัดไก่": { cal: 550, proteinCal: 96, carbsCal: 280, fatCal: 174 },
    "ข้าวไข่เจียว": { cal: 445, proteinCal: 48, carbsCal: 220, fatCal: 177 },
    "ผัดไทยกุ้งสด": { cal: 585, proteinCal: 88, carbsCal: 280, fatCal: 217 },
    "ก๋วยเตี๋ยวเรือน้ำตกหมู": { cal: 180, proteinCal: 48, carbsCal: 80, fatCal: 52 },
    "ส้มตำไทย": { cal: 60, proteinCal: 8, carbsCal: 44, fatCal: 8 },
    "ไก่ย่าง": { cal: 165, proteinCal: 100, carbsCal: 10, fatCal: 55 },
    "เวย์โปรตีน": { cal: 120, proteinCal: 96, carbsCal: 8, fatCal: 16 },
    "อกไก่ต้ม": { cal: 165, proteinCal: 124, carbsCal: 0, fatCal: 41 },
    "สลัดผัก": { cal: 100, proteinCal: 12, carbsCal: 60, fatCal: 28 },
    "อเมริกาโน่": { cal: 15, proteinCal: 0, carbsCal: 12, fatCal: 3 }
};

let DB_KEY = 'dad_hq_fitlife_db_v21';

// โครงสร้างข้อมูล localData พร้อมข้อมูลส่วนตัวสำหรับคำนวณ TDEE แนะนำ
let localData = { 
    brain_dump: [], 
    foods: [], 
    customMenu: {}, 
    weightLog: [], 
    calorieTargetMode: 'bmi', 
    customCalorieTarget: 2000,
    userProfile: { gender: 'male', age: 42, height: 176, activity: 1.55 }
};

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
        if (!localData.userProfile) {
            localData.userProfile = { gender: 'male', age: 42, height: 176, activity: 1.55 };
        }
    } catch (e) { console.error(e); }
}

let hqActiveFilter = 'all'; 
let calendarSelectedDay = new Date().getDate(); 
let calendarCurrentDate = new Date();

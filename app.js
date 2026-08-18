let recognition; 
function startSpeechRecognition() { 
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; 
    if (!window.SpeechRecognition) return alert("ไมโครโฟนไม่รองรับบนเบราว์เซอร์นี้ครับ"); 
    const btn = document.getElementById('voice-btn'); 
    if(btn.classList.contains('bg-emerald-600')) { recognition.stop(); return; } 
    recognition = new SpeechRecognition(); 
    recognition.lang = 'th-TH'; 
    recognition.onstart = () => { btn.className = "bg-emerald-600 text-white text-xs px-2.5 py-1.5 rounded-xl font-bold shadow-sm"; }; 
    recognition.onend = () => { btn.className = "bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-1.5 rounded-xl font-medium"; }; 
    recognition.onresult = (e) => { document.getElementById('raw-input').value = e.results[0][0].transcript; }; 
    recognition.start(); 
}

function pasteFromClipboard() { 
    navigator.clipboard.readText().then(t => { if(t) document.getElementById('raw-input').value = t; }); 
}

document.addEventListener('click', function(e) { 
    if (e.target.id !== 'food-input') { 
        document.getElementById('suggestion-box').classList.add('hidden'); 
    } 
});

window.onload = () => { 
    const options = { weekday: 'long', day: 'numeric', month: 'short' };
    document.getElementById('date-display').innerText = new Date().toLocaleDateString('th-TH', options);

    initCalorieModeUI(); 
    setWeightDefaultValues(); 
    calculateHealth(); 
    displayData(); 
    checkTodayAppointments(); 
    renderWeightHistory(); 
    
    let now = new Date(); 
    let localISODate = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    document.getElementById('diet-log-date').value = localISODate; 
    renderFoods();
    renderStatsGraph('day');
};

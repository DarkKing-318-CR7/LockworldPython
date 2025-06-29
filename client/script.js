// Khởi tạo bản đồ
var map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Tải danh sách quốc gia
fetch('http://localhost:5000/countries')
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok: ' + response.statusText);
        return response.json();
    })
    .then(countries => {
        const select = document.getElementById('countrySelect');
        if (!select) {
            console.error("countrySelect element not found");
            return;
        }
        select.innerHTML = '<option value="">Select a country</option>'; // Reset dropdown
        let addedCount = 0;
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.text = country.name;
            select.appendChild(option);
            addedCount++;
        });
        console.log(`Loaded and added ${addedCount} countries:`, countries.map(c => c.name));
        // Nếu test thành công, bỏ slice(0, 20) và dùng full list
        // countries.forEach(country => { ... });
    })
    .catch(error => {
        console.error("Error fetching countries:", error);
    });

// Đồng hồ kim
function drawAnalogClock(time) {
    const canvas = document.getElementById('analog-clock');
    if (!canvas || !canvas.getContext) {
        console.error("Canvas not supported or not found");
        return;
    }
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2 - 10;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#fff' : '#000';
    ctx.stroke();

    // Vẽ số
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let num = 1; num <= 12; num++) {
        const angle = (num - 3) * (Math.PI * 2) / 12;
        const x = centerX + Math.cos(angle) * (radius - 20);
        const y = centerY + Math.sin(angle) * (radius - 20);
        ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#fff' : '#000';
        ctx.fillText(num, x, y);
    }

    // Vẽ vạch chia
    for (let i = 0; i < 60; i++) {
        const angle = (i - 15) * (Math.PI * 2) / 60;
        ctx.beginPath();
        ctx.moveTo(
            centerX + Math.cos(angle) * (radius - 10),
            centerY + Math.sin(angle) * (radius - 10)
        );
        ctx.lineTo(
            centerX + Math.cos(angle) * (radius - (i % 5 === 0 ? 20 : 15)),
            centerY + Math.sin(angle) * (radius - (i % 5 === 0 ? 20 : 15))
        );
        ctx.lineWidth = i % 5 === 0 ? 3 : 1;
        ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#ccc' : '#333';
        ctx.stroke();
    }

    const hour = time.getHours() % 12;
    const minute = time.getMinutes();
    const second = time.getSeconds();

    // Vẽ kim giờ
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.PI / 6 * (hour + minute / 60 + second / 3600));
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, -radius * 0.5);
    ctx.lineWidth = 8;
    ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#fff' : '#000';
    ctx.stroke();
    ctx.restore();

    // Vẽ kim phút
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.PI / 30 * (minute + second / 60));
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, -radius * 0.7);
    ctx.lineWidth = 5;
    ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#fff' : '#000';
    ctx.stroke();
    ctx.restore();

    // Vẽ kim giây
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.PI / 30 * second);
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(0, -radius * 0.9);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Vẽ tâm đồng hồ
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
}

// Đồng hồ số
function updateDigitalClock(time) {
    const digitalClock = document.getElementById('digital-clock');
    if (digitalClock) {
        digitalClock.innerText = time.toLocaleTimeString();
    }
}

// Cập nhật đồng hồ dựa trên quốc gia đã chọn
function updateClock() {
    const countryCode = document.getElementById('countrySelect').value || 'US';
    fetch(`http://localhost:5000/time/${countryCode}`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok: ' + response.statusText);
            return response.json();
        })
        .then(data => {
    if (data.error) {
        document.getElementById('time').innerText = data.error;
    } else {
        const time = new Date(data.time);
        drawAnalogClock(time);
        updateDigitalClock(time);
        document.getElementById('time').innerText = `${data.country}: ${data.time} (Date: ${time.toLocaleDateString()})`;
        saveQueryHistory(data.country_code); // Thêm dòng này
    }
})
        .catch(error => {
            console.error("Error updating clock:", error);
            document.getElementById('time').innerText = "Error fetching time";
        });
}

// Lấy thời gian khi click bản đồ
map.on('click', function(e) {
    const { lat, lng } = e.latlng;
    console.log(`Clicked at lat: ${lat}, lng: ${lng}`); // Debug tọa độ
    fetch('http://localhost:5000/time-by-coordinates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng })
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok: ' + response.statusText);
        return response.json();
    })
    .then(data => {
        if (data.error) {
            document.getElementById('time').innerText = data.error;
            console.log("API Error:", data.error); // Debug lỗi
        } else {
            const time = new Date(data.time);
            drawAnalogClock(time);
            updateDigitalClock(time);
            document.getElementById('time').innerText = `${data.country}: ${data.time} (Date: ${time.toLocaleDateString()})`;
            // Cập nhật dropdown với quốc gia được chọn
            const select = document.getElementById('countrySelect');
            select.value = data.country_code || '';
        }
    })
    .catch(error => {
        console.error("Error getting time by coordinates:", error);
        document.getElementById('time').innerText = "Error fetching time";
    });
});

// Chuyển đổi chế độ tối
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    drawAnalogClock(new Date()); // Cập nhật lại đồng hồ để đổi màu
}

// Chuyển đổi chế độ toàn màn hình
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error("Error entering fullscreen:", err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// ...existing code...

let multiClocks = []; // Lưu danh sách các quốc gia đã thêm

function addMultiClock() {
    const select = document.getElementById('countrySelect');
    const code = select.value;
    if (!code || multiClocks.find(c => c === code)) return;
    multiClocks.push(code);
    updateMultiClocks();
    saveQueryHistory(code);
}

function updateMultiClocks() {
    const container = document.getElementById('multi-clocks');
    container.innerHTML = '';
    multiClocks.forEach(code => {
        fetch(`http://localhost:5000/time/${code}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) return;
                const time = new Date(data.time);
                const div = document.createElement('div');
                div.className = 'multi-clock-item';
                div.style.display = 'inline-block';
                div.style.margin = '10px';
                div.innerHTML = `
                    <div><b>${data.country}</b></div>
                    <canvas width="120" height="120" id="analog-${code}"></canvas>
                    <div>${time.toLocaleTimeString()}</div>
                    <div>${time.toLocaleDateString()}</div>
                    <button onclick="removeMultiClock('${code}')">Xóa</button>
                `;
                container.appendChild(div);
                drawAnalogClockCustom(time, `analog-${code}`);
            });
    });
}

function removeMultiClock(code) {
    multiClocks = multiClocks.filter(c => c !== code);
    updateMultiClocks();
}

// Vẽ đồng hồ analog nhỏ
function drawAnalogClockCustom(time, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2 - 8;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#fff' : '#000';
    ctx.stroke();
    // Kim giờ
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.PI / 6 * (time.getHours() % 12 + time.getMinutes() / 60));
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(0, -radius * 0.5);
    ctx.lineWidth = 5;
    ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#fff' : '#000';
    ctx.stroke();
    ctx.restore();
    // Kim phút
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.PI / 30 * time.getMinutes());
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, -radius * 0.7);
    ctx.lineWidth = 3;
    ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#fff' : '#000';
    ctx.stroke();
    ctx.restore();
    // Kim giây
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.PI / 30 * time.getSeconds());
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(0, -radius * 0.9);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    // Tâm
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
}

// ...existing code...

function saveQueryHistory(code) {
    let history = JSON.parse(localStorage.getItem('queryHistory') || '[]');
    if (!history.includes(code)) {
        history.unshift(code);
        if (history.length > 5) history = history.slice(0, 5); // Lưu tối đa 5 quốc gia
        localStorage.setItem('queryHistory', JSON.stringify(history));
    }
    renderQueryHistory();
}

function renderQueryHistory() {
    let history = JSON.parse(localStorage.getItem('queryHistory') || '[]');
    const div = document.getElementById('query-history');
    if (!div) return;
    div.innerHTML = 'Lịch sử: ';
    history.forEach(code => {
        const btn = document.createElement('button');
        btn.innerText = code;
        btn.onclick = () => {
            document.getElementById('countrySelect').value = code;
            updateClock();
        };
        div.appendChild(btn);
    });
}

// Gọi khi trang load
window.onload = function() {
    updateClock();
    setInterval(updateClock, 1000);
    renderQueryHistory();
};

// Khởi động đồng hồ khi tải trang
window.onload = function() {
    updateClock();
    setInterval(updateClock, 1000); // Cập nhật mỗi giây
};
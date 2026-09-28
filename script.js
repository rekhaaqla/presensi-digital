const STUDENTS_KEY = "presensi_students";
const ATTENDANCE_KEY = "presensi_attendance";

let html5QrCode = null;


// ===============================
// STORAGE
// ===============================

function getStudents() {
    return JSON.parse(localStorage.getItem(STUDENTS_KEY)) || [];
}

function saveStudents(data) {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(data));
}

function getAttendance() {
    return JSON.parse(localStorage.getItem(ATTENDANCE_KEY)) || [];
}

function saveAttendance(data) {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(data));
}


// ===============================
// NAVIGATION
// ===============================

function showPage(pageId, button) {

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active-page");
    });

    document.getElementById(pageId).classList.add("active-page");

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    if (button) {
        button.classList.add("active");
    }

    if (pageId === "dashboard") {
        loadDashboard();
    }

    if (pageId === "students") {
        loadStudents();
    }

    if (pageId === "scan") {
        startScanner();
    }

    if (pageId !== "scan") {
        stopScanner();
    }
}


// ===============================
// DASHBOARD
// ===============================

function loadDashboard() {

    const students = getStudents();
    const attendance = getAttendance();

    const today = getDateKey();

    const todayAttendance = attendance.filter(item => {
        return item.dateKey === today;
    });

    document.getElementById("totalMahasiswa").textContent =
        students.length;

    document.getElementById("hadirHariIni").textContent =
        todayAttendance.length;

    document.getElementById("tanggalHariIni").textContent =
        formatDate(new Date());

    document.getElementById("systemMessage").textContent =
        "Data tersimpan di browser ini (Local Storage).";
}


// ===============================
// GENERATE QR
// ===============================

function generateQR() {

    const nim = document.getElementById("nim").value.trim();
    const nama = document.getElementById("nama").value.trim();
    const kelas = document.getElementById("kelas").value.trim();
    const jurusan = document.getElementById("jurusan").value.trim();

    if (!/^\d{11}$/.test(nim)) {
        alert("NIM harus terdiri dari tepat 11 angka.");
        return;
    }

    if (!nama) {
        alert("Nama mahasiswa wajib diisi.");
        return;
    }

    if (!kelas) {
        alert("Kelas wajib diisi.");
        return;
    }

    if (!jurusan) {
        alert("Jurusan wajib diisi.");
        return;
    }

    const student = {
        nim: nim,
        nama: nama,
        kelas: kelas,
        jurusan: jurusan
    };

    // Simpan mahasiswa
    let students = getStudents();

    const existingIndex = students.findIndex(
        item => item.nim === nim
    );

    if (existingIndex >= 0) {
        students[existingIndex] = student;
    } else {
        students.push(student);
    }

    saveStudents(students);

    // Data untuk QR
    const qrData = JSON.stringify(student);

    const qrContainer = document.getElementById("qrcode");

    qrContainer.innerHTML = "";

    new QRCode(qrContainer, {
        text: qrData,
        width: 220,
        height: 220,
        correctLevel: QRCode.CorrectLevel.H
    });

    document.getElementById("qrStudentInfo").innerHTML = `
        <div class="student-info">
            <p><strong>NIM:</strong> ${escapeHTML(nim)}</p>
            <p><strong>Nama:</strong> ${escapeHTML(nama)}</p>
            <p><strong>Kelas:</strong> ${escapeHTML(kelas)}</p>
            <p><strong>Jurusan:</strong> ${escapeHTML(jurusan)}</p>
        </div>
    `;

    document.getElementById("qrResult")
        .classList.remove("hidden");

    loadDashboard();
}


// ===============================
// DOWNLOAD QR
// ===============================

function downloadQR() {

    const qrCanvas = document.querySelector("#qrcode canvas");

    if (!qrCanvas) {
        alert("QR Code belum dibuat.");
        return;
    }

    const link = document.createElement("a");

    link.download = "qr-presensi.png";
    link.href = qrCanvas.toDataURL("image/png");

    link.click();
}


// ===============================
// SCANNER
// ===============================

function startScanner() {

    if (html5QrCode) {
        return;
    }

    const reader = document.getElementById("reader");

    if (!reader) {
        return;
    }

    html5QrCode = new Html5Qrcode("reader");

    const config = {
        fps: 10,
        qrbox: {
            width: 250,
            height: 250
        }
    };

    html5QrCode
        .start(
            {
                facingMode: "environment"
            },
            config,
            qrCodeSuccess,
            qrCodeError
        )
        .catch(error => {

            console.error(error);

            document.getElementById("scanResult").innerHTML =
                "Kamera tidak dapat digunakan. Pastikan izin kamera sudah diberikan.";

        });
}


function stopScanner() {

    if (!html5QrCode) {
        return;
    }

    html5QrCode
        .stop()
        .then(() => {

            html5QrCode.clear();
            html5QrCode = null;

        })
        .catch(error => {

            console.error(error);
            html5QrCode = null;

        });
}


function qrCodeError(errorMessage) {
    // Error scan diabaikan agar scanner tetap berjalan.
}


// ===============================
// QR BERHASIL
// ===============================

function qrCodeSuccess(decodedText) {

    let data;

    try {

        data = JSON.parse(decodedText);

    } catch (error) {

        showScanResult(
            "QR Code tidak valid.",
            "error"
        );

        return;
    }

    if (
        !data.nim ||
        !data.nama ||
        !data.kelas ||
        !data.jurusan
    ) {

        showScanResult(
            "Data mahasiswa tidak lengkap.",
            "error"
        );

        return;
    }

    if (!/^\d{11}$/.test(String(data.nim))) {

        showScanResult(
            "NIM pada QR harus terdiri dari 11 angka.",
            "error"
        );

        return;
    }

    const result = submitAttendance(data);

    if (result.success) {

        showScanResult(
            `
            <strong>Presensi Berhasil ✓</strong><br>
            ${escapeHTML(data.nama)}<br>
            NIM: ${escapeHTML(data.nim)}<br>
            Kelas: ${escapeHTML(data.kelas)}<br>
            Waktu: ${result.time}
            `,
            "success"
        );

    } else {

        showScanResult(
            `
            <strong>Presensi Sudah Tercatat</strong><br>
            ${escapeHTML(data.nama)}<br>
            NIM: ${escapeHTML(data.nim)}<br>
            Hari ini sudah melakukan presensi.
            `,
            "warning"
        );
    }

    loadDashboard();
    loadStudents();
}


// ===============================
// SIMPAN PRESENSI
// ===============================

function submitAttendance(data) {

    const attendance = getAttendance();

    const today = getDateKey();

    // Cegah presensi dua kali dalam satu hari
    const alreadyPresent = attendance.some(item => {

        return (
            item.nim === String(data.nim) &&
            item.dateKey === today
        );

    });

    if (alreadyPresent) {

        return {
            success: false
        };

    }

    const now = new Date();

    const attendanceData = {

        id: Date.now(),

        nim: String(data.nim),

        nama: data.nama,

        kelas: data.kelas,

        jurusan: data.jurusan,

        tanggal: formatDate(now),

        waktu: formatTime(now),

        dateKey: today,

        status: "Hadir"

    };

    attendance.push(attendanceData);

    saveAttendance(attendance);

    // Pastikan data mahasiswa juga tersimpan
    let students = getStudents();

    const existingStudent = students.findIndex(
        item => item.nim === String(data.nim)
    );

    const studentData = {

        nim: String(data.nim),

        nama: data.nama,

        kelas: data.kelas,

        jurusan: data.jurusan

    };

    if (existingStudent >= 0) {

        students[existingStudent] = studentData;

    } else {

        students.push(studentData);

    }

    saveStudents(students);

    return {

        success: true,

        time: formatTime(now)

    };
}


// ===============================
// TABEL PRESENSI
// ===============================

function loadStudents() {

    const attendance = getAttendance();

    const table = document.getElementById("studentTable");
    const emptyData = document.getElementById("emptyData");

    table.innerHTML = "";

    if (attendance.length === 0) {

        emptyData.style.display = "block";

        return;

    }

    emptyData.style.display = "none";

    // Data terbaru di atas
    const sortedData = [...attendance].reverse();

    sortedData.forEach((student, index) => {

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${index + 1}</td>

            <td>${escapeHTML(student.nim)}</td>

            <td>${escapeHTML(student.nama)}</td>

            <td>${escapeHTML(student.kelas)}</td>

            <td>${escapeHTML(student.jurusan)}</td>

            <td>
                ${escapeHTML(student.tanggal)}
                <br>
                <small>${escapeHTML(student.waktu)}</small>
            </td>

            <td>
                <span class="status-badge">
                    ${escapeHTML(student.status)}
                </span>
            </td>

        `;

        table.appendChild(row);

    });
}


// ===============================
// HAPUS DATA
// ===============================

function clearData() {

    const confirmDelete = confirm(
        "Apakah kamu yakin ingin menghapus semua data presensi?"
    );

    if (!confirmDelete) {
        return;
    }

    localStorage.removeItem(STUDENTS_KEY);
    localStorage.removeItem(ATTENDANCE_KEY);

    loadDashboard();
    loadStudents();

    alert("Semua data berhasil dihapus.");
}


// ===============================
// HELPER
// ===============================

function getDateKey(date = new Date()) {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatDate(date) {

    return date.toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


function formatTime(date) {

    return date.toLocaleTimeString(
        "id-ID",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );
}


function showScanResult(message, type) {

    const result = document.getElementById("scanResult");

    result.innerHTML = message;

    result.className = "scan-result";

    if (type) {
        result.classList.add(type);
    }
}


function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ===============================
// SAAT HALAMAN DIBUKA
// ===============================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadDashboard();

        loadStudents();

    }
);

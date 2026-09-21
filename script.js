// ======================================================
// GOOGLE APPS SCRIPT URL
// ======================================================

const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxtkFmoeB-9t3rutANs8BCqCjw7-73ZaEMF4Uje_Y7HoVm4OX3MylKfhbwpAm7b6Q6oBA/exec";


// ======================================================
// GLOBAL VARIABLE
// ======================================================

let html5QrCode = null;
let scannerRunning = false;


// ======================================================
// PAGE NAVIGATION
// ======================================================

function showPage(pageId, button) {

    // Hide semua halaman
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    // Tampilkan halaman yang dipilih
    const page = document.getElementById(pageId);

    if (page) {
        page.classList.add("active");
    }


    // Update tombol navigation
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    if (button) {
        button.classList.add("active");
    }


    // Jika masuk dashboard
    if (pageId === "dashboard") {
        loadDashboard();
    }


    // Jika masuk mahasiswa
    if (pageId === "mahasiswa") {
        loadStudents();
    }
}



// ======================================================
// VALIDASI NIM
// ======================================================

function validateNIM(input) {

    // Hanya angka
    input.value = input.value.replace(/\D/g, "");

    // Maksimal 11 digit
    if (input.value.length > 11) {
        input.value = input.value.substring(0, 11);
    }


    const help = document.getElementById("nimHelp");

    if (!help) return;


    if (input.value.length === 0) {

        help.textContent =
            "NIM harus terdiri dari 11 digit angka";

        help.className = "";

    } else if (input.value.length < 11) {

        help.textContent =
            `Kurang ${11 - input.value.length} digit`;

        help.className = "warning";

    } else {

        help.textContent =
            "✓ NIM sudah 11 digit";

        help.className = "success";

    }
}



// ======================================================
// GENERATE QR
// ======================================================

function generateQR(event) {

    event.preventDefault();


    const nim =
        document.getElementById("nim").value.trim();

    const nama =
        document.getElementById("nama").value.trim();

    const kelas =
        document.getElementById("kelas").value.trim();

    const jurusan =
        document.getElementById("jurusan").value.trim();


    // Validasi NIM
    if (!/^\d{11}$/.test(nim)) {

        showNotification(
            "NIM harus terdiri dari tepat 11 digit angka!",
            "error"
        );

        document.getElementById("nim").focus();

        return;
    }


    // Validasi nama
    if (!nama) {

        showNotification(
            "Nama mahasiswa harus diisi!",
            "error"
        );

        document.getElementById("nama").focus();

        return;
    }


    // Data yang dimasukkan ke QR
    const qrData = {

        nim: nim,

        nama: nama,

        kelas: kelas,

        jurusan: jurusan

    };


    const qrContainer =
        document.getElementById("qrcode");


    // Bersihkan QR sebelumnya
    qrContainer.innerHTML = "";


    try {

        new QRCode(qrContainer, {

            text: JSON.stringify(qrData),

            width: 250,

            height: 250,

            colorDark: "#111827",

            colorLight: "#ffffff",

            correctLevel: QRCode.CorrectLevel.H

        });


        // Aktifkan tombol download
        document.getElementById("downloadBtn").disabled = false;


        // Informasi QR
        document.getElementById("qrInfo").innerHTML = `

            <div class="qr-student">

                <strong>${escapeHTML(nama)}</strong>

                <span>NIM: ${escapeHTML(nim)}</span>

                ${
                    kelas
                    ? `<span>Kelas: ${escapeHTML(kelas)}</span>`
                    : ""
                }

                ${
                    jurusan
                    ? `<span>Jurusan: ${escapeHTML(jurusan)}</span>`
                    : ""
                }

            </div>

        `;


        showNotification(
            "QR Code berhasil dibuat!",
            "success"
        );


    } catch (error) {

        console.error(error);

        showNotification(
            "Gagal membuat QR Code!",
            "error"
        );

    }
}



// ======================================================
// DOWNLOAD QR
// ======================================================

function downloadQR() {

    const qrContainer =
        document.getElementById("qrcode");


    const canvas =
        qrContainer.querySelector("canvas");

    const image =
        qrContainer.querySelector("img");


    let dataURL = null;


    if (canvas) {

        dataURL = canvas.toDataURL("image/png");

    } else if (image) {

        dataURL = image.src;

    }


    if (!dataURL) {

        showNotification(
            "QR Code belum dibuat!",
            "error"
        );

        return;
    }


    const link =
        document.createElement("a");


    link.href = dataURL;

    link.download =
        "QR-Presensi.png";


    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
}



// ======================================================
// CLEAR FORM
// ======================================================

function clearForm() {

    document.getElementById("qrForm").reset();


    document.getElementById("qrcode").innerHTML = `

        <div class="qr-placeholder">

            <div class="qr-placeholder-icon">
                ▦
            </div>

            <p>QR Code akan muncul di sini</p>

        </div>

    `;


    document.getElementById("qrInfo").innerHTML = "";


    document.getElementById("downloadBtn").disabled = true;


    const help =
        document.getElementById("nimHelp");

    help.textContent =
        "NIM harus terdiri dari 11 digit angka";

    help.className = "";
}



// ======================================================
// START SCANNER
// ======================================================

async function startScanner() {

    if (scannerRunning) {

        showNotification(
            "Scanner sedang berjalan.",
            "warning"
        );

        return;
    }


    const resultBox =
        document.getElementById("scanResult");


    try {

        html5QrCode =
            new Html5Qrcode("reader");


        const config = {

            fps: 10,

            qrbox: {
                width: 250,
                height: 250
            }

        };


        await html5QrCode.start(

            {
                facingMode: "environment"
            },

            config,

            qrCodeSuccess,

            qrCodeError

        );


        scannerRunning = true;


        resultBox.innerHTML = `
            <div class="scan-info">
                Kamera aktif. Silakan arahkan ke QR Code.
            </div>
        `;


    } catch (error) {

        console.error(error);


        resultBox.innerHTML = `

            <div class="scan-error">

                <strong>Scanner gagal dijalankan.</strong>

                <br>

                Pastikan browser mengizinkan
                akses kamera.

            </div>

        `;


        showNotification(
            "Tidak dapat mengakses kamera!",
            "error"
        );

    }
}



// ======================================================
// STOP SCANNER
// ======================================================

async function stopScanner() {

    if (!html5QrCode || !scannerRunning) {

        return;
    }


    try {

        await html5QrCode.stop();

        await html5QrCode.clear();

        scannerRunning = false;


        document.getElementById("scanResult").innerHTML = `

            <div class="scan-info">
                Scanner dihentikan.
            </div>

        `;


    } catch (error) {

        console.error(error);

    }
}



// ======================================================
// QR CODE SUCCESS
// ======================================================

async function qrCodeSuccess(decodedText) {

    // Stop scanner setelah berhasil scan
    await stopScanner();


    let data;


    try {

        data = JSON.parse(decodedText);

    } catch (error) {

        document.getElementById("scanResult").innerHTML = `

            <div class="scan-error">

                QR Code tidak valid.

            </div>

        `;

        showNotification(
            "QR Code tidak valid!",
            "error"
        );

        return;
    }


    // Validasi data
    if (!data.nim || !data.nama) {

        showNotification(
            "Data mahasiswa dalam QR tidak lengkap!",
            "error"
        );

        return;
    }


    // Pastikan NIM 11 digit
    if (!/^\d{11}$/.test(String(data.nim))) {

        showNotification(
            "NIM dalam QR tidak valid!",
            "error"
        );

        return;
    }


    // Tampilkan informasi mahasiswa
    document.getElementById("scanResult").innerHTML = `

        <div class="student-scan">

            <div class="scan-success-icon">
                ✓
            </div>

            <h3>${escapeHTML(data.nama)}</h3>

            <p>
                <strong>NIM:</strong>
                ${escapeHTML(String(data.nim))}
            </p>

            ${
                data.kelas
                ? `
                    <p>
                        <strong>Kelas:</strong>
                        ${escapeHTML(data.kelas)}
                    </p>
                `
                : ""
            }

            ${
                data.jurusan
                ? `
                    <p>
                        <strong>Jurusan:</strong>
                        ${escapeHTML(data.jurusan)}
                    </p>
                `
                : ""
            }

            <div class="loading-attendance">
                Menyimpan presensi...
            </div>

        </div>

    `;


    // Kirim ke Google Sheets
    await submitAttendance(data);
}



// ======================================================
// QR ERROR
// ======================================================

function qrCodeError(errorMessage) {

    // Tidak perlu menampilkan error setiap frame.
}



// ======================================================
// SUBMIT PRESENSI
// ======================================================

async function submitAttendance(data) {

    try {

        const response =
            await fetch(GOOGLE_SCRIPT_URL, {

                method: "POST",

                headers: {

                    "Content-Type":
                        "text/plain;charset=utf-8"

                },

                body: JSON.stringify({

                    action: "attendance",

                    nim: String(data.nim),

                    nama: data.nama,

                    kelas: data.kelas || "",

                    jurusan: data.jurusan || ""

                })

            });


        const result =
            await response.json();


        console.log("Response:", result);


        if (result.success) {

            document.getElementById(
                "scanResult"
            ).innerHTML = `

                <div class="attendance-success">

                    <div class="big-check">
                        ✓
                    </div>

                    <h3>Presensi Berhasil!</h3>

                    <p>
                        ${escapeHTML(data.nama)}
                    </p>

                    <p>
                        NIM: ${escapeHTML(String(data.nim))}
                    </p>

                    <small>
                        ${new Date().toLocaleString("id-ID")}
                    </small>

                </div>

            `;


            showNotification(
                "Presensi berhasil disimpan!",
                "success"
            );


            // Update dashboard
            loadDashboard();

        } else {

            document.getElementById(
                "scanResult"
            ).innerHTML = `

                <div class="scan-error">

                    <strong>Presensi gagal</strong>

                    <p>
                        ${escapeHTML(
                            result.message ||
                            "Terjadi kesalahan."
                        )}
                    </p>

                </div>

            `;


            showNotification(
                result.message ||
                "Presensi gagal!",
                "error"
            );

        }


    } catch (error) {

        console.error(error);


        document.getElementById(
            "scanResult"
        ).innerHTML = `

            <div class="scan-error">

                <strong>Koneksi gagal.</strong>

                <p>
                    Tidak dapat terhubung
                    ke Google Sheets.
                </p>

            </div>

        `;


        showNotification(
            "Gagal terhubung ke Google Sheets!",
            "error"
        );

    }
}



// ======================================================
// LOAD DATA MAHASISWA
// ======================================================

async function loadStudents() {

    const table =
        document.getElementById("studentTable");


    table.innerHTML = `

        <tr>
            <td colspan="5" class="empty">
                Memuat data...
            </td>
        </tr>

    `;


    try {

        const response =
            await fetch(
                GOOGLE_SCRIPT_URL +
                "?action=students"
            );


        const result =
            await response.json();


        if (!result.success) {

            throw new Error(
                result.message ||
                "Gagal mengambil data."
            );

        }


        renderStudents(result.data || []);


    } catch (error) {

        console.error(error);


        table.innerHTML = `

            <tr>

                <td colspan="5" class="empty error-text">

                    Gagal mengambil data mahasiswa.

                    <br>

                    Pastikan Google Apps Script
                    sudah dideploy sebagai Web App.

                </td>

            </tr>

        `;

    }
}



// ======================================================
// RENDER MAHASISWA
// ======================================================

function renderStudents(students) {

    const table =
        document.getElementById("studentTable");


    if (!students || students.length === 0) {

        table.innerHTML = `

            <tr>

                <td colspan="5" class="empty">

                    Belum ada data mahasiswa.

                </td>

            </tr>

        `;

        return;
    }


    table.innerHTML =
        students.map((student, index) => {

            return `

                <tr>

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(
                                String(student.nim || "")
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            student.nama || ""
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            student.kelas || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            student.jurusan || "-"
                        )}
                    </td>

                </tr>

            `;

        }).join("");
}



// ======================================================
// DASHBOARD
// ======================================================

async function loadDashboard() {

    const tanggal =
        document.getElementById(
            "tanggalHariIni"
        );


    if (tanggal) {

        tanggal.textContent =
            new Date().toLocaleDateString(
                "id-ID",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );

    }


    try {

        const response =
            await fetch(
                GOOGLE_SCRIPT_URL +
                "?action=stats"
            );


        const result =
            await response.json();


        if (!result.success) {

            throw new Error(
                result.message ||
                "Gagal mengambil statistik."
            );

        }


        const stats =
            result.data || {};


        document.getElementById(
            "totalMahasiswa"
        ).textContent =
            stats.totalMahasiswa || 0;


        document.getElementById(
            "hadirHariIni"
        ).textContent =
            stats.hadirHariIni || 0;


        document.getElementById(
            "systemMessage"
        ).innerHTML = `

            <div class="system-online">

                <span class="online-dot"></span>

                Terhubung ke Google Sheets

            </div>

        `;


    } catch (error) {

        console.error(error);


        document.getElementById(
            "systemMessage"
        ).innerHTML = `

            <div class="system-offline">

                <span class="offline-dot"></span>

                Gagal terhubung ke Google Sheets

            </div>

        `;

    }
}



// ======================================================
// NOTIFICATION
// ======================================================

function showNotification(message, type = "success") {

    const notification =
        document.getElementById("notification");


    notification.textContent = message;

    notification.className =
        `notification show ${type}`;


    setTimeout(() => {

        notification.classList.remove("show");

    }, 3000);
}



// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}



// ======================================================
// INITIALIZE
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadDashboard();

        loadStudents();

    }
);

// ========== GOOGLE APPS SCRIPT - BPM FPIK UBT ==========
// FULL VERSION: Penilaian Dosen + Anggota BPM + Kegiatan + Aspirasi + Berkas
// Version: 5.0.0

// ========== KONFIGURASI UTAMA ==========
const SPREADSHEET_ID = '1z4M_Gwnn_017BaTGxeNzj84gSBbTbwigY7_o2mAP43M';
const SHEET_NAME_PENILAIAN = 'Sheet1';
const EMAIL_NOTIF = 'bpmfpikubt9@gmail.com';

// Konfigurasi untuk fitur baru (Ganti dengan ID folder Drive Anda di akun database)
const FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID_HERE';

// ========== HANDLE GET ==========
function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : null;
    
    // Fitur Penilaian Dosen (lama)
    if (action === 'getData') {
      const data = getAllDataFromSpreadsheet();
      return response(true, "Data berhasil diambil", data);
    }
    if (action === 'getStats') {
      const stats = getStatistics();
      return response(true, "Statistik berhasil diambil", stats);
    }
    
    // Fitur Baru
    if (action === 'getAnggota') return respond(getAnggota());
    if (action === 'getKegiatan') return respond(getKegiatan());
    if (action === 'getAspirasi') return respond(getAspirasi());
    if (action === 'getBerkas') return respond(getBerkas());
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      status: "active",
      version: "5.0.0",
      message: "API BPM FPIK UBT siap digunakan",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(error) {
    return response(false, error.toString());
  }
}

// ========== HANDLE POST ==========
function doPost(e) {
  try {
    let params = {};
    let action = null;
    
    if (e.postData && e.postData.contents) {
      try {
        const jsonData = JSON.parse(e.postData.contents);
        if (jsonData.dosen) {
          return handlePenilaianDosen(jsonData);
        }
        params = jsonData;
        action = params.action;
      } catch(parseError) {
        params = e.parameter;
        action = params ? params.action : null;
      }
    } else {
      params = e.parameter;
      action = params ? params.action : null;
    }
    
    if (params.dosen && params.matakuliah && !action) {
      return handlePenilaianDosen(params);
    }
    
    // Fitur Baru - Anggota
    if (action === 'tambahAnggota') return respond(tambahAnggota(params));
    if (action === 'updateAnggota') return respond(updateAnggota(params));
    if (action === 'hapusAnggota') return respond(hapusAnggota(params));
    if (action === 'uploadFotoAnggota') return respond(uploadFotoAnggota(params));
    
    // Fitur Baru - Kegiatan
    if (action === 'tambahKegiatan') return respond(tambahKegiatan(params));
    if (action === 'updateKegiatan') return respond(updateKegiatan(params));
    if (action === 'hapusKegiatan') return respond(hapusKegiatan(params));
    if (action === 'uploadFotoKegiatan') return respond(uploadFotoKegiatan(params));
    if (action === 'hapusFotoKegiatan') return respond(hapusFotoKegiatan(params));
    
    // Fitur Baru - Aspirasi
    if (action === 'updateStatusAspirasi') return respond(updateStatusAspirasi(params));
    
    // Fitur Baru - Berkas
    if (action === 'uploadBerkas') return respond(uploadBerkas(params));
    if (action === 'hapusBerkas') return respond(hapusBerkas(params));
    
    return response(false, "Aksi tidak dikenal");
    
  } catch(error) {
    return response(false, error.toString());
  }
}

// ========== FUNGSI RESPONSE ==========
function response(success, message, data = null) {
  const result = { success: success, message: message, timestamp: new Date().toISOString() };
  if (data !== null) result.data = data;
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ==================== PENILAIAN DOSEN ====================
function handlePenilaianDosen(data) {
  if (!data.dosen || !data.matakuliah) {
    return response(false, "Data dosen atau mata kuliah kosong");
  }
  const result = saveToSpreadsheet(data);
  if (result.success) {
    sendEmailNotification(data);
    return response(true, "Data berhasil disimpan");
  } else {
    return response(false, result.error);
  }
}

function saveToSpreadsheet(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME_PENILAIAN);
    
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME_PENILAIAN);
      const headers = [
        "Tanggal", "Nama", "NIM", "Prodi", "Semester", "Email",
        "Dosen", "Matakuliah", "R1", "R2", "R3", "R4", "R5",
        "Rata2", "Predikat", "Kelebihan", "Kekurangan"
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }
    
    const r1 = Math.min(Math.max(parseInt(data.rating1) || parseInt(data.r1) || 0, 0), 5);
    const r2 = Math.min(Math.max(parseInt(data.rating2) || parseInt(data.r2) || 0, 0), 5);
    const r3 = Math.min(Math.max(parseInt(data.rating3) || parseInt(data.r3) || 0, 0), 5);
    const r4 = Math.min(Math.max(parseInt(data.rating4) || parseInt(data.r4) || 0, 0), 5);
    const r5 = Math.min(Math.max(parseInt(data.rating5) || parseInt(data.r5) || 0, 0), 5);
    
    const totalRating = r1 + r2 + r3 + r4 + r5;
    const rataRata = (totalRating / 5).toFixed(1);
    
    let predikat = "";
    const nilai = parseFloat(rataRata);
    if (nilai >= 4.5) predikat = "Sangat Baik (A)";
    else if (nilai >= 3.5) predikat = "Baik (B)";
    else if (nilai >= 2.5) predikat = "Cukup (C)";
    else if (nilai >= 1.5) predikat = "Kurang (D)";
    else predikat = "Sangat Kurang (E)";
    
    const newRow = [
      data.tanggal || new Date().toLocaleString('id-ID'),
      "Anonim",
      data.nim || "-",
      data.prodi || "-",
      data.semester || "-",
      data.emailResponden || "-",
      data.dosen || "-",
      data.matakuliah || "-",
      r1, r2, r3, r4, r5,
      rataRata,
      predikat,
      data.kelebihan || "-",
      data.kekurangan || "-"
    ];
    
    sheet.appendRow(newRow);
    return { success: true };
    
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

function getAllDataFromSpreadsheet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME_PENILAIAN);
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const headers = data[0];
    const rows = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        let value = data[i][j];
        if (headers[j] === "Tanggal" && value instanceof Date) {
          value = Utilities.formatDate(value, "Asia/Makassar", "dd/MM/yyyy HH:mm:ss");
        }
        row[headers[j]] = value;
      }
      rows.push(row);
    }
    return rows;
  } catch(error) {
    return [];
  }
}

function getStatistics() {
  try {
    const allData = getAllDataFromSpreadsheet();
    let totalRating = 0;
    let validCount = 0;
    const perDosen = {};
    
    for (const item of allData) {
      let rating = parseFloat(item.Rata2) || 0;
      if (rating >= 1 && rating <= 5) {
        totalRating += rating;
        validCount++;
        const dosen = item.Dosen || "Unknown";
        if (!perDosen[dosen]) perDosen[dosen] = { total: 0, count: 0 };
        perDosen[dosen].total += rating;
        perDosen[dosen].count += 1;
      }
    }
    
    let rataRata = "0";
    if (validCount > 0) rataRata = (totalRating / validCount).toFixed(1);
    
    const dosenRating = [];
    for (const [nama, nilai] of Object.entries(perDosen)) {
      dosenRating.push({
        nama: nama,
        rataRata: (nilai.total / nilai.count).toFixed(1),
        jumlah: nilai.count
      });
    }
    dosenRating.sort((a, b) => parseFloat(b.rataRata) - parseFloat(a.rataRata));
    
    return {
      totalPenilaian: validCount,
      rataRataKeseluruhan: rataRata,
      totalDosen: Object.keys(perDosen).length,
      dosenTerbaik: dosenRating.slice(0, 5),
      lastUpdate: new Date().toISOString()
    };
  } catch(error) {
    return { totalPenilaian: 0, rataRataKeseluruhan: "0", totalDosen: 0 };
  }
}

function sendEmailNotification(data) {
  try {
    const subject = `Penilaian Baru: ${data.dosen} - ${data.matakuliah}`;
    const message = `Penilaian baru masuk.\n\nDosen: ${data.dosen}\nMata Kuliah: ${data.matakuliah}\n\nLihat data lengkap di:\nhttps://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`;
    MailApp.sendEmail(EMAIL_NOTIF, subject, message);
  } catch(error) {}
}

function clearAllData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME_PENILAIAN);
    if (sheet) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
    }
    return "Semua data berhasil dihapus";
  } catch(error) {
    return "Error: " + error.toString();
  }
}

function checkSheetStructure() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME_PENILAIAN);
    if (!sheet) return "Sheet belum dibuat";
    return {
      sheetName: SHEET_NAME_PENILAIAN,
      rowCount: sheet.getLastRow(),
      columnCount: sheet.getLastColumn(),
      status: "Aktif"
    };
  } catch(error) {
    return "Error: " + error.toString();
  }
}

// ==================== FITUR BARU ====================
// ========== UTILITY ==========
function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function ensureSheet(name, headers) {
  let sheet = getSheet(name);
  if (!sheet) {
    sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
}

function getMimeType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const mime = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png'
  };
  return mime[ext] || 'application/octet-stream';
}

// ========== ANGGOTA BPM ==========
function getAnggota() {
  const sheet = getSheet('anggota');
  if (!sheet) return { success: true, data: [] };
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };
  
  const anggota = [];
  for (let i = 1; i < data.length; i++) {
    anggota.push({
      id: data[i][0],
      nama: data[i][1] || '',
      jabatan: data[i][2] || '',
      deskripsi: data[i][3] || '',
      fotoUrl: data[i][4] || '',
      email: data[i][5] || '',
      instagram: data[i][6] || '',
      whatsapp: data[i][7] || '',
      anggotaTim: data[i][8] || '',
      rowIndex: i
    });
  }
  return { success: true, data: anggota };
}

function tambahAnggota(e) {
  const sheet = ensureSheet('anggota', ['ID', 'Nama', 'Jabatan', 'Deskripsi', 'FotoUrl', 'Email', 'Instagram', 'WhatsApp', 'AnggotaTim']);
  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    e.nama || '',
    e.jabatan || '',
    e.deskripsi || '',
    '',
    e.email || '',
    e.instagram || '',
    e.whatsapp || '',
    ''
  ]);
  return { success: true };
}

function updateAnggota(e) {
  const sheet = getSheet('anggota');
  if (!sheet) return { success: false };
  
  const row = parseInt(e.rowIndex) + 1;
  sheet.getRange(row, 2).setValue(e.nama || '');
  sheet.getRange(row, 3).setValue(e.jabatan || '');
  sheet.getRange(row, 4).setValue(e.deskripsi || '');
  sheet.getRange(row, 6).setValue(e.email || '');
  sheet.getRange(row, 7).setValue(e.instagram || '');
  sheet.getRange(row, 8).setValue(e.whatsapp || '');
  sheet.getRange(row, 9).setValue(e.anggotaTim || '');
  
  return { success: true };
}

function hapusAnggota(e) {
  const sheet = getSheet('anggota');
  if (!sheet) return { success: false };
  
  const row = parseInt(e.rowIndex) + 1;
  sheet.deleteRow(row);
  return { success: true };
}

function uploadFotoAnggota(e) {
  try {
    const base64 = e.base64Data;
    const namaFile = e.namaFile;
    const rowIndex = parseInt(e.rowIndex) + 1;
    
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), getMimeType(namaFile), namaFile);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fotoUrl = "https://drive.google.com/thumbnail?id=" + file.getId();
    
    const sheet = getSheet('anggota');
    sheet.getRange(rowIndex, 5).setValue(fotoUrl);
    
    return { success: true, url: fotoUrl };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// ========== KEGIATAN ==========
function getKegiatan() {
  const sheet = getSheet('kegiatan');
  if (!sheet) return { success: true, data: [] };
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };
  
  const kegiatan = [];
  for (let i = 1; i < data.length; i++) {
    kegiatan.push({
      id: data[i][0],
      title: data[i][1] || '',
      deskripsi: data[i][2] || '',
      tujuan: data[i][3] || '',
      kontak: data[i][4] || '',
      images: data[i][5] || '[]',
      rowIndex: i
    });
  }
  return { success: true, data: kegiatan };
}

function tambahKegiatan(e) {
  const sheet = ensureSheet('kegiatan', ['ID', 'Title', 'Deskripsi', 'Tujuan', 'Kontak', 'Images']);
  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    e.title || '',
    e.deskripsi || '',
    e.tujuan || '',
    e.kontak || '',
    '[]'
  ]);
  return { success: true };
}

function updateKegiatan(e) {
  const sheet = getSheet('kegiatan');
  if (!sheet) return { success: false };
  
  const row = parseInt(e.rowIndex) + 1;
  sheet.getRange(row, 2).setValue(e.title || '');
  sheet.getRange(row, 3).setValue(e.deskripsi || '');
  
  return { success: true };
}

function hapusKegiatan(e) {
  const sheet = getSheet('kegiatan');
  if (!sheet) return { success: false };
  
  const row = parseInt(e.rowIndex) + 1;
  sheet.deleteRow(row);
  return { success: true };
}

function uploadFotoKegiatan(e) {
  try {
    const base64 = e.base64Data;
    const namaFile = e.namaFile;
    const rowIndex = parseInt(e.rowIndex) + 1;
    
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), getMimeType(namaFile), namaFile);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fotoUrl = "https://drive.google.com/thumbnail?id=" + file.getId();
    
    const sheet = getSheet('kegiatan');
    let images = [];
    try {
      const currentValue = sheet.getRange(rowIndex, 6).getValue();
      images = currentValue ? JSON.parse(currentValue) : [];
    } catch(e) { images = []; }
    
    images.push(fotoUrl);
    sheet.getRange(rowIndex, 6).setValue(JSON.stringify(images));
    
    return { success: true };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

function hapusFotoKegiatan(e) {
  try {
    const rowIndex = parseInt(e.rowIndex) + 1;
    const imgIndex = parseInt(e.imgIndex);
    
    const sheet = getSheet('kegiatan');
    let images = [];
    try {
      const currentValue = sheet.getRange(rowIndex, 6).getValue();
      images = currentValue ? JSON.parse(currentValue) : [];
    } catch(e) { images = []; }
    
    if (imgIndex >= 0 && imgIndex < images.length) {
      images.splice(imgIndex, 1);
      sheet.getRange(rowIndex, 6).setValue(JSON.stringify(images));
    }
    
    return { success: true };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// ========== ASPIRASI ==========
function getAspirasi() {
  const sheet = getSheet('aspirasi');
  if (!sheet) return { success: true, data: [] };
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };
  
  const aspirasi = [];
  for (let i = 1; i < data.length; i++) {
    aspirasi.push({
      timestamp: data[i][0] ? formatDate(data[i][0]) : '-',
      nama: data[i][1] || '-',
      nim: data[i][2] || '-',
      kategori: data[i][3] || '-',
      pesan: data[i][4] || '-',
      status: data[i][5] || 'Belum Dibaca',
      rowIndex: i
    });
  }
  aspirasi.reverse();
  return { success: true, data: aspirasi };
}

function updateStatusAspirasi(e) {
  try {
    const sheet = getSheet('aspirasi');
    if (!sheet) return { success: false };
    
    const row = parseInt(e.rowIndex) + 1;
    sheet.getRange(row, 6).setValue(e.status || 'Sudah Dibaca');
    
    return { success: true };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// ========== BERKAS ==========
function getBerkas() {
  const sheet = getSheet('berkas');
  if (!sheet) return { success: true, data: [] };
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };
  
  const berkas = [];
  for (let i = 1; i < data.length; i++) {
    berkas.push({
      id: data[i][0],
      judul: data[i][1] || '-',
      kategori: data[i][2] || 'Lainnya',
      deskripsi: data[i][3] || '',
      link: data[i][4] || '#',
      namaFile: data[i][5] || '',
      tanggal: data[i][6] ? formatDate(data[i][6]) : '-',
      fileId: data[i][7] || '',
      rowIndex: i
    });
  }
  berkas.reverse();
  return { success: true, data: berkas };
}

function uploadBerkas(e) {
  try {
    const base64 = e.base64Data;
    const namaFile = e.namaFile;
    const judul = e.judul;
    const kategori = e.kategori;
    const deskripsi = e.deskripsi;
    
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), getMimeType(namaFile), namaFile);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const sheet = ensureSheet('berkas', ['ID', 'Judul', 'Kategori', 'Deskripsi', 'Link', 'Nama File', 'Tanggal', 'File ID']);
    const id = Utilities.getUuid();
    
    sheet.appendRow([id, judul, kategori, deskripsi, file.getUrl(), namaFile, new Date(), file.getId()]);
    
    return { success: true };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

function hapusBerkas(e) {
  try {
    const fileId = e.fileId;
    const rowIndex = parseInt(e.rowIndex) + 1;
    
    if (fileId && fileId !== 'undefined') {
      try {
        DriveApp.getFileById(fileId).setTrashed(true);
      } catch(err) {}
    }
    
    const sheet = getSheet('berkas');
    if (sheet) {
      sheet.deleteRow(rowIndex);
    }
    
    return { success: true };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}
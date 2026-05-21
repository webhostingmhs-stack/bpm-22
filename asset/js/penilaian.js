// ============= KONFIGURASI =============
const API_URL = 'https://script.google.com/macros/s/AKfycbzElA-8pOdO9SLZU9SUHbuP2wINi1va1Z8XIFNK9htVnv6OnSy7xmUIrCR0EKGEcbXPzA/exec';

const form = document.getElementById('penilaianForm');
const alertBox = document.getElementById('alertMessage');
const submitBtn = document.getElementById('submitBtn');

function showAlert(message, type) {
    alertBox.innerHTML = message;
    alertBox.className = `alert ${type}`;
    alertBox.style.display = 'flex';
    setTimeout(() => { alertBox.style.display = 'none'; }, 5000);
}

function getRatingValue(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    if (selected) {
        const value = parseInt(selected.value);
        console.log(`[DEBUG] ${name} = ${value}`);
        return value;
    }
    return 0;
}

function validateForm() {
    const nama = document.getElementById('nama').value.trim();
    const nim = document.getElementById('nim').value.trim();
    const prodi = document.getElementById('prodi').value;
    const semester = document.getElementById('semester').value;
    const namaDosen = document.getElementById('namaDosen').value;
    const matakuliah = document.getElementById('matakuliah').value.trim();
    
    if (!nama || !nim || !prodi || !semester || !namaDosen || !matakuliah) {
        showAlert('Mohon lengkapi semua data!', 'error');
        return false;
    }
    if (!/^\d{9,10}$/.test(nim)) {
        showAlert('NIM harus 9-10 digit angka!', 'error');
        return false;
    }
    
    const ratingFields = ['rating_materi', 'rating_metode', 'rating_kehadiran', 'rating_interaksi', 'rating_keadilan'];
    for (let field of ratingFields) {
        if (!document.querySelector(`input[name="${field}"]:checked`)) {
            showAlert('Mohon beri bintang untuk semua aspek!', 'error');
            return false;
        }
    }
    return true;
}

function resetForm() {
    document.getElementById('nama').value = '';
    document.getElementById('nim').value = '';
    document.getElementById('emailResponden').value = '';
    document.getElementById('matakuliah').value = '';
    document.getElementById('kelebihan').value = '';
    document.getElementById('kekurangan').value = '';
    document.getElementById('prodi').value = '';
    document.getElementById('semester').value = '';
    document.getElementById('namaDosen').value = '';
    
    document.querySelectorAll('.stars input').forEach(input => {
        input.checked = false;
    });
    
    document.querySelectorAll('.stars label').forEach(label => {
        label.style.color = '#cbd5e1';
    });
}

// Update warna bintang (normal: dari kiri ke kanan)
function updateStarColors(container, value) {
    const labels = container.querySelectorAll('label');
    // value 1 = bintang 1 (paling kiri), value 5 = bintang 5 (paling kanan)
    for (let i = 0; i < labels.length; i++) {
        if (i < value) {
            labels[i].style.color = 'var(--accent)';
        } else {
            labels[i].style.color = '#cbd5e1';
        }
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    const rating1 = getRatingValue('rating_materi');
    const rating2 = getRatingValue('rating_metode');
    const rating3 = getRatingValue('rating_kehadiran');
    const rating4 = getRatingValue('rating_interaksi');
    const rating5 = getRatingValue('rating_keadilan');
    
    console.log('Rating yang dipilih:', rating1, rating2, rating3, rating4, rating5);
    
    const data = {
        tanggal: new Date().toLocaleString('id-ID'),
        nama: document.getElementById('nama').value.trim(),
        nim: document.getElementById('nim').value.trim(),
        prodi: document.getElementById('prodi').value,
        semester: document.getElementById('semester').value,
        emailResponden: document.getElementById('emailResponden').value.trim(),
        dosen: document.getElementById('namaDosen').value,
        matakuliah: document.getElementById('matakuliah').value.trim(),
        rating1: rating1,
        rating2: rating2,
        rating3: rating3,
        rating4: rating4,
        rating5: rating5,
        kelebihan: document.getElementById('kelebihan').value.trim() || '-',
        kekurangan: document.getElementById('kekurangan').value.trim() || '-'
    };
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Mengirim...';
    
    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        showAlert('Penilaian berhasil dikirim!', 'success');
        resetForm();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Gagal mengirim!', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Kirim Penilaian';
    }
});

// ============= RATING STARS NORMAL (KIRI KE KANAN) =============
document.querySelectorAll('.stars').forEach(starsContainer => {
    const radioButtons = starsContainer.querySelectorAll('input');
    const labels = starsContainer.querySelectorAll('label');
    
    // Saat radio button dipilih
    radioButtons.forEach((radio) => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                const value = parseInt(this.value);
                updateStarColors(starsContainer, value);
                console.log(`${this.name} = ${value}`);
            }
        });
    });
    
    // Hover effect (dari kiri ke kanan)
    labels.forEach((label, idx) => {
        label.addEventListener('mouseenter', () => {
            // Warna bintang dari kiri sampai yang di-hover
            for (let i = 0; i <= idx; i++) {
                labels[i].style.color = 'var(--accent)';
            }
            for (let i = idx + 1; i < labels.length; i++) {
                labels[i].style.color = '#cbd5e1';
            }
        });
        
        label.addEventListener('mouseleave', () => {
            const checked = starsContainer.querySelector('input:checked');
            if (checked) {
                updateStarColors(starsContainer, parseInt(checked.value));
            } else {
                labels.forEach(l => l.style.color = '#cbd5e1');
            }
        });
    });
});

// Inisialisasi
document.querySelectorAll('.stars label').forEach(label => {
    label.style.color = '#cbd5e1';
});

console.log('penilaian.js loaded - bintang NORMAL dari kiri ke kanan (klik kiri = 1, klik kanan = 5)');
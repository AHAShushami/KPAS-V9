// Fetch Live PPS Data from Google Sheets
const URL_PPS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTf1QfkAclUHFpdAYZ87d6UUu71mPGF4VLJ83jfWw01Sazmf95hx9lKBq8SYj3rBnuSOWDLat9Ojht6/pub?gid=1321416036&single=true&output=csv';
let livePPSData = [];

Papa.parse(URL_PPS, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
        livePPSData = results.data || [];
        console.log("Loaded Live PPS Data:", livePPSData.length, "records");
    }
});

const selectDistrict = document.getElementById('selectDistrict');
const selectPPS = document.getElementById('selectPPS');

selectDistrict.addEventListener('change', function() {
    const district = this.value;
    selectPPS.innerHTML = '<option value="" disabled selected>Select PPS...</option>';
    
    const districtPPS = livePPSData.filter(d => (d.Daerah || '') === district);
    
    // Sort alphabetically
    districtPPS.sort((a, b) => (a.PPS || '').localeCompare(b.PPS || ''));

    districtPPS.forEach(pps => {
        const option = document.createElement('option');
        option.value = pps.PPS;
        option.text = pps.PPS;
        selectPPS.appendChild(option);
    });

    selectPPS.disabled = false;
    
    // Reset form fields
    document.getElementById('daerah').value = district;
    document.getElementById('gps').value = '';
    document.getElementById('statusLawatan').value = '';
    document.getElementById('tarikhLawatan').value = '';
    document.getElementById('namaPegawai').value = '';
    document.getElementById('statusFungsi').value = '';
    document.getElementById('catatan').value = '';
});

selectPPS.addEventListener('change', function() {
    const ppsName = this.value;
    const ppsData = livePPSData.find(d => d.PPS === ppsName);
    
    if (ppsData) {
        document.getElementById('gps').value = `${ppsData.Latitude || ''}, ${ppsData.Longitude || ''}`;
        
        // Auto-fill existing data if available
        let status = ppsData.Status_Lawatan_PKD_2026 || ppsData.Status || '';
        if (status === 'Telah Dilawati' || status === 'Belum Dilawati') {
            document.getElementById('statusLawatan').value = status;
        }
        
        // Functionality
        let fungsi = ppsData.Status_Fungsi_Semasa || ppsData.fungsi || '';
        if (fungsi) {
            document.getElementById('statusFungsi').value = fungsi;
        }

        // Add other fields if they exist in the sheet (can expand later)
        // document.getElementById('tarikhLawatan').value = ppsData.Tarikh_Lawatan || '';
        // document.getElementById('namaPegawai').value = ppsData.Pegawai || '';
        // document.getElementById('catatan').value = ppsData.Catatan || '';
    }
});

// Live Google Apps Script URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwJUqrZYab9aqVtIAR0-pedrK6IbBFKka0lHDvpDuvp4l6_BoTgFLme_IMA5I7OVm12/exec';

document.getElementById('verify-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const msg = document.getElementById('submitMessage');
    
    // Gather form data to match the Apps Script
    const formData = {
        ppsName: document.getElementById('selectPPS').value,
        daerah: document.getElementById('daerah').value,
        statusLawatan: document.getElementById('statusLawatan').value,
        tarikhLawatan: document.getElementById('tarikhLawatan').value,
        namaPegawai: document.getElementById('namaPegawai').value,
        statusFungsi: document.getElementById('statusFungsi').value,
        catatan: document.getElementById('catatan').value
    };

    if (!formData.ppsName || !formData.daerah) {
        msg.innerText = '❌ Please select a district and PPS first!';
        msg.style.color = '#ef4444';
        return;
    }
    
    submitBtn.innerText = 'Syncing to Google Sheets...';
    submitBtn.style.opacity = '0.7';
    submitBtn.disabled = true;
    
    // Send POST request to Google Apps Script
    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // standard for google apps script web apps without complex auth
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        // no-cors mode returns an opaque response, so we assume success if no network error
        submitBtn.innerText = 'Submit Verification Data';
        submitBtn.style.opacity = '1';
        submitBtn.disabled = false;
        
        msg.innerText = '✅ Data successfully synced to live Google Sheet!';
        msg.style.color = '#10b981';
        this.reset();
        selectPPS.innerHTML = '<option value="" disabled selected>Select District First...</option>';
        selectPPS.disabled = true;
        
        setTimeout(() => { msg.innerText = ''; }, 5000);
    })
    .catch(error => {
        submitBtn.innerText = 'Submit Verification Data';
        submitBtn.style.opacity = '1';
        submitBtn.disabled = false;
        msg.innerText = '❌ Network Error. Could not connect to Google Sheets.';
        msg.style.color = '#ef4444';
        console.error('Error:', error);
    });
});

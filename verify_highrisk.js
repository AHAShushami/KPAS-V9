// Fetch Live High Risk Data from Google Sheets
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSE2pLghFzq8bmpPetoSZcMe9BUc8SMoLUA6QNYS1coxmYGyqQMOGz4DwZjiVTgRlg2f8wec5V6bxdI/pub?gid=644797701&single=true&output=csv';
let liveFacilityData = [];

Papa.parse(SHEET_CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
        liveFacilityData = results.data || [];
        console.log("Loaded High Risk Search Data:", liveFacilityData.length, "records");
    }
});

const selectDistrict = document.getElementById('selectDistrict');
const selectFacility = document.getElementById('selectFacility');

selectDistrict.addEventListener('change', function() {
    const district = this.value;
    selectFacility.innerHTML = '<option value="" disabled selected>Select High-Risk Facility...</option>';
    
    const districtFacilities = liveFacilityData.filter(d => (d.District || '') === district);
    
    // Sort alphabetically
    districtFacilities.sort((a, b) => (a.High_Risk_Facility || '').localeCompare(b.High_Risk_Facility || ''));

    districtFacilities.forEach(fac => {
        const option = document.createElement('option');
        option.value = fac.High_Risk_Facility;
        option.text = fac.High_Risk_Facility;
        selectFacility.appendChild(option);
    });

    selectFacility.disabled = false;
    
    // Reset form fields
    document.getElementById('daerah').value = district;
    document.getElementById('facilityName').value = '';
    document.getElementById('altFacility').value = '';
    document.getElementById('verificationStatus').value = '';
    document.getElementById('contactPerson').value = '';
    document.getElementById('contactNumber').value = '';
    document.getElementById('logistics').value = '';
});

selectFacility.addEventListener('change', function() {
    const facName = this.value;
    const facData = liveFacilityData.find(d => d.High_Risk_Facility === facName);
    
    if (facData) {
        // If it's a blank row, let user type new facility, else set it
        if(facData.High_Risk_Facility.includes('ADD NEW FACILITY')) {
            document.getElementById('facilityName').value = '';
            document.getElementById('facilityName').focus();
        } else {
            document.getElementById('facilityName').value = facData.High_Risk_Facility;
        }
        
        document.getElementById('daerah').value = facData.District || '';
        document.getElementById('altFacility').value = facData.Alternative_Facility || '';
        document.getElementById('verificationStatus').value = facData.Verification_Status || 'Pending';
        document.getElementById('contactPerson').value = facData.Contact_Person || '';
        document.getElementById('contactNumber').value = facData.Contact_Number || '';
        document.getElementById('logistics').value = facData.Logistics_Needed_To_Move || '';
    }
});

// Live Google Apps Script URL for POSTING data
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyCrkJUrZlgOSibCZkT7zYWT57tPqvDxUsDJbkJENUgP9bEvgmGo90n-n6v6fBIBhCC/exec';

document.getElementById('verify-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const msg = document.getElementById('submitMessage');
    
    if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        msg.innerText = '❌ Error: Google Apps Script Web App URL is not set in verify_highrisk.js!';
        msg.style.color = '#ef4444';
        return;
    }

    const formData = {
        district: document.getElementById('daerah').value,
        highRiskFacility: document.getElementById('facilityName').value,
        alternativeFacility: document.getElementById('altFacility').value,
        verificationStatus: document.getElementById('verificationStatus').value,
        contactPerson: document.getElementById('contactPerson').value,
        contactNumber: document.getElementById('contactNumber').value,
        logistics: document.getElementById('logistics').value
    };

    if (!formData.district || !formData.highRiskFacility) {
        msg.innerText = '❌ Please select a district and facility first!';
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
        submitBtn.innerText = 'Submit Facility Data to Google Sheets';
        submitBtn.style.opacity = '1';
        submitBtn.disabled = false;
        
        msg.innerText = '✅ Data successfully synced to live Google Sheet!';
        msg.style.color = '#10b981';
        this.reset();
        selectFacility.innerHTML = '<option value="" disabled selected>Select District First...</option>';
        selectFacility.disabled = true;
        
        setTimeout(() => { msg.innerText = ''; }, 5000);
    })
    .catch(error => {
        submitBtn.innerText = 'Submit Facility Data to Google Sheets';
        submitBtn.style.opacity = '1';
        submitBtn.disabled = false;
        msg.innerText = '❌ Network Error. Could not connect to Google Sheets.';
        msg.style.color = '#ef4444';
        console.error('Error:', error);
    });
});

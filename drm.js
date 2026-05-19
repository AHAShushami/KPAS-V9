const URL_DRP_FACILITY = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSz79935IRGsGoV7cw9rsLQ62GIfUb0pLen4KjS-rJwzmGumggj97Sprb9582DW-A_jpG84bscwuX-w/pub?gid=1001329693&single=true&output=csv';
let liveDRMData = [];

// Thematic Groupings for the Scorecard Modal
const THEMES = {
    "Facility Info & Location": ["Facility code", "Hospital category", "Facility sector", "Facility contact num", "Location", "State", "Latitude", "Longitude", "Bilik Gerakan Phone No"],
    "Medical Specialists": ["Emergency Physician", "Internal Medicine Specialist", "Trauma Surgeon", "General Surgeon", "Neurosurgeon", "Vascular Surgeon", "Cardiothoracic Surgeon", "Orthopaedic Surgeon", "Oral Surgeon", "Plastic Surgeon", "Urologist", "Anaesthesiologist", "Intensivist", "Infectious Disease Physician", "Paediatrician", "Forensic Medicine Specialist", "Forensic Odontologist", "Psychiatrist", "Clinical Psychologist", "Obstetrician & Gynaecologist"],
    "Medical Equipment": ["Portable Ventilator", "Portable transport monitor", "Portable Manual Defibrillator", "Automated/Semi-Auto External Defibrillator", "Syringe Pumps", "Infusion Pumps", "Automated CPR machine", "Portable Oxygen Tanks", "Portable Suction Machine", "Portable Oxygen Tanks_1", "Oxygen Concentrator", "Portable Sterilizer", "Medical cold chain box"],
    "Evacuation & Transport": ["Spinal Board", "Foldable Stretcher", "Basket Stretcher", "Rescue Stretcher", "Scoop Stretcher", "Vacuum Mattress", "Evacuation Trolley"],
    "Tents & Field Logistics": ["Disaster Tent", "Inflatable disaster tent", "Camping tent", "Other types of tent", "Portable Negative Pressure Tent", "Portable Decontamination Shower Tent", "Portable lighting system", "Portable emergency lamps/ lanterns", "Canvas Beds"],
    "Hospital Zones & Capacities": ["Red Zone bays", "Yellow Zone bays", "Observation bays", "Medical Emergency Coordinating Center (MECC)", "Decontamination bays", "Waste Disposal after Decontamination", "Intensive Care Unit", "Operation Theater", "Blood Bank", "CT Scan", "Mortuary", "Labour Room", "Burn Unit", "Negative Pressure Isolation Room", "Helipad", "Dialysis Unit"],
    "Infrastructure & Utilities": ["Power generator", "Portable Genset", "Water tank storage - capacity", "Water tank storage - supply", "Capacity of rain water harversting tank", "Rain water harversting tank - supply", "Tube well", "Petrol storage capacity", "Petrol storage - supply", "Diesel storage capacity", "Diesel storage - supply"],
    "Supplies & Consumables": ["Linen stock", "Patient Garments", "Blankets", "Food supply", "Dry ration", "Enough blood supply", "Adequate PPE supply"],
    "Communications": ["GIRN Handheld", "GIRN Vehicular", "GIRN Desktop", "GIRN Briefcase", "GIRN Rapid Deployment Unit", "Satellite Phone", "Full duplex communication system", "Amateur Radio", "Walkie talkie"],
    "Vehicles": ["Lorry", "Bus", "Type A Land Ambulance", "Type B Land Ambulance"],
    "Disaster Response Teams": ["Disaster Management Plan - Year Updated", "Disaster Response Unit (Team and Vehicle)", "Disaster Response Team (No vehicle)", "CBRNe Special team", "Mental Health Response Team (MHRT)", "Medical Emergencies Response Team (MERT)", "Rapid Assessment Team (RAT)", "Rapid Response Team (RRT)"],
    "Remarks": ["Remarks"]
};

// Fetch live DRM data
Papa.parse(URL_DRP_FACILITY, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
        liveDRMData = results.data.map(d => ({
            facility: d['Facility name'] || d.Facility || '',
            district: d.District || '',
            teams: parseInt(d.Medical_Teams) || parseInt(d['Rapid Assessment Team (RAT)']) || 0,
            fourwd: parseInt(d.Four_WD) || 0,
            amb: parseInt(d.Ambulances) || parseInt(d['Type A Land Ambulance']) || parseInt(d['Type B Land Ambulance']) || 0,
            tents: parseInt(d['Disaster Tent']) || parseInt(d['Inflatable disaster tent']) || 0,
            water: d.Water_Supply || d['Water tank storage - supply'] || 'Standby',
            raw: d // Store full raw data for the thematic scorecard
        })).filter(d => d.facility !== '');
        
        console.log("Loaded DRM Data:", liveDRMData.length, "facilities");
        populateFacilityFilter();
        loadAssetTable();
    }
});

function populateFacilityFilter() {
    const filterSelect = document.getElementById('facilityFilter');
    filterSelect.innerHTML = '<option value="All">All Facilities</option>';
    
    liveDRMData.sort((a, b) => a.facility.localeCompare(b.facility)).forEach(fac => {
        const option = document.createElement('option');
        option.value = fac.facility;
        option.text = fac.facility;
        filterSelect.appendChild(option);
    });
}

function loadAssetTable(filter = "All") {
    const tbody = document.getElementById('assetTableBody');
    tbody.innerHTML = '';
    
    liveDRMData.forEach(asset => {
        if (filter !== "All" && asset.facility !== filter) return;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 500; color: #60a5fa; cursor: pointer; text-decoration: underline;" onclick="openFacilityModal('${asset.facility.replace(/'/g, "\\'")}')">${asset.facility}</td>
            <td>${asset.teams}</td>
            <td>${asset.fourwd}</td>
            <td>${asset.amb}</td>
            <td>${asset.tents}</td>
            <td><span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${asset.water}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('facilityFilter').addEventListener('change', (e) => {
    loadAssetTable(e.target.value);
});

// Modal Logic
function openFacilityModal(facilityName) {
    const asset = liveDRMData.find(d => d.facility === facilityName);
    if (!asset) return;

    document.getElementById('modal-facility-title').innerText = asset.facility;
    document.getElementById('modal-facility-subtitle').innerText = \`District: \${asset.district || 'N/A'}\`;
    
    const container = document.getElementById('modal-dynamic-content');
    container.innerHTML = ''; // Clear previous content

    // Build thematic sections
    for (const [themeName, keys] of Object.entries(THEMES)) {
        let themeHasData = false;
        let themeHTML = \`<div style="margin-bottom: 2rem;">
            <h3 style="color: var(--accent-color); margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; font-family: 'Outfit';">\${themeName}</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">\`;

        keys.forEach(key => {
            let val = asset.raw[key];
            if (val && val.trim() !== '' && val !== '0' && val.toLowerCase() !== 'n/a' && val.toLowerCase() !== 'na' && val.toLowerCase() !== 'false') {
                themeHasData = true;
                
                // Style boolean "Yes" as badges, else standard key-value blocks
                if (val.toLowerCase() === 'yes' || val.toLowerCase() === 'true') {
                    themeHTML += \`
                    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.8rem; border-radius: 8px; display: flex; align-items: center;">
                        <span style="color: #34d399; font-weight: 500;">✅ \${key}</span>
                    </div>\`;
                } else {
                    themeHTML += \`
                    <div style="background: rgba(0,0,0,0.3); padding: 0.8rem; border-radius: 8px;">
                        <div style="color: var(--text-secondary); font-size: 0.75rem; margin-bottom: 0.3rem; text-transform: uppercase;">\${key}</div>
                        <div style="font-size: 1rem; font-weight: 500; color: #fff;">\${val}</div>
                    </div>\`;
                }
            }
        });

        themeHTML += \`</div></div>\`;

        if (themeHasData) {
            container.innerHTML += themeHTML;
        }
    }

    if (container.innerHTML === '') {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem 0;">No detailed DRM data available for this facility.</p>';
    }

    document.getElementById('facilityModal').style.display = 'flex';
}

function closeFacilityModal() {
    document.getElementById('facilityModal').style.display = 'none';
}

// Close modal when clicking outside
document.getElementById('facilityModal').addEventListener('click', (e) => {
    if (e.target.id === 'facilityModal') closeFacilityModal();
});

// Form Submission Simulation
document.getElementById('drm-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const msg = document.getElementById('submitMessage');
    
    submitBtn.innerText = 'Syncing to Logistics Database...';
    submitBtn.style.opacity = '0.7';
    
    setTimeout(() => {
        submitBtn.innerText = 'Update Logistics Database';
        submitBtn.style.opacity = '1';
        
        msg.innerText = '✅ Asset Logistics successfully updated!';
        msg.style.color = '#10b981';
        
        this.reset();
        setTimeout(() => { msg.innerText = ''; }, 5000);
    }, 1500);
});

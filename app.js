let mockPPSData = [];
let mockDRPData = [];
let mockDRMData = [];
let mockScorecardData = [];
window.liveHighRiskData = [];

let map, legend, ppsIcon, riskIcon, facilityIcon;
let markers = [];
let verifyChartInstance = null;
let riskChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Map Initialization
        if (document.getElementById('map')) {
            map = L.map('map').setView([6.1184, 100.3685], 8);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);

            // Legend Control
            legend = L.control({position: 'bottomright'});
            legend.onAdd = function (map) {
                const div = L.DomUtil.create('div', 'info legend glass');
                div.style.padding = '10px';
                div.style.borderRadius = '8px';
                div.innerHTML = `
                    <div style="margin-bottom: 5px;"><span style="display:inline-block; width:10px; height:10px; background:#3b82f6; border-radius:50%; margin-right:8px;"></span> PPS</div>
                    <div style="margin-bottom: 5px;"><span style="display:inline-block; width:12px; height:12px; background:#ef4444; border-radius:3px; margin-right:6px;"></span> Hazard (DRP)</div>
                    <div><span style="display:inline-block; width:12px; height:12px; background:#10b981; border-radius:50%; margin-right:6px; color:white; text-align:center; font-size:10px; line-height:12px;">+</span> Facility (DRM)</div>
                `;
                return div;
            };
            legend.addTo(map);

            // Custom Icons
            ppsIcon = L.divIcon({
                className: 'custom-icon',
                html: '<div style="background-color: #3b82f6; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(59,130,246,0.8);"></div>',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            });

            riskIcon = L.divIcon({
                className: 'custom-icon',
                html: '<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 3px; border: 2px solid white; box-shadow: 0 0 5px rgba(239,68,68,0.8);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            facilityIcon = L.divIcon({
                className: 'custom-icon',
                html: '<div style="background-color: #10b981; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; box-shadow: 0 0 5px rgba(16,185,129,0.8);">+</div>',
                iconSize: [18, 18],
                iconAnchor: [9, 9]
            });
        }

        await fetchData();

        // Populate district dropdown
        const select = document.getElementById('district-filter');
        if (select) {
            select.innerHTML = '<option value="All">All Districts</option>';
            const uniqueDistricts = [...new Set(mockScorecardData.map(d => d.district))].sort();
            uniqueDistricts.forEach(d => {
                select.innerHTML += `<option value="${d}">${d}</option>`;
            });

            // Add District Filter listener
            select.addEventListener('change', (e) => {
                loadDashboard(e.target.value);
            });
        }

        loadDashboard("All"); // Initialize the dashboard
    } catch(err) {
        console.error(err);
    }
});

function loadDashboard(districtFilter = "All") {
    // 1. FILTER DATA
    const filteredPPS = districtFilter === "All" ? mockPPSData : mockPPSData.filter(d => d.daerah === districtFilter);
    const filteredDRP = districtFilter === "All" ? mockDRPData : mockDRPData.filter(d => d.daerah === districtFilter);
    const filteredDRM = districtFilter === "All" ? mockDRMData : mockDRMData.filter(d => d.daerah === districtFilter);
    const filteredScorecard = districtFilter === "All" ? mockScorecardData : mockScorecardData.filter(d => d.district === districtFilter);

    // 2. UPDATE MAP
    if (map) {
        markers.forEach(m => map.removeLayer(m));
        markers = [];

        filteredPPS.forEach(pps => {
            const marker = L.marker([pps.lat, pps.lng], { icon: ppsIcon }).addTo(map);
            marker.bindPopup(`<b>PPS:</b> ${pps.pps}<br><b>Daerah:</b> ${pps.daerah}<br><b>Status:</b> ${pps.status}`);
            markers.push(marker);
        });

        filteredDRP.forEach(risk => {
            const marker = L.marker([risk.lat, risk.lng], { icon: riskIcon }).addTo(map);
            marker.bindPopup(`<b>HAZARD:</b> ${risk.hazard}<br><b>Category:</b> ${risk.kategori}<br><b>Class:</b> ${risk.class}`);
            markers.push(marker);
        });

        filteredDRM.forEach(fac => {
            const marker = L.marker([fac.lat, fac.lng], { icon: facilityIcon }).addTo(map);
            marker.bindPopup(`<b>FACILITY:</b> ${fac.facility}<br><b>Med Teams:</b> ${fac.teams}<br><b>Ambulances:</b> ${fac.amb}`);
            markers.push(marker);
        });
        
        // Pan map to district if filtered
        if (districtFilter !== "All" && filteredPPS.length > 0) {
            map.setView([filteredPPS[0].lat, filteredPPS[0].lng], 10);
        } else if (districtFilter === "All") {
            map.setView([6.1184, 100.3685], 8);
        }
    }

    // 3. UPDATE METRICS UI
    if (document.getElementById("total-pps")) {
        document.getElementById("total-pps").innerText = filteredPPS.length;
        document.getElementById("pps-verified").innerText = `${filteredPPS.filter(p => p.status === 'Telah Dilawati').length} / ${filteredPPS.length}`;
        document.getElementById("pps-active").innerText = filteredPPS.filter(p => p.fungsi === 'Masih Berfungsi').length;
        document.getElementById("high-risks").innerText = filteredDRP.filter(r => r.class === 'high').length;
        document.getElementById("medium-risks").innerText = filteredDRP.filter(r => r.class === 'medium').length;
        document.getElementById("total-hazards").innerText = filteredDRP.length; 
        document.getElementById("total-teams").innerText = filteredDRM.reduce((sum, d) => sum + d.teams, 0);
        document.getElementById("total-4wd").innerText = filteredDRM.reduce((sum, d) => sum + d.fourwd, 0);
        document.getElementById("total-amb").innerText = filteredDRM.reduce((sum, d) => sum + d.amb, 0);
    }
    
    // 4. UPDATE SCORECARD TABLE
    const tbody = document.getElementById('scorecard-body');
    if (tbody) {
        tbody.innerHTML = '';
        filteredScorecard.forEach(d => {
            let color = "var(--danger)";
            if (d.ppsPct > 40) color = "var(--warning)";
            if (d.ppsPct > 75) color = "var(--success)";
            
            let riskColor = d.risks > 5 ? "color: var(--danger); font-weight: bold;" : "";
            
            tbody.innerHTML += `
                <tr style="cursor: pointer; transition: background 0.3s;" onclick="openDistrictModal('${d.district}')" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 1.2rem 1.5rem; font-weight: 500; color: #fff; text-decoration: underline; text-underline-offset: 4px; text-decoration-color: var(--accent-color);">${d.district}</td>
                    <td style="padding: 1.2rem 1.5rem; width: 30%;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 2px;">
                            <span>${d.ppsPct}%</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${d.ppsPct}%; background: ${color};"></div>
                        </div>
                    </td>
                    <td style="padding: 1.2rem 1.5rem; text-align: center; ${riskColor}">${d.risks}</td>
                    <td style="padding: 1.2rem 1.5rem; text-align: center;">${d.teams}</td>
                    <td style="padding: 1.2rem 1.5rem; text-align: center;">${d.amb}</td>
                </tr>
            `;
        });
    }

    // 5. UPDATE CHARTS
    updateCharts(filteredPPS, filteredDRP);
}

function updateCharts(ppsData, drpData) {
    const verified = ppsData.filter(p => p.status === 'Telah Dilawati').length;
    const pending = ppsData.length - verified;

    const highRisk = drpData.filter(r => r.class === 'high').length;
    const medRisk = drpData.filter(r => r.class === 'medium').length;

    // Verification Chart
    const ctxVerify = document.getElementById('verificationChart');
    if (ctxVerify) {
        if (verifyChartInstance) verifyChartInstance.destroy();
        verifyChartInstance = new Chart(ctxVerify, {
            type: 'doughnut',
            data: {
                labels: ['Verified', 'Pending'],
                datasets: [{
                    data: [verified, pending],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#a0aec0' } }
                }
            }
        });
    }

    // Risk Chart
    const ctxRisk = document.getElementById('riskChart');
    if (ctxRisk) {
        if (riskChartInstance) riskChartInstance.destroy();
        riskChartInstance = new Chart(ctxRisk, {
            type: 'bar',
            data: {
                labels: ['High Risk', 'Medium Risk'],
                datasets: [{
                    label: 'Hazards',
                    data: [highRisk, medRisk],
                    backgroundColor: ['#ef4444', '#f59e0b'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a0aec0' } },
                    x: { grid: { display: false }, ticks: { color: '#a0aec0' } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

// --- Modal Functions ---
window.openDistrictModal = function(district) {
    if (document.getElementById('modal-district-title')) {
        document.getElementById('modal-district-title').innerText = district.toUpperCase() + " - DEEP DIVE";
    }
    
    // DRM Data (Logistics)
    const drmBody = document.getElementById('modal-drm-body');
    if (drmBody) {
        drmBody.innerHTML = '';
        const dDRM = mockDRMData.filter(d => d.daerah.toLowerCase() === district.toLowerCase() || String(d.facility).toLowerCase().includes(district.toLowerCase()));
        
        if(dDRM.length === 0) {
            drmBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color: var(--text-secondary);">No facility data available for this district.</td></tr>';
        } else {
            dDRM.forEach(f => {
                let badges = '';
                if(f.plan && f.plan !== 'No' && f.plan !== 'N/A') badges += `<span style="display:inline-block; background:rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color:#34d399; padding:3px 8px; border-radius:12px; font-size:0.7rem; margin-right:6px; margin-top:6px; box-shadow: 0 0 10px rgba(16,185,129,0.1);">📝 Plan: ${f.plan}</span>`;
                if(f.water && f.water !== 'No' && f.water !== 'N/A') badges += `<span style="display:inline-block; background:rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); color:#60a5fa; padding:3px 8px; border-radius:12px; font-size:0.7rem; margin-right:6px; margin-top:6px; box-shadow: 0 0 10px rgba(59,130,246,0.1);">💧 Water: ${f.water}D</span>`;
                if(f.genset === 'Yes') badges += `<span style="display:inline-block; background:rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); color:#fbbf24; padding:3px 8px; border-radius:12px; font-size:0.7rem; margin-right:6px; margin-top:6px; box-shadow: 0 0 10px rgba(245,158,11,0.1);">⚡ Genset</span>`;
                if(f.sat === 'Yes') badges += `<span style="display:inline-block; background:rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3); color:#a78bfa; padding:3px 8px; border-radius:12px; font-size:0.7rem; margin-right:6px; margin-top:6px; box-shadow: 0 0 10px rgba(139,92,246,0.1);">📡 Sat Phone</span>`;
                if(f.mhrt === 'Yes') badges += `<span style="display:inline-block; background:rgba(236,72,153,0.15); border: 1px solid rgba(236,72,153,0.3); color:#f472b6; padding:3px 8px; border-radius:12px; font-size:0.7rem; margin-right:6px; margin-top:6px; box-shadow: 0 0 10px rgba(236,72,153,0.1);">🧠 MHRT</span>`;

                drmBody.innerHTML += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem;">
                            <div style="font-weight: 500; color: #fff; font-size: 1.05rem;">${f.facility}</div>
                            <div style="display: flex; flex-wrap: wrap;">${badges}</div>
                        </td>
                        <td style="padding: 1rem; text-align: center; vertical-align: middle;">${f.teams}</td>
                        <td style="padding: 1rem; text-align: center; vertical-align: middle;">${f.fourwd}</td>
                        <td style="padding: 1rem; text-align: center; vertical-align: middle;">${f.amb}</td>
                    </tr>`;
            });
        }
    }

    // DRP Data (Risks)
    const drpBody = document.getElementById('modal-drp-body');
    if (drpBody) {
        drpBody.innerHTML = '';
        const dDRP = mockDRPData.filter(d => d.daerah.toLowerCase() === district.toLowerCase());
        
        if(dDRP.length === 0) {
            drpBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:1.5rem; color: var(--text-secondary);">No hazard data recorded for this district.</td></tr>';
        } else {
            dDRP.forEach(r => {
                let riskColor = r.class === 'high' ? 'var(--danger)' : 'var(--warning)';
                drpBody.innerHTML += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem; color: #fff;">${r.mukim}</td>
                        <td style="padding: 1rem;">${r.hazard}</td>
                        <td style="padding: 1rem; text-align: center; color: ${riskColor}; font-weight: bold; text-transform: uppercase;">${r.class}</td>
                    </tr>`;
            });
        }
    }

    // High-Risk Facilities Data
    const hrBody = document.getElementById('modal-highrisk-body');
    if (hrBody) {
        hrBody.innerHTML = '';
        const dHR = (window.liveHighRiskData || []).filter(d => 
            d.District && d.District.toLowerCase() === district.toLowerCase() && 
            d.High_Risk_Facility && !d.High_Risk_Facility.includes('[ADD NEW FACILITY HERE]')
        );

        if(dHR.length === 0) {
            hrBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color: var(--text-secondary);">No verified high-risk facilities for this district.</td></tr>';
        } else {
            dHR.forEach(r => {
                let statusColor = r.Verification_Status === 'Verified' ? 'var(--success)' : 'var(--warning)';
                let altText = r.Alternative_Facility || '<span style="color:var(--text-secondary); font-style:italic;">Not Specified</span>';
                let logText = r.Logistics_Needed_To_Move || '<span style="color:var(--text-secondary); font-style:italic;">None</span>';
                
                hrBody.innerHTML += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem; color: #fff; font-weight: 500;">${r.High_Risk_Facility}</td>
                        <td style="padding: 1rem; color: #fbbf24; font-weight: 500;">${altText}</td>
                        <td style="padding: 1rem; text-align: center; color: ${statusColor}; font-weight: bold;">${r.Verification_Status || 'Pending'}</td>
                        <td style="padding: 1rem;">${logText}</td>
                    </tr>`;
            });
        }
    }

    if (document.getElementById('deepDiveModal')) {
        document.getElementById('deepDiveModal').style.display = 'flex';
    }
}

window.closeModal = function() {
    if (document.getElementById('deepDiveModal')) {
        document.getElementById('deepDiveModal').style.display = 'none';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('deepDiveModal');
    if (event.target === modal) {
        closeModal();
    }
}

// --- LIVE DATA FETCHING ---
const URL_PPS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTf1QfkAclUHFpdAYZ87d6UUu71mPGF4VLJ83jfWw01Sazmf95hx9lKBq8SYj3rBnuSOWDLat9Ojht6/pub?gid=1321416036&single=true&output=csv';
const URL_DRP_FACILITY = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSz79935IRGsGoV7cw9rsLQ62GIfUb0pLen4KjS-rJwzmGumggj97Sprb9582DW-A_jpG84bscwuX-w/pub?gid=1001329693&single=true&output=csv';
const URL_DRM_HAZARD = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWpgFSm-I06bmNuadgkPmAFM9sC85fkw9QF-3vtpykk-NRa061DVYRBPv9tW2NjDfjtXCq6xCCKysY/pub?gid=342019860&single=true&output=csv';
const URL_HIGH_RISK = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSE2pLghFzq8bmpPetoSZcMe9BUc8SMoLUA6QNYS1coxmYGyqQMOGz4DwZjiVTgRlg2f8wec5V6bxdI/pub?output=csv';

function fetchCsvData(url) {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (err) => reject(err)
        });
    });
}

function computeScorecard() {
    const districts = ["Baling", "Bandar Baharu", "Kota Setar", "Kuala Muda", "Kubang Pasu", "Kulim", "Langkawi", "Padang Terap", "Pendang", "Pokok Sena", "Sik", "Yan"];
    
    return districts.map(district => {
        const d_pps = mockPPSData.filter(p => p.daerah === district);
        const d_drp = mockDRPData.filter(r => r.daerah === district);
        const d_drm = mockDRMData.filter(f => f.daerah === district);
        
        let verified = d_pps.filter(p => p.status === 'Telah Dilawati').length;
        let ppsPct = d_pps.length > 0 ? Math.round((verified / d_pps.length) * 100) : 0;
        
        let risks = d_drp.length;
        // Teams and Ambulances from DRM (Facility Data)
        let teams = d_drm.reduce((sum, f) => sum + (parseInt(f.teams) || 0), 0);
        let amb = d_drm.reduce((sum, f) => sum + (parseInt(f.amb) || 0), 0);
        
        return {
            district: district,
            ppsPct: ppsPct,
            risks: risks,
            teams: teams,
            amb: amb
        };
    });
}

async function fetchData() {
    try {
        const [ppsData, drpFacData, drmHazData, hrData] = await Promise.all([
            fetchCsvData(URL_PPS),
            fetchCsvData(URL_DRP_FACILITY),
            fetchCsvData(URL_DRM_HAZARD),
            fetchCsvData(URL_HIGH_RISK)
        ]);

        // Map PPS data
        mockPPSData = ppsData.map(d => ({
            pps: d.PPS || '',
            daerah: d.Daerah || '',
            lat: parseFloat(d.Latitude),
            lng: parseFloat(d.Longitude),
            status: d.Status_Lawatan_PKD_2026 || d.Status || 'Belum Dilawati',
            fungsi: d.Status_Fungsi_Semasa || d.fungsi || 'Tidak Berfungsi'
        })).filter(d => !isNaN(d.lat) && !isNaN(d.lng));

        // Map Hazard Data to mockDRPData
        mockDRPData = drmHazData.map(d => ({
            daerah: d.DAERAH || '',
            mukim: d.MUKIM || '',
            kategori: d.RISK_CATEGORY || '',
            hazard: d.RISK || '',
            class: (d.RISK_CLASS || 'high').toLowerCase(),
            lat: parseFloat(d.LATITUDE),
            lng: parseFloat(d.LONGITUDE)
        })).filter(d => !isNaN(d.lat) && !isNaN(d.lng));

        // Map Facility Data to mockDRMData
        mockDRMData = drpFacData.map(d => ({
            facility: d['Facility name'] || '',
            daerah: d.District || '',
            teams: parseInt(d.Medical_Teams) || 2, // fallback values if headers differ
            amb: parseInt(d.Ambulances) || 0,
            fourwd: parseInt(d.Four_WD) || 0,
            lat: parseFloat(d.Latitude),
            lng: parseFloat(d.Longitude)
        })).filter(d => !isNaN(d.lat) && !isNaN(d.lng));

        // Map High-Risk Verification data
        window.liveHighRiskData = hrData;

        // Compute scorecard data
        mockScorecardData = computeScorecard();

        console.log("Data successfully fetched and mapped.");

    } catch (error) {
        console.error("Error fetching data:", error);
        alert("Failed to load live data. Dashboard may be empty.");
    }
}
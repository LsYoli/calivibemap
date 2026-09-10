document.addEventListener('DOMContentLoaded', () => {
    initMap();
});

async function initMap() {
    // --- 1. Map Initialization (Leaflet + CartoDB Voyager Style) ---
    // Cali Coordinates: 3.4516, -76.5320
    const caliCoords = [3.4516, -76.5320];
    const map = L.map('map', {
        center: caliCoords,
        zoom: 13,
        zoomControl: false // Custom placement
    });

    // Add zoom control
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // OpenStreetMap Standard Basemap (sin API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abc',
        maxZoom: 19
    }).addTo(map);

    // --- 2. Fetch and Render Student Data ---
    try {
        // Fetch the index of student files
        const indexResponse = await fetch('data/index.json');
        if (!indexResponse.ok) throw new Error('Failed to load student index');
        const fileList = await indexResponse.json();

        // Fetch all student files in parallel
        const studentsData = await Promise.all(
            fileList.map(async (fileName) => {
                const response = await fetch(`data/students/${fileName}`);
                if (!response.ok) {
                    console.warn(`Failed to load student file: ${fileName}`);
                    return null;
                }
                return response.json();
            })
        );

        // Filter out any failed loads
        const validStudents = studentsData.filter(student => student !== null);
        
        renderMarkers(map, validStudents);

    } catch (error) {
        console.error('Error loading student data:', error);
        // Fallback for file:// protocol issues if user opens directly
        if (window.location.protocol === 'file:') {
            alert('Note: Fetch API may not work when opening HTML files directly due to CORS. Please use a local server (e.g., Live Server extension in VS Code).');
        }
    }
}

function getIconForLikes(likes) {
    const defaultIcon = 'fa-user';
    const iconMap = {
        'hamburguesas': 'fa-burger',
        'arepas': 'fa-cookie', // Closest simple shape or use custom SVG
        'pizza': 'fa-pizza-slice',
        'salsa': 'fa-music',
        'café': 'fa-mug-hot',
        'ciclismo': 'fa-bicycle',
        'bicicleta': 'fa-bicycle',
        'gatos': 'fa-cat',
        'perros': 'fa-dog',
        'gaming': 'fa-gamepad',
        'fotografía': 'fa-camera',
        'naturaleza': 'fa-tree',
        'yoga': 'fa-person-praying'
    };

    // Find the first matching icon from likes
    for (const like of likes) {
        const likeLower = like.toLowerCase();
        // Check for partial matches (e.g., "hamburguesas artesanales" matches "hamburguesas")
        for (const [key, iconClass] of Object.entries(iconMap)) {
            if (likeLower.includes(key)) {
                return iconClass;
            }
        }
    }
    
    return defaultIcon;
}

function renderMarkers(map, students) {
    students.forEach(student => {
        // Determine icon based on likes
        const iconClass = getIconForLikes(student.likes || []);

        // Create custom CSS icon
        const customIcon = L.divIcon({
            className: 'custom-div-icon', 
            html: `<div class='custom-marker'><i class="fa-solid ${iconClass}"></i></div>`,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
            popupAnchor: [0, -26]
        });

        // Add marker to map
        const marker = L.marker([student.lat, student.lng], { icon: customIcon }).addTo(map);

        // Construct Popup HTML
        const likesHtml = student.likes.map(t => `<span class="tag like">${t}</span>`).join('');
        const dislikesHtml = student.dislikes.map(t => `<span class="tag dislike">${t}</span>`).join('');
        
        // Add photo logic with fallback
        const photoHtml = student.photo 
            ? `<img src="${student.photo}" alt="${student.name}" class="student-photo">`
            : `<div class="student-photo-placeholder"><i class="fa-solid fa-user"></i></div>`;

        const popupContent = `
            <div class="popup-card">
                <div class="popup-header">
                    <div class="profile-info">
                        ${photoHtml}
                        <div class="text-info">
                            <h3>${student.name}</h3>
                            <span class="social-handle">${student.socialMedia}</span>
                        </div>
                    </div>
                </div>
                <div class="popup-section">
                    <span class="section-title">Le gusta</span>
                    <div class="tags-container">${likesHtml}</div>
                </div>
                <div class="popup-section">
                    <span class="section-title">No le gusta</span>
                    <div class="tags-container">${dislikesHtml}</div>
                </div>
            </div>
        `;

        // Bind Popup
        marker.bindPopup(popupContent, {
            closeButton: false,
            offset: [0, -5],
            maxWidth: 300,
            minWidth: 250,
            className: 'custom-popup-container'
        });

        // Hover Events
        marker.on('mouseover', function(e) {
            this.openPopup();
        });

        marker.on('mouseout', function(e) {
            this.closePopup();
        });
    });
}
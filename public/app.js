// ====== web-admin/public/app.js ======

// Configuración global
const CONFIG = {
    API_URL: 'https://rondin.oemspot.com.ar/api', // CAMBIAR IP AQUÍ
    TOKEN_KEY: 'adminToken',
    USER_KEY: 'adminUser'
};

// Estado global de la aplicación
const AppState = {
    token: localStorage.getItem(CONFIG.TOKEN_KEY),
    user: JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || '{}'),
    isLoading: false
};

// ====== UTILIDADES ======
const Utils = {
    // Mostrar/ocultar loading
    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            if (show) {
                overlay.classList.remove('hidden');
                AppState.isLoading = true;
            } else {
                overlay.classList.add('hidden');
                AppState.isLoading = false;
            }
        }
    },

    // Mostrar toast notification
    showToast(message, type = 'info', title = 'Notificación') {
        const toast = document.getElementById('toast');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        
        if (!toast || !toastTitle || !toastMessage) return;
        
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        // Remover clases anteriores
        toast.classList.remove('text-bg-success', 'text-bg-danger', 'text-bg-warning', 'text-bg-info');
        
        // Agregar clase según tipo
        switch(type) {
            case 'success':
                toast.classList.add('text-bg-success');
                break;
            case 'error':
                toast.classList.add('text-bg-danger');
                break;
            case 'warning':
                toast.classList.add('text-bg-warning');
                break;
            default:
                toast.classList.add('text-bg-info');
        }
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    },

    // Formatear fecha
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    },

    // Formatear fecha relativa
    formatRelativeDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Hace un momento';
        if (diffInMinutes < 60) return `Hace ${diffInMinutes} minutos`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `Hace ${diffInHours} horas`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `Hace ${diffInDays} días`;
        
        return date.toLocaleDateString('es-AR');
    },

    // Validar email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ====== API CLIENT ======
const API = {
    // Headers por defecto
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (AppState.token) {
            headers['Authorization'] = `Bearer ${AppState.token}`;
        }
        
        return headers;
    },

    // Manejo de errores
    async handleResponse(response) {
        if (!response.ok) {
            let error;
            try {
                error = await response.json();
            } catch {
                error = { error: `HTTP ${response.status}: ${response.statusText}` };
            }
            throw new Error(error.error || `Error ${response.status}`);
        }
        return response.json();
    },

    // Login
    async login(email, password) {
        const response = await fetch(`${CONFIG.API_URL}/login`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ email, password })
        });
        return this.handleResponse(response);
    },

    // Estadísticas
    async getStats() {
        const response = await fetch(`${CONFIG.API_URL}/stats`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    // Sitios
    async getSites() {
        const response = await fetch(`${CONFIG.API_URL}/sites`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    async createSite(lugar) {
        const response = await fetch(`${CONFIG.API_URL}/sites`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ lugar })
        });
        return this.handleResponse(response);
    },

    async updateSite(id, lugar) {
        const response = await fetch(`${CONFIG.API_URL}/sites/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ lugar })
        });
        return this.handleResponse(response);
    },

    // Registros
    async getRecords(params = {}) {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key]) {
                searchParams.append(key, params[key]);
            }
        });
        
        const response = await fetch(`${CONFIG.API_URL}/records?${searchParams}`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    // Usuarios
    async getUsers() {
        const response = await fetch(`${CONFIG.API_URL}/users`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    async createUser(userData) {
        const response = await fetch(`${CONFIG.API_URL}/users`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(userData)
        });
        return this.handleResponse(response);
    },

    async resetUserPassword(id, password) {
        const response = await fetch(`${CONFIG.API_URL}/users/${id}/password`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ password })
        });
        return this.handleResponse(response);
    },

    async getRondaStatus() {
        const response = await fetch(`${CONFIG.API_URL}/ronda/status`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

};

// ====== AUTH MODULE ======
const Auth = {
    // Inicializar autenticación
    init() {
        if (AppState.token) {
            this.showAdminPanel();
        } else {
            this.showLoginForm();
        }
        
        // Event listener para el formulario de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }
    },

    // Mostrar formulario de login
    showLoginForm() {
        const loginSection = document.getElementById('loginSection');
        const adminSection = document.getElementById('adminSection');
        
        if (loginSection) loginSection.classList.remove('hidden');
        if (adminSection) adminSection.classList.add('hidden');
    },

    // Mostrar panel de administración
    showAdminPanel() {
        const loginSection = document.getElementById('loginSection');
        const adminSection = document.getElementById('adminSection');
        
        if (loginSection) loginSection.classList.add('hidden');
        if (adminSection) adminSection.classList.remove('hidden');
        
        // Mostrar nombre del usuario
        const userNameElement = document.getElementById('currentUserName');
        if (userNameElement && AppState.user.nombre) {
            userNameElement.textContent = AppState.user.nombre;
        }
        
        // Cargar dashboard inicial
        Dashboard.load();
    },

    // Manejar login
    async handleLogin(e) {
        e.preventDefault();
        
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        if (!emailInput || !passwordInput) return;
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            Utils.showToast('Por favor, completa todos los campos', 'warning');
            return;
        }

        if (!Utils.isValidEmail(email)) {
            Utils.showToast('Por favor, ingresa un email válido', 'warning');
            return;
        }

        Utils.showLoading(true);

        try {
            const response = await API.login(email, password);
            
            if (response.user.rol !== 'administrador') {
                throw new Error('Solo administradores pueden acceder a este panel');
            }

            // Guardar token y usuario
            AppState.token = response.token;
            AppState.user = response.user;
            localStorage.setItem(CONFIG.TOKEN_KEY, response.token);
            localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(response.user));

            Utils.showToast('¡Bienvenido al panel de administración!', 'success');
            this.showAdminPanel();

        } catch (error) {
            console.error('Error en login:', error);
            Utils.showToast(error.message, 'error', 'Error de autenticación');
        } finally {
            Utils.showLoading(false);
        }
    },

    // Logout
    logout() {
        AppState.token = null;
        AppState.user = {};
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        localStorage.removeItem(CONFIG.USER_KEY);
        
        Utils.showToast('Sesión cerrada correctamente', 'info');
        this.showLoginForm();
        
        // Limpiar formulario
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();
    }
};

// ====== DASHBOARD MODULE ======
const Dashboard = {
    async load() {
        try {
            // Cargar estadísticas (esto no cambia)
            const stats = await API.getStats();
            this.updateStats(stats);

            // ¡CAMBIO IMPORTANTE!
            // Ahora cargamos el reporte de ronda en lugar de la actividad reciente
            await RondaReport.load();

        } catch (error) {
            console.error('Error cargando dashboard:', error);
            Utils.showToast('Error al cargar el dashboard', 'error');
        }
    },

    updateStats(stats) {
        const elements = {
            totalSitios: document.getElementById('totalSitios'),
            registrosHoy: document.getElementById('registrosHoy'),
            totalUsuarios: document.getElementById('totalUsuarios'),
            registrosSemana: document.getElementById('registrosSemana')
        };

        if (elements.totalSitios) elements.totalSitios.textContent = stats.totalSitios || 0;
        if (elements.registrosHoy) elements.registrosHoy.textContent = stats.registrosHoy || 0;
        if (elements.totalUsuarios) elements.totalUsuarios.textContent = stats.totalUsuarios || 0;
        if (elements.registrosSemana) elements.registrosSemana.textContent = stats.registrosSemana || 0;
    },

    async loadRecentActivity() {
        try {
            const records = await API.getRecords({ limit: 10 });
            this.displayRecentActivity(records);
        } catch (error) {
            console.error('Error cargando actividad reciente:', error);
            const container = document.getElementById('recentActivity');
            if (container) {
                container.innerHTML = '<p class="text-muted text-center">Error al cargar la actividad reciente</p>';
            }
        }
    },

    displayRecentActivity(records) {
        const container = document.getElementById('recentActivity');
        if (!container) return;
        
        if (!records || records.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No hay actividad reciente</p>';
            return;
        }

        const html = records.map(record => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-qrcode"></i>
                </div>
                <div class="activity-content">
                    <strong>${record.usuario_nombre}</strong> escaneó 
                    <strong>${record.sitio_nombre}</strong>
                </div>
                <div class="activity-time">
                    ${Utils.formatRelativeDate(record.fecha)}
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }
};

// ====== SITES MODULE ======
const Sites = {
    async load() {
        try {
            const sites = await API.getSites();
            this.displaySites(sites);
        } catch (error) {
            console.error('Error cargando sitios:', error);
            Utils.showToast('Error al cargar los sitios', 'error');
        }
    },

    displaySites(sites) {
        const tbody = document.getElementById('sitiosTable');
        if (!tbody) return;
        if (!sites || sites.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay sitios registrados</td></tr>';
            return;
        }

        const html = sites.map(site => `
            <tr>
                <td>
                    <input class="form-check-input site-checkbox" type="checkbox" value="${site.id}" data-nombre="${site.lugar.replace(/"/g, '&quot;')}">
                </td>
                <td><strong>${site.id}</strong></td>
                <td>${site.lugar}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-2" onclick="Sites.generateQR(${site.id}, '${site.lugar.replace(/'/g, "\\'")}')" title="Ver QR">
                        <i class="fas fa-qrcode"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning me-2" onclick="Sites.openEditModal(${site.id}, '${site.lugar.replace(/'/g, "\\'")}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="Sites.openDeleteConfirm(${site.id}, '${site.lugar.replace(/'/g, "\\'")}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        tbody.innerHTML = html;
    },

    // --- ¡NUEVAS FUNCIONES PARA EDITAR! ---
    openEditModal(id, currentName) {
        const modalElement = document.getElementById('editSiteModal');
        const nameInput = document.getElementById('editSiteName');
        if (!modalElement || !nameInput) return;

        modalElement.dataset.siteId = id;
        nameInput.value = currentName;
        
        const bsModal = new bootstrap.Modal(modalElement);
        bsModal.show();
    },

    async handleUpdate() {
        const modalElement = document.getElementById('editSiteModal');
        const nameInput = document.getElementById('editSiteName');
        if (!modalElement || !nameInput) return;

        const id = modalElement.dataset.siteId;
        const newName = nameInput.value.trim();

        if (!newName) {
            Utils.showToast('El nombre no puede estar vacío.', 'warning');
            return;
        }

        Utils.showLoading(true);
        try {
            await API.updateSite(id, newName);
            Utils.showToast('Sitio actualizado correctamente.', 'success');
            
            const bsModal = bootstrap.Modal.getInstance(modalElement);
            bsModal.hide();

            await this.load();

        } catch (error) {
            console.error('Error actualizando sitio:', error);
            Utils.showToast('Error al actualizar el sitio.', 'error');
        } finally {
            Utils.showLoading(false);
        }
    },

    // --- ¡NUEVAS FUNCIONES PARA ELIMINAR! ---
    openDeleteConfirm(id, name) {
        const modalElement = document.getElementById('deleteSiteModal');
        const nameElement = document.getElementById('deleteSiteName');
        if (!modalElement || !nameElement) return;

        modalElement.dataset.siteId = id;
        nameElement.textContent = name;
        
        const bsModal = new bootstrap.Modal(modalElement);
        bsModal.show();
    },

    async handleDelete() {
        const modalElement = document.getElementById('deleteSiteModal');
        if (!modalElement) return;

        const id = modalElement.dataset.siteId;
        
        Utils.showLoading(true);
        try {
            await API.deleteSite(id);
            Utils.showToast('Sitio eliminado correctamente.', 'success');
            
            const bsModal = bootstrap.Modal.getInstance(modalElement);
            bsModal.hide();

            await this.load();

        } catch (error) {
            console.error('Error eliminando sitio:', error);
            Utils.showToast(error.message, 'error');
            const bsModal = bootstrap.Modal.getInstance(modalElement);
            bsModal.hide();
        } finally {
            Utils.showLoading(false);
        }
    },

    toggleAllCheckboxes(source) {
        const checkboxes = document.querySelectorAll('.site-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = source.checked);
    },

    async create() {
        const lugarInput = document.getElementById('nuevoSitio');
        if (!lugarInput) return;
        const lugar = lugarInput.value.trim();
        if (!lugar) {
            Utils.showToast('Por favor, ingresa el nombre del sitio', 'warning');
            lugarInput.focus();
            return;
        }
        Utils.showLoading(true);
        try {
            const site = await API.createSite(lugar);
            lugarInput.value = '';
            this.generateQR(site.id, site.lugar);
            await this.load();
            Utils.showToast('Sitio creado correctamente', 'success');
        } catch (error) {
            console.error('Error creando sitio:', error);
            Utils.showToast('Error al crear el sitio: ' + error.message, 'error');
        } finally {
            Utils.showLoading(false);
        }
    },

    generateQR(id, nombre) {
        const container = document.getElementById('qrResult');
        if (!container) return;
        container.innerHTML = '';
        container.classList.add('active');
        const qrContent = `
            <div style="text-align: center; padding: 20px; background: white; border-radius: 10px; border: 2px solid #e0e0e0;">
                <h5 style="color: #333; margin-bottom: 20px; font-weight: 600;">QR para: ${nombre}</h5>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${id}&format=png&ecc=M" alt="Código QR" style="border: 2px solid #ddd; border-radius: 8px;">
                <div style="margin: 15px 0; padding: 10px; background: #e3f2fd; border-radius: 6px;">
                    <strong style="color: #1976d2;">ID del Sitio:</strong> 
                    <span style="font-family: monospace; font-size: 18px; font-weight: bold;">${id}</span>
                </div>
                <div>
                    <button class="btn btn-primary btn-sm me-2" onclick="Sites.printQR('${nombre}', '${id}')">Imprimir</button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="Sites.downloadQR('${nombre}', '${id}')">Descargar</button>
                </div>
            </div>`;
        container.innerHTML = qrContent;
    },

    printQR(nombre, id) {
        const printContent = `
            <!DOCTYPE html><html><head><title>Código QR - ${nombre}</title><style>
                body { font-family: Arial, sans-serif; text-align: center; padding-top: 40px; margin: 0; background: white; }
                .qr-print-container { max-width: 300px; margin: 0 auto; padding: 25px; border: 2px solid #333; border-radius: 10px; }
                h1 { color: #333; margin-bottom: 8px; font-size: 20px; font-weight: bold; }
                .site-id { color: #666; font-size: 14px; margin-bottom: 20px; font-weight: bold; }
                .qr-image { border: 2px solid #ddd; border-radius: 8px; margin: 15px 0; max-width: 100px; }
                .instructions { font-size: 12px; color: #444; margin-top: 20px; line-height: 1.5; border-top: 1px solid #eee; padding-top: 15px; }
                .footer { margin-top: 25px; font-size: 10px; color: #888; }
            </style></head><body>
                <div class="qr-print-container">
                    <h1>${nombre}</h1><div class="site-id">ID: ${id}</div>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${id}&format=png&ecc=M" alt="Código QR" class="qr-image">
                    <div class="instructions">
                        <strong>Instrucciones:</strong><br>
                        1. Escanea este código QR con la aplicación móvil<br>
                        2. Confirma tu ubicación en el punto de control<br>
                        3. El registro se guardará automáticamente
                    </div>
                    <div class="footer">Sistema de Control de Rondas - ${new Date().toLocaleDateString('es-AR')}</div>
                </div>
            </body></html>`;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 1000);
    },

    downloadQR(nombre, id) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${id}&format=png&ecc=M`;
        const link = document.createElement('a');
        link.href = qrUrl;
        link.download = `QR_${nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    printSelected() {
        const selectedCheckboxes = document.querySelectorAll('.site-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            Utils.showToast('No has seleccionado ningún sitio para imprimir.', 'warning');
            return;
        }
        const chunkSize = 6;
        const pagesHTML = [];
        const selectedArray = Array.from(selectedCheckboxes);
        for (let i = 0; i < selectedArray.length; i += chunkSize) {
            const chunk = selectedArray.slice(i, i + chunkSize);
            let qrItemsHTML = '';
            chunk.forEach(checkbox => {
                const id = checkbox.value;
                const nombre = checkbox.dataset.nombre;
                qrItemsHTML += `
                    <div class="qr-print-item">
                        <h1>${nombre}</h1>
                        <div class="site-id">ID: ${id}</div>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${id}&format=png&ecc=M" class="qr-image">
                        <div class="instructions">
                            <strong>Instrucciones:</strong><br>
                            1. Escanea este código QR con la app móvil<br>
                            2. El registro se guardará automáticamente
                        </div>
                    </div>`;
            });
            pagesHTML.push(`<div class="print-page">${qrItemsHTML}</div>`);
        }
        const printContent = `
            <!DOCTYPE html><html><head><title>Códigos QR de Sitios</title><style>
                @page { size: A4; margin: 15mm; }
                body { font-family: Arial, sans-serif; margin: 0; }
                .print-page { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr 1fr; gap: 15mm; height: calc(297mm - 30mm); width: calc(210mm - 30mm); page-break-after: always; }
                .qr-print-item { text-align: center; border: 2px solid #333; border-radius: 10px; padding: 8mm 5mm; display: flex; flex-direction: column; justify-content: space-between; }
                h1 { font-size: 12pt; font-weight: bold; margin: 0 0 5px 0; height: 35pt; display: flex; align-items: center; justify-content: center; }
                .site-id { font-size: 9pt; margin-bottom: 5px; }
                .qr-image { max-width: 90px; margin: 0 auto; }
                .instructions { font-size: 7pt; text-align: left; margin-top: 5px; border-top: 1px solid #ccc; padding-top: 5px; }
            </style></head><body>
                ${pagesHTML.join('')}
            </body></html>`;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 1000);
    }
};

// ====== RECORDS MODULE ======
const Records = {
    async load() {
        try {
            const records = await API.getRecords({ limit: 50 });
            this.displayRecords(records);
            await this.loadFilterOptions();
        } catch (error) {
            console.error('Error cargando registros:', error);
            Utils.showToast('Error al cargar los registros', 'error');
        }
    },

    displayRecords(records) {
        const tbody = document.getElementById('registrosTable');
        if (!tbody) return;
        
        if (!records || records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay registros disponibles</td></tr>';
            return;
        }

        const html = records.map(record => `
            <tr>
                <td>
                    <strong>${record.usuario_nombre}</strong>
                </td>
                <td>
                    <span class="badge bg-secondary">${record.sitio_nombre}</span>
                </td>
                <td>
                    <small>${record.fecha}</small>
                </td>
                <td class="text-center">
                    ${record.latitud && record.longitud ? 
                        `<a href="https://maps.google.com/?q=${record.latitud},${record.longitud}" 
                           target="_blank" class="btn btn-sm btn-outline-info" title="Ver ubicación">
                            <i class="fas fa-map-marker-alt"></i>
                        </a>` : 
                        '<span class="text-muted">-</span>'
                    }
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    },

    async loadFilterOptions() {
        try {
            // Cargar usuarios para filtro
            const users = await API.getUsers();
            const userSelect = document.getElementById('filterUsuario');
            if (userSelect) {
                userSelect.innerHTML = '<option value="">Todos los usuarios</option>' +
                    users.map(user => `<option value="${user.id}">${user.nombre}</option>`).join('');
            }

            // Cargar sitios para filtro
            const sites = await API.getSites();
            const siteSelect = document.getElementById('filterSitio');
            if (siteSelect) {
                siteSelect.innerHTML = '<option value="">Todos los sitios</option>' +
                    sites.map(site => `<option value="${site.id}">${site.lugar}</option>`).join('');
            }

        } catch (error) {
            console.error('Error cargando opciones de filtro:', error);
        }
    },

    async filter() {
        const fechaDesde = document.getElementById('fechaDesde');
        const fechaHasta = document.getElementById('fechaHasta');
        const filterUsuario = document.getElementById('filterUsuario');
        const filterSitio = document.getElementById('filterSitio');
        
        const params = {
            limit: 100
        };
        
        if (fechaDesde && fechaDesde.value) params.fecha_desde = fechaDesde.value;
        if (fechaHasta && fechaHasta.value) params.fecha_hasta = fechaHasta.value;
        if (filterUsuario && filterUsuario.value) params.usuario_id = filterUsuario.value;
        if (filterSitio && filterSitio.value) params.sitio_id = filterSitio.value;

        Utils.showLoading(true);

        try {
            const records = await API.getRecords(params);
            this.displayRecords(records);
            Utils.showToast('Registros filtrados correctamente', 'success');
        } catch (error) {
            console.error('Error filtrando registros:', error);
            Utils.showToast('Error al filtrar los registros', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }
};

// ====== USERS MODULE ======
const Users = {
    async load() {
        try {
            const users = await API.getUsers();
            this.displayUsers(users);
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            Utils.showToast('Error al cargar los usuarios', 'error');
        }
    },

    displayUsers(users) {
        const tbody = document.getElementById('usuariosTable');
        if (!tbody) return;
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay usuarios registrados</td></tr>';
            return;
        }

        const html = users.map(user => `
            <tr>
                <td><strong>${user.nombre}</strong></td>
                <td><small class="text-muted">${user.email}</small></td>
                <td>
                    <span class="badge ${user.rol === 'administrador' ? 'bg-primary' : 'bg-secondary'}">
                        <i class="fas ${user.rol === 'administrador' ? 'fa-user-shield' : 'fa-user'} me-1"></i>
                        ${user.rol}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary" onclick="Users.openResetPasswordModal(${user.id}, '${user.nombre.replace(/'/g, "\\'")}')" title="Restablecer Contraseña">
                        <i class="fas fa-key"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Se modifica el encabezado de la tabla para añadir la nueva columna
        const thead = tbody.previousElementSibling;
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Acciones</th>
                </tr>
            `;
        }

        tbody.innerHTML = html;
    },

    async create() {
        const nombreInput = document.getElementById('nuevoUsuarioNombre');
        const emailInput = document.getElementById('nuevoUsuarioEmail');
        const passwordInput = document.getElementById('nuevoUsuarioPassword');
        const rolSelect = document.getElementById('nuevoUsuarioRol');
        
        if (!nombreInput || !emailInput || !passwordInput || !rolSelect) return;
        
        const nombre = nombreInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const rol = rolSelect.value;

        // Validaciones
        if (!nombre || !email || !password) {
            Utils.showToast('Por favor, completa todos los campos obligatorios', 'warning');
            return;
        }

        if (!Utils.isValidEmail(email)) {
            Utils.showToast('Por favor, ingresa un email válido', 'warning');
            return;
        }

        if (password.length < 6) {
            Utils.showToast('La contraseña debe tener al menos 6 caracteres', 'warning');
            return;
        }

        Utils.showLoading(true);

        try {
            await API.createUser({ nombre, email, password, rol });
            
            // Limpiar formulario
            nombreInput.value = '';
            emailInput.value = '';
            passwordInput.value = '';
            rolSelect.value = 'usuario';
            
            await this.load();
            Utils.showToast('Usuario creado correctamente', 'success');
        } catch (error) {
            console.error('Error creando usuario:', error);
            Utils.showToast('Error al crear el usuario: ' + error.message, 'error');
        } finally {
            Utils.showLoading(false);
        }
    },

    openResetPasswordModal(id, name) {
        const modalElement = document.getElementById('resetPasswordModal');
        const userNameElement = document.getElementById('resetPasswordUserName');
        const passInput = document.getElementById('newUserPassword');
        const confirmPassInput = document.getElementById('confirmNewUserPassword');
        
        if (!modalElement || !userNameElement || !passInput || !confirmPassInput) return;

        modalElement.dataset.userId = id;
        userNameElement.textContent = name;
        passInput.value = '';
        confirmPassInput.value = '';
        
        const bsModal = new bootstrap.Modal(modalElement);
        bsModal.show();
    },

    async handleResetPassword() {
        const modalElement = document.getElementById('resetPasswordModal');
        const passInput = document.getElementById('newUserPassword');
        const confirmPassInput = document.getElementById('confirmNewUserPassword');

        if (!modalElement || !passInput || !confirmPassInput) return;

        const id = modalElement.dataset.userId;
        const newPassword = passInput.value;
        const confirmPassword = confirmPassInput.value;

        // Validaciones
        if (!newPassword || newPassword.length < 6) {
            Utils.showToast('La nueva contraseña debe tener al menos 6 caracteres.', 'warning');
            return;
        }
        if (newPassword !== confirmPassword) {
            Utils.showToast('Las contraseñas no coinciden.', 'warning');
            return;
        }

        Utils.showLoading(true);
        try {
            await API.resetUserPassword(id, newPassword);
            Utils.showToast('Contraseña actualizada correctamente.', 'success');
            
            const bsModal = bootstrap.Modal.getInstance(modalElement);
            bsModal.hide();

        } catch (error) {
            console.error('Error actualizando contraseña:', error);
            Utils.showToast('Error al actualizar la contraseña.', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }
};

// ====== RONDA REPORT MODULE ======
const RondaReport = {
    async load() {
        const container = document.getElementById('rondaReportContainer');
        const header = document.getElementById('rondaHeader');
        if (!container || !header) return;

        container.innerHTML = `<div class="text-center p-4"><div class="spinner-border text-primary"></div></div>`;
        header.textContent = 'Cargando información de la ronda...';

        try {
            const data = await API.getRondaStatus();
            this.displayReport(data);
        } catch (error) {
            console.error('Error cargando reporte de ronda:', error);
            Utils.showToast('Error al cargar el reporte', 'error');
            container.innerHTML = `<p class="text-center text-danger">No se pudo cargar el reporte.</p>`;
        }
    },

    displayReport(data) {
        const container = document.getElementById('rondaReportContainer');
        const header = document.getElementById('rondaHeader');

        const { horaInicio, horaFin } = data.ronda.config;
        header.textContent = `Reporte para la ronda de ${horaInicio} a ${horaFin}`;
        
        if (!data.sitios || data.sitios.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay sitios configurados para reportar.</p>';
            return;
        }

        const html = data.sitios.map(sitio => {
            const isOk = sitio.status === 'ok';
            const statusClass = isOk ? 'status-ok' : 'status-missed';
            const iconClass = isOk ? 'fa-check-circle' : 'fa-times-circle';

            // --- ¡CAMBIO AQUÍ! ---
            const timeText = sitio.ultimoRegistro || 'Sin registro';

            return `
                <div class="ronda-item ${statusClass}">
                    <div class="ronda-icon">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="ronda-lugar">
                        <strong>${sitio.lugar}</strong>
                    </div>
                    <div class="ronda-tiempo">
                        ${timeText}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }
};

// ====== NAVIGATION MODULE ======
const Navigation = {
    init() {
        // Manejar cambios de tabs
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', this.handleTabChange.bind(this));
        });
    },

    handleTabChange(event) {
        const targetId = event.target.getAttribute('href').substring(1);
        
        // Cargar datos según la pestaña
        switch(targetId) {
            case 'dashboard':
                Dashboard.load();
                break;
            case 'sitios':
                Sites.load();
                break;
            case 'registros':
                Records.load();
                break;
            case 'usuarios':
                Users.load();
                break;
            case 'reporteRonda':
                RondaReport.load();
                break;
        }
    }
};

// ====== EVENT HANDLERS ======
const AppEventHandlers = {
    init() {
        this.setupFormHandlers();
        this.setDefaultDates();
        this.setupKeyboardShortcuts();
    },

    setupFormHandlers() {
        // Enter key en campos de texto
        const nuevoSitioInput = document.getElementById('nuevoSitio');
        if (nuevoSitioInput) {
            nuevoSitioInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') Sites.create();
            });
        }
    },

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const fechaDesde = document.getElementById('fechaDesde');
        const fechaHasta = document.getElementById('fechaHasta');
        
        if (fechaDesde) fechaDesde.value = weekAgo;
        if (fechaHasta) fechaHasta.value = today;
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Solo procesar shortcuts si no estamos en un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            switch(e.key) {
                case 'Escape':
                    Utils.showLoading(false);
                    break;
                    
                case 'r':
                case 'R':
                    if (isCtrlOrCmd) {
                        e.preventDefault();
                        this.refreshCurrentTab();
                    }
                    break;
            }
        });
    },

    refreshCurrentTab() {
        const activeTab = document.querySelector('.nav-link.active');
        const activeTabId = activeTab ? activeTab.getAttribute('href').substring(1) : null;
        
        switch(activeTabId) {
            case 'dashboard':
                Dashboard.load();
                break;
            case 'sitios':
                Sites.load();
                break;
            case 'registros':
                Records.load();
                break;
            case 'usuarios':
                Users.load();
                break;
        }
        
        Utils.showToast('Datos actualizados', 'info');
    }
};

// ====== GLOBAL FUNCTIONS ======
window.crearSitio = () => Sites.create();
window.crearUsuario = () => Users.create();
window.filtrarRegistros = () => Records.filter();
window.loadDashboard = () => Dashboard.load();
window.logout = () => Auth.logout();
window.imprimirSeleccionados = () => Sites.printSelected();

// Exponer módulos para debugging
window.Sites = Sites;
window.Users = Users;
window.Records = Records;
window.Dashboard = Dashboard;
window.RondaReport = RondaReport;

// ====== ERROR HANDLING ======
window.addEventListener('error', (e) => {
    console.error('Error global:', e.error);
    if (!AppState.isLoading) {
        Utils.showToast('Ha ocurrido un error inesperado', 'error');
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rejection no manejada:', e.reason);
    if (!AppState.isLoading) {
        Utils.showToast('Error de conexión. Verifica tu conexión a internet.', 'error');
    }
    e.preventDefault();
});

// ====== INITIALIZATION ======
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando Panel de Control de Rondas v1.0...');
    
    try {
        // Inicializar todos los módulos
        Auth.init();
        Navigation.init();
        AppEventHandlers.init();
        
        console.log('✅ Panel de administración inicializado correctamente');
        
        // Mensaje de bienvenida en desarrollo
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            setTimeout(() => {
                Utils.showToast('Panel de administración cargado', 'success');
                console.log('🔑 Credenciales por defecto: admin@test.com / admin123');
                console.log('⌨️ Atajos: Ctrl+R (refrescar)');
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ Error fatal inicializando aplicación:', error);
        Utils.showToast('Error crítico al inicializar la aplicación', 'error');
    }
});

// ====== CONNECTION MONITOR ======
window.addEventListener('online', () => {
    Utils.showToast('Conexión restaurada', 'success');
    if (AppState.token) {
        Dashboard.load();
    }
});

window.addEventListener('offline', () => {
    Utils.showToast('Sin conexión a internet', 'warning');
});

// ====== AUTO REFRESH ======
let autoRefreshInterval = null;

function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(() => {
        // Solo refrescar si la página está visible y hay usuario logueado
        if (document.visibilityState === 'visible' && AppState.token && !AppState.isLoading) {
            try {
                const activeTab = document.querySelector('.nav-link.active');
                const activeTabId = activeTab ? activeTab.getAttribute('href').substring(1) : null;
                
                // Solo refrescar dashboard automáticamente
                if (activeTabId === 'dashboard') {
                    Dashboard.load();
                }
            } catch (error) {
                console.error('Error en auto-refresh:', error);
            }
        }
    }, 60000); // Cada minuto
}

// Iniciar auto-refresh
startAutoRefresh();

// ====== DATA EXPORT UTILITIES ======
const DataExport = {
    async exportRecords() {
        try {
            Utils.showLoading(true);
            const records = await API.getRecords({ limit: 1000 });
            
            const exportData = records.map(record => ({
                'Usuario': record.usuario_nombre,
                'Sitio': record.sitio_nombre,
                'Fecha': Utils.formatDate(record.fecha),
                'Latitud': record.latitud || '',
                'Longitud': record.longitud || ''
            }));
            
            this.downloadCSV(exportData, 'registros_rondas.csv');
            Utils.showToast('Registros exportados correctamente', 'success');
        } catch (error) {
            console.error('Error exportando registros:', error);
            Utils.showToast('Error al exportar registros', 'error');
        } finally {
            Utils.showLoading(false);
        }
    },

    async exportSites() {
        try {
            const sites = await API.getSites();
            
            const exportData = sites.map(site => ({
                'ID': site.id,
                'Nombre': site.lugar,
                'QR_Data': site.qr_data || site.id
            }));
            
            this.downloadCSV(exportData, 'sitios.csv');
            Utils.showToast('Sitios exportados correctamente', 'success');
        } catch (error) {
            console.error('Error exportando sitios:', error);
            Utils.showToast('Error al exportar sitios', 'error');
        }
    },

    downloadCSV(data, filename) {
        if (!data || data.length === 0) {
            Utils.showToast('No hay datos para exportar', 'warning');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }
};

// Exponer utilidades de exportación
window.DataExport = DataExport;

// ====== RESPONSIVE BEHAVIOR ======
window.addEventListener('resize', Utils.debounce(() => {
    if (window.innerWidth < 768) {
        document.body.classList.add('mobile-view');
    } else {
        document.body.classList.remove('mobile-view');
    }
}, 250));

// ====== CONFIGURACIÓN FINAL ======
console.log('📱 Panel de Control de Rondas v1.0');
console.log('🔧 Configuración API:', CONFIG.API_URL);
console.log('📚 Módulos cargados: Auth, Dashboard, Sites, Records, Users, Navigation');
console.log('🎯 Listo para usar');

// ====== HEALTH CHECK ======
async function checkAPIHealth() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/health`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Verificar salud de la API cada 5 minutos
setInterval(async () => {
    if (AppState.token) {
        const isHealthy = await checkAPIHealth();
        if (!isHealthy) {
            console.warn('⚠️ API no responde correctamente');
        }
    }
}, 300000);

// ====== PWA SUPPORT (FUTURO) ======
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Aquí se podría registrar un service worker para PWA
        // navigator.serviceWorker.register('/sw.js');
    });
}
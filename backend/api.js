// ====== api.js ======
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const { connectDB } = require('./db');

const router = express.Router();

// ==================================================================
// --- INICIO: NUEVO BLOQUE DE CACHÉ DE CONFIGURACIÓN ---
// ==================================================================
let appConfig = {}; // Objeto para guardar la configuración en memoria

// Función para cargar/recargar la configuración desde la DB
async function loadConfig() {
    try {
        console.log('🔄️ Cargando configuración...');
        const pool = await connectDB();
        const result = await pool.request().query('SELECT clave, valor FROM config');
        
        // Convertimos el resultado de la DB en un objeto fácil de usar
        appConfig = result.recordset.reduce((acc, item) => {
            acc[item.clave] = item.valor;
            return acc;
        }, {});
        
        console.log('✅ Configuración cargada:', appConfig);
    } catch (error) {
        console.error('❌ Error fatal al cargar la configuración:', error);
        // Si no podemos cargar la config, es un error crítico
        process.exit(1);
    }
}

// Carga inicial de la configuración al arrancar el servidor
loadConfig();
// ==================================================================
// --- FIN: NUEVO BLOQUE DE CACHÉ DE CONFIGURACIÓN ---
// ==================================================================


// Middleware de autenticación (sin cambios)
function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token invalido' });
    }
}

// ===== RUTAS =====

// LOGIN (sin cambios)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = await connectDB();
        
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM usuarios WHERE email = @email');
            
        const user = result.recordset[0];
        if (!user || !await bcrypt.compare(password, user.password_hash)) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }
        
        const token = jwt.sign(
            { userId: user.id, email: user.email, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            token,
            user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// REGISTRAR ESCANEO (sin cambios)
router.post('/scans', auth, async (req, res) => {
    try {
        const { id_sitio, fecha, latitud, longitud } = req.body;
        const pool = await connectDB();

        const fechaSql = fecha ? '@fechaParam' : 'GETDATE()';
        const queryText = `INSERT INTO registros (id_sitio, id_usuario, fecha, latitud, longitud) 
                           VALUES (@id_sitio, @id_usuario, ${fechaSql}, @latitud, @longitud)`;

        const request = pool.request();
        
        request.input('id_sitio', sql.Int, id_sitio);
        request.input('id_usuario', sql.Int, req.user.userId);
        request.input('latitud', sql.Decimal(10, 8), latitud);
        request.input('longitud', sql.Decimal(11, 8), longitud);
        
        // --- ¡CAMBIO CLAVE Y DEFINITIVO AQUÍ! ---
        // Pasamos la fecha como un texto (VarChar) para evitar que el driver la convierta a UTC.
        if (fecha) {
            request.input('fechaParam', sql.VarChar, fecha);
        }

        await request.query(queryText);
        
        res.status(201).json({ success: true, message: 'Escaneo registrado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// VER SITIOS (sin cambios)
router.get('/sites', auth, async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request()
            // Cambiamos el orden para que sea por 'id'
            .query('SELECT id, lugar FROM sitios ORDER BY id'); 
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREAR SITIO (sin cambios)
router.post('/sites', auth, async (req, res) => {
    try {
        if (req.user.rol !== 'administrador') {
            return res.status(403).json({ error: 'Acceso denegado. Solo para administradores.' });
        }
        
        const { lugar } = req.body;
        const pool = await connectDB();
        const result = await pool.request()
            .input('lugar', sql.NVarChar, lugar)
            .query('INSERT INTO sitios (lugar) OUTPUT INSERTED.id, INSERTED.lugar VALUES (@lugar)');
        
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// EDITAR/ACTUALIZAR SITIO (solo admin)
router.put('/sites/:id', auth, async (req, res) => {
    try {
        if (req.user.rol !== 'administrador') {
            return res.status(403).json({ error: 'Acceso denegado.' });
        }
        
        const { id } = req.params; // Obtenemos el ID de la URL
        const { lugar } = req.body; // Obtenemos el nuevo nombre del cuerpo de la petición

        if (!lugar) {
            return res.status(400).json({ error: 'El nombre del sitio no puede estar vacío.' });
        }

        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('lugar', sql.NVarChar, lugar)
            .query('UPDATE sitios SET lugar = @lugar WHERE id = @id');
        
        res.json({ success: true, message: 'Sitio actualizado correctamente.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/sites/:id', auth, async (req, res) => {
    try {
        if (req.user.rol !== 'administrador') {
            return res.status(403).json({ error: 'Acceso denegado.' });
        }
        
        const { id } = req.params;
        const pool = await connectDB();

        // Paso 1: Verificar si existen registros asociados a este sitio
        const checkResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT COUNT(*) as recordCount FROM registros WHERE id_sitio = @id');

        if (checkResult.recordset[0].recordCount > 0) {
            // Si hay registros, devolvemos un error de conflicto (409)
            return res.status(409).json({ error: 'No se puede eliminar el sitio porque tiene registros de rondas asociados.' });
        }

        // Paso 2: Si no hay registros, proceder con la eliminación
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM sitios WHERE id = @id');
        
        res.json({ success: true, message: 'Sitio eliminado correctamente.' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// VER REGISTROS (sin cambios)
router.get('/records', auth, async (req, res) => {
    try {
        // Se añaden usuario_id y sitio_id para recibirlos del frontend
        const { fecha_desde, fecha_hasta, limit = 100, usuario_id, sitio_id } = req.query;
        const pool = await connectDB();
        
        let query = `
            SELECT TOP ${parseInt(limit)} 
                r.id, 
                CONVERT(varchar, r.fecha, 103) + ', ' + CONVERT(varchar, r.fecha, 108) as fecha,
                r.latitud, 
                r.longitud,
                u.nombre as usuario_nombre, 
                s.lugar as sitio_nombre
            FROM registros r
            JOIN usuarios u ON r.id_usuario = u.id
            JOIN sitios s ON r.id_sitio = s.id
            WHERE 1=1
        `;
        
        const request = pool.request();
        
        // --- INICIO DE CORRECCIONES Y AJUSTES ---

        if (fecha_desde) {
            query += ' AND r.fecha >= @fecha_desde';
            // Se pasa la fecha como texto (VarChar) para evitar errores de zona horaria
            request.input('fecha_desde', sql.VarChar, fecha_desde);
        }
        
        if (fecha_hasta) {
            // Se ajusta la fecha 'hasta' para que incluya el día completo (hasta las 23:59:59)
            const fechaHastaCompleta = `${fecha_hasta} 23:59:59`;
            
            query += ' AND r.fecha <= @fecha_hasta';
            // Se pasa como texto (VarChar) para evitar errores de zona horaria
            request.input('fecha_hasta', sql.VarChar, fechaHastaCompleta);
        }

        // Se añade la lógica para el filtro de usuario
        if (usuario_id) {
            query += ' AND r.id_usuario = @usuario_id';
            request.input('usuario_id', sql.Int, usuario_id);
        }

        // Se añade la lógica para el filtro de sitio
        if (sitio_id) {
            query += ' AND r.id_sitio = @sitio_id';
            request.input('sitio_id', sql.Int, sitio_id);
        }
        
        // --- FIN DE CORRECCIONES Y AJUSTES ---
        
        query += ' ORDER BY r.fecha DESC';
        
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ESTADISTICAS (sin cambios)
router.get('/stats', auth, async (req, res) => {
    try {
        const pool = await connectDB();
        const sitios = await pool.request().query('SELECT COUNT(*) as total FROM sitios');
        const registrosHoy = await pool.request().query(`
            SELECT COUNT(*) as total FROM registros 
            WHERE CAST(fecha AS DATE) = CAST(GETDATE() AS DATE)
        `);
        
        res.json({
            totalSitios: sitios.recordset[0].total,
            registrosHoy: registrosHoy.recordset[0].total
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// VER USUARIOS (sin cambios)
router.get('/users', auth, async (req, res) => {
    try {
        if (req.user.rol !== 'administrador') {
            return res.status(403).json({ error: 'Acceso denegado. Solo para administradores.' });
        }
        const pool = await connectDB();
        const result = await pool.request()
            .query('SELECT id, nombre, email, rol FROM usuarios ORDER BY nombre');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREAR USUARIO (sin cambios)
router.post('/users', auth, async (req, res) => {
    try {
        if (req.user.rol !== 'administrador') {
            return res.status(403).json({ error: 'Acceso denegado. Solo para administradores.' });
        }
        
        const { nombre, email, password, rol = 'usuario' } = req.body;
        const hash = await bcrypt.hash(password, 10);
        const pool = await connectDB();
        
        await pool.request()
            .input('nombre', sql.NVarChar, nombre)
            .input('email', sql.NVarChar, email)
            .input('password_hash', sql.NVarChar, hash)
            .input('rol', sql.NVarChar, rol)
            .query('INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (@nombre, @email, @password_hash, @rol)');
        
        res.status(201).json({ success: true, message: 'Usuario creado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// RESTABLECER/CAMBIAR CONTRASEÑA DE USUARIO (solo admin)
router.put('/users/:id/password', auth, async (req, res) => {
    try {
        if (req.user.rol !== 'administrador') {
            return res.status(403).json({ error: 'Acceso denegado.' });
        }

        const { id } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        // Encriptar la nueva contraseña
        const hash = await bcrypt.hash(password, 10);

        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('password_hash', sql.NVarChar, hash)
            .query('UPDATE usuarios SET password_hash = @password_hash WHERE id = @id');
        
        res.json({ success: true, message: 'Contraseña actualizada correctamente.' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RUTAS DE CONFIGURACIÓN ---

// OBTENER TODA LA CONFIGURACIÓN (sin cambios)
router.get('/config', auth, async (req, res) => {
    if (req.user.rol !== 'administrador') {
        return res.status(403).json({ error: 'Acceso denegado.' });
    }
    try {
        const pool = await connectDB();
        const result = await pool.request().query('SELECT clave, valor, descripcion FROM config');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ACTUALIZAR LA CONFIGURACIÓN (MODIFICADO para recargar caché)
router.put('/config', auth, async (req, res) => {
    if (req.user.rol !== 'administrador') {
        return res.status(403).json({ error: 'Acceso denegado.' });
    }
    try {
        const settings = req.body;
        const pool = await connectDB();
        const transaction = new sql.Transaction(pool);
        
        await transaction.begin();
        try {
            for (const setting of settings) {
                const request = new sql.Request(transaction);
                await request
                    .input('clave', sql.NVarChar, setting.clave)
                    .input('valor', sql.NVarChar, setting.valor)
                    .query('UPDATE config SET valor = @valor WHERE clave = @clave');
            }
            await transaction.commit();

            // ¡MODIFICACIÓN IMPORTANTE!
            await loadConfig(); // Recargamos la caché con los nuevos valores
            
            res.json({ success: true, message: 'Configuración actualizada.' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar la configuración: ' + err.message });
    }
});


// ==================================================================
// --- INICIO: RUTA CORREGIDA PARA REPORTE DE ESTADO DE RONDA ---
// ==================================================================
router.get('/ronda/status', auth, async (req, res) => {
    try {
        const horaInicio = appConfig.HORA_INICIO_RONDA; // ej: "22:00"
        const horaFin = appConfig.HORA_FIN_RONDA;       // ej: "06:00"

        if (!horaInicio || !horaFin) {
            return res.status(500).json({ error: 'La configuración de horas de ronda no está definida.' });
        }

        // --- INICIO DEL CAMBIO IMPORTANTE ---
        // Se reemplaza la lógica de new Date() por construcción de texto simple
        // para evitar problemas de zona horaria.
        
        const ahora = new Date();
        const ayer = new Date();
        ayer.setDate(ahora.getDate() - 1);

        const pad = (num) => num.toString().padStart(2, '0');

        const hoyStr = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
        const ayerStr = `${ayer.getFullYear()}-${pad(ayer.getMonth() + 1)}-${pad(ayer.getDate())}`;

        const fechaInicio = `${ayerStr} ${horaInicio}:00`; // ej: "2025-08-17 22:00:00"
        const fechaFin = `${hoyStr} ${horaFin}:00`;       // ej: "2025-08-18 06:00:00"
        // --- FIN DEL CAMBIO IMPORTANTE ---

        const pool = await connectDB();

        const sitiosResult = await pool.request().query('SELECT id, lugar FROM sitios');
        const todosLosSitios = sitiosResult.recordset;

        const registrosResult = await pool.request()
            .input('fechaInicio', sql.VarChar, fechaInicio) // Se pasa como VarChar
            .input('fechaFin', sql.VarChar, fechaFin)     // Se pasa como VarChar
            .query(`
                SELECT 
                    id_sitio, 
                    CONVERT(varchar, MAX(fecha), 103) + ', ' + CONVERT(varchar, MAX(fecha), 108) as ultimo_registro
                FROM registros
                WHERE fecha BETWEEN @fechaInicio AND @fechaFin
                GROUP BY id_sitio
            `);

        const registrosMap = new Map(registrosResult.recordset.map(r => [r.id_sitio, r.ultimo_registro]));

        const reporteFinal = todosLosSitios.map(sitio => {
            const ultimoRegistro = registrosMap.get(sitio.id);
            return {
                lugar: sitio.lugar,
                status: ultimoRegistro ? 'ok' : 'missed',
                ultimoRegistro: ultimoRegistro || null
            };
        });
        
        res.json({
            ronda: {
                inicia: fechaInicio,
                termina: fechaFin,
                config: { horaInicio, horaFin }
            },
            sitios: reporteFinal
        });

    } catch (err) {
        console.error("Error generando reporte de ronda:", err);
        res.status(500).json({ error: err.message });
    }
});
// ==================================================================
// --- FIN: RUTA CORREGIDA ---
// ==================================================================


module.exports = router;

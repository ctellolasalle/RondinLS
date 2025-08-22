// ====== server.js (REFACTORIZADO) ======
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./db');
const apiRoutes = require('./api');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuración de CORS ---
const allowedOrigins = [
    'http://10.0.10.26:8100',
    'http://localhost:8100',
    'http://10.0.10.26:8080',
    'http://localhost',
    'https://localhost',
    'https://rondin.oemspot.com.ar',
    'https://admrdn.oemspot.com.ar'
];

const corsOptions = {
  origin: function (origin, callback) {
    console.log('Petición recibida del origen:', origin);
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  }
};

// --- Middlewares Globales ---
app.use(cors(corsOptions));
app.use(express.json());

// --- Rutas de la API ---
// Todas las rutas definidas en api.js se registrarán bajo el prefijo /api
app.use('/api', apiRoutes);

// --- Función para iniciar el servidor ---
async function startServer() {
    try {
        // 1. Conectar a la base de datos
        await connectDB();
        
        // 2. Iniciar el servidor de Express
        app.listen(PORT, () => {
            console.log(`🚀 Servidor en puerto ${PORT}`);
            console.log(`🔗 API disponible en http://localhost:${PORT}/api`);
        });

    } catch (error) {
        console.error("❌ No se pudo iniciar el servidor", error);
        process.exit(1);
    }
}

// Iniciar la aplicación
startServer();
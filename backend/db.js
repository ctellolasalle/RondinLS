// ====== db.js ======
const sql = require('mssql');
require('dotenv').config();

// Configuracion DB leída desde el .env
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    instanceName: process.env.DB_INSTANCE || 'SQLEXPRESS'
  }
};

// Variable para mantener la conexión (pool)
let pool;

// Función para conectar y obtener el pool de conexiones
async function connectDB() {
    try {
        if (pool) return pool; // Si ya existe, la retornamos

        pool = await sql.connect(dbConfig);
        console.log('✅ Conectado a SQL Server');
        return pool;
    } catch (err) {
        console.error('❌ Error al conectar con la DB:', err);
        // Si hay un error, terminamos el proceso para evitar un estado inconsistente
        process.exit(1);
    }
}

module.exports = {
    connectDB
};
CREATE DATABASE rondinls;
GO

USE rondinls;
GO

CREATE TABLE usuarios (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    rol NVARCHAR(20) NOT NULL CHECK (rol IN ('administrador', 'usuario'))
);

CREATE TABLE sitios (
    id INT IDENTITY(1,1) PRIMARY KEY,
    lugar NVARCHAR(100) NOT NULL
);

CREATE TABLE registros (
    id INT IDENTITY(1,1) PRIMARY KEY,
    id_sitio INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT GETDATE(),
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    FOREIGN KEY (id_sitio) REFERENCES sitios(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

-- Usuario admin por defecto (password: admin123)
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES 
('Admin', 'admin@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye/Eb4K2.QJ.3ZQJ3rMjQm1.QQB2.x7Dq', 'administrador');

-- Algunos sitios de ejemplo
INSERT INTO sitios (lugar) VALUES
('Garita Warnes'),
('Baño Docente 1er Piso Ing Pri'),
('Direccion 2do Piso Ing Pri'),
('Auxiliares 1er Piso Ing Pri'),
('Oficina IT PB Pri'),
('Puerta 8 Entrada Primaria'),
('Buffet Grande / Comerdor Sec Basico'),
('Enfermería / Vestuarios'),
('Garita Malaver'),
('Porton Basurero Malaver'),
('Porton Campo de Deporte / Patio Sec'),
('Tablero Electrico Laboratorios Informatica'),
('Puerta Kiosco Secundario Sup'),
('Preceptoria 209'),
('Preceptoria 210'),
('Preceptoria 310'),
('Secretaria Terciario / Oficina Lopa'),
('Garita Yrigoyen'),
('Sala de Musica / Gim Grande'),
('Porton Acrilico Jardin de Infantes');


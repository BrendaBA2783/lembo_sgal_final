-- Create database
CREATE DATABASE IF NOT EXISTS agri_management;
USE agri_management;

-- Table: users
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  telefono VARCHAR(15),
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  estado ENUM('activo', 'inactivo') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: sensors
CREATE TABLE IF NOT EXISTS sensores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  id_sensor VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  imagen VARCHAR(255),
  unidad_medida VARCHAR(20) NOT NULL,
  tiempo_escaneo INT NOT NULL COMMENT 'Tiempo en segundos',
  descripcion TEXT,
  estado ENUM('activo', 'inactivo') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: sensor readings
CREATE TABLE IF NOT EXISTS lecturas_sensores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_sensor VARCHAR(50) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  unidad_medida VARCHAR(20) NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_sensor) REFERENCES sensores(id_sensor) ON DELETE CASCADE
);

-- Table: insumos (supplies)
CREATE TABLE IF NOT EXISTS insumos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  id_insumo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  unidad_medida VARCHAR(20) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  valor_unitario DECIMAL(10,2) NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  descripcion TEXT,
  estado ENUM('activo', 'inactivo') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: cultivos (crops)
CREATE TABLE IF NOT EXISTS cultivos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  id_cultivo VARCHAR(50) NOT NULL UNIQUE,
  fotografia VARCHAR(255),
  tamano VARCHAR(50) NOT NULL,
  ubicacion VARCHAR(100) NOT NULL,
  fecha_siembra DATE,
  descripcion TEXT,
  estado ENUM('activo', 'inactivo') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Trigger para generar ID de cultivo automático
DELIMITER //
DROP TRIGGER IF EXISTS before_insert_cultivo//
CREATE TRIGGER before_insert_cultivo
BEFORE INSERT ON cultivos
FOR EACH ROW
BEGIN
    DECLARE next_id INT;
    DECLARE tipo_prefix VARCHAR(3);
    DECLARE attempts INT DEFAULT 0;
    DECLARE id_exists INT;
    
    -- Get prefix based on tipo
    SET tipo_prefix = CASE NEW.tipo
        WHEN 'Hortaliza' THEN 'HOR'
        WHEN 'Fruta' THEN 'FRU'
        WHEN 'Cereal' THEN 'CER'
        WHEN 'Legumbre' THEN 'LEG'
        ELSE 'OTR'
    END;
    
    -- Try to find a unique ID (prevent race conditions)
    id_generation: LOOP
        -- Get the next available number for this tipo
        SELECT COALESCE(MAX(CAST(SUBSTRING(id_cultivo, 5) AS UNSIGNED)), 0) + 1
        INTO next_id
        FROM cultivos
        WHERE id_cultivo LIKE CONCAT(tipo_prefix, '-%');
        
        -- Generate candidate ID
        SET NEW.id_cultivo = CONCAT(tipo_prefix, '-', LPAD(next_id, 4, '0'));
        
        -- Check if this ID already exists
        SELECT COUNT(*)
        INTO id_exists
        FROM cultivos
        WHERE id_cultivo = NEW.id_cultivo;
        
        -- If ID is unique, break the loop
        IF id_exists = 0 THEN
            LEAVE id_generation;
        END IF;
        
        -- Prevent infinite loops
        SET attempts = attempts + 1;
        IF attempts >= 100 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Could not generate unique ID after 100 attempts';
        END IF;
    END LOOP;
END//
DELIMITER ;

-- Table: ciclos_cultivo (crop cycles)
DROP TABLE IF EXISTS ciclos_cultivo;
CREATE TABLE IF NOT EXISTS ciclos_cultivo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_ciclo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL, -- Keep as NOT NULL since it's required
  descripcion TEXT DEFAULT NULL,
  fecha_inicial DATE NOT NULL, -- Keep as NOT NULL since it's required
  fecha_final DATE NOT NULL, -- Keep as NOT NULL since it's required
  novedades TEXT DEFAULT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  id_cultivo VARCHAR(50) NOT NULL, -- Keep as NOT NULL due to foreign key
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_cultivo) REFERENCES cultivos(id_cultivo) ON DELETE CASCADE
);

-- Table: producciones (productions)
CREATE TABLE IF NOT EXISTS producciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_produccion VARCHAR(20) NOT NULL UNIQUE,
  id_responsable INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  id_cultivo VARCHAR(50) NOT NULL,
  id_ciclo_cultivo VARCHAR(50) NOT NULL,
  inversion DECIMAL(10,2) DEFAULT 0,
  meta DECIMAL(10,2) DEFAULT 0,
  fecha_inicio DATE NOT NULL DEFAULT (CURRENT_DATE),
  fecha_fin DATE,
  estado ENUM('activo', 'inactivo', 'borrador') DEFAULT 'borrador',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_responsable) REFERENCES usuarios(id),
  FOREIGN KEY (id_cultivo) REFERENCES cultivos(id_cultivo),
  FOREIGN KEY (id_ciclo_cultivo) REFERENCES ciclos_cultivo(id_ciclo),
  CONSTRAINT check_nombre_produccion CHECK (
    LENGTH(nombre) >= 3 AND 
    LENGTH(nombre) <= 100 AND 
    nombre REGEXP '[A-Za-z]'
  )
);

-- Junction table: cultivo_sensor
CREATE TABLE IF NOT EXISTS cultivo_sensor (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_cultivo VARCHAR(50) NOT NULL,
  id_sensor VARCHAR(50) NOT NULL,
  FOREIGN KEY (id_cultivo) REFERENCES cultivos(id_cultivo) ON DELETE CASCADE,
  FOREIGN KEY (id_sensor) REFERENCES sensores(id_sensor) ON DELETE CASCADE,
  UNIQUE (id_cultivo, id_sensor)
);

-- Junction table: cultivo_insumo
CREATE TABLE IF NOT EXISTS cultivo_insumo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_cultivo VARCHAR(50) NOT NULL,
  id_insumo VARCHAR(50) NOT NULL,
  FOREIGN KEY (id_cultivo) REFERENCES cultivos(id_cultivo) ON DELETE CASCADE,
  FOREIGN KEY (id_insumo) REFERENCES insumos(id_insumo) ON DELETE CASCADE,
  UNIQUE (id_cultivo, id_insumo)
);

-- Junction table: insumo_ciclo
CREATE TABLE IF NOT EXISTS insumo_ciclo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_insumo VARCHAR(50) NOT NULL,
  id_ciclo_cultivo VARCHAR(50) NOT NULL,
  id_cultivo VARCHAR(50) NOT NULL,
  FOREIGN KEY (id_insumo) REFERENCES insumos(id_insumo) ON DELETE CASCADE,
  FOREIGN KEY (id_ciclo_cultivo) REFERENCES ciclos_cultivo(id_ciclo) ON DELETE CASCADE,
  FOREIGN KEY (id_cultivo) REFERENCES cultivos(id_cultivo) ON DELETE CASCADE
);

-- Junction table: produccion_sensor (máximo 3 sensores por producción)
CREATE TABLE IF NOT EXISTS produccion_sensor (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_produccion VARCHAR(20) NOT NULL,
  id_sensor VARCHAR(50) NOT NULL,
  fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_produccion) REFERENCES producciones(id_produccion) ON DELETE CASCADE,
  FOREIGN KEY (id_sensor) REFERENCES sensores(id_sensor) ON DELETE CASCADE
);

-- Trigger para limitar a 3 sensores por producción
DELIMITER //
CREATE TRIGGER before_insert_produccion_sensor
BEFORE INSERT ON produccion_sensor
FOR EACH ROW
BEGIN
  DECLARE sensor_count INT;
  
  SELECT COUNT(*) INTO sensor_count
  FROM produccion_sensor
  WHERE id_produccion = NEW.id_produccion;
  
  IF sensor_count >= 3 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'No se pueden asignar más de 3 sensores por producción';
  END IF;
END//
DELIMITER ;

-- Junction table: produccion_insumo
CREATE TABLE IF NOT EXISTS produccion_insumo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_produccion VARCHAR(20) NOT NULL,
  id_insumo VARCHAR(50) NOT NULL,
  FOREIGN KEY (id_produccion) REFERENCES producciones(id_produccion) ON DELETE CASCADE,
  FOREIGN KEY (id_insumo) REFERENCES insumos(id_insumo) ON DELETE CASCADE
);

-- Table: uso_insumo (insumo usage records)
CREATE TABLE IF NOT EXISTS uso_insumo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_produccion VARCHAR(20) NOT NULL,
  id_insumo VARCHAR(50) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  fecha_uso DATE NOT NULL,
  id_responsable INT NOT NULL,
  valor_unitario DECIMAL(10,2) NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_produccion) REFERENCES producciones(id_produccion) ON DELETE CASCADE,
  FOREIGN KEY (id_insumo) REFERENCES insumos(id_insumo) ON DELETE CASCADE,
  FOREIGN KEY (id_responsable) REFERENCES usuarios(id)
);

-- Insert default admin user
INSERT INTO usuarios (nombre, email, password, role, telefono, estado) 
VALUES 
('Administrador', 'admin@example.com', '$2a$10$XZ.95CKlM1awwJ4vq0yxGOHDCPEHc8x3EYmnKdqH8XlQNSyI4DCVm', 'admin', '3001234567', 'activo');

-- Insertar usuarios adicionales
INSERT INTO usuarios (nombre, email, password, role, telefono, estado) 
VALUES 
('Juan Pérez', 'juan.perez@example.com', '$2a$10$XZ.95CKlM1awwJ4vq0yxGOHDCPEHc8x3EYmnKdqH8XlQNSyI4DCVm', 'user', '3001234568', 'activo'),
('María García', 'maria.garcia@example.com', '$2a$10$XZ.95CKlM1awwJ4vq0yxGOHDCPEHc8x3EYmnKdqH8XlQNSyI4DCVm', 'user', '3001234569', 'activo'),
('Carlos López', 'carlos.lopez@example.com', '$2a$10$XZ.95CKlM1awwJ4vq0yxGOHDCPEHc8x3EYmnKdqH8XlQNSyI4DCVm', 'user', NULL, 'activo'),
('Ana Martínez', 'ana.martinez@example.com', '$2a$10$XZ.95CKlM1awwJ4vq0yxGOHDCPEHc8x3EYmnKdqH8XlQNSyI4DCVm', 'user', NULL, 'activo'),
('Pedro Sánchez', 'pedro.sanchez@example.com', '$2a$10$XZ.95CKlM1awwJ4vq0yxGOHDCPEHc8x3EYmnKdqH8XlQNSyI4DCVm', 'user', NULL, 'activo'),
('Laura Rodríguez', 'laura.rodriguez@example.com', '$2a$10$XZ.95CKlM1awwJ4vq0yxGOHDCPEHc8x3EYmnKdqH8XlQNSyI4DCVm', 'user', NULL, 'activo'),
('Miguel Fernández', 'miguel.fernandez@example.com', '$2a$10$XZ.95CKlM1awwJ4vq0yxGOHDCPEHc8x3EYmnKdqH8XlQNSyI4DCVm', 'user', NULL, 'activo'),
('Sofía González', 'sofia.gonzalez@example.com', '$2a$10$XZ.95CKlM1awwJ4vq0yxGOHDCPEHc8x3EYmnKdqH8XlQNSyI4DCVm', 'user', NULL, 'activo'),
('David Ruiz', 'david.ruiz@example.com', '$2a$10$XZ.95CKlM1awwJ4vq0yxGOHDCPEHc8x3EYmnKdqH8XlQNSyI4DCVm', 'user', NULL, 'activo'),
('Elena Díaz', 'elena.diaz@example.com', '$2a$10$XZ.95CKlM1awwJ4vq0yxGOHDCPEHc8x3EYmnKdqH8XlQNSyI4DCVm', 'user', NULL, 'activo');

-- Common sensor types for agricultural applications
INSERT INTO sensores (tipo, id_sensor, nombre, unidad_medida, tiempo_escaneo, descripcion, estado)
VALUES 
('Temperatura', 'TEMP-001', 'Sensor de Temperatura Ambiente', '°C', 300, 'Mide la temperatura ambiente del entorno de cultivo', 'activo'),
('Humedad', 'HUM-001', 'Sensor de Humedad de Suelo', '%', 300, 'Mide el porcentaje de humedad en el suelo', 'activo'),
('pH', 'PH-001', 'Sensor de pH del Suelo', 'pH', 1800, 'Mide el nivel de acidez/alcalinidad del suelo', 'activo');

-- Insertar más tipos de sensores para aplicaciones agrícolas
INSERT INTO sensores (tipo, id_sensor, nombre, unidad_medida, tiempo_escaneo, descripcion, estado)
VALUES 
('Luz', 'LUX-001', 'Sensor de Intensidad Lumínica', 'lux', 300, 'Mide la intensidad de la luz solar', 'activo'),
('CO2', 'CO2-001', 'Sensor de Dióxido de Carbono', 'ppm', 600, 'Mide la concentración de CO2 en el ambiente', 'activo'),
('Conductividad', 'EC-001', 'Sensor de Conductividad Eléctrica', 'mS/cm', 300, 'Mide la conductividad eléctrica del suelo', 'activo'),
('Viento', 'WIND-001', 'Sensor de Velocidad del Viento', 'm/s', 300, 'Mide la velocidad del viento', 'activo'),
('Lluvia', 'RAIN-001', 'Sensor de Precipitación', 'mm', 300, 'Mide la cantidad de lluvia', 'activo'),
('Presión', 'PRESS-001', 'Sensor de Presión Atmosférica', 'hPa', 600, 'Mide la presión atmosférica', 'activo'),
('Oxígeno', 'O2-001', 'Sensor de Oxígeno Disuelto', 'mg/L', 300, 'Mide el oxígeno disuelto en agua', 'activo'),
('Nitrógeno', 'N-001', 'Sensor de Nitrógeno en Suelo', 'mg/kg', 1800, 'Mide el contenido de nitrógeno en el suelo', 'activo'),
('Fósforo', 'P-001', 'Sensor de Fósforo en Suelo', 'mg/kg', 1800, 'Mide el contenido de fósforo en el suelo', 'activo'),
('Potasio', 'K-001', 'Sensor de Potasio en Suelo', 'mg/kg', 1800, 'Mide el contenido de potasio en el suelo', 'activo');

-- Insertar datos de ejemplo para cultivos
INSERT INTO cultivos (tipo, nombre, tamano, ubicacion, fecha_siembra, descripcion)
VALUES 
('Hortaliza', 'Tomate Cherry', '100m²', 'Invernadero Norte', '2024-03-15', 'Cultivo de tomate cherry en sistema hidropónico'),
('Hortaliza', 'Lechuga Romana', '50m²', 'Invernadero Sur', '2024-03-20', 'Cultivo de lechuga en sistema NFT'),
('Hortaliza', 'Pepino', '80m²', 'Invernadero Este', '2024-03-18', 'Cultivo de pepino en sistema vertical'),
('Hortaliza', 'Pimiento', '60m²', 'Invernadero Oeste', '2024-03-22', 'Cultivo de pimiento en sustrato'),
('Hortaliza', 'Zanahoria', '40m²', 'Campo Abierto 1', '2024-03-25', 'Cultivo de zanahoria orgánica'),
('Hortaliza', 'Espinaca', '30m²', 'Túnel 2', '2024-03-28', 'Cultivo de espinaca en sistema NFT'),
('Fruta', 'Melón', '120m²', 'Campo Abierto 2', '2024-03-30', 'Cultivo de melón en suelo'),
('Fruta', 'Sandía', '150m²', 'Campo Abierto 3', '2024-04-01', 'Cultivo de sandía en suelo'),
('Hortaliza', 'Brócoli', '45m²', 'Invernadero Central', '2024-04-05', 'Cultivo de brócoli en sustrato'),
('Hortaliza', 'Coliflor', '50m²', 'Invernadero Central', '2024-04-08', 'Cultivo de coliflor en sustrato');

-- Insertar datos de ejemplo para insumos
INSERT INTO insumos (tipo, id_insumo, nombre, unidad_medida, cantidad, valor_unitario, valor_total, descripcion)
VALUES 
('Fertilizante', 'FERT-001', 'NPK 15-15-15', 'kg', 100, 25.50, 2550.00, 'Fertilizante balanceado'),
('Fertilizante', 'FERT-002', 'NPK 20-20-20', 'kg', 80, 28.75, 2300.00, 'Fertilizante para crecimiento'),
('Fertilizante', 'FERT-003', 'Nitrato de Potasio', 'kg', 60, 32.50, 1950.00, 'Fertilizante para floración'),
('Pesticida', 'PEST-001', 'Insecticida Orgánico', 'L', 50, 35.75, 1787.50, 'Insecticida para control de plagas'),
('Pesticida', 'PEST-002', 'Fungicida Sistémico', 'L', 40, 42.25, 1690.00, 'Control de hongos'),
('Pesticida', 'PEST-003', 'Acaricida', 'L', 30, 38.50, 1155.00, 'Control de ácaros'),
('Sustrato', 'SUST-001', 'Fibra de Coco', 'm³', 20, 120.00, 2400.00, 'Sustrato para cultivo hidropónico'),
('Sustrato', 'SUST-002', 'Perlita', 'm³', 25, 95.00, 2375.00, 'Sustrato para hidroponía'),
('Sustrato', 'SUST-003', 'Vermiculita', 'm³', 20, 110.00, 2200.00, 'Sustrato para semilleros');

-- Insertar datos de ejemplo para ciclos de cultivo
DELIMITER //
CREATE PROCEDURE InsertCiclos()
BEGIN
    DECLARE tom_id, lec_id, pep_id, pim_id, zan_id, esp_id, mel_id, san_id, bro_id, col_id VARCHAR(50);
    
    -- Get the generated IDs
    SELECT id_cultivo INTO tom_id FROM cultivos WHERE nombre = 'Tomate Cherry' LIMIT 1;
    SELECT id_cultivo INTO lec_id FROM cultivos WHERE nombre = 'Lechuga Romana' LIMIT 1;
    SELECT id_cultivo INTO pep_id FROM cultivos WHERE nombre = 'Pepino' LIMIT 1;
    SELECT id_cultivo INTO pim_id FROM cultivos WHERE nombre = 'Pimiento' LIMIT 1;
    SELECT id_cultivo INTO zan_id FROM cultivos WHERE nombre = 'Zanahoria' LIMIT 1;
    SELECT id_cultivo INTO esp_id FROM cultivos WHERE nombre = 'Espinaca' LIMIT 1;
    SELECT id_cultivo INTO mel_id FROM cultivos WHERE nombre = 'Melón' LIMIT 1;
    SELECT id_cultivo INTO san_id FROM cultivos WHERE nombre = 'Sandía' LIMIT 1;
    SELECT id_cultivo INTO bro_id FROM cultivos WHERE nombre = 'Brócoli' LIMIT 1;
    SELECT id_cultivo INTO col_id FROM cultivos WHERE nombre = 'Coliflor' LIMIT 1;
    
    -- Insert ciclos with the correct IDs
    INSERT INTO ciclos_cultivo (id_ciclo, nombre, descripcion, fecha_inicial, fecha_final, id_cultivo) VALUES
    ('CIC-001', 'Ciclo Primavera 2024', 'Ciclo de cultivo de primavera', '2024-03-15', '2024-06-15', tom_id),
    ('CIC-002', 'Ciclo Verano 2024', 'Ciclo de cultivo de verano', '2024-06-20', '2024-09-20', lec_id),
    ('CIC-003', 'Ciclo Otoño 2024', 'Ciclo de cultivo de otoño', '2024-09-25', '2024-12-25', pep_id),
    ('CIC-004', 'Ciclo Invierno 2024', 'Ciclo de cultivo de invierno', '2024-12-30', '2025-03-30', pim_id),
    ('CIC-005', 'Ciclo Primavera 2024-2', 'Segundo ciclo de primavera', '2024-04-01', '2024-07-01', zan_id),
    ('CIC-006', 'Ciclo Verano 2024-2', 'Segundo ciclo de verano', '2024-07-05', '2024-10-05', esp_id),
    ('CIC-007', 'Ciclo Otoño 2024-2', 'Segundo ciclo de otoño', '2024-10-10', '2025-01-10', mel_id),
    ('CIC-008', 'Ciclo Invierno 2024-2', 'Segundo ciclo de invierno', '2025-01-15', '2025-04-15', san_id),
    ('CIC-009', 'Ciclo Primavera 2024-3', 'Tercer ciclo de primavera', '2024-04-20', '2024-07-20', bro_id),
    ('CIC-010', 'Ciclo Verano 2024-3', 'Tercer ciclo de verano', '2024-07-25', '2024-10-25', col_id);
END //
DELIMITER ;

-- Execute the procedure
CALL InsertCiclos();

-- Clean up
DROP PROCEDURE IF EXISTS InsertCiclos;

-- Procedure to insert producciones with correct IDs
DELIMITER //
CREATE PROCEDURE InsertProducciones()
BEGIN
    -- Variables for cultivo IDs
    DECLARE tom_id, lec_id, pep_id, pim_id, zan_id, esp_id, mel_id, san_id, bro_id, col_id VARCHAR(50);
    
    -- Get the generated IDs
    SELECT id_cultivo INTO tom_id FROM cultivos WHERE nombre = 'Tomate Cherry' LIMIT 1;
    SELECT id_cultivo INTO lec_id FROM cultivos WHERE nombre = 'Lechuga Romana' LIMIT 1;
    SELECT id_cultivo INTO pep_id FROM cultivos WHERE nombre = 'Pepino' LIMIT 1;
    SELECT id_cultivo INTO pim_id FROM cultivos WHERE nombre = 'Pimiento' LIMIT 1;
    SELECT id_cultivo INTO zan_id FROM cultivos WHERE nombre = 'Zanahoria' LIMIT 1;
    SELECT id_cultivo INTO esp_id FROM cultivos WHERE nombre = 'Espinaca' LIMIT 1;
    SELECT id_cultivo INTO mel_id FROM cultivos WHERE nombre = 'Melón' LIMIT 1;
    SELECT id_cultivo INTO san_id FROM cultivos WHERE nombre = 'Sandía' LIMIT 1;
    SELECT id_cultivo INTO bro_id FROM cultivos WHERE nombre = 'Brócoli' LIMIT 1;
    SELECT id_cultivo INTO col_id FROM cultivos WHERE nombre = 'Coliflor' LIMIT 1;

    -- Insert producciones with the correct IDs
    INSERT INTO producciones (id_produccion, id_responsable, nombre, id_cultivo, id_ciclo_cultivo, inversion, meta, fecha_inicio, fecha_fin)
    VALUES 
    ('PROD-001', 1, 'Producción Tomate Primavera', tom_id, 'CIC-001', 5000.00, 1000.00, '2024-03-15', '2024-06-15'),
    ('PROD-002', 1, 'Producción Lechuga Verano', lec_id, 'CIC-002', 3000.00, 800.00, '2024-06-20', '2024-09-20'),
    ('PROD-003', 1, 'Producción Pepino Otoño', pep_id, 'CIC-003', 4500.00, 900.00, '2024-09-25', '2024-12-25'),
    ('PROD-004', 1, 'Producción Pimiento Invierno', pim_id, 'CIC-004', 3800.00, 750.00, '2024-12-30', '2025-03-30'),
    ('PROD-005', 1, 'Producción Zanahoria Primavera', zan_id, 'CIC-005', 3200.00, 600.00, '2024-04-01', '2024-07-01'),
    ('PROD-006', 1, 'Producción Espinaca Verano', esp_id, 'CIC-006', 2800.00, 500.00, '2024-07-05', '2024-10-05'),
    ('PROD-007', 1, 'Producción Melón Otoño', mel_id, 'CIC-007', 6000.00, 1200.00, '2024-10-10', '2025-01-10'),
    ('PROD-008', 1, 'Producción Sandía Invierno', san_id, 'CIC-008', 6500.00, 1300.00, '2025-01-15', '2025-04-15'),
    ('PROD-009', 1, 'Producción Brócoli Primavera', bro_id, 'CIC-009', 3500.00, 700.00, '2024-04-20', '2024-07-20'),
    ('PROD-010', 1, 'Producción Coliflor Verano', col_id, 'CIC-010', 3600.00, 720.00, '2024-07-25', '2024-10-25');
END //
DELIMITER ;

-- Execute the procedure after inserting cultivos and ciclos
CALL InsertProducciones();

-- Clean up
DROP PROCEDURE IF EXISTS InsertProducciones;

-- Insertar datos de ejemplo para lecturas de sensores
INSERT INTO lecturas_sensores (id_sensor, valor, unidad_medida)
VALUES 
('TEMP-001', 25.5, '°C'),
('TEMP-001', 24.8, '°C'),
('TEMP-001', 25.2, '°C'),
('TEMP-001', 24.5, '°C'),
('HUM-001', 65.2, '%'),
('HUM-001', 68.5, '%'),
('HUM-001', 70.2, '%'),
('HUM-001', 67.8, '%'),
('PH-001', 6.8, 'pH'),
('PH-001', 6.5, 'pH'),
('PH-001', 6.9, 'pH');

-- Insertar datos de ejemplo para uso de insumos
INSERT INTO uso_insumo (id_produccion, id_insumo, cantidad, fecha_uso, id_responsable, valor_unitario, valor_total, observaciones)
VALUES 
('PROD-001', 'FERT-001', 5.00, '2024-03-20', 1, 25.50, 127.50, 'Aplicación inicial de fertilizante'),
('PROD-002', 'PEST-001', 2.50, '2024-06-25', 1, 35.75, 89.38, 'Control preventivo de plagas'),
('PROD-003', 'FERT-002', 4.50, '2024-09-28', 1, 28.75, 129.38, 'Aplicación inicial de fertilizante'),
('PROD-004', 'PEST-002', 3.00, '2024-12-31', 1, 42.25, 126.75, 'Control preventivo de hongos'),
('PROD-005', 'FERT-003', 5.50, '2024-04-05', 1, 32.50, 178.75, 'Aplicación de fertilizante'),
('PROD-006', 'PEST-003', 2.00, '2024-07-10', 1, 38.50, 77.00, 'Control de ácaros'),
('PROD-007', 'SUST-002', 8.00, '2024-10-15', 1, 95.00, 760.00, 'Preparación de sustrato'),
('PROD-008', 'SUST-003', 6.00, '2025-01-20', 1, 110.00, 660.00, 'Preparación de semilleros'),
('PROD-009', 'FERT-001', 7.00, '2024-04-25', 1, 25.50, 178.50, 'Aplicación de fertilizante'),
('PROD-010', 'PEST-001', 4.00, '2024-07-30', 1, 35.75, 143.00, 'Control preventivo de plagas');

-- Trigger para generar ID de producción automático
DELIMITER //
CREATE TRIGGER before_insert_produccion
BEFORE INSERT ON producciones
FOR EACH ROW
BEGIN
  DECLARE year_val VARCHAR(4);
  DECLARE last_num INT;
  
  SET year_val = DATE_FORMAT(CURRENT_DATE, '%Y');
  
  -- Obtener el último número usado este año
  SELECT COALESCE(MAX(CAST(SUBSTRING(id_produccion, 15) AS UNSIGNED)), 0)
  INTO last_num
  FROM producciones
  WHERE id_produccion LIKE CONCAT('PROD-', DATE_FORMAT(CURRENT_DATE, '%d%m'), year_val, '-%');
  
  -- Generar nuevo ID
  SET NEW.id_produccion = CONCAT('PROD-', DATE_FORMAT(CURRENT_DATE, '%d%m'), year_val, '-', 
    LPAD(last_num + 1, 4, '0'));
END//
DELIMITER ;

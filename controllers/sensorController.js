const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

// Get all sensors
exports.getAllSensors = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sensores ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching sensors:', error);
    res.status(500).json({ message: 'Error al obtener sensores', error: error.message });
  }
};

// Get sensor by ID
exports.getSensorById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sensores WHERE id_sensor = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Sensor no encontrado' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching sensor:', error);
    res.status(500).json({ message: 'Error al obtener sensor', error: error.message });
  }
};

// Create sensor
exports.createSensor = async (req, res) => {
  try {
    const { tipo, id_sensor, nombre, unidad_medida, tiempo_escaneo, descripcion } = req.body;
    
    let imagen = null;
    if (req.files && req.files.imagen) {
      const file = req.files.imagen;
      const fileName = `${Date.now()}_${file.name}`;
      const uploadPath = path.join(__dirname, '../public/uploads/sensores', fileName);
      
      await file.mv(uploadPath);
      imagen = `/uploads/sensores/${fileName}`;
    }
    
    const [result] = await pool.query(
      'INSERT INTO sensores (tipo, id_sensor, nombre, imagen, unidad_medida, tiempo_escaneo, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tipo, id_sensor, nombre, imagen, unidad_medida, tiempo_escaneo, descripcion]
    );
    
    res.status(201).json({ 
      message: 'Sensor creado exitosamente',
      id: result.insertId,
      id_sensor
    });
  } catch (error) {
    console.error('Error creating sensor:', error);
    res.status(500).json({ message: 'Error al crear sensor', error: error.message });
  }
};

// Update sensor
exports.updateSensor = async (req, res) => {
  try {
    const { tipo, nombre, unidad_medida, tiempo_escaneo, descripcion } = req.body;
    const id_sensor = req.params.id;
    
    let imagen = null;
    if (req.files && req.files.imagen) {
      // Get current image to delete later
      const [currentSensor] = await pool.query('SELECT imagen FROM sensores WHERE id_sensor = ?', [id_sensor]);
      
      const file = req.files.imagen;
      const fileName = `${Date.now()}_${file.name}`;
      const uploadPath = path.join(__dirname, '../public/uploads/sensores', fileName);
      
      await file.mv(uploadPath);
      imagen = `/uploads/sensores/${fileName}`;
      
      // Delete old image if exists
      if (currentSensor.length > 0 && currentSensor[0].imagen) {
        const oldImagePath = path.join(__dirname, '../public', currentSensor[0].imagen);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    let query = 'UPDATE sensores SET tipo = ?, nombre = ?, unidad_medida = ?, tiempo_escaneo = ?, descripcion = ?';
    let params = [tipo, nombre, unidad_medida, tiempo_escaneo, descripcion];
    
    if (imagen) {
      query += ', imagen = ?';
      params.push(imagen);
    }
    
    query += ' WHERE id_sensor = ?';
    params.push(id_sensor);
    
    const [result] = await pool.query(query, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Sensor no encontrado' });
    }
    
    res.json({ message: 'Sensor actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating sensor:', error);
    res.status(500).json({ message: 'Error al actualizar sensor', error: error.message });
  }
};

// Update sensor status
exports.updateSensorStatus = async (req, res) => {
  try {
    const { estado } = req.body;
    const id_sensor = req.params.id;
    
    const [result] = await pool.query(
      'UPDATE sensores SET estado = ? WHERE id_sensor = ?',
      [estado, id_sensor]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Sensor no encontrado' });
    }
    
    res.json({ message: 'Estado del sensor actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating sensor status:', error);
    res.status(500).json({ message: 'Error al actualizar estado del sensor', error: error.message });
  }
};

// Delete sensor
exports.deleteSensor = async (req, res) => {
  try {
    const id_sensor = req.params.id;
    
    // Get sensor to delete its image
    const [sensor] = await pool.query('SELECT imagen FROM sensores WHERE id_sensor = ?', [id_sensor]);
    
    const [result] = await pool.query('DELETE FROM sensores WHERE id_sensor = ?', [id_sensor]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Sensor no encontrado' });
    }
    
    // Delete image if exists
    if (sensor.length > 0 && sensor[0].imagen) {
      const imagePath = path.join(__dirname, '../public', sensor[0].imagen);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    res.json({ message: 'Sensor eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting sensor:', error);
    res.status(500).json({ message: 'Error al eliminar sensor', error: error.message });
  }
};

// Generate sensor report
exports.generateSensorReport = async (req, res) => {
  try {
    const id_sensor = req.params.id;
    
    // Get sensor info
    const [sensor] = await pool.query('SELECT * FROM sensores WHERE id_sensor = ?', [id_sensor]);
    
    if (sensor.length === 0) {
      return res.status(404).json({ message: 'Sensor no encontrado' });
    }
    
    // Get sensor readings
    const [readings] = await pool.query(
      'SELECT * FROM lecturas_sensores WHERE id_sensor = ? ORDER BY fecha',
      [id_sensor]
    );
    
    res.json({
      sensor: sensor[0],
      readings: readings
    });
  } catch (error) {
    console.error('Error generating sensor report:', error);
    res.status(500).json({ message: 'Error al generar reporte de sensor', error: error.message });
  }
};

// Get sensor readings
exports.getSensorReadings = async (req, res) => {
  try {
    const id_sensor = req.params.id;
    const { start_date, end_date } = req.query;
    
    let query = 'SELECT * FROM lecturas_sensores WHERE id_sensor = ?';
    let params = [id_sensor];
    
    if (start_date && end_date) {
      query += ' AND fecha BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }
    
    query += ' ORDER BY fecha DESC';
    
    const [readings] = await pool.query(query, params);
    
    res.json(readings);
  } catch (error) {
    console.error('Error fetching sensor readings:', error);
    res.status(500).json({ message: 'Error al obtener lecturas del sensor', error: error.message });
  }
};

// Add sensor reading
exports.addSensorReading = async (req, res) => {
  try {
    const id_sensor = req.params.id;
    const { valor, unidad_medida } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO lecturas_sensores (id_sensor, valor, unidad_medida) VALUES (?, ?, ?)',
      [id_sensor, valor, unidad_medida]
    );
    
    res.status(201).json({ 
      message: 'Lectura de sensor agregada exitosamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error adding sensor reading:', error);
    res.status(500).json({ message: 'Error al agregar lectura de sensor', error: error.message });
  }
};
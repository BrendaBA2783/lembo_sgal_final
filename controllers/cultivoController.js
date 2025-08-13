const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

// Get all cultivos
exports.getAllCultivos = async (req, res) => {
  try {
    const { estado } = req.query;
    
    let query = 'SELECT * FROM cultivos';
    let params = [];
    
    if (estado) {
      query += ' WHERE estado = ?';
      params.push(estado);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching cultivos:', error);
    res.status(500).json({ message: 'Error al obtener cultivos', error: error.message });
  }
};

// Get cultivo by ID
exports.getCultivoById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cultivos WHERE id_cultivo = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Cultivo no encontrado' });
    }
    
    // Get associated sensors
    const [sensors] = await pool.query(
      `SELECT s.* FROM sensores s
       JOIN cultivo_sensor cs ON s.id_sensor = cs.id_sensor
       WHERE cs.id_cultivo = ?`,
      [req.params.id]
    );
    
    // Get associated insumos
    const [insumos] = await pool.query(
      `SELECT i.* FROM insumos i
       JOIN cultivo_insumo ci ON i.id_insumo = ci.id_insumo
       WHERE ci.id_cultivo = ?`,
      [req.params.id]
    );
    
    const cultivo = rows[0];
    cultivo.sensores = sensors;
    cultivo.insumos = insumos;
    
    res.json(cultivo);
  } catch (error) {
    console.error('Error fetching cultivo:', error);
    res.status(500).json({ message: 'Error al obtener cultivo', error: error.message });
  }
};

// Create cultivo
exports.createCultivo = async (req, res) => {
  try {
    const { 
      tipo, 
      nombre, 
      id_cultivo, 
      tamano, 
      ubicacion, 
      fecha_siembra, 
      descripcion,
      sensores,
      insumos
    } = req.body;
    
    let fotografia = null;
    if (req.files && req.files.fotografia) {
      const file = req.files.fotografia;
      const fileName = `${Date.now()}_${file.name}`;
      const uploadPath = path.join(__dirname, '../public/uploads/cultivos', fileName);
      
      await file.mv(uploadPath);
      fotografia = `/uploads/cultivos/${fileName}`;
    }
    
    const [result] = await pool.query(
      `INSERT INTO cultivos 
       (tipo, nombre, id_cultivo, fotografia, tamano, ubicacion, fecha_siembra, descripcion) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tipo, nombre, id_cultivo, fotografia, tamano, ubicacion, fecha_siembra, descripcion]
    );
    
    // Add associated sensors if provided
    if (sensores && Array.isArray(sensores) && sensores.length > 0) {
      for (const sensorId of sensores) {
        await pool.query(
          'INSERT INTO cultivo_sensor (id_cultivo, id_sensor) VALUES (?, ?)',
          [id_cultivo, sensorId]
        );
      }
    }
    
    // Add associated insumos if provided
    if (insumos && Array.isArray(insumos) && insumos.length > 0) {
      for (const insumoId of insumos) {
        await pool.query(
          'INSERT INTO cultivo_insumo (id_cultivo, id_insumo) VALUES (?, ?)',
          [id_cultivo, insumoId]
        );
      }
    }
    
    res.status(201).json({ 
      message: 'Cultivo creado exitosamente',
      id: result.insertId,
      id_cultivo
    });
  } catch (error) {
    console.error('Error creating cultivo:', error);
    res.status(500).json({ message: 'Error al crear cultivo', error: error.message });
  }
};

// Update cultivo
exports.updateCultivo = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get current cultivo to ensure it exists and merge with updates
    const [currentCultivo] = await pool.query(
      'SELECT * FROM cultivos WHERE id_cultivo = ?',
      [id]
    );

    if (!currentCultivo.length) {
      return res.status(404).json({ message: 'Cultivo no encontrado' });
    }

    // Only update the provided fields
    const updateFields = [];
    const updateValues = [];
    
    // Fields that can be updated
    const allowedFields = [
      'tipo', 'nombre', 'tamano', 'ubicacion', 
      'fecha_siembra', 'descripcion', 'estado'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updateData[field]);
      }
    });

    // Add ID at the end for WHERE clause
    updateValues.push(id);

    // If there are fields to update
    if (updateFields.length > 0) {
      const updateQuery = `
        UPDATE cultivos 
        SET ${updateFields.join(', ')}
        WHERE id_cultivo = ?
      `;

      await pool.query(updateQuery, updateValues);

      // Get updated cultivo
      const [updatedCultivo] = await pool.query(
        'SELECT * FROM cultivos WHERE id_cultivo = ?',
        [id]
      );

      res.json(updatedCultivo[0]);
    } else {
      res.json(currentCultivo[0]);
    }

  } catch (error) {
    console.error('Error updating cultivo:', error);
    res.status(500).json({ 
      message: 'Error al actualizar cultivo',
      error: error.message 
    });
  }
};

// Update cultivo status
exports.updateCultivoStatus = async (req, res) => {
  try {
    const { estado } = req.body;
    const id_cultivo = req.params.id;
    
    const [result] = await pool.query(
      'UPDATE cultivos SET estado = ? WHERE id_cultivo = ?',
      [estado, id_cultivo]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cultivo no encontrado' });
    }
    
    res.json({ message: 'Estado del cultivo actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating cultivo status:', error);
    res.status(500).json({ message: 'Error al actualizar estado del cultivo', error: error.message });
  }
};

// Delete cultivo
exports.deleteCultivo = async (req, res) => {
  try {
    const id_cultivo = req.params.id;
    
    // Get cultivo to delete its image
    const [cultivo] = await pool.query('SELECT fotografia FROM cultivos WHERE id_cultivo = ?', [id_cultivo]);
    
    const [result] = await pool.query('DELETE FROM cultivos WHERE id_cultivo = ?', [id_cultivo]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cultivo no encontrado' });
    }
    
    // Delete image if exists
    if (cultivo.length > 0 && cultivo[0].fotografia) {
      const imagePath = path.join(__dirname, '../public', cultivo[0].fotografia);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    res.json({ message: 'Cultivo eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting cultivo:', error);
    res.status(500).json({ message: 'Error al eliminar cultivo', error: error.message });
  }
};

// Generate cultivo report
exports.generateCultivoReport = async (req, res) => {
  try {
    const { estado } = req.query;
    
    let query = `
      SELECT c.*, 
             (SELECT COUNT(*) FROM cultivo_sensor cs WHERE cs.id_cultivo = c.id_cultivo) AS num_sensores,
             (SELECT COUNT(*) FROM cultivo_insumo ci WHERE ci.id_cultivo = c.id_cultivo) AS num_insumos
      FROM cultivos c
    `;
    
    let params = [];
    
    if (estado) {
      query += ' WHERE c.estado = ?';
      params.push(estado);
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    const [cultivos] = await pool.query(query, params);
    
    res.json(cultivos);
  } catch (error) {
    console.error('Error generating cultivo report:', error);
    res.status(500).json({ message: 'Error al generar reporte de cultivos', error: error.message });
  }
};

// Assign sensor to cultivo
exports.assignSensorToCultivo = async (req, res) => {
  try {
    const id_cultivo = req.params.id;
    const { id_sensor } = req.body;
    
    // Check if cultivo exists
    const [cultivo] = await pool.query('SELECT * FROM cultivos WHERE id_cultivo = ?', [id_cultivo]);
    
    if (cultivo.length === 0) {
      return res.status(404).json({ message: 'Cultivo no encontrado' });
    }
    
    // Check if sensor exists
    const [sensor] = await pool.query('SELECT * FROM sensores WHERE id_sensor = ?', [id_sensor]);
    
    if (sensor.length === 0) {
      return res.status(404).json({ message: 'Sensor no encontrado' });
    }
    
    // Check if association already exists
    const [existing] = await pool.query(
      'SELECT * FROM cultivo_sensor WHERE id_cultivo = ? AND id_sensor = ?',
      [id_cultivo, id_sensor]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ message: 'El sensor ya está asignado a este cultivo' });
    }
    
    // Create association
    await pool.query(
      'INSERT INTO cultivo_sensor (id_cultivo, id_sensor) VALUES (?, ?)',
      [id_cultivo, id_sensor]
    );
    
    res.status(201).json({ message: 'Sensor asignado al cultivo exitosamente' });
  } catch (error) {
    console.error('Error assigning sensor to cultivo:', error);
    res.status(500).json({ message: 'Error al asignar sensor al cultivo', error: error.message });
  }
};

// Assign insumo to cultivo
exports.assignInsumoToCultivo = async (req, res) => {
  try {
    const id_cultivo = req.params.id;
    const { id_insumo } = req.body;
    
    // Check if cultivo exists
    const [cultivo] = await pool.query('SELECT * FROM cultivos WHERE id_cultivo = ?', [id_cultivo]);
    
    if (cultivo.length === 0) {
      return res.status(404).json({ message: 'Cultivo no encontrado' });
    }
    
    // Check if insumo exists
    const [insumo] = await pool.query('SELECT * FROM insumos WHERE id_insumo = ?', [id_insumo]);
    
    if (insumo.length === 0) {
      return res.status(404).json({ message: 'Insumo no encontrado' });
    }
    
    // Check if association already exists
    const [existing] = await pool.query(
      'SELECT * FROM cultivo_insumo WHERE id_cultivo = ? AND id_insumo = ?',
      [id_cultivo, id_insumo]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ message: 'El insumo ya está asignado a este cultivo' });
    }
    
    // Create association
    await pool.query(
      'INSERT INTO cultivo_insumo (id_cultivo, id_insumo) VALUES (?, ?)',
      [id_cultivo, id_insumo]
    );
    
    res.status(201).json({ message: 'Insumo asignado al cultivo exitosamente' });
  } catch (error) {
    console.error('Error assigning insumo to cultivo:', error);
    res.status(500).json({ message: 'Error al asignar insumo al cultivo', error: error.message });
  }
};
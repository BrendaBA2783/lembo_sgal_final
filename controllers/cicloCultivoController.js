const pool = require('../config/db');

// Get all ciclos cultivo
exports.getAllCiclosCultivo = async (req, res) => {
  try {
    const { estado } = req.query;
    
    let query = `
      SELECT cc.*, c.nombre AS nombre_cultivo
      FROM ciclos_cultivo cc
      JOIN cultivos c ON cc.id_cultivo = c.id_cultivo
    `;
    
    let params = [];
    
    if (estado) {
      query += ' WHERE cc.estado = ?';
      params.push(estado);
    }
    
    query += ' ORDER BY cc.created_at DESC';
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching ciclos cultivo:', error);
    res.status(500).json({ message: 'Error al obtener ciclos de cultivo', error: error.message });
  }
};

// Get ciclo cultivo by ID
exports.getCicloCultivoById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT cc.*, c.nombre AS nombre_cultivo
      FROM ciclos_cultivo cc
      JOIN cultivos c ON cc.id_cultivo = c.id_cultivo
      WHERE cc.id_ciclo = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Ciclo de cultivo no encontrado' });
    }
    
    // Get associated insumos
    const [insumos] = await pool.query(`
      SELECT i.* 
      FROM insumos i
      JOIN insumo_ciclo ic ON i.id_insumo = ic.id_insumo
      WHERE ic.id_ciclo_cultivo = ?
    `, [req.params.id]);
    
    const cicloCultivo = rows[0];
    cicloCultivo.insumos = insumos;
    
    res.json(cicloCultivo);
  } catch (error) {
    console.error('Error fetching ciclo cultivo:', error);
    res.status(500).json({ message: 'Error al obtener ciclo de cultivo', error: error.message });
  }
};

// Create ciclo cultivo
exports.createCicloCultivo = async (req, res) => {
  try {
    const { 
      id_ciclo, 
      nombre, 
      descripcion, 
      fecha_inicial, 
      fecha_final, 
      novedades, 
      id_cultivo,
      insumos
    } = req.body;
    
    // Validate required fields
    if (!id_ciclo || !nombre || !fecha_inicial || !fecha_final || !id_cultivo) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }
    
    // Check if cultivo exists
    const [cultivo] = await pool.query('SELECT * FROM cultivos WHERE id_cultivo = ?', [id_cultivo]);
    
    if (cultivo.length === 0) {
      return res.status(404).json({ message: 'Cultivo no encontrado' });
    }
    
    // Create ciclo cultivo
    const [result] = await pool.query(
      `INSERT INTO ciclos_cultivo 
       (id_ciclo, nombre, descripcion, fecha_inicial, fecha_final, novedades, id_cultivo) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_ciclo, nombre, descripcion, fecha_inicial, fecha_final, novedades, id_cultivo]
    );
    
    // Add associated insumos if provided
    if (insumos && Array.isArray(insumos) && insumos.length > 0) {
      for (const insumoId of insumos) {
        await pool.query(
          'INSERT INTO insumo_ciclo (id_insumo, id_ciclo_cultivo, id_cultivo) VALUES (?, ?, ?)',
          [insumoId, id_ciclo, id_cultivo]
        );
      }
    }
    
    res.status(201).json({ 
      message: 'Ciclo de cultivo creado exitosamente',
      id: result.insertId,
      id_ciclo
    });
  } catch (error) {
    console.error('Error creating ciclo cultivo:', error);
    res.status(500).json({ message: 'Error al crear ciclo de cultivo', error: error.message });
  }
};

// Update ciclo cultivo
exports.updateCicloCultivo = async (req, res) => {
  try {
    const { 
      nombre, 
      descripcion, 
      fecha_inicial, 
      fecha_final, 
      novedades 
    } = req.body;
    const id_ciclo = req.params.id;
    
    const [result] = await pool.query(
      `UPDATE ciclos_cultivo 
       SET nombre = ?, descripcion = ?, fecha_inicial = ?, fecha_final = ?, novedades = ? 
       WHERE id_ciclo = ?`,
      [nombre, descripcion, fecha_inicial, fecha_final, novedades, id_ciclo]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ciclo de cultivo no encontrado' });
    }
    
    res.json({ message: 'Ciclo de cultivo actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating ciclo cultivo:', error);
    res.status(500).json({ message: 'Error al actualizar ciclo de cultivo', error: error.message });
  }
};

// Update ciclo cultivo status
exports.updateCicloCultivoStatus = async (req, res) => {
  try {
    const { estado } = req.body;
    const id_ciclo = req.params.id;
    
    const [result] = await pool.query(
      'UPDATE ciclos_cultivo SET estado = ? WHERE id_ciclo = ?',
      [estado, id_ciclo]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ciclo de cultivo no encontrado' });
    }
    
    res.json({ message: 'Estado del ciclo de cultivo actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating ciclo cultivo status:', error);
    res.status(500).json({ message: 'Error al actualizar estado del ciclo de cultivo', error: error.message });
  }
};

// Delete ciclo cultivo
exports.deleteCicloCultivo = async (req, res) => {
  try {
    const id_ciclo = req.params.id;
    
    const [result] = await pool.query('DELETE FROM ciclos_cultivo WHERE id_ciclo = ?', [id_ciclo]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ciclo de cultivo no encontrado' });
    }
    
    res.json({ message: 'Ciclo de cultivo eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting ciclo cultivo:', error);
    res.status(500).json({ message: 'Error al eliminar ciclo de cultivo', error: error.message });
  }
};

// Get ciclos by cultivo
exports.getCiclosByCultivo = async (req, res) => {
  try {
    const id_cultivo = req.params.id;
    
    const [rows] = await pool.query(
      `SELECT * FROM ciclos_cultivo 
       WHERE id_cultivo = ?
       ORDER BY fecha_inicial DESC`,
      [id_cultivo]
    );
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching ciclos by cultivo:', error);
    res.status(500).json({ message: 'Error al obtener ciclos por cultivo', error: error.message });
  }
};

// Generate ciclo cultivo report
exports.generateCicloCultivoReport = async (req, res) => {
  try {
    const { id_cultivo, estado } = req.query;
    
    let query = `
      SELECT cc.*, c.nombre AS nombre_cultivo,
             (SELECT COUNT(*) FROM insumo_ciclo ic WHERE ic.id_ciclo_cultivo = cc.id_ciclo) AS num_insumos
      FROM ciclos_cultivo cc
      JOIN cultivos c ON cc.id_cultivo = c.id_cultivo
    `;
    
    let params = [];
    let conditions = [];
    
    if (id_cultivo) {
      conditions.push('cc.id_cultivo = ?');
      params.push(id_cultivo);
    }
    
    if (estado) {
      conditions.push('cc.estado = ?');
      params.push(estado);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY cc.created_at DESC';
    
    const [rows] = await pool.query(query, params);
    
    res.json(rows);
  } catch (error) {
    console.error('Error generating ciclo cultivo report:', error);
    res.status(500).json({ message: 'Error al generar reporte de ciclos de cultivo', error: error.message });
  }
};
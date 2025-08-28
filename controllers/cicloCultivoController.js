const pool = require('../config/db');

// Get all ciclos cultivo
exports.getAllCiclosCultivo = async (req, res) => {
  try {
    const { estado } = req.query;
    
    let query = `
      SELECT cc.*, c.nombre AS nombre_cultivo
      FROM ciclos_cultivo cc
      LEFT JOIN cultivos c ON cc.id_cultivo = c.id_cultivo
    `;
    
    let params = [];
    
    if (estado) {
      query += ' WHERE cc.estado = ?';
      params.push(estado);
    }
    
    query += ' ORDER BY cc.created_at DESC';
    
    const [rows] = await pool.query(query, params);
    
    // Clean up date fields and handle null values
    const cleanedRows = rows.map(row => ({
      ...row,
      fecha_inicial: row.fecha_inicial ? new Date(row.fecha_inicial).toISOString().split('T')[0] : null,
      fecha_final: row.fecha_final ? new Date(row.fecha_final).toISOString().split('T')[0] : null,
      novedades: row.novedades || null,
      nombre_cultivo: row.nombre_cultivo || 'Sin cultivo asignado'
    }));
    
    res.json(cleanedRows);
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
      LEFT JOIN cultivos c ON cc.id_cultivo = c.id_cultivo
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
    
    // Clean up date fields
    cicloCultivo.fecha_inicial = cicloCultivo.fecha_inicial ? new Date(cicloCultivo.fecha_inicial).toISOString().split('T')[0] : null;
    cicloCultivo.fecha_final = cicloCultivo.fecha_final ? new Date(cicloCultivo.fecha_final).toISOString().split('T')[0] : null;
    cicloCultivo.novedades = cicloCultivo.novedades || null;
    cicloCultivo.nombre_cultivo = cicloCultivo.nombre_cultivo || 'Sin cultivo asignado';
    
    res.json(cicloCultivo);
  } catch (error) {
    console.error('Error fetching ciclo cultivo:', error);
    res.status(500).json({ message: 'Error al obtener ciclo de cultivo', error: error.message });
  }
};

// Create ciclo cultivo
exports.createCicloCultivo = async (req, res) => {
  try {
    console.log('Creating ciclo cultivo with body:', JSON.stringify(req.body, null, 2));
    console.log('Body type:', typeof req.body);
    console.log('Body keys:', Object.keys(req.body));
    
    const { 
      nombre, 
      descripcion, 
      fecha_inicio, 
      fecha_fin, 
      novedades, 
      estado = 'activo',
      id_cultivo = null
    } = req.body;
    
    console.log('Extracted fields:', { 
      nombre, 
      fecha_inicio, 
      fecha_fin, 
      descripcion, 
      novedades, 
      estado, 
      id_cultivo 
    });
    
    console.log('Field types:', {
      nombre: typeof nombre,
      fecha_inicio: typeof fecha_inicio,
      fecha_fin: typeof fecha_fin
    });
    
    // Validate required fields
    if (!nombre || !fecha_inicio || !fecha_fin) {
      console.log('Validation failed:', { 
        nombre: !!nombre, 
        fecha_inicio: !!fecha_inicio, 
        fecha_fin: !!fecha_fin 
      });
      console.log('Empty values:', {
        nombre: nombre === '',
        fecha_inicio: fecha_inicio === '',
        fecha_fin: fecha_fin === ''
      });
      return res.status(400).json({ 
        message: 'Faltan campos requeridos',
        details: {
          nombre: !nombre ? 'Campo requerido' : null,
          fecha_inicio: !fecha_inicio ? 'Campo requerido' : null,
          fecha_fin: !fecha_fin ? 'Campo requerido' : null
        }
      });
    }
    
    // Generate unique ID for ciclo
    const id_ciclo = `CIC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Generated ID:', id_ciclo);
    
    // Create ciclo cultivo
    const [result] = await pool.query(
      `INSERT INTO ciclos_cultivo 
       (id_ciclo, nombre, descripcion, fecha_inicial, fecha_final, novedades, estado, id_cultivo) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_ciclo, nombre, descripcion, fecha_inicio, fecha_fin, novedades, estado, id_cultivo]
    );
    
    console.log('Insert result:', result);
    
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
      fecha_inicio, 
      fecha_fin, 
      novedades,
      estado,
      id_cultivo
    } = req.body;
    const id_ciclo = req.params.id;
    
    const [result] = await pool.query(
      `UPDATE ciclos_cultivo 
       SET nombre = ?, descripcion = ?, fecha_inicial = ?, fecha_final = ?, novedades = ?, estado = ?, id_cultivo = ?
       WHERE id_ciclo = ?`,
      [nombre, descripcion, fecha_inicio, fecha_fin, novedades, estado, id_cultivo, id_ciclo]
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
    const { estado } = req.query;
    
    let query = `
      SELECT cc.*, c.nombre AS nombre_cultivo,
             (SELECT COUNT(*) FROM insumo_ciclo ic WHERE ic.id_ciclo_cultivo = cc.id_ciclo) AS num_insumos
      FROM ciclos_cultivo cc
      LEFT JOIN cultivos c ON cc.id_cultivo = c.id_cultivo
    `;
    
    let params = [];
    let conditions = [];
    
    if (estado) {
      conditions.push('cc.estado = ?');
      params.push(estado);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY cc.created_at DESC';
    
    const [rows] = await pool.query(query, params);
    
    // Clean up date fields
    const cleanedRows = rows.map(row => ({
      ...row,
      fecha_inicial: row.fecha_inicial ? new Date(row.fecha_inicial).toISOString().split('T')[0] : null,
      fecha_final: row.fecha_final ? new Date(row.fecha_final).toISOString().split('T')[0] : null,
      novedades: row.novedades || null,
      nombre_cultivo: row.nombre_cultivo || 'Sin cultivo asignado'
    }));
    
    res.json(cleanedRows);
  } catch (error) {
    console.error('Error generating ciclo cultivo report:', error);
    res.status(500).json({ message: 'Error al generar reporte de ciclos de cultivo', error: error.message });
  }
};
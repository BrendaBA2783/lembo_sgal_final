const pool = require('../config/db');

// Get all insumos
exports.getAllInsumos = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM insumos ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching insumos:', error);
    res.status(500).json({ message: 'Error al obtener insumos', error: error.message });
  }
};

// Get insumo by ID
exports.getInsumoById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM insumos WHERE id_insumo = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Insumo no encontrado' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching insumo:', error);
    res.status(500).json({ message: 'Error al obtener insumo', error: error.message });
  }
};

// Create insumo
exports.createInsumo = async (req, res) => {
  try {
    const { 
      tipo, 
      id_insumo, 
      nombre, 
      unidad_medida, 
      cantidad, 
      valor_unitario, 
      descripcion 
    } = req.body;
    
    // Calculate total value
    const valor_total = parseFloat(cantidad) * parseFloat(valor_unitario);
    
    const [result] = await pool.query(
      `INSERT INTO insumos 
       (tipo, id_insumo, nombre, unidad_medida, cantidad, valor_unitario, valor_total, descripcion) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tipo, id_insumo, nombre, unidad_medida, cantidad, valor_unitario, valor_total, descripcion]
    );
    
    res.status(201).json({ 
      message: 'Insumo creado exitosamente',
      id: result.insertId,
      id_insumo
    });
  } catch (error) {
    console.error('Error creating insumo:', error);
    res.status(500).json({ message: 'Error al crear insumo', error: error.message });
  }
};

// Update insumo
exports.updateInsumo = async (req, res) => {
  try {
    const { 
      tipo, 
      nombre, 
      unidad_medida, 
      cantidad, 
      valor_unitario, 
      descripcion 
    } = req.body;
    const id_insumo = req.params.id;
    
    // Calculate total value
    const valor_total = parseFloat(cantidad) * parseFloat(valor_unitario);
    
    const [result] = await pool.query(
      `UPDATE insumos 
       SET tipo = ?, nombre = ?, unidad_medida = ?, cantidad = ?, 
           valor_unitario = ?, valor_total = ?, descripcion = ? 
       WHERE id_insumo = ?`,
      [tipo, nombre, unidad_medida, cantidad, valor_unitario, valor_total, descripcion, id_insumo]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Insumo no encontrado' });
    }
    
    res.json({ message: 'Insumo actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating insumo:', error);
    res.status(500).json({ message: 'Error al actualizar insumo', error: error.message });
  }
};

// Update insumo status
exports.updateInsumoStatus = async (req, res) => {
  try {
    const { estado } = req.body;
    const id_insumo = req.params.id;
    
    const [result] = await pool.query(
      'UPDATE insumos SET estado = ? WHERE id_insumo = ?',
      [estado, id_insumo]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Insumo no encontrado' });
    }
    
    res.json({ message: 'Estado del insumo actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating insumo status:', error);
    res.status(500).json({ message: 'Error al actualizar estado del insumo', error: error.message });
  }
};

// Delete insumo
exports.deleteInsumo = async (req, res) => {
  try {
    const id_insumo = req.params.id;
    
    const [result] = await pool.query('DELETE FROM insumos WHERE id_insumo = ?', [id_insumo]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Insumo no encontrado' });
    }
    
    res.json({ message: 'Insumo eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting insumo:', error);
    res.status(500).json({ message: 'Error al eliminar insumo', error: error.message });
  }
};

// Get insumos by cultivo
exports.getInsumoByCultivo = async (req, res) => {
  try {
    const id_cultivo = req.params.id;
    
    const [rows] = await pool.query(
      `SELECT i.* FROM insumos i
       JOIN cultivo_insumo ci ON i.id_insumo = ci.id_insumo
       WHERE ci.id_cultivo = ?
       ORDER BY i.created_at DESC`,
      [id_cultivo]
    );
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching insumos by cultivo:', error);
    res.status(500).json({ message: 'Error al obtener insumos por cultivo', error: error.message });
  }
};

// Get insumos by ciclo cultivo
exports.getInsumoByCiclo = async (req, res) => {
  try {
    const id_ciclo = req.params.id;
    
    const [rows] = await pool.query(
      `SELECT i.* FROM insumos i
       JOIN insumo_ciclo ic ON i.id_insumo = ic.id_insumo
       WHERE ic.id_ciclo_cultivo = ?
       ORDER BY i.created_at DESC`,
      [id_ciclo]
    );
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching insumos by ciclo:', error);
    res.status(500).json({ message: 'Error al obtener insumos por ciclo', error: error.message });
  }
};

// Generate insumo report
exports.generateInsumoReport = async (req, res) => {
  try {
    const { id_cultivo, id_ciclo } = req.query;
    
    let query = `SELECT i.*, c.nombre as nombre_cultivo, cc.nombre as nombre_ciclo 
                FROM insumos i`;
    
    let params = [];
    let joinClauses = [];
    let whereClauses = [];
    
    if (id_cultivo) {
      joinClauses.push(`JOIN cultivo_insumo ci ON i.id_insumo = ci.id_insumo
                       JOIN cultivos c ON ci.id_cultivo = c.id_cultivo`);
      whereClauses.push(`ci.id_cultivo = ?`);
      params.push(id_cultivo);
    }
    
    if (id_ciclo) {
      joinClauses.push(`JOIN insumo_ciclo ic ON i.id_insumo = ic.id_insumo
                       JOIN ciclos_cultivo cc ON ic.id_ciclo_cultivo = cc.id_ciclo`);
      whereClauses.push(`ic.id_ciclo_cultivo = ?`);
      params.push(id_ciclo);
    }
    
    if (joinClauses.length > 0) {
      query += ' ' + joinClauses.join(' ');
    }
    
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    query += ' ORDER BY i.created_at DESC';
    
    const [rows] = await pool.query(query, params);
    
    res.json(rows);
  } catch (error) {
    console.error('Error generating insumo report:', error);
    res.status(500).json({ message: 'Error al generar reporte de insumos', error: error.message });
  }
};
const pool = require('../config/db');

// Get all producciones
exports.getAllProducciones = async (req, res) => {
  try {
    const { 
      estado, 
      nombre, 
      id_cultivo, 
      id_ciclo_cultivo, 
      fecha_inicio, 
      fecha_fin 
    } = req.query;
    
    let query = `
      SELECT p.*, 
             u.nombre AS responsable_nombre,
             c.nombre AS cultivo_nombre,
             cc.nombre AS ciclo_cultivo_nombre
      FROM producciones p
      JOIN usuarios u ON p.id_responsable = u.id
      JOIN cultivos c ON p.id_cultivo = c.id_cultivo
      JOIN ciclos_cultivo cc ON p.id_ciclo_cultivo = cc.id_ciclo
    `;
    
    let params = [];
    let conditions = [];
    
    if (estado) {
      conditions.push('p.estado = ?');
      params.push(estado);
    }
    
    if (nombre) {
      conditions.push('p.nombre LIKE ?');
      params.push(`%${nombre}%`);
    }
    
    if (id_cultivo) {
      conditions.push('p.id_cultivo = ?');
      params.push(id_cultivo);
    }
    
    if (id_ciclo_cultivo) {
      conditions.push('p.id_ciclo_cultivo = ?');
      params.push(id_ciclo_cultivo);
    }
    
    if (fecha_inicio) {
      conditions.push('p.fecha_inicio >= ?');
      params.push(fecha_inicio);
    }
    
    if (fecha_fin) {
      conditions.push('p.fecha_fin <= ?');
      params.push(fecha_fin);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY p.fecha_creacion DESC';
    
    const [rows] = await pool.query(query, params);
    
    // Get additional data for each produccion
    for (const produccion of rows) {
      // Get sensors count
      const [sensorCount] = await pool.query(
        'SELECT COUNT(*) AS count FROM produccion_sensor WHERE id_produccion = ?',
        [produccion.id_produccion]
      );
      produccion.sensor_count = sensorCount[0].count;
      
      // Get insumos count
      const [insumoCount] = await pool.query(
        'SELECT COUNT(*) AS count FROM produccion_insumo WHERE id_produccion = ?',
        [produccion.id_produccion]
      );
      produccion.insumo_count = insumoCount[0].count;
    }
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching producciones:', error);
    res.status(500).json({ message: 'Error al obtener producciones', error: error.message });
  }
};

// Get produccion by ID
exports.getProduccionById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, 
             u.nombre AS responsable_nombre,
             c.nombre AS cultivo_nombre,
             cc.nombre AS ciclo_cultivo_nombre
      FROM producciones p
      JOIN usuarios u ON p.id_responsable = u.id
      JOIN cultivos c ON p.id_cultivo = c.id_cultivo
      JOIN ciclos_cultivo cc ON p.id_ciclo_cultivo = cc.id_ciclo
      WHERE p.id_produccion = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Producción no encontrada' });
    }
    
    const produccion = rows[0];
    
    // Get associated sensors
    const [sensors] = await pool.query(`
      SELECT s.* 
      FROM sensores s
      JOIN produccion_sensor ps ON s.id_sensor = ps.id_sensor
      WHERE ps.id_produccion = ?
    `, [req.params.id]);
    
    // Get associated insumos
    const [insumos] = await pool.query(`
      SELECT i.* 
      FROM insumos i
      JOIN produccion_insumo pi ON i.id_insumo = pi.id_insumo
      WHERE pi.id_produccion = ?
    `, [req.params.id]);
    
    // Get insumo usage records
    const [usosInsumo] = await pool.query(`
      SELECT ui.*, 
             i.nombre AS insumo_nombre,
             u.nombre AS responsable_nombre
      FROM uso_insumo ui
      JOIN insumos i ON ui.id_insumo = i.id_insumo
      JOIN usuarios u ON ui.id_responsable = u.id
      WHERE ui.id_produccion = ?
      ORDER BY ui.fecha_uso DESC
    `, [req.params.id]);
    
    produccion.sensores = sensors;
    produccion.insumos = insumos;
    produccion.usos_insumo = usosInsumo;
    
    res.json(produccion);
  } catch (error) {
    console.error('Error fetching produccion:', error);
    res.status(500).json({ message: 'Error al obtener producción', error: error.message });
  }
};

// Create produccion
exports.createProduccion = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { 
      id_responsable, 
      nombre, 
      id_cultivo, 
      id_ciclo_cultivo, 
      inversion, 
      meta, 
      fecha_inicio, 
      fecha_fin, 
      estado,
      sensores,
      insumos
    } = req.body;
    
    // Generate ID (normally done by trigger on insert)
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    
    // Get last number
    const [lastProd] = await connection.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(id_produccion, 15) AS UNSIGNED)), 0) AS last_num
      FROM producciones
      WHERE id_produccion LIKE ?
    `, [`PROD-${day}${month}${year}-%`]);
    
    const lastNum = lastProd[0].last_num || 0;
    const newNum = lastNum + 1;
    const id_produccion = `PROD-${day}${month}${year}-${String(newNum).padStart(4, '0')}`;
    
    // Insert produccion
    const [result] = await connection.query(
      `INSERT INTO producciones 
       (id_produccion, id_responsable, nombre, id_cultivo, id_ciclo_cultivo, inversion, meta, fecha_inicio, fecha_fin, estado) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_produccion, id_responsable, nombre, id_cultivo, id_ciclo_cultivo, inversion, meta, fecha_inicio, fecha_fin, estado || 'borrador']
    );
    
    // Add associated sensors if provided
    if (sensores && Array.isArray(sensores) && sensores.length > 0) {
      if (sensores.length > 3) {
        throw new Error('No se pueden asignar más de 3 sensores por producción');
      }
      
      for (const sensorId of sensores) {
        await connection.query(
          'INSERT INTO produccion_sensor (id_produccion, id_sensor) VALUES (?, ?)',
          [id_produccion, sensorId]
        );
      }
    }
    
    // Add associated insumos if provided
    if (insumos && Array.isArray(insumos) && insumos.length > 0) {
      for (const insumoId of insumos) {
        await connection.query(
          'INSERT INTO produccion_insumo (id_produccion, id_insumo) VALUES (?, ?)',
          [id_produccion, insumoId]
        );
      }
    }
    
    await connection.commit();
    
    res.status(201).json({ 
      message: 'Producción creada exitosamente',
      id_produccion
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating produccion:', error);
    res.status(500).json({ message: 'Error al crear producción', error: error.message });
  } finally {
    connection.release();
  }
};

// Update produccion
exports.updateProduccion = async (req, res) => {
  try {
    const { 
      id_responsable, 
      nombre, 
      id_cultivo, 
      id_ciclo_cultivo, 
      inversion, 
      meta, 
      fecha_inicio, 
      fecha_fin 
    } = req.body;
    const id_produccion = req.params.id;
    
    const [result] = await pool.query(
      `UPDATE producciones 
       SET id_responsable = ?, nombre = ?, id_cultivo = ?, id_ciclo_cultivo = ?, 
           inversion = ?, meta = ?, fecha_inicio = ?, fecha_fin = ? 
       WHERE id_produccion = ?`,
      [id_responsable, nombre, id_cultivo, id_ciclo_cultivo, inversion, meta, fecha_inicio, fecha_fin, id_produccion]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producción no encontrada' });
    }
    
    res.json({ message: 'Producción actualizada exitosamente' });
  } catch (error) {
    console.error('Error updating produccion:', error);
    res.status(500).json({ message: 'Error al actualizar producción', error: error.message });
  }
};

// Update produccion status
exports.updateProduccionStatus = async (req, res) => {
  try {
    const { estado } = req.body;
    const id_produccion = req.params.id;
    
    const [result] = await pool.query(
      'UPDATE producciones SET estado = ? WHERE id_produccion = ?',
      [estado, id_produccion]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producción no encontrada' });
    }
    
    res.json({ message: 'Estado de la producción actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating produccion status:', error);
    res.status(500).json({ message: 'Error al actualizar estado de la producción', error: error.message });
  }
};

// Delete produccion
exports.deleteProduccion = async (req, res) => {
  try {
    const id_produccion = req.params.id;
    
    const [result] = await pool.query('DELETE FROM producciones WHERE id_produccion = ?', [id_produccion]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producción no encontrada' });
    }
    
    res.json({ message: 'Producción eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting produccion:', error);
    res.status(500).json({ message: 'Error al eliminar producción', error: error.message });
  }
};

// Generate produccion report
exports.generateProduccionReport = async (req, res) => {
  try {
    const { 
      nombre, 
      id_cultivo, 
      id_ciclo_cultivo, 
      estado, 
      fecha_inicio, 
      fecha_fin 
    } = req.query;
    
    let query = `
      SELECT p.*, 
             u.nombre AS responsable_nombre,
             c.nombre AS cultivo_nombre,
             cc.nombre AS ciclo_cultivo_nombre,
             (SELECT COUNT(*) FROM produccion_sensor ps WHERE ps.id_produccion = p.id_produccion) AS num_sensores,
             (SELECT COUNT(*) FROM produccion_insumo pi WHERE pi.id_produccion = p.id_produccion) AS num_insumos
      FROM producciones p
      JOIN usuarios u ON p.id_responsable = u.id
      JOIN cultivos c ON p.id_cultivo = c.id_cultivo
      JOIN ciclos_cultivo cc ON p.id_ciclo_cultivo = cc.id_ciclo
    `;
    
    let params = [];
    let conditions = [];
    
    if (nombre) {
      conditions.push('p.nombre LIKE ?');
      params.push(`%${nombre}%`);
    }
    
    if (id_cultivo) {
      conditions.push('p.id_cultivo = ?');
      params.push(id_cultivo);
    }
    
    if (id_ciclo_cultivo) {
      conditions.push('p.id_ciclo_cultivo = ?');
      params.push(id_ciclo_cultivo);
    }
    
    if (estado) {
      conditions.push('p.estado = ?');
      params.push(estado);
    }
    
    if (fecha_inicio) {
      conditions.push('p.fecha_inicio >= ?');
      params.push(fecha_inicio);
    }
    
    if (fecha_fin) {
      conditions.push('p.fecha_fin <= ?');
      params.push(fecha_fin);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY p.fecha_creacion DESC';
    
    const [rows] = await pool.query(query, params);
    
    res.json(rows);
  } catch (error) {
    console.error('Error generating produccion report:', error);
    res.status(500).json({ message: 'Error al generar reporte de producciones', error: error.message });
  }
};

// Assign sensor to produccion
exports.assignSensorToProduccion = async (req, res) => {
  try {
    const id_produccion = req.params.id;
    const { id_sensor } = req.body;
    
    // Check if produccion exists
    const [produccion] = await pool.query('SELECT * FROM producciones WHERE id_produccion = ?', [id_produccion]);
    
    if (produccion.length === 0) {
      return res.status(404).json({ message: 'Producción no encontrada' });
    }
    
    // Check if sensor exists
    const [sensor] = await pool.query('SELECT * FROM sensores WHERE id_sensor = ?', [id_sensor]);
    
    if (sensor.length === 0) {
      return res.status(404).json({ message: 'Sensor no encontrado' });
    }
    
    // Check number of sensors currently assigned
    const [sensorCount] = await pool.query(
      'SELECT COUNT(*) AS count FROM produccion_sensor WHERE id_produccion = ?',
      [id_produccion]
    );
    
    if (sensorCount[0].count >= 3) {
      return res.status(400).json({ message: 'No se pueden asignar más de 3 sensores por producción' });
    }
    
    // Check if association already exists
    const [existing] = await pool.query(
      'SELECT * FROM produccion_sensor WHERE id_produccion = ? AND id_sensor = ?',
      [id_produccion, id_sensor]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ message: 'El sensor ya está asignado a esta producción' });
    }
    
    // Create association
    await pool.query(
      'INSERT INTO produccion_sensor (id_produccion, id_sensor) VALUES (?, ?)',
      [id_produccion, id_sensor]
    );
    
    res.status(201).json({ message: 'Sensor asignado a la producción exitosamente' });
  } catch (error) {
    console.error('Error assigning sensor to produccion:', error);
    res.status(500).json({ message: 'Error al asignar sensor a la producción', error: error.message });
  }
};

// Assign insumo to produccion
exports.assignInsumoToProduccion = async (req, res) => {
  try {
    const id_produccion = req.params.id;
    const { id_insumo } = req.body;
    
    // Check if produccion exists
    const [produccion] = await pool.query('SELECT * FROM producciones WHERE id_produccion = ?', [id_produccion]);
    
    if (produccion.length === 0) {
      return res.status(404).json({ message: 'Producción no encontrada' });
    }
    
    // Check if insumo exists
    const [insumo] = await pool.query('SELECT * FROM insumos WHERE id_insumo = ?', [id_insumo]);
    
    if (insumo.length === 0) {
      return res.status(404).json({ message: 'Insumo no encontrado' });
    }
    
    // Check if association already exists
    const [existing] = await pool.query(
      'SELECT * FROM produccion_insumo WHERE id_produccion = ? AND id_insumo = ?',
      [id_produccion, id_insumo]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ message: 'El insumo ya está asignado a esta producción' });
    }
    
    // Create association
    await pool.query(
      'INSERT INTO produccion_insumo (id_produccion, id_insumo) VALUES (?, ?)',
      [id_produccion, id_insumo]
    );
    
    res.status(201).json({ message: 'Insumo asignado a la producción exitosamente' });
  } catch (error) {
    console.error('Error assigning insumo to produccion:', error);
    res.status(500).json({ message: 'Error al asignar insumo a la producción', error: error.message });
  }
};

// Register insumo usage
exports.registrarUsoInsumo = async (req, res) => {
  try {
    const id_produccion = req.params.id;
    const { 
      id_insumo, 
      cantidad, 
      fecha_uso, 
      id_responsable, 
      valor_unitario, 
      observaciones 
    } = req.body;
    
    // Calculate total value
    const valor_total = parseFloat(cantidad) * parseFloat(valor_unitario);
    
    // Insert usage record
    const [result] = await pool.query(
      `INSERT INTO uso_insumo 
       (id_produccion, id_insumo, cantidad, fecha_uso, id_responsable, valor_unitario, valor_total, observaciones) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_produccion, id_insumo, cantidad, fecha_uso, id_responsable, valor_unitario, valor_total, observaciones]
    );
    
    // Update produccion inversion
    await pool.query(
      `UPDATE producciones 
       SET inversion = inversion + ? 
       WHERE id_produccion = ?`,
      [valor_total, id_produccion]
    );
    
    res.status(201).json({ 
      message: 'Uso de insumo registrado exitosamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error registering insumo usage:', error);
    res.status(500).json({ message: 'Error al registrar uso de insumo', error: error.message });
  }
};

// Get insumo usages for a produccion
exports.getUsosInsumo = async (req, res) => {
  try {
    const id_produccion = req.params.id;
    
    const [rows] = await pool.query(`
      SELECT ui.*, 
             i.nombre AS insumo_nombre,
             u.nombre AS responsable_nombre
      FROM uso_insumo ui
      JOIN insumos i ON ui.id_insumo = i.id_insumo
      JOIN usuarios u ON ui.id_responsable = u.id
      WHERE ui.id_produccion = ?
      ORDER BY ui.fecha_uso DESC
    `, [id_produccion]);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching insumo usages:', error);
    res.status(500).json({ message: 'Error al obtener usos de insumo', error: error.message });
  }
};
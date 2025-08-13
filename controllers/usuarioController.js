const pool = require('../config/db');

// Get all usuarios
exports.getAllUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM usuarios ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
};

// Get usuario by ID
exports.getUsuarioById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching usuario:', error);
    res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
  }
};

// Create usuario
exports.createUsuario = async (req, res) => {
  try {
    const { nombre, email, role, estado, password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: 'La contraseña es requerida' });
    }

    // Use bcrypt or similar for password hashing in production
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, role, estado, password) VALUES (?, ?, ?, ?, ?)',
      [nombre, email, role, estado || 'activo', password]
    );
    
    res.status(201).json({ 
      message: 'Usuario creado exitosamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creating usuario:', error);
    res.status(500).json({ message: 'Error al crear usuario', error: error.message });
  }
};

// Update usuario
exports.updateUsuario = async (req, res) => {
  try {
    const { nombre, email, role, estado } = req.body;
    const id = req.params.id;
    
    const [result] = await pool.query(
      'UPDATE usuarios SET nombre = ?, email = ?, role = ?, estado = ? WHERE id = ?',
      [nombre, email, role, estado, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating usuario:', error);
    res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
  }
};

// Delete usuario
exports.deleteUsuario = async (req, res) => {
  try {
    const id = req.params.id;
    
    const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting usuario:', error);
    res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
  }
};

// Generate usuario report
exports.generateUsuarioReport = async (req, res) => {
  try {
    const { role, estado } = req.query;
    
    let query = 'SELECT * FROM usuarios';
    let params = [];
    let conditions = [];
    
    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }
    
    if (estado) {
      conditions.push('estado = ?');
      params.push(estado);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.query(query, params);
    
    res.json(rows);
  } catch (error) {
    console.error('Error generating usuario report:', error);
    res.status(500).json({ message: 'Error al generar reporte de usuarios', error: error.message });
  }
};

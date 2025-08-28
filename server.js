const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const dotenv = require('dotenv');

// Routes
const sensorRoutes = require('./routes/sensorRoutes');
const insumoRoutes = require('./routes/insumoRoutes');
const cultivoRoutes = require('./routes/cultivoRoutes');
const cicloCultivoRoutes = require('./routes/cicloCultivoRoutes');
const produccionRoutes = require('./routes/produccionRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');

// Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5501',
  'http://localhost:5500',
  'http://localhost:5501'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: true
}));

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: true
}));

// API Routes
app.use('/api/sensores', sensorRoutes);
app.use('/api/insumos', insumoRoutes);
app.use('/api/cultivos', cultivoRoutes);
app.use('/api/ciclos-cultivo', cicloCultivoRoutes);
app.use('/api/producciones', produccionRoutes);
app.use('/api/usuarios', usuarioRoutes);

// Serve the main index page for any other routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

// Rutas para sensores
router.get('/', sensorController.getAllSensors);
router.get('/:id', sensorController.getSensorById);
router.post('/', sensorController.createSensor);
router.put('/:id', sensorController.updateSensor);
router.patch('/:id/status', sensorController.updateSensorStatus);
router.delete('/:id', sensorController.deleteSensor);
router.get('/reporte/:id', sensorController.generateSensorReport);
router.get('/lecturas/:id', sensorController.getSensorReadings);
router.post('/lecturas/:id', sensorController.addSensorReading);

module.exports = router;
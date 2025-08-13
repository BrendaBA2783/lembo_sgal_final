const express = require('express');
const router = express.Router();
const cultivoController = require('../controllers/cultivoController');

// Rutas para cultivos
router.get('/', cultivoController.getAllCultivos);
router.get('/:id', cultivoController.getCultivoById);
router.post('/', cultivoController.createCultivo);
router.put('/:id', cultivoController.updateCultivo);
router.patch('/:id/status', cultivoController.updateCultivoStatus);
router.delete('/:id', cultivoController.deleteCultivo);
router.get('/reporte/generar', cultivoController.generateCultivoReport);
router.post('/:id/asignar-sensor', cultivoController.assignSensorToCultivo);
router.post('/:id/asignar-insumo', cultivoController.assignInsumoToCultivo);

module.exports = router;
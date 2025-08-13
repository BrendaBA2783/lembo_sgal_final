const express = require('express');
const router = express.Router();
const produccionController = require('../controllers/produccionController');

// Rutas para producciones
router.get('/', produccionController.getAllProducciones);
router.get('/:id', produccionController.getProduccionById);
router.post('/', produccionController.createProduccion);
router.put('/:id', produccionController.updateProduccion);
router.patch('/:id/status', produccionController.updateProduccionStatus);
router.delete('/:id', produccionController.deleteProduccion);
router.get('/reporte/generar', produccionController.generateProduccionReport);
router.post('/:id/asignar-sensor', produccionController.assignSensorToProduccion);
router.post('/:id/asignar-insumo', produccionController.assignInsumoToProduccion);
router.post('/:id/usar-insumo', produccionController.registrarUsoInsumo);
router.get('/:id/usos-insumo', produccionController.getUsosInsumo);

module.exports = router;
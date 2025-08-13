const express = require('express');
const router = express.Router();
const insumoController = require('../controllers/insumoController');

// Rutas para insumos
router.get('/', insumoController.getAllInsumos);
router.get('/:id', insumoController.getInsumoById);
router.post('/', insumoController.createInsumo);
router.put('/:id', insumoController.updateInsumo);
router.patch('/:id/status', insumoController.updateInsumoStatus);
router.delete('/:id', insumoController.deleteInsumo);
router.get('/reporte/cultivo/:id', insumoController.getInsumoByCultivo);
router.get('/reporte/ciclo/:id', insumoController.getInsumoByCiclo);
router.get('/reporte/generar', insumoController.generateInsumoReport);

module.exports = router;
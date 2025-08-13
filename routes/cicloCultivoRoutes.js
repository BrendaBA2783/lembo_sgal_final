const express = require('express');
const router = express.Router();
const cicloCultivoController = require('../controllers/cicloCultivoController');

// Rutas para ciclos de cultivo
router.get('/', cicloCultivoController.getAllCiclosCultivo);
router.get('/:id', cicloCultivoController.getCicloCultivoById);
router.post('/', cicloCultivoController.createCicloCultivo);
router.put('/:id', cicloCultivoController.updateCicloCultivo);
router.patch('/:id/status', cicloCultivoController.updateCicloCultivoStatus);
router.delete('/:id', cicloCultivoController.deleteCicloCultivo);
router.get('/cultivo/:id', cicloCultivoController.getCiclosByCultivo);
router.get('/reporte/generar', cicloCultivoController.generateCicloCultivoReport);

module.exports = router;
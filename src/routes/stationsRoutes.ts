import { Router } from "express";
import {
  getVerdad,
  putVerdad,
  getPilares,
  putPilares,
  getCodInconciente,
  putCodInconciente,
  getTarot,
  putTarot,
  getHumanoReal,
  putHumanoReal,
  getArteBiologico,
  putArteBiologico,
  getArteEmociones,
  putArteEmociones,
  getArteConsciencia,
  putArteConsciencia,
  getArteEnergia,
  putArteEnergia,
  getStationsSummary,
} from "@controllers/stationsController";
import { requireAuth } from "@middlewares/requireAuth";

const router = Router();

// /api/v1/stations/verdad
router.get("/verdad", requireAuth, getVerdad);
router.put("/verdad", requireAuth, putVerdad);

// /api/v1/stations/pilares
router.get("/pilares", requireAuth, getPilares);
router.put("/pilares", requireAuth, putPilares);

// /api/v1/stations/codinconciente (+ alias "codinconsciente")
router.get("/codinconciente", requireAuth, getCodInconciente);
router.put("/codinconciente", requireAuth, putCodInconciente);
router.get("/codinconsciente", requireAuth, getCodInconciente);
router.put("/codinconsciente", requireAuth, putCodInconciente);

// /api/v1/stations/tarot
router.get("/tarot", requireAuth, getTarot);
router.put("/tarot", requireAuth, putTarot);

// /api/v1/stations/humanoreal
router.get("/humanoreal", requireAuth, getHumanoReal);
router.put("/humanoreal", requireAuth, putHumanoReal);

// /api/v1/stations/artebiologico
router.get("/artebiologico", requireAuth, getArteBiologico);
router.put("/artebiologico", requireAuth, putArteBiologico);

// /api/v1/stations/arteemociones
router.get("/arteemociones", requireAuth, getArteEmociones);
router.put("/arteemociones", requireAuth, putArteEmociones);

// /api/v1/stations/arteconsciencia
router.get("/arteconsciencia", requireAuth, getArteConsciencia);
router.put("/arteconsciencia", requireAuth, putArteConsciencia);

// /api/v1/stations/arteenergia
router.get("/arteenergia", requireAuth, getArteEnergia);
router.put("/arteenergia", requireAuth, putArteEnergia);

// /api/v1/stations/summary (todas las estaciones del usuario)
router.get("/summary", requireAuth, getStationsSummary);

export default router;

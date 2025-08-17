import { Request, Response } from "express";
import { Types } from "mongoose";
import { StationEntryModel } from "@models/StationEntry";

// ==========================
// Estación: Verdad
// ==========================

export const ARCHETYPES = new Set([
  "hero",
  "mother",
  "father",
  "child",
  "trickster",
  "anima",
  "animus",
  "shadow",
  "wise",
  "spirit",
]);

export type ArchetypeId =
  | "hero"
  | "mother"
  | "father"
  | "child"
  | "trickster"
  | "anima"
  | "animus"
  | "shadow"
  | "wise"
  | "spirit";

export type VerdadPayload = {
  tableArchetypes: (ArchetypeId | null)[][];
};

export function validateVerdadPayload(
  body: any
): asserts body is VerdadPayload {
  if (!body || typeof body !== "object")
    throw new Error("Body must be an object");
  const { tableArchetypes } = body as VerdadPayload;
  if (!Array.isArray(tableArchetypes))
    throw new Error("tableArchetypes must be an array");
  if (tableArchetypes.length !== 7)
    throw new Error("tableArchetypes must have exactly 7 rows");
  tableArchetypes.forEach((row, i) => {
    if (!Array.isArray(row)) throw new Error(`Row ${i} must be an array`);
    if (row.length !== 2) throw new Error(`Row ${i} must have exactly 2 cells`);
    const [a, b] = row as (ArchetypeId | null)[];
    const isValidCell = (v: any) =>
      v === null || (typeof v === "string" && ARCHETYPES.has(v));
    if (!isValidCell(a))
      throw new Error(`Row ${i} - cell 0 must be null or a valid archetype id`);
    if (!isValidCell(b))
      throw new Error(`Row ${i} - cell 1 must be null or a valid archetype id`);
  });
}

const STATION_KEY_VERDAD = "verdad" as const;

export const getVerdad = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as Types.ObjectId;
    const doc = await StationEntryModel.findOne({
      userId,
      stationKey: STATION_KEY_VERDAD,
    });
    if (!doc) {
      res.json({ stationKey: STATION_KEY_VERDAD, data: null, updatedAt: null });
      return;
    }
    res.json({
      stationKey: STATION_KEY_VERDAD,
      data: doc.payload,
      updatedAt: doc.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

export const putVerdad = async (req: Request, res: Response) => {
  try {
    validateVerdadPayload(req.body);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Invalid payload" });
    return;
  }
  try {
    const userId = req.userId as Types.ObjectId;
    const payload = req.body as VerdadPayload;
    const updated = await StationEntryModel.findOneAndUpdate(
      { userId, stationKey: STATION_KEY_VERDAD },
      {
        $set: { payload },
        $setOnInsert: { userId, stationKey: STATION_KEY_VERDAD },
      },
      { upsert: true, new: true }
    );
    res.json({
      stationKey: STATION_KEY_VERDAD,
      data: payload,
      updatedAt: updated.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

// ==========================
// Estación: Pilares
// ==========================

export type PilaresPayload = {
  halaganTags: string[];
  criticanTags: string[];
  escasezInputs: string[];
  abundanciaInputs: string[];
  potencialUniverso: string[];
  fraseAbundancia: string;
  frasePotencialUniverso: string;
};

export function validatePilaresPayload(
  body: any
): asserts body is PilaresPayload {
  const isNonEmpty = (v: any) => typeof v === "string" && v.trim() !== "";
  const arrCheck = (a: any, len: number) =>
    Array.isArray(a) && a.length === len && a.every(isNonEmpty);
  if (!arrCheck(body?.halaganTags, 4))
    throw new Error("halaganTags debe tener 4 elementos no vacíos");
  if (new Set(body.halaganTags).size !== 4)
    throw new Error("halaganTags no deben repetirse");
  if (!arrCheck(body?.criticanTags, 4))
    throw new Error("criticanTags debe tener 4 elementos no vacíos");
  if (new Set(body.criticanTags).size !== 4)
    throw new Error("criticanTags no deben repetirse");
  if (!arrCheck(body?.escasezInputs, 8))
    throw new Error("escasezInputs debe tener 8 textos");
  if (!arrCheck(body?.abundanciaInputs, 8))
    throw new Error("abundanciaInputs debe tener 8 textos");
  if (!arrCheck(body?.potencialUniverso, 8))
    throw new Error("potencialUniverso debe tener 8 textos");
  if (!isNonEmpty(body?.fraseAbundancia))
    throw new Error("fraseAbundancia requerida");
  if (!isNonEmpty(body?.frasePotencialUniverso))
    throw new Error("frasePotencialUniverso requerida");
}

const STATION_KEY_PILARES = "pilares" as const;

export const getPilares = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as Types.ObjectId;
    const doc = await StationEntryModel.findOne({
      userId,
      stationKey: STATION_KEY_PILARES,
    }).lean();
    if (!doc) {
      res.json({
        stationKey: STATION_KEY_PILARES,
        data: null,
        updatedAt: null,
      });
      return;
    }
    res.json({
      stationKey: STATION_KEY_PILARES,
      data: doc.payload,
      updatedAt:
        (doc as any).updatedAt?.toISOString?.() ??
        (doc as any).updatedAt ??
        null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

export const putPilares = async (req: Request, res: Response) => {
  try {
    validatePilaresPayload(req.body);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Invalid payload" });
    return;
  }
  try {
    const userId = req.userId as Types.ObjectId;
    const payload = req.body as PilaresPayload;
    await StationEntryModel.updateOne(
      { userId, stationKey: STATION_KEY_PILARES },
      {
        $set: { payload },
        $setOnInsert: { userId, stationKey: STATION_KEY_PILARES },
      },
      { upsert: true }
    );
    const doc = await StationEntryModel.findOne({
      userId,
      stationKey: STATION_KEY_PILARES,
    });
    res.json({
      stationKey: STATION_KEY_PILARES,
      data: payload,
      updatedAt: doc?.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

// ==========================
// Estación: CodInconciente
// ==========================

export type CodInconcientePayload = {
  codificaciones: [string, string];
  expansiones: [string, string];
  lugares: [string, string];
  acciones1: [string, string, string];
  acciones2: [string, string, string];
};

const CODI_VALUES = new Set([
  "AYUDA-RESCATE",
  "ABANDONO",
  "ABUSO-INJUSTICIA",
  "NO SER VISTO",
  "VICTIMA",
  "SOMETIDO",
  "SER COMPRENDIDO",
]);

const LUGARES_VALUES = new Set([
  "Acepto",
  "Fluyo",
  "No Fluyo",
  "Me Adapto",
  "Rechazo",
]);

export function validateCodInconcientePayload(
  body: any
): asserts body is CodInconcientePayload {
  const isNonEmpty = (v: any) => typeof v === "string" && v.trim() !== "";
  const arrCheck = (a: any, len: number) =>
    Array.isArray(a) && a.length === len && a.every(isNonEmpty);
  if (!Array.isArray(body?.codificaciones) || body.codificaciones.length !== 2)
    throw new Error("codificaciones debe tener exactamente 2 valores");
  const [c0, c1] = body.codificaciones as string[];
  if (!CODI_VALUES.has(c0) || !CODI_VALUES.has(c1))
    throw new Error("codificaciones contiene valores no permitidos");
  if (!arrCheck(body?.expansiones, 2))
    throw new Error("expansiones debe tener 2 textos no vacíos");
  if (!Array.isArray(body?.lugares) || body.lugares.length !== 2)
    throw new Error("lugares debe tener exactamente 2 valores");
  const [l0, l1] = body.lugares as string[];
  if (!LUGARES_VALUES.has(l0) || !LUGARES_VALUES.has(l1))
    throw new Error("lugares contiene valores no permitidos");
  if (!arrCheck(body?.acciones1, 3))
    throw new Error("acciones1 debe tener 3 textos no vacíos");
  if (!arrCheck(body?.acciones2, 3))
    throw new Error("acciones2 debe tener 3 textos no vacíos");
}

const STATION_KEY_CODI = "codinconciente" as const;

export const getCodInconciente = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as Types.ObjectId;
    const doc = await StationEntryModel.findOne({
      userId,
      stationKey: STATION_KEY_CODI,
    });
    if (!doc) {
      res.json({ stationKey: STATION_KEY_CODI, data: null, updatedAt: null });
      return;
    }
    res.json({
      stationKey: STATION_KEY_CODI,
      data: doc.payload,
      updatedAt: doc.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

export const putCodInconciente = async (req: Request, res: Response) => {
  try {
    validateCodInconcientePayload(req.body?.data ?? req.body);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Invalid payload" });
    return;
  }
  try {
    const userId = req.userId as Types.ObjectId;
    const payload = (req.body?.data ?? req.body) as CodInconcientePayload;
    const updated = await StationEntryModel.findOneAndUpdate(
      { userId, stationKey: STATION_KEY_CODI },
      {
        $set: { payload },
        $setOnInsert: { userId, stationKey: STATION_KEY_CODI },
      },
      { upsert: true, new: true }
    );
    res.json({
      stationKey: STATION_KEY_CODI,
      data: payload,
      updatedAt: updated.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

// ==========================
// Estación: Tarot
// ==========================

type TarotType =
  | "linaje-materno-paterno"
  | "arbol"
  | "linea-tiempo"
  | "eventos"
  | "red-relaciones"
  | "ancestralidad";
type TarotLinaje = "materno" | "paterno";
type TarotCardCategory = "elementos" | "ambientes" | "arboles";

export type TarotCard = {
  id: number;
  name: string;
  category: TarotCardCategory;
  role: string;
};
export type TarotReading = {
  type: TarotType;
  linaje?: TarotLinaje;
  selectedCards: TarotCard[];
  integrationPhrase?: string;
};
export type TarotStationData = { readings: Record<string, TarotReading> };
export type TarotPutBody = { readingKey: string; reading: TarotReading };

const TAROT_TYPES: TarotType[] = [
  "linaje-materno-paterno",
  "arbol",
  "linea-tiempo",
  "eventos",
  "red-relaciones",
  "ancestralidad",
];
const TAROT_COUNTS: Record<TarotType, number> = {
  "linaje-materno-paterno": 5,
  arbol: 5,
  "linea-tiempo": 3,
  eventos: 2,
  "red-relaciones": 5,
  ancestralidad: 4,
};

function canonicalReadingKey(type: TarotType, linaje?: TarotLinaje) {
  if (
    type === "linaje-materno-paterno" ||
    type === "arbol" ||
    type === "ancestralidad"
  ) {
    if (!linaje) throw new Error("linaje requerido para el tipo seleccionado");
    return `${type}:${linaje}`;
  }
  return type;
}

export function validateTarotPutBody(body: any): asserts body is TarotPutBody {
  const isNonEmpty = (v: any) => typeof v === "string" && v.trim() !== "";
  if (!body || typeof body !== "object") throw new Error("Body inválido");
  const { readingKey, reading } = body as TarotPutBody;
  if (!isNonEmpty(readingKey)) throw new Error("readingKey es requerido");
  if (!reading || typeof reading !== "object")
    throw new Error("reading es requerido");
  const { type, linaje, selectedCards, integrationPhrase } = reading;
  if (!TAROT_TYPES.includes(type)) throw new Error("type inválido");
  if (
    (type === "linaje-materno-paterno" ||
      type === "arbol" ||
      type === "ancestralidad") &&
    !["materno", "paterno"].includes(linaje as any)
  ) {
    throw new Error("linaje requerido y debe ser 'materno' o 'paterno'");
  }
  if (!Array.isArray(selectedCards))
    throw new Error("selectedCards debe ser un array");
  const expected = TAROT_COUNTS[type];
  if (selectedCards.length !== expected)
    throw new Error(
      `selectedCards debe tener ${expected} elementos para el tipo ${type}`
    );
  const isValidCard = (c: any): c is TarotCard =>
    c &&
    typeof c.id === "number" &&
    Number.isFinite(c.id) &&
    isNonEmpty(c.name) &&
    ["elementos", "ambientes", "arboles"].includes(c.category) &&
    isNonEmpty(c.role);
  if (!selectedCards.every(isValidCard))
    throw new Error("selectedCards contiene cartas inválidas");
  if (!isNonEmpty(integrationPhrase))
    throw new Error("integrationPhrase requerida");
  const canonical = canonicalReadingKey(type, linaje);
  if (canonical !== readingKey)
    throw new Error(`readingKey inválido, se esperaba '${canonical}'`);
}

const STATION_KEY_TAROT = "tarot" as const;

export const getTarot = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as Types.ObjectId;
    const doc = await StationEntryModel.findOne({
      userId,
      stationKey: STATION_KEY_TAROT,
    });
    if (!doc) {
      res.json({ stationKey: STATION_KEY_TAROT, data: null, updatedAt: null });
      return;
    }
    res.json({
      stationKey: STATION_KEY_TAROT,
      data: doc.payload,
      updatedAt: doc.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

export const putTarot = async (req: Request, res: Response) => {
  try {
    const roleNames = (req.currentUser?.roles || [])
      .map((r: any) => r?.name)
      .filter(Boolean);
    if (!roleNames.some((n: string) => n === "admin" || n === "user")) {
      res.status(403).json({ message: "forbidden" });
      return;
    }
    validateTarotPutBody(req.body);
  } catch (err: any) {
    res.status(400).json({ message: err?.message ?? "Invalid payload" });
    return;
  }
  try {
    const userId = req.userId as Types.ObjectId;
    const { readingKey, reading } = req.body as TarotPutBody;
    const updated = await StationEntryModel.findOneAndUpdate(
      { userId, stationKey: STATION_KEY_TAROT },
      { $set: { ["payload.readings." + readingKey]: reading } },
      { upsert: true, new: true }
    );
    res.json({
      stationKey: STATION_KEY_TAROT,
      data: updated.payload,
      updatedAt: updated.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

// ==========================
// Estación: Humano Real (usa station_entries)
// ==========================

const STATION_KEY_HUMANOREAL = "humanoreal" as const;
type HumanorealValue = "Humano" | "Cristal";
type HumanorealBody = {
  soyMas: HumanorealValue;
  mi: HumanorealValue;
  debeAbrazar: HumanorealValue;
};

export function validateHumanoreal(body: any): asserts body is HumanorealBody {
  const allowed = new Set(["Humano", "Cristal"]);
  const isVal = (v: any) => typeof v === "string" && allowed.has(v);
  if (!isVal(body?.soyMas)) throw new Error("soyMas inválido");
  if (!isVal(body?.mi)) throw new Error("mi inválido");
  if (!isVal(body?.debeAbrazar)) throw new Error("debeAbrazar inválido");
  if (body.mi !== body.soyMas) throw new Error("mi debe ser igual a soyMas");
  const opposite = body.soyMas === "Humano" ? "Cristal" : "Humano";
  if (body.debeAbrazar !== opposite)
    throw new Error("debeAbrazar debe ser el opuesto de soyMas");
}

export const getHumanoReal = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as Types.ObjectId;
    const doc = await StationEntryModel.findOne({
      userId,
      stationKey: STATION_KEY_HUMANOREAL,
    });
    if (!doc) {
      res.json({
        stationKey: STATION_KEY_HUMANOREAL,
        data: null,
        updatedAt: null,
      });
      return;
    }
    res.json({
      stationKey: STATION_KEY_HUMANOREAL,
      data: doc.payload ?? null,
      updatedAt: doc.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

export const putHumanoReal = async (req: Request, res: Response) => {
  const roleNames = (req.currentUser?.roles || [])
    .map((r: any) => r?.name)
    .filter(Boolean);
  if (!roleNames.some((n: string) => n === "admin" || n === "user")) {
    res.status(401).json({ message: "unauthorized" });
    return;
  }
  try {
    validateHumanoreal(req.body);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Body inválido" });
    return;
  }
  try {
    const userId = req.userId as Types.ObjectId;
    const payload = req.body as HumanorealBody;
    const updated = await StationEntryModel.findOneAndUpdate(
      { userId, stationKey: STATION_KEY_HUMANOREAL },
      {
        $set: { payload },
        $setOnInsert: { userId, stationKey: STATION_KEY_HUMANOREAL },
      },
      { upsert: true, new: true }
    );
    res.json({
      stationKey: STATION_KEY_HUMANOREAL,
      data: payload,
      updatedAt: updated.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

// ==========================
// Estación: Arte Biológico
// ==========================

const STATION_KEY_ARTE_BIO = "artebiologico" as const;

export type ArteBiologicoCodId =
  | "AYUDA_RESCATE"
  | "VICTIMA"
  | "ABUSO_INJUSTICIA"
  | "SOMETIMIENTO"
  | "ABANDONO"
  | "RECONOCIMIENTO"
  | "SER_COMPRENDIDO";

export type ArteBiologicoSelected = {
  name: string;
  codId: ArteBiologicoCodId;
  codLabel?: string;
  expansion: string;
};

export type ArteBiologicoData = {
  selected: ArteBiologicoSelected[];
  actions: Partial<Record<ArteBiologicoCodId, string>>;
};

const ARTE_BIO_CODS = new Set<ArteBiologicoCodId>([
  "AYUDA_RESCATE",
  "VICTIMA",
  "ABUSO_INJUSTICIA",
  "SOMETIMIENTO",
  "ABANDONO",
  "RECONOCIMIENTO",
  "SER_COMPRENDIDO",
]);

export function validateArteBiologicoPayload(
  body: any
): asserts body is ArteBiologicoData {
  if (!body || typeof body !== "object") throw new Error("Body inválido");

  const { selected, actions } = body as ArteBiologicoData;
  if (!Array.isArray(selected) || selected.length !== 3) {
    throw new Error("Debe seleccionar exactamente 3 dolencias");
  }

  const nonEmpty = (v: any) => typeof v === "string" && v.trim() !== "";

  selected.forEach((item, idx) => {
    if (!item || typeof item !== "object")
      throw new Error(`Ítem seleccionado inválido en posición ${idx}`);
    if (!nonEmpty(item.name))
      throw new Error(`El nombre es requerido en la posición ${idx}`);
    if (!ARTE_BIO_CODS.has(item.codId))
      throw new Error(`codId inválido en la posición ${idx}`);
    if (!nonEmpty(item.expansion))
      throw new Error(`La expansión es requerida en la posición ${idx}`);
    if (item.codLabel != null && typeof item.codLabel !== "string")
      throw new Error(`codLabel inválido en la posición ${idx}`);
  });

  if (!actions || typeof actions !== "object") {
    throw new Error(
      "Complete las acciones para cada codificación seleccionada"
    );
  }

  const requiredCods = Array.from(new Set(selected.map((s) => s.codId)));
  for (const cod of requiredCods) {
    const val = (actions as any)[cod];
    if (typeof val !== "string" || val.trim() === "") {
      throw new Error(
        "Complete las acciones para cada codificación seleccionada"
      );
    }
  }
}

export const getArteBiologico = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as Types.ObjectId;
    const doc = await StationEntryModel.findOne({
      userId,
      stationKey: STATION_KEY_ARTE_BIO,
    });
    if (!doc) {
      res.json({
        stationKey: STATION_KEY_ARTE_BIO,
        data: null,
        updatedAt: null,
      });
      return;
    }
    res.json({
      stationKey: STATION_KEY_ARTE_BIO,
      data: doc.payload ?? null,
      updatedAt: doc.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

export const putArteBiologico = async (req: Request, res: Response) => {
  // Validación
  try {
    validateArteBiologicoPayload(req.body);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Invalid payload" });
    return;
  }

  try {
    const userId = req.userId as Types.ObjectId;
    const body = req.body as ArteBiologicoData;

    // Sanitización: trim de strings y filtrar actions a solo codIds seleccionados únicos
    const selectedUnique = body.selected.map((s) => ({
      name: s.name.trim(),
      codId: s.codId,
      codLabel: typeof s.codLabel === "string" ? s.codLabel.trim() : s.codLabel,
      expansion: s.expansion.trim(),
    }));
    const cods = Array.from(new Set(selectedUnique.map((s) => s.codId)));
    const cleanedActions: Partial<Record<ArteBiologicoCodId, string>> = {};
    for (const cod of cods) {
      const raw = (body.actions as any)[cod];
      const t = typeof raw === "string" ? raw.trim() : "";
      if (!t) {
        // Seguridad extra, debería estar garantizado por validate
        res.status(400).json({
          message: "Complete las acciones para cada codificación seleccionada",
        });
        return;
      }
      cleanedActions[cod] = t;
    }

    const payload: ArteBiologicoData = {
      selected: selectedUnique,
      actions: cleanedActions,
    };

    const updated = await StationEntryModel.findOneAndUpdate(
      { userId, stationKey: STATION_KEY_ARTE_BIO },
      {
        $set: { payload, updatedAt: new Date() },
        $setOnInsert: { userId, stationKey: STATION_KEY_ARTE_BIO },
      },
      { upsert: true, new: true }
    );

    res.json({
      stationKey: STATION_KEY_ARTE_BIO,
      data: payload,
      updatedAt: updated.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

// ==========================
// Estación: Arte Emociones
// ==========================

const STATION_KEY_ARTE_EMO = "arteemociones" as const;

export type BodyKey = "consciencia" | "biologia" | "emocional";

export type EmotionEntry = {
  low: string;
  high: string;
  expansion: string;
};

export type FearEntry = {
  fear: string;
  resign: string;
};

export type ArteEmocionesPayload = {
  cuerpos: Record<BodyKey, EmotionEntry>;
  miedos: [FearEntry, FearEntry];
};

export function validateArteEmocionesPayload(
  body: any
): asserts body is ArteEmocionesPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Body inválido");
  }
  const { cuerpos, miedos } = body as ArteEmocionesPayload;

  // Validación de cuerpos
  const requiredBodies: BodyKey[] = ["consciencia", "biologia", "emocional"];
  if (!cuerpos || typeof cuerpos !== "object") {
    throw new Error("cuerpos es requerido");
  }
  // Debe incluir exactamente las 3 claves requeridas
  const cuerpoKeys = Object.keys(cuerpos);
  const hasAll = requiredBodies.every((k) => k in cuerpos);
  if (!hasAll || cuerpoKeys.length !== requiredBodies.length) {
    throw new Error(
      "cuerpos debe incluir exactamente: consciencia, biologia, emocional"
    );
  }
  const nonEmpty = (v: any) => typeof v === "string" && v.trim() !== "";
  for (const key of requiredBodies) {
    const entry = (cuerpos as any)[key];
    if (!entry || typeof entry !== "object") {
      throw new Error(`Entrada de cuerpo inválida para '${key}'`);
    }
    if (!nonEmpty(entry.low))
      throw new Error(`'low' es requerido para '${key}'`);
    if (!nonEmpty(entry.high))
      throw new Error(`'high' es requerido para '${key}'`);
    if (!nonEmpty(entry.expansion))
      throw new Error(`'expansion' es requerida para '${key}'`);
  }

  // Validación de miedos
  if (!Array.isArray(miedos) || miedos.length !== 2) {
    throw new Error("miedos debe tener exactamente 2 elementos");
  }
  miedos.forEach((m, idx) => {
    if (!m || typeof m !== "object")
      throw new Error(`Entrada de miedo inválida en posición ${idx}`);
    if (!nonEmpty(m.fear))
      throw new Error(`'fear' es requerido en posición ${idx}`);
    if (!nonEmpty(m.resign))
      throw new Error(`'resign' es requerido en posición ${idx}`);
  });
}

export const getArteEmociones = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as Types.ObjectId;
    const doc = await StationEntryModel.findOne({
      userId,
      stationKey: STATION_KEY_ARTE_EMO,
    });
    if (!doc) {
      res.json({
        stationKey: STATION_KEY_ARTE_EMO,
        data: null,
        updatedAt: null,
      });
      return;
    }
    res.json({
      stationKey: STATION_KEY_ARTE_EMO,
      data: doc.payload ?? null,
      updatedAt: doc.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

export const putArteEmociones = async (req: Request, res: Response) => {
  // Validación
  try {
    validateArteEmocionesPayload(req.body);
  } catch (err: any) {
    res.status(400).json({ message: err.message ?? "Invalid payload" });
    return;
  }

  try {
    const userId = req.userId as Types.ObjectId;
    const body = req.body as ArteEmocionesPayload;

    // Sanitización: trim de todos los strings y limitar cuerpos a las claves requeridas
    const trim = (s: string) => s.trim();
    const cleanedCuerpos: ArteEmocionesPayload["cuerpos"] = {
      consciencia: {
        low: trim(body.cuerpos.consciencia.low),
        high: trim(body.cuerpos.consciencia.high),
        expansion: trim(body.cuerpos.consciencia.expansion),
      },
      biologia: {
        low: trim(body.cuerpos.biologia.low),
        high: trim(body.cuerpos.biologia.high),
        expansion: trim(body.cuerpos.biologia.expansion),
      },
      emocional: {
        low: trim(body.cuerpos.emocional.low),
        high: trim(body.cuerpos.emocional.high),
        expansion: trim(body.cuerpos.emocional.expansion),
      },
    };

    const cleanedMiedos: [FearEntry, FearEntry] = [
      {
        fear: trim(body.miedos[0].fear),
        resign: trim(body.miedos[0].resign),
      },
      {
        fear: trim(body.miedos[1].fear),
        resign: trim(body.miedos[1].resign),
      },
    ];

    const payload: ArteEmocionesPayload = {
      cuerpos: cleanedCuerpos,
      miedos: cleanedMiedos,
    };

    const updated = await StationEntryModel.findOneAndUpdate(
      { userId, stationKey: STATION_KEY_ARTE_EMO },
      {
        $set: { payload, updatedAt: new Date() },
        $setOnInsert: { userId, stationKey: STATION_KEY_ARTE_EMO },
      },
      { upsert: true, new: true }
    );

    res.json({
      stationKey: STATION_KEY_ARTE_EMO,
      data: payload,
      updatedAt: updated.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

// ==========================
// Estación: Arte Consciencia
// ==========================

const STATION_KEY_ARTE_CON = "arteconsciencia" as const;

export type ArteConscienciaPayload = {
  formasConsciencia: string;
  escrituraLibre: string;
};

export function validateArteConscienciaPayload(
  body: any
): asserts body is ArteConscienciaPayload {
  const MAX = 5000;
  const nonEmpty = (v: any) => typeof v === "string" && v.trim().length > 0;
  if (!body || typeof body !== "object") {
    throw new Error("Body inválido");
  }
  const { formasConsciencia, escrituraLibre } = body as ArteConscienciaPayload;
  if (!nonEmpty(formasConsciencia))
    throw new Error("'formasConsciencia' es requerido");
  if (!nonEmpty(escrituraLibre))
    throw new Error("'escrituraLibre' es requerido");
  if (formasConsciencia.trim().length > MAX)
    throw new Error("'formasConsciencia' excede el máximo de 5000 caracteres");
  if (escrituraLibre.trim().length > MAX)
    throw new Error("'escrituraLibre' excede el máximo de 5000 caracteres");
}

function hasUserRole(req: Request) {
  const roleNames = (req.currentUser?.roles || [])
    .map((r: any) => r?.name)
    .filter(Boolean);
  return roleNames.some((n: string) => n === "admin" || n === "user");
}

export const getArteConsciencia = async (req: Request, res: Response) => {
  try {
    if (!hasUserRole(req)) {
      res.status(403).json({ message: "forbidden" });
      return;
    }
    const userId = req.userId as Types.ObjectId;
    const doc = await StationEntryModel.findOne({
      userId,
      stationKey: STATION_KEY_ARTE_CON,
    });
    if (!doc) {
      res.json({
        stationKey: STATION_KEY_ARTE_CON,
        data: null,
        updatedAt: null,
      });
      return;
    }
    res.json({
      stationKey: STATION_KEY_ARTE_CON,
      data: doc.payload ?? null,
      updatedAt: doc.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

export const putArteConsciencia = async (req: Request, res: Response) => {
  try {
    if (!hasUserRole(req)) {
      res.status(403).json({ message: "forbidden" });
      return;
    }
    validateArteConscienciaPayload(req.body);
  } catch (err: any) {
    // Si proviene de requireAuth (JWT inválido), ya respondió 401.
    if (err?.status === 401) {
      return;
    }
    res.status(400).json({ message: err?.message ?? "Invalid payload" });
    return;
  }

  try {
    const userId = req.userId as Types.ObjectId;
    const MAX = 5000;
    const trimLimit = (s: string) => s.trim().slice(0, MAX);
    const body = req.body as ArteConscienciaPayload;

    const payload: ArteConscienciaPayload = {
      formasConsciencia: trimLimit(body.formasConsciencia),
      escrituraLibre: trimLimit(body.escrituraLibre),
    };

    const updated = await StationEntryModel.findOneAndUpdate(
      { userId, stationKey: STATION_KEY_ARTE_CON },
      {
        $set: { payload, updatedAt: new Date() },
        $setOnInsert: { userId, stationKey: STATION_KEY_ARTE_CON },
      },
      { upsert: true, new: true }
    );

    res.json({
      stationKey: STATION_KEY_ARTE_CON,
      data: payload,
      updatedAt: updated.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

// ==========================
// Estación: Arte Energía
// ==========================

const STATION_KEY_ARTE_ENE = "arteenergia" as const;

export type ArteEnergiaPayload = {
  bitacoraTexto: string; // 1..5000
  quienEres: string; // 1..2000
  caminosTransitaste: string; // 1..2000
  dondeEvolucion: string; // 1..2000
};

export function validateArteEnergiaPayload(
  body: any
): asserts body is ArteEnergiaPayload {
  const MAX = {
    bitacoraTexto: 5000,
    quienEres: 2000,
    caminosTransitaste: 2000,
    dondeEvolucion: 2000,
  } as const;
  const fields = [
    "bitacoraTexto",
    "quienEres",
    "caminosTransitaste",
    "dondeEvolucion",
  ] as const;
  if (!body || typeof body !== "object") {
    const e: any = new Error("Body inválido");
    e.status = 422;
    throw e;
  }
  for (const k of fields) {
    const v = (body as any)[k];
    if (typeof v !== "string" || v.trim() === "") {
      const e: any = new Error(`${k} es requerido`);
      e.status = 422;
      throw e;
    }
    if (v.trim().length > MAX[k]) {
      const e: any = new Error(`${k} excede el máximo de ${MAX[k]} caracteres`);
      e.status = 422;
      throw e;
    }
  }
}

export const getArteEnergia = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as Types.ObjectId;
    const doc = await StationEntryModel.findOne({
      userId,
      stationKey: STATION_KEY_ARTE_ENE,
    });
    if (!doc) {
      res.json({
        stationKey: STATION_KEY_ARTE_ENE,
        data: null,
        updatedAt: null,
      });
      return;
    }
    res.json({
      stationKey: STATION_KEY_ARTE_ENE,
      data: doc.payload ?? null,
      updatedAt: doc.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

export const putArteEnergia = async (req: Request, res: Response) => {
  try {
    validateArteEnergiaPayload(req.body);
  } catch (err: any) {
    const status = err?.status === 422 ? 422 : 422;
    res
      .status(status)
      .json({ message: err?.message ?? "Unprocessable Entity" });
    return;
  }

  try {
    const userId = req.userId as Types.ObjectId;
    const MAX = {
      bitacoraTexto: 5000,
      quienEres: 2000,
      caminosTransitaste: 2000,
      dondeEvolucion: 2000,
    } as const;
    const trimCap = (s: string, n: number) => s.trim().slice(0, n);
    const body = req.body as ArteEnergiaPayload;
    const payload: ArteEnergiaPayload = {
      bitacoraTexto: trimCap(body.bitacoraTexto, MAX.bitacoraTexto),
      quienEres: trimCap(body.quienEres, MAX.quienEres),
      caminosTransitaste: trimCap(
        body.caminosTransitaste,
        MAX.caminosTransitaste
      ),
      dondeEvolucion: trimCap(body.dondeEvolucion, MAX.dondeEvolucion),
    };

    const updated = await StationEntryModel.findOneAndUpdate(
      { userId, stationKey: STATION_KEY_ARTE_ENE },
      {
        $set: { payload, updatedAt: new Date() },
        $setOnInsert: { userId, stationKey: STATION_KEY_ARTE_ENE },
      },
      { upsert: true, new: true }
    );

    res.json({
      stationKey: STATION_KEY_ARTE_ENE,
      data: payload,
      updatedAt: updated.updatedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? err });
  }
};

// ==========================
// Resumen de estaciones (agregado)
// ==========================

const KNOWN_STATION_KEYS = [
  "verdad",
  "pilares",
  "codinconciente",
  "tarot",
  "humanoreal",
  "artebiologico",
  "arteemociones",
  "arteconsciencia",
  "arteenergia",
] as const;

type KnownStationKey = (typeof KNOWN_STATION_KEYS)[number];

export const getStationsSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as Types.ObjectId;
    const docs = await StationEntryModel.find({ userId }).lean();

    // Base con todas las estaciones conocidas en null para claves consistentes
    const base: Record<
      KnownStationKey,
      { data: any | null; updatedAt: string | null }
    > = KNOWN_STATION_KEYS.reduce((acc: any, k) => {
      acc[k] = { data: null, updatedAt: null };
      return acc;
    }, {});

    for (const d of docs) {
      const key = (d as any).stationKey as string;
      if ((KNOWN_STATION_KEYS as readonly string[]).includes(key)) {
        (base as any)[key] = {
          data: (d as any).payload ?? null,
          updatedAt:
            (d as any).updatedAt?.toISOString?.() ??
            (d as any).updatedAt ??
            null,
        };
      }
    }

    res.json({
      userId: String(userId),
      stations: base,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ message: err?.message ?? err });
  }
};

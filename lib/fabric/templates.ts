// Plantillas de collage para ImprimeYA
// Cada slot define un area donde va una imagen

export interface CollageSlot {
  id: string;
  // Posicion y tamano como porcentaje (0-100)
  x: number;      // Porcentaje desde izquierda
  y: number;      // Porcentaje desde arriba
  width: number;  // Porcentaje del ancho total
  height: number; // Porcentaje del alto total
  rotation?: number; // Rotacion en grados
}

export interface CollageTemplate {
  id: string;
  name: string;
  description: string;
  slots: CollageSlot[];
  aspectRatio: string;  // "4:6", "5:7", etc.
  previewUrl?: string;
  isPremium: boolean;
  premiumPrice?: number; // Precio adicional en colones
}

// Plantillas basicas (2 fotos)
const TEMPLATE_2_HORIZONTAL: CollageTemplate = {
  id: "2-horizontal",
  name: "2 Fotos Horizontal",
  description: "Dos fotos lado a lado",
  aspectRatio: "4:6",
  isPremium: false,
  slots: [
    { id: "1", x: 1, y: 1, width: 48, height: 98 },
    { id: "2", x: 51, y: 1, width: 48, height: 98 },
  ],
};

const TEMPLATE_2_VERTICAL: CollageTemplate = {
  id: "2-vertical",
  name: "2 Fotos Vertical",
  description: "Dos fotos apiladas",
  aspectRatio: "4:6",
  isPremium: false,
  slots: [
    { id: "1", x: 1, y: 1, width: 98, height: 48 },
    { id: "2", x: 1, y: 51, width: 98, height: 48 },
  ],
};

const TEMPLATE_2_DIAGONAL: CollageTemplate = {
  id: "2-diagonal",
  name: "2 Fotos Diagonal",
  description: "Dos fotos en diagonal",
  aspectRatio: "4:6",
  isPremium: false,
  slots: [
    { id: "1", x: 5, y: 5, width: 55, height: 55, rotation: -5 },
    { id: "2", x: 40, y: 40, width: 55, height: 55, rotation: 5 },
  ],
};

// Plantillas de 3 fotos
const TEMPLATE_3_GRID: CollageTemplate = {
  id: "3-grid",
  name: "3 Fotos Grid",
  description: "Una grande arriba, dos abajo",
  aspectRatio: "4:6",
  isPremium: false,
  slots: [
    { id: "1", x: 1, y: 1, width: 98, height: 64 },
    { id: "2", x: 1, y: 67, width: 48, height: 32 },
    { id: "3", x: 51, y: 67, width: 48, height: 32 },
  ],
};

const TEMPLATE_3_VERTICAL: CollageTemplate = {
  id: "3-vertical",
  name: "3 Fotos Vertical",
  description: "Tres fotos apiladas",
  aspectRatio: "4:6",
  isPremium: false,
  slots: [
    { id: "1", x: 1, y: 1, width: 98, height: 32 },
    { id: "2", x: 1, y: 34, width: 98, height: 32 },
    { id: "3", x: 1, y: 67, width: 98, height: 32 },
  ],
};

const TEMPLATE_3_SIDEBAR: CollageTemplate = {
  id: "3-sidebar",
  name: "3 Fotos Lateral",
  description: "Una grande, dos al lado",
  aspectRatio: "4:6",
  isPremium: false,
  slots: [
    { id: "1", x: 1, y: 1, width: 64, height: 98 },
    { id: "2", x: 67, y: 1, width: 32, height: 48 },
    { id: "3", x: 67, y: 51, width: 32, height: 48 },
  ],
};

// Plantillas de 4 fotos
const TEMPLATE_4_GRID: CollageTemplate = {
  id: "4-grid",
  name: "4 Fotos Grid",
  description: "Cuatro fotos en cuadricula",
  aspectRatio: "4:6",
  isPremium: false,
  slots: [
    { id: "1", x: 1, y: 1, width: 48, height: 48 },
    { id: "2", x: 51, y: 1, width: 48, height: 48 },
    { id: "3", x: 1, y: 51, width: 48, height: 48 },
    { id: "4", x: 51, y: 51, width: 48, height: 48 },
  ],
};

const TEMPLATE_4_POLAROID: CollageTemplate = {
  id: "4-polaroid",
  name: "4 Fotos Polaroid",
  description: "Estilo polaroid dispersas",
  aspectRatio: "4:6",
  isPremium: true,
  premiumPrice: 200,
  slots: [
    { id: "1", x: 5, y: 5, width: 45, height: 45, rotation: -8 },
    { id: "2", x: 50, y: 8, width: 45, height: 45, rotation: 6 },
    { id: "3", x: 8, y: 50, width: 45, height: 45, rotation: 4 },
    { id: "4", x: 48, y: 52, width: 45, height: 45, rotation: -5 },
  ],
};

const TEMPLATE_4_FEATURE: CollageTemplate = {
  id: "4-feature",
  name: "4 Fotos Destacada",
  description: "Una grande, tres pequenas",
  aspectRatio: "4:6",
  isPremium: false,
  slots: [
    { id: "1", x: 1, y: 1, width: 64, height: 98 },
    { id: "2", x: 67, y: 1, width: 32, height: 32 },
    { id: "3", x: 67, y: 34, width: 32, height: 32 },
    { id: "4", x: 67, y: 67, width: 32, height: 32 },
  ],
};

// Plantillas de 6 fotos
const TEMPLATE_6_GRID: CollageTemplate = {
  id: "6-grid",
  name: "6 Fotos Grid",
  description: "Seis fotos en cuadricula 2x3",
  aspectRatio: "4:6",
  isPremium: false,
  slots: [
    { id: "1", x: 1, y: 1, width: 48, height: 32 },
    { id: "2", x: 51, y: 1, width: 48, height: 32 },
    { id: "3", x: 1, y: 34, width: 48, height: 32 },
    { id: "4", x: 51, y: 34, width: 48, height: 32 },
    { id: "5", x: 1, y: 67, width: 48, height: 32 },
    { id: "6", x: 51, y: 67, width: 48, height: 32 },
  ],
};

const TEMPLATE_6_MOSAIC: CollageTemplate = {
  id: "6-mosaic",
  name: "6 Fotos Mosaico",
  description: "Mosaico asimetrico",
  aspectRatio: "4:6",
  isPremium: true,
  premiumPrice: 200,
  slots: [
    { id: "1", x: 1, y: 1, width: 64, height: 48 },
    { id: "2", x: 67, y: 1, width: 32, height: 24 },
    { id: "3", x: 67, y: 26, width: 32, height: 24 },
    { id: "4", x: 1, y: 51, width: 32, height: 48 },
    { id: "5", x: 34, y: 51, width: 32, height: 48 },
    { id: "6", x: 67, y: 51, width: 32, height: 48 },
  ],
};

// Plantillas de 9 fotos
const TEMPLATE_9_GRID: CollageTemplate = {
  id: "9-grid",
  name: "9 Fotos Grid",
  description: "Nueve fotos en cuadricula 3x3",
  aspectRatio: "4:6",
  isPremium: false,
  slots: [
    { id: "1", x: 1, y: 1, width: 32, height: 32 },
    { id: "2", x: 34, y: 1, width: 32, height: 32 },
    { id: "3", x: 67, y: 1, width: 32, height: 32 },
    { id: "4", x: 1, y: 34, width: 32, height: 32 },
    { id: "5", x: 34, y: 34, width: 32, height: 32 },
    { id: "6", x: 67, y: 34, width: 32, height: 32 },
    { id: "7", x: 1, y: 67, width: 32, height: 32 },
    { id: "8", x: 34, y: 67, width: 32, height: 32 },
    { id: "9", x: 67, y: 67, width: 32, height: 32 },
  ],
};

// Exportar todas las plantillas
export const COLLAGE_TEMPLATES: CollageTemplate[] = [
  // 2 fotos
  TEMPLATE_2_HORIZONTAL,
  TEMPLATE_2_VERTICAL,
  TEMPLATE_2_DIAGONAL,
  // 3 fotos
  TEMPLATE_3_GRID,
  TEMPLATE_3_VERTICAL,
  TEMPLATE_3_SIDEBAR,
  // 4 fotos
  TEMPLATE_4_GRID,
  TEMPLATE_4_POLAROID,
  TEMPLATE_4_FEATURE,
  // 6 fotos
  TEMPLATE_6_GRID,
  TEMPLATE_6_MOSAIC,
  // 9 fotos
  TEMPLATE_9_GRID,
];

// Agrupar por numero de fotos
export const TEMPLATES_BY_SLOTS: Record<number, CollageTemplate[]> = {
  2: [TEMPLATE_2_HORIZONTAL, TEMPLATE_2_VERTICAL, TEMPLATE_2_DIAGONAL],
  3: [TEMPLATE_3_GRID, TEMPLATE_3_VERTICAL, TEMPLATE_3_SIDEBAR],
  4: [TEMPLATE_4_GRID, TEMPLATE_4_POLAROID, TEMPLATE_4_FEATURE],
  6: [TEMPLATE_6_GRID, TEMPLATE_6_MOSAIC],
  9: [TEMPLATE_9_GRID],
};

// Obtener plantilla por ID
export function getTemplateById(id: string): CollageTemplate | undefined {
  return COLLAGE_TEMPLATES.find((t) => t.id === id);
}

// Obtener plantillas por numero de fotos
export function getTemplatesBySlots(slots: number): CollageTemplate[] {
  return TEMPLATES_BY_SLOTS[slots] || [];
}

// Calcular posiciones reales de los slots dado un canvas
export interface SlotPosition {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: number;
}

export function calculateSlotPositions(
  template: CollageTemplate,
  canvasWidth: number,
  canvasHeight: number
): SlotPosition[] {
  return template.slots.map((slot) => ({
    id: slot.id,
    left: (slot.x / 100) * canvasWidth,
    top: (slot.y / 100) * canvasHeight,
    width: (slot.width / 100) * canvasWidth,
    height: (slot.height / 100) * canvasHeight,
    rotation: slot.rotation || 0,
  }));
}

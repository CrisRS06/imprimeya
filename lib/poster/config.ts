// Configuracion de poster multi-hoja
// Cada hoja es del tamano de impresion seleccionado

export interface PosterConfig {
  id: string;
  name: string;
  description: string;
  rows: number;
  cols: number;
  sheets: number; // Total de hojas
}

// Configuraciones disponibles de poster
export const POSTER_CONFIGS: PosterConfig[] = [
  {
    id: "2x1",
    name: "2 hojas horizontal",
    description: "2 columnas x 1 fila",
    rows: 1,
    cols: 2,
    sheets: 2,
  },
  {
    id: "1x2",
    name: "2 hojas vertical",
    description: "1 columna x 2 filas",
    rows: 2,
    cols: 1,
    sheets: 2,
  },
  {
    id: "2x2",
    name: "4 hojas (2x2)",
    description: "Poster cuadrado grande",
    rows: 2,
    cols: 2,
    sheets: 4,
  },
  {
    id: "3x2",
    name: "6 hojas (3x2)",
    description: "Poster horizontal grande",
    rows: 2,
    cols: 3,
    sheets: 6,
  },
  {
    id: "2x3",
    name: "6 hojas (2x3)",
    description: "Poster vertical grande",
    rows: 3,
    cols: 2,
    sheets: 6,
  },
  {
    id: "3x3",
    name: "9 hojas (3x3)",
    description: "Poster extra grande",
    rows: 3,
    cols: 3,
    sheets: 9,
  },
  {
    id: "4x3",
    name: "12 hojas (4x3)",
    description: "Poster panoramico horizontal",
    rows: 3,
    cols: 4,
    sheets: 12,
  },
  {
    id: "3x4",
    name: "12 hojas (3x4)",
    description: "Poster panoramico vertical",
    rows: 4,
    cols: 3,
    sheets: 12,
  },
];

// Obtener config por ID
export function getPosterConfigById(id: string): PosterConfig | undefined {
  return POSTER_CONFIGS.find((c) => c.id === id);
}

// Calcular dimensiones totales del poster
export interface PosterDimensions {
  totalWidthInches: number;
  totalHeightInches: number;
  sheetWidthInches: number;
  sheetHeightInches: number;
  overlapInches: number; // Area de solapamiento para pegar
}

export function calculatePosterDimensions(
  config: PosterConfig,
  sheetWidthInches: number,
  sheetHeightInches: number,
  overlapInches = 0.5 // Media pulgada de solapamiento
): PosterDimensions {
  // El tamanio total considera el solapamiento
  const effectiveSheetWidth = sheetWidthInches - overlapInches;
  const effectiveSheetHeight = sheetHeightInches - overlapInches;

  return {
    totalWidthInches:
      effectiveSheetWidth * config.cols + overlapInches,
    totalHeightInches:
      effectiveSheetHeight * config.rows + overlapInches,
    sheetWidthInches,
    sheetHeightInches,
    overlapInches,
  };
}

// Generar grid de hojas con sus posiciones
export interface SheetPosition {
  id: string;
  row: number;
  col: number;
  // Posicion relativa en el poster completo (0-1)
  x: number;
  y: number;
  width: number;
  height: number;
  // Marcadores de alineacion
  hasTopMarker: boolean;
  hasBottomMarker: boolean;
  hasLeftMarker: boolean;
  hasRightMarker: boolean;
}

export function generateSheetPositions(config: PosterConfig): SheetPosition[] {
  const sheets: SheetPosition[] = [];
  const sheetWidth = 1 / config.cols;
  const sheetHeight = 1 / config.rows;

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      sheets.push({
        id: `${row}-${col}`,
        row,
        col,
        x: col * sheetWidth,
        y: row * sheetHeight,
        width: sheetWidth,
        height: sheetHeight,
        // Marcadores en los bordes interiores
        hasTopMarker: row > 0,
        hasBottomMarker: row < config.rows - 1,
        hasLeftMarker: col > 0,
        hasRightMarker: col < config.cols - 1,
      });
    }
  }

  return sheets;
}

// Formato humano para dimensiones
export function formatPosterSize(
  dimensions: PosterDimensions
): string {
  const widthFeet = Math.floor(dimensions.totalWidthInches / 12);
  const widthInches = Math.round(dimensions.totalWidthInches % 12);
  const heightFeet = Math.floor(dimensions.totalHeightInches / 12);
  const heightInches = Math.round(dimensions.totalHeightInches % 12);

  let width = "";
  let height = "";

  if (widthFeet > 0) {
    width = `${widthFeet}'${widthInches}"`;
  } else {
    width = `${widthInches}"`;
  }

  if (heightFeet > 0) {
    height = `${heightFeet}'${heightInches}"`;
  } else {
    height = `${heightInches}"`;
  }

  return `${width} x ${height}`;
}

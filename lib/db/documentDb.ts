import Dexie, { Table } from "dexie";

/**
 * Documento almacenado en IndexedDB
 * Permite PDFs de hasta 50MB+ sin limitaciones de sessionStorage
 */
export interface StoredDocument {
  id: string;
  name: string;
  pdfData: ArrayBuffer;
  size: number;
  pageCount: number;
  selectedPages: number[];
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Base de datos IndexedDB para documentos PDF
 * Usa Dexie para una API más amigable
 */
export class DocumentDatabase extends Dexie {
  documents!: Table<StoredDocument>;

  constructor() {
    super("ImprimeYADocuments");
    this.version(1).stores({
      // id es la clave primaria, createdAt tiene índice para queries
      documents: "id, createdAt",
    });
  }
}

// Singleton de la base de datos
// Solo se crea en el cliente (browser)
let documentDb: DocumentDatabase | null = null;

/**
 * Obtiene la instancia de la base de datos
 * Solo funciona en el cliente (browser)
 */
export function getDocumentDb(): DocumentDatabase {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB solo está disponible en el navegador");
  }

  if (!documentDb) {
    documentDb = new DocumentDatabase();
  }

  return documentDb;
}

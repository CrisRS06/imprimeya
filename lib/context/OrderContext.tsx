"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { ProductType, PaperType } from "@/lib/supabase/types";
import type { PrintSizeName } from "@/lib/utils/image-validation";

// Tipos para imagenes subidas
export interface UploadedImage {
  id: string;
  file?: File;
  preview: string;
  storagePath?: string;
  publicUrl?: string;
  width: number;
  height: number;
  originalName: string;
}

// Estado del editor (posicion, escala, rotacion de cada imagen)
export interface ImageEditorState {
  imageId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

// Opciones de impresion
export interface PrintOptions {
  sizeName: PrintSizeName;
  paperType: PaperType;
  quantity: number;
}

// Estado completo del pedido
export interface OrderState {
  // Tipo de producto
  productType: ProductType | null;

  // Imagenes subidas
  images: UploadedImage[];

  // Estado del editor para cada imagen
  editorStates: ImageEditorState[];

  // Template de collage seleccionado (si aplica)
  collageTemplateId: string | null;

  // Configuracion de poster (si aplica)
  posterConfig: {
    rows: number;
    cols: number;
  } | null;

  // Opciones de impresion
  printOptions: PrintOptions;

  // Session ID para este pedido
  sessionId: string | null;

  // Imagen procesada (resultado del editor)
  processedImageUrl: string | null;

  // Datos de Fabric.js serializados
  fabricData: object | null;
}

// Acciones del reducer
type OrderAction =
  | { type: "SET_PRODUCT_TYPE"; payload: ProductType }
  | { type: "ADD_IMAGES"; payload: UploadedImage[] }
  | { type: "REMOVE_IMAGE"; payload: string }
  | { type: "CLEAR_IMAGES" }
  | { type: "UPDATE_EDITOR_STATE"; payload: ImageEditorState }
  | { type: "SET_COLLAGE_TEMPLATE"; payload: string }
  | { type: "SET_POSTER_CONFIG"; payload: { rows: number; cols: number } }
  | { type: "SET_PRINT_OPTIONS"; payload: Partial<PrintOptions> }
  | { type: "SET_SESSION_ID"; payload: string }
  | { type: "SET_PROCESSED_IMAGE"; payload: string }
  | { type: "SET_FABRIC_DATA"; payload: object }
  | { type: "RESET_ORDER" }
  | { type: "LOAD_STATE"; payload: Partial<OrderState> };

// Estado inicial
const initialState: OrderState = {
  productType: null,
  images: [],
  editorStates: [],
  collageTemplateId: null,
  posterConfig: null,
  printOptions: {
    sizeName: "4x6",
    paperType: "bond_normal",
    quantity: 1,
  },
  sessionId: null,
  processedImageUrl: null,
  fabricData: null,
};

// Reducer
function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case "SET_PRODUCT_TYPE":
      return { ...state, productType: action.payload };

    case "ADD_IMAGES":
      return {
        ...state,
        images: [...state.images, ...action.payload],
        editorStates: [
          ...state.editorStates,
          ...action.payload.map((img) => ({
            imageId: img.id,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
          })),
        ],
      };

    case "REMOVE_IMAGE":
      return {
        ...state,
        images: state.images.filter((img) => img.id !== action.payload),
        editorStates: state.editorStates.filter(
          (es) => es.imageId !== action.payload
        ),
      };

    case "CLEAR_IMAGES":
      return {
        ...state,
        images: [],
        editorStates: [],
      };

    case "UPDATE_EDITOR_STATE":
      return {
        ...state,
        editorStates: state.editorStates.map((es) =>
          es.imageId === action.payload.imageId ? action.payload : es
        ),
      };

    case "SET_COLLAGE_TEMPLATE":
      return { ...state, collageTemplateId: action.payload };

    case "SET_POSTER_CONFIG":
      return { ...state, posterConfig: action.payload };

    case "SET_PRINT_OPTIONS":
      return {
        ...state,
        printOptions: { ...state.printOptions, ...action.payload },
      };

    case "SET_SESSION_ID":
      return { ...state, sessionId: action.payload };

    case "SET_PROCESSED_IMAGE":
      return { ...state, processedImageUrl: action.payload };

    case "SET_FABRIC_DATA":
      return { ...state, fabricData: action.payload };

    case "RESET_ORDER":
      return initialState;

    case "LOAD_STATE":
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

// Contexto
interface OrderContextType {
  state: OrderState;
  setProductType: (type: ProductType) => void;
  addImages: (images: UploadedImage[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  updateEditorState: (editorState: ImageEditorState) => void;
  setCollageTemplate: (templateId: string) => void;
  setPosterConfig: (config: { rows: number; cols: number }) => void;
  setPrintOptions: (options: Partial<PrintOptions>) => void;
  setSessionId: (id: string) => void;
  setProcessedImage: (url: string) => void;
  setFabricData: (data: object) => void;
  resetOrder: () => void;
}

const OrderContext = createContext<OrderContextType | null>(null);

// Storage key
const STORAGE_KEY = "imprimeya_order_state";

// Provider
export function OrderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(orderReducer, initialState);

  // Cargar estado desde localStorage al montar
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // No cargar files ya que no se pueden serializar
        dispatch({ type: "LOAD_STATE", payload: parsed });
      } catch {
        // Si hay error, limpiar storage
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Guardar estado en localStorage cuando cambie
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Crear version serializable (sin File objects)
    const toSave = {
      ...state,
      images: state.images.map((img) => ({
        ...img,
        file: undefined, // No serializar File
      })),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [state]);

  // Acciones
  const setProductType = useCallback((type: ProductType) => {
    dispatch({ type: "SET_PRODUCT_TYPE", payload: type });
  }, []);

  const addImages = useCallback((images: UploadedImage[]) => {
    dispatch({ type: "ADD_IMAGES", payload: images });
  }, []);

  const removeImage = useCallback((id: string) => {
    dispatch({ type: "REMOVE_IMAGE", payload: id });
  }, []);

  const clearImages = useCallback(() => {
    dispatch({ type: "CLEAR_IMAGES" });
  }, []);

  const updateEditorState = useCallback((editorState: ImageEditorState) => {
    dispatch({ type: "UPDATE_EDITOR_STATE", payload: editorState });
  }, []);

  const setCollageTemplate = useCallback((templateId: string) => {
    dispatch({ type: "SET_COLLAGE_TEMPLATE", payload: templateId });
  }, []);

  const setPosterConfig = useCallback(
    (config: { rows: number; cols: number }) => {
      dispatch({ type: "SET_POSTER_CONFIG", payload: config });
    },
    []
  );

  const setPrintOptions = useCallback((options: Partial<PrintOptions>) => {
    dispatch({ type: "SET_PRINT_OPTIONS", payload: options });
  }, []);

  const setSessionId = useCallback((id: string) => {
    dispatch({ type: "SET_SESSION_ID", payload: id });
  }, []);

  const setProcessedImage = useCallback((url: string) => {
    dispatch({ type: "SET_PROCESSED_IMAGE", payload: url });
  }, []);

  const setFabricData = useCallback((data: object) => {
    dispatch({ type: "SET_FABRIC_DATA", payload: data });
  }, []);

  const resetOrder = useCallback(() => {
    dispatch({ type: "RESET_ORDER" });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value: OrderContextType = {
    state,
    setProductType,
    addImages,
    removeImage,
    clearImages,
    updateEditorState,
    setCollageTemplate,
    setPosterConfig,
    setPrintOptions,
    setSessionId,
    setProcessedImage,
    setFabricData,
    resetOrder,
  };

  return (
    <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
  );
}

// Hook para usar el contexto
export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrder debe usarse dentro de OrderProvider");
  }
  return context;
}

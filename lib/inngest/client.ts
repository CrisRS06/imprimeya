import { Inngest, EventSchemas } from "inngest";

// Definición de eventos personalizados
type Events = {
  "order/created": {
    data: {
      orderId: string;
    };
  };
  "order/pdf.generate": {
    data: {
      orderId: string;
    };
  };
  "storage/cleanup": {
    data: {
      olderThanDays: number;
    };
  };
};

// Cliente Inngest
export const inngest = new Inngest({
  id: "imprimeya",
  schemas: new EventSchemas().fromRecord<Events>(),
});

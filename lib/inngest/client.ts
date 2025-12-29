import { Inngest } from "inngest";

// Definicion de eventos personalizados
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

// Necesario para que TypeScript reconozca los tipos
import { EventSchemas } from "inngest";

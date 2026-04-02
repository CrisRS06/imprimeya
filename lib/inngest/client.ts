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

// Cliente Inngest (eventKey auto-reads from INNGEST_EVENT_KEY env var,
// explicit here as defense-in-depth)
export const inngest = new Inngest({
  id: "imprimeya",
  eventKey: process.env.INNGEST_EVENT_KEY,
  schemas: new EventSchemas().fromRecord<Events>(),
});

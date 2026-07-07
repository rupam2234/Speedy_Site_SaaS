"use client";

import { OrderData } from "@/app/api";
import { FormEvent, useState } from "react";

type OrderFormInput = Pick<
  OrderData,
  "website_name" | "website_address" | "report_email"
>;

const initialState: OrderFormInput = {
  website_address: "",
  website_name: "",
  report_email: "",
};

export default function ManagedServiceMetadata() {
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [form, setForm] = useState<OrderFormInput>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    // do something
  };

  return (
    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="col-span-1 order-1 space-y-3">
        <h2 className="text-primary/80 text-sm">
          To complete this order we need a few details of your site. Please
          complete the form below and the system will automatically assign an
          expert to the order.
        </h2>
        <form></form>
      </div>
      <div className="col-span-1 order-1">Hi 2</div>
    </div>
  );
}

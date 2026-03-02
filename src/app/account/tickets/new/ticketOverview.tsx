import React from "react";

interface Props {
  userRole: string | null;
  submitTicket: () => void;
  ticketTitle: string;
  ticketDescription: string;
  relatedOrder: string | undefined;
}

export default function TicketOverView({
  submitTicket,
  ticketTitle,
  relatedOrder,
  ticketDescription,
}: Props) {
  return (
    <div className="col-span-1 md:col-span-2 flex flex-col p-6 rounded-xl border border-primary/20 bg-primary-foreground dark:bg-secondary-background shadow-sm min-h-[calc(100vh-105px)]">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-primary/90 tracking-tight">
          Review Ticket
        </h3>
        <p className="text-sm text-primary/80">
          Please verify the details below before submitting.
        </p>
      </div>

      {/* Details Grid */}
      <div className="grow space-y-6">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-primary">
              Title
            </dt>
            <dd className="mt-1 text-sm font-medium text-primary/60 truncate">
              {ticketTitle || "—"}
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-primary">
              Message
            </dt>
            <dd className="mt-1 text-sm text-primary/60 leading-relaxed wrap-break-word whitespace-pre-wrap">
              {ticketDescription || "No description provided."}
            </dd>
          </div>

          {/* <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-primary">
              Submitted By
            </dt>
            <dd className="mt-1 text-sm font-medium text-primary/60">
              {userRole || "Guest"}
            </dd>
          </div> */}

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-primary">
              Related Order
            </dt>
            <dd className="mt-1 text-sm font-medium text-primary/60">
              {relatedOrder?.split("-")[0] || "None"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Footer / Action */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <button
          onClick={submitTicket}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Submit Ticket
        </button>
      </div>
    </div>
  );
}

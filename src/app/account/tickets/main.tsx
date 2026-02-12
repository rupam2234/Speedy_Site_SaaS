"use client";

import { Tickets } from "lucide-react";
import { useState } from "react";

type Ticket = {
  id: string | number;
  subject: string;
  messages: {
    id: string;
    sender: string;
    role: "user" | "admin" | "support";
    content: string;
    timestamp: string;
  }[];
  status: "open" | "closed" | "pending";
  updatedAt: string;
};

const tickets: Ticket[] = [
  {
    id: "1111",
    subject: "Cannot login",
    messages: [
      {
        id: "m1",
        role: "user",
        sender: "User",
        content: "I keep getting an error when trying to login.",
        timestamp: "2026-02-10T12:00:00Z",
      },
      {
        id: "m2",
        role: "admin",
        sender: "Adrian",
        content: "Hi! Can you provide the error message?",
        timestamp: "2026-02-10T12:15:00Z",
      },
      {
        id: "m3",
        role: "user",
        sender: "User",
        content:
          "It says 'Invalid credentials', but I am sure they are correct.",
        timestamp: "2026-02-10T12:30:00Z",
      },
    ],
    status: "open",
    updatedAt: "2026-02-10T12:30:00Z",
  },
  {
    id: "2222",
    subject: "Billing issue",
    messages: [
      {
        id: "m4",
        role: "user",
        sender: "User",
        content: "My subscription was charged twice this month.",
        timestamp: "2026-02-09T15:00:00Z",
      },
      {
        id: "m5",
        role: "admin",
        sender: "Adrian",
        content: "We are reviewing your invoice and will get back shortly.",
        timestamp: "2026-02-09T15:45:00Z",
      },
    ],
    status: "pending",
    updatedAt: "2026-02-09T15:45:00Z",
  },
];

export default function Main() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  console.log(selectedTicket);

  return (
    <>
      {/* Desc */}
      <section className="px-5 py-2 mt-2">
        <div className="flex flex-row items-center justify-between">
          <span className="font-bold flex items-center gap-2 text-[20px] text-primary/80">
            <Tickets size={20} />
            <h2> Tickets</h2>
          </span>
          <button className="cursor-pointer text-sm bg-primary/20 dark:hover:bg-gray-100/30 dark:hover:text-primary rounded-md hover:bg-secondary-background hover:text-primary-foreground px-2 py-1">
            Create New Ticket
          </button>
        </div>
      </section>

      {/* tickets */}
      <section className="p-5 grid grid-cols-3 md:grid-cols-6 md:gap-5 gap-3">
        <div className="col-span-1 md:col-span-2">
          {tickets.map((item, i) => {
            return (
              <div
                key={i}
                className={`border-2 border-primary/20 mb-3.5 cursor-pointer hover:bg-primary/5 rounded-sm px-2 py-1 ${item.id === selectedTicket?.id ? "bg-primary/5" : ""}`}
                onClick={() => setSelectedTicket(item)}
              >
                <div className="flex items-center text-sm justify-between">
                  <span className={`truncate`}>
                    Subject:{" "}
                    {item.subject.length > 40
                      ? `${item.subject.slice(0, 40)}...`
                      : item.subject}
                  </span>
                  {statusBadge({ status: item.status })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="col-span-2 min-h-screen md:border-l px-5 md:col-span-4">
          {selectedTicket !== null ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 justify-between text-sm">
                <h3 className="font-medium max-w-lg truncate">
                  {selectedTicket.subject}
                </h3>
                <p>
                  Updated at:{" "}
                  {(() => {
                    const date = new Date(selectedTicket.updatedAt);
                    const formated = date.toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });

                    return <>{formated}</>;
                  })()}
                </p>
              </div>
              <div className="flex flex-col gap-3 mt-4">
                {selectedTicket.messages.map((msg) => {
                  const isAdmin = msg.role === "admin";
                  const isSupport = msg.role === "support";

                  const isRight = isAdmin || isSupport;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isRight ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl text-sm shadow-sm
                          ${
                            isRight
                              ? "bg-primary dark:bg-secondary-background text-white dark:text-white rounded-br-none"
                              : "bg-primary/10 dark:bg-blue-500 dark:text-white text-gray-900 rounded-bl-none"
                          }`}
                      >
                        <p className="text-xs opacity-70 mb-1">{msg.sender}</p>
                        <p>{msg.content}</p>
                        <p className="text-[10px] mt-1 opacity-60 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <></>
          )}
        </div>
      </section>
    </>
  );
}

// function for status badge
function statusBadge({ status }: { status: "open" | "closed" | "pending" }) {
  const colors = {
    open: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    closed: "bg-gray-200 text-gray-800",
  };

  return (
    <span
      className={`px-2 py-0.5 capitalize rounded-4xl text-sm font-medium ${colors[status]}`}
    >
      {status}
    </span>
  );
}

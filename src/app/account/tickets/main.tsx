"use client";

import { Tickets } from "lucide-react";
import { useEffect, useState } from "react";
import { SpeedySiteTickets, TicketMessages } from "@/app/api/dataTypes";
import { useFormStatus } from "react-dom";

interface SendMessageProps<T> {
  message: T;
}

export default function Main() {
  const [selectedTicket, setSelectedTicket] =
    useState<SpeedySiteTickets | null>(null);
  const [tickets, setTickets] = useState<SpeedySiteTickets[] | null>(null);
  const [userRole, setUserRole] = useState<"user" | "admin">("user"); // sets user role for ticket dashboard **admin | user**
  const [activeMessages, setActiveMessages] = useState<TicketMessages[] | null>(
    null,
  );

  const [messageInput, setMessageInput] = useState<string>("");
  const { pending } = useFormStatus();

  useEffect(() => {
    getTickets();
  }, []);

  useEffect(() => {
    if (!selectedTicket) return;

    getMessages(0);
  }, [selectedTicket]);

  return (
    <>
      {/* Header */}
      <section className="px-5 py-2 mt-2">
        <div className="flex flex-row items-center justify-between">
          <span className="font-bold flex items-center gap-2 text-[20px] text-primary/80">
            <Tickets size={20} />
            <h2>Tickets</h2>
          </span>

          {userRole === "user" && (
            <button className="cursor-pointer text-sm bg-primary/20 dark:hover:bg-gray-100/30 dark:hover:text-primary rounded-md hover:bg-secondary-background hover:text-primary-foreground px-2 py-1">
              Create New Ticket
            </button>
          )}
        </div>
      </section>

      {/* Tickets Layout */}
      <section className="relative p-5 grid grid-cols-3 md:grid-cols-6 md:gap-5 gap-3">
        {/* Ticket List */}
        <div className="sticky top-20 left-0 h-[80vh] overflow-auto col-span-1 md:col-span-2">
          {tickets === null ? (
            <div className="mb-3.5 rounded-sm space-y-3 px-2 py-1 animate-pulse">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center text-sm justify-between">
                    <div className="h-6 bg-primary/20 rounded w-3/4"></div>
                    <div className="h-6 bg-primary/20 rounded w-16"></div>
                  </div>
                  <div className="text-sm bg-primary/20 h-3 w-3/4 rounded-sm"></div>
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets found.</p>
          ) : (
            tickets.map((item, i) => (
              <div
                key={i}
                className={`space-y-2 border-2 border-primary/20 cursor-pointer hover:bg-primary/10 rounded-sm mb-3.5 px-2 py-1 ${
                  item.id === selectedTicket?.id ? "bg-primary/5" : ""
                }`}
                onClick={() => setSelectedTicket(item)}
              >
                <div className="flex items-center text-sm justify-between gap-2">
                  <span className="truncate">
                    {item.subject.length > 40
                      ? `${item.subject.slice(0, 40)}...`
                      : item.subject}
                  </span>

                  {/* {userRole === "admin" && item.user_id && (
                    <span className="text-xs opacity-60 truncate max-w-20">
                      {item.user_id}
                    </span>
                  )} */}

                  {statusBadge({
                    status: item.status as "open" | "closed" | "pending",
                  })}
                </div>

                <div className="mt-1 text-xs text-primary/80">
                  {userRole === "admin" ? (
                    <> {/* will add sender name here for admins */} </>
                  ) : (
                    <span className="flex items-center justify-between">
                      <p> Created at: {item.created_at?.split("T")[0]}</p>
                      {item.related_order !== null &&
                      item.related_order !== undefined ? (
                        <>Order: {item.related_order.slice(0, 8)}</>
                      ) : (
                        <></>
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Ticket Details + Messages */}
        <div className="relative bg-[#f7f7f7] col-span-2 md:col-span-4 flex flex-col h-full md:border-l pl-5">
          {selectedTicket && (
            <div className="space-y-3 h-full">
              {/* Ticket Header */}
              <div className="flex items-center gap-2 justify-between text-sm">
                <h3 className="font-medium max-w-lg truncate">
                  {selectedTicket.subject}
                </h3>
              </div>

              {/* Messages */}
              <div className="flex-1 flex flex-col gap-3 mt-4">
                {activeMessages &&
                  activeMessages.map((item, i) => {
                    const date =
                      item.created_at &&
                      new Date(item.created_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      });

                    return (
                      <div
                        key={i}
                        className="border-b border-primary/10 px-4 py-3 w-full space-y-3 h-auto"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="rounded-full bg-blue-300 text-primary/80 px-3 py-1 text-lg font-semibold flex items-center gap-2">
                              {item.sender_name
                                ? item.sender_name[0].toUpperCase()
                                : "S"}
                            </div>
                            <div className="flex item-start flex-col">
                              <p>
                                {item.sender_name ? item.sender_name : ""}{" "}
                                <span className="text-xs text-primary/60">
                                  replied
                                </span>
                              </p>
                              <p className="text-xs text-primary/60">{date}</p>
                            </div>
                          </div>
                          {item.sender_role !== "user" && (
                            <div className="px-2 py-0.5 rounded-sm bg-amber-300 text-primary/80 font-medium capitalize text-xs">
                              {item.sender_role}
                            </div>
                          )}
                        </div>
                        <div className="text-[15px] text-primary/75">
                          {item.message}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
          {selectedTicket && (
            <form
              className="shadow-2xl flex gap-3 z-20 items-end p-2 w-full bg-primary-foreground sticky bottom-1 left-0 border-2 rounded-sm border-primary/20"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage({ message: messageInput });
              }}
            >
              <textarea
                name="message"
                placeholder="Your message..."
                className=" px-2 w-full py-1 rounded-sm text-sm outline-none"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                style={{ height: "150px" }}
              />
              <button
                type="submit"
                disabled={pending}
                className="bg-blue-400 px-2 py-0.5 rounded-sm cursor-pointer font-medium hover:bg-blue-400/80"
              >
                Send
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );

  function statusBadge({ status }: { status: "open" | "closed" | "pending" }) {
    const colors = {
      open: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      closed: "bg-gray-200 text-gray-800",
    };

    return (
      <span
        className={`px-2 py-px capitalize rounded-4xl text-sm font-medium ${colors[status]}`}
      >
        {status}
      </span>
    );
  }

  /**
   * gets tickets for the active user
   * @returns tickets array
   */
  async function getTickets() {
    try {
      const res = await fetch("/api/tickets/get");
      const body: any = await res.json();

      if (!res.ok) {
        setTickets(null);
        throw new Error(body.message);
      }

      setUserRole(body.role);
      setTickets(body.tickets.response);
    } catch (error) {
      console.error(error);
      setTickets([]);
    }
  }

  /**
   * get messages for a ticket
   * @param offset offset is the starting point of range to acquire messages
   * @returns message array
   */
  async function getMessages(offset: number) {
    if (!selectedTicket || !selectedTicket.id) return;

    try {
      const res = await fetch("/api/tickets/messages/get", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticket_id: selectedTicket.id, offset: offset }),
      });

      const body: any = await res.json();

      if (!res.ok) {
        setActiveMessages([]);
        throw new Error(body.message || "Unable to fetch messages");
      }

      setActiveMessages(body.data);
    } catch (error: any) {
      console.error(error.message);
    }
  }

  /**
   * sends user message to database
   * @param param0 message of any type T
   */
  async function sendMessage<T>({ message }: SendMessageProps<T>) {
    console.log(message);
  }
}

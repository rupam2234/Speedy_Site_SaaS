"use client";

import { OrderData } from "@/app/api/dataTypes";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Main() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [ticketTitle, setTicketTitle] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setSubmissionResult] = useState<{
    message: string;
    success: boolean;
  }>({ message: "", success: false });

  const hasFetched = useRef(false);

  const ticketTypes = ["General", "Technical Support", "Billing"];

  const handleSubmitTicket = useCallback(() => {
    submitTicket();
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      Promise.all([getRole(), getOrders()]).catch((error: any) => {
        console.error(error);
      });

      hasFetched.current = true;
    }
  }, []);

  return (
    <>
      {userRole === "user" ? (
        <>
          <div className="p-4 grid grid-cols-1 md:grid-cols-6 gap-4 items-start">
            <div className="col-span-1 md:col-span-4 space-y-8 bg-white/50 dark:bg-secondary-background p-6 rounded-sm border border-primary/10">
              <div>
                <h2 className="text-lg font-bold text-primary/80 tracking-tight">
                  Create New Ticket
                </h2>
                <p className="text-sm text-primary/60 mt-1">
                  Fill out the details below and our team will get back to you
                  shortly.
                </p>
              </div>

              <form
                id="ticketForm"
                onSubmit={(e) => e.preventDefault()}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-primary/60 ml-1">
                      Ticket Type
                    </label>
                    <select
                      required
                      className="w-full bg-primary-foreground dark:bg-secondary-background text-sm text-primary/80 border border-primary/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    >
                      <option>Select a type</option>
                      {ticketTypes?.map((x, i) => (
                        <option key={i} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-primary/60 ml-1">
                      Related Order (Optional)
                    </label>

                    <select
                      onChange={(e) => {
                        const selected = orders.find(
                          (item) => item.order_id === e.target.value,
                        );

                        setSelectedOrder(
                          selected !== undefined ? selected : null,
                        );
                      }}
                      value={selectedOrder?.order_id}
                      className="w-full bg-primary-foreground dark:bg-secondary-background text-sm text-primary/80 border border-primary/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    >
                      <option>Select a website</option>
                      {orders.map((x) => (
                        <option key={x.order_id} value={x.order_id}>
                          {x.website_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-primary/60 ml-1">
                    Subject Title
                  </label>
                  <input
                    type="text"
                    value={ticketTitle}
                    required
                    placeholder="What is the issue about?"
                    onChange={(e) => setTicketTitle(e.target.value)}
                    className="w-full bg-primary-foreground dark:bg-secondary-background px-4 py-2.5 text-sm outline-none border border-primary/10 rounded-xl text-primary/80 placeholder:text-primary/30 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-primary/60 ml-1">
                    Detailed Message
                  </label>
                  <textarea
                    placeholder="Describe your problem in detail..."
                    required
                    value={message}
                    rows={8}
                    className="w-full bg-primary-foreground dark:bg-secondary-background px-4 py-3 text-sm text-primary/80 outline-none border border-primary/10 rounded-xl min-h-50 placeholder:text-primary/30 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </form>
            </div>
            {/* Right Column: Overview component */}
            <div className="col-span-1 md:col-span-2 space-y-4">
              {selectedOrder ? (
                <div className="dark:bg-secondary-background bg-[#f7f7f7] border border-primary/10 rounded-sm p-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4">
                    Selected Order Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-primary/50">Order ID</span>
                      <span className="text-xs font-mono font-medium text-primary/80">
                        #{selectedOrder?.order_id?.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-primary/50">Website</span>
                      <span className="text-xs font-medium text-primary/80">
                        {selectedOrder.website_name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-primary/50">Status</span>
                      <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold uppercase">
                        {selectedOrder.order_status === true
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-primary/5 border border-dashed border-primary/20 rounded-sm p-8 text-center">
                  <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-primary/30"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="Options... (your icon here)"
                      />
                    </svg>
                  </div>
                  <p className="text-xs text-primary/40 leading-relaxed">
                    Select an order to see specific details here.
                  </p>
                </div>
              )}

              {/* Step 2: Expectations/SLA Card */}
              <div className="bg-white/50 dark:bg-secondary-background p-6 rounded-sm border border-primary/10">
                <h3 className="text-sm font-bold text-primary/80 uppercase tracking-wider mb-4">
                  Submission Info
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-primary/80">
                        Typical Response Time
                      </p>
                      <p className="text-[11px] text-primary/50 mt-0.5">
                        Usually under 24 hours on business days.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-primary/80">
                        Attachments
                      </p>
                      <p className="text-[11px] text-primary/50 mt-0.5">
                        You can add screenshots once the ticket is created.
                      </p>
                    </div>
                  </li>
                </ul>

                <button
                  onClick={handleSubmitTicket}
                  disabled={loading}
                  className="w-full mt-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all transform active:scale-[0.98]"
                >
                  {loading ? "Submitting..." : "Submit Ticket"}
                </button>
                {!loading && result.message.length > 0 && (
                  <div
                    className="h-auto text-sm text-primary/80 mt-4 px-2 py-1 rounded-sm"
                    style={{
                      background:
                        result.success === true ? "#A2CB8B" : "#FFB2B2",
                    }}
                  >
                    {result.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : userRole === "admin" ? (
        <div className="p-4 grid grid-cols-1 md:grid-cols-6 gap-8 items-start">
          {/* Left Column: The Form */}
          <div className="col-span-1 md:col-span-4 space-y-8 bg-white/50 dark:bg-secondary-background p-6 rounded-sm border border-primary/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500/10 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Staff Portal
                </span>
              </div>
              <h2 className="text-lg font-bold text-primary/80 tracking-tight mt-1">
                Open Ticket on behalf of User
              </h2>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* 1. Select User Account */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-primary/60 ml-1">
                    Target User Account
                  </label>
                  <select
                    className="w-full bg-primary-foreground dark:bg-secondary-background text-sm text-primary/80 border border-primary/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
                    onChange={() => {
                      // Logic to handle user selection and fetch their specific orders
                      // setSelectedUser(e.target.value)
                    }}
                  >
                    <option value="">Search for a user...</option>
                    {/* Map through your users list here */}
                    <option value="user123">John Doe (john@example.com)</option>
                    <option value="user456">
                      Jane Smith (jane@design.com)
                    </option>
                  </select>
                </div>

                {/* 2. Select Website (Filtered by User) */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-primary/60 ml-1">
                    Assign to Website
                  </label>
                  <select
                    disabled={!selectedOrder} // Disable if no user selected logic
                    className="w-full bg-primary-foreground dark:bg-secondary-background text-sm text-primary/80 border border-primary/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                  >
                    <option>Select user first...</option>
                    {orders.map((x) => (
                      <option key={x.order_id} value={x.order_id}>
                        {x.website_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-primary/60 ml-1">
                    Ticket Priority
                  </label>
                  <select className="w-full bg-primary-foreground dark:bg-secondary-background text-sm text-primary/80 border border-primary/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent / Critical</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-primary/60 ml-1">
                    Category
                  </label>
                  <select className="w-full bg-primary-foreground dark:bg-secondary-background text-sm text-primary/80 border border-primary/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                    {ticketTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-primary/60 ml-1">
                  Subject Title
                </label>
                <input
                  type="text"
                  className="w-full bg-primary-foreground dark:bg-secondary-background px-4 py-2.5 text-sm border border-primary/10 rounded-xl outline-none focus:border-blue-500 transition-all"
                  placeholder="e.g., Server Migration Request"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-primary/60 ml-1">
                  Official Message (Visible to User)
                </label>
                <textarea
                  rows={6}
                  className="w-full bg-primary-foreground dark:bg-secondary-background px-4 py-3 text-sm border border-primary/10 rounded-xl outline-none focus:border-blue-500 transition-all resize-none"
                  placeholder="Type the message the user will see..."
                />
              </div>
            </form>
          </div>

          {/* Right Column: User Context & Admin Actions */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            {/* User Quick Info Card */}
            <div className="bg-white/50 dark:bg-secondary-background border border-primary/10 rounded-2xl p-6">
              <h3 className="text-xs font-bold text-primary/40 uppercase tracking-widest mb-4">
                User Overview
              </h3>

              {/* If no user selected */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary/60">
                    JD
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary/80">
                      John Doe
                    </p>
                    <p className="text-[11px] text-primary/50">
                      Pro Plan • Member since 2023
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2 rounded-lg bg-primary/5 border border-primary/5">
                    <p className="text-[10px] text-primary/40 uppercase font-bold">
                      Open Tickets
                    </p>
                    <p className="text-lg font-bold text-primary/70">2</p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/5 border border-primary/5">
                    <p className="text-[10px] text-primary/40 uppercase font-bold">
                      Total Spent
                    </p>
                    <p className="text-lg font-bold text-primary/70">$420</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Internal Admin Notes */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
              <h3 className="text-xs font-bold text-amber-600/80 uppercase tracking-widest mb-3">
                Internal Notes
              </h3>
              <textarea
                className="w-full bg-transparent text-xs text-amber-900 dark:text-amber-200/70 outline-none min-h-25 placeholder:text-amber-600/30"
                placeholder="Add a private note for other staff members... (Not visible to user)"
              />
            </div>

            <button
              onClick={submitTicket}
              className="w-full bg-primary text-secondary dark:bg-white dark:text-black text-sm font-bold py-4 rounded-xl shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Create Ticket
            </button>

            <p className="text-[10px] text-center text-primary/40 px-4">
              Creating this ticket will notify the user via email automatically.
            </p>
          </div>
        </div>
      ) : (
        <></>
      )}
    </>
  );

  /**
   * Gets the profile of the current user
   */
  async function getRole() {
    try {
      const res = await fetch("/api/account/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const body: any = await res.json();

      if (!res.ok) {
        setUserRole(null);
        throw new Error(body.message);
      }

      setUserRole(body.role);
    } catch (error: any) {
      console.error(error);
    }
  }

  /**
   * get websites/orders for ticket
   */
  async function getOrders() {
    // check for cache of order
    const cachedOrders = sessionStorage.getItem("orders");

    if (cachedOrders && cachedOrders.length > 0) {
      setOrders(JSON.parse(cachedOrders));
      return;
    }

    try {
      const response = await fetch("/api/orders/fetchOrder");

      const body: any = await response.json();

      if (!response.ok) {
        throw new Error(body.message);
      }

      setOrders(body.data);
    } catch (error: any) {
      setOrders([]);
      console.error(error.message || "Something went wrong fetching orders");
    }
  }

  async function submitTicket() {
    // submit the ticket
    if (ticketTitle.length < 1 || message.length < 1) return;

    setLoading(true);

    try {
      const res = await fetch("/api/tickets/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: ticketTitle,
          message: message,
          related_order: selectedOrder?.order_id,
        }),
      });

      const body: any = await res.json();

      if (!res.ok) {
        setLoading(false);
        throw new Error(body.message);
      }

      // reset the form
      setTicketTitle("");
      setMessage("");
      setSelectedOrder(null);
      setSubmissionResult({
        message: "ticket created, go to ticket section",
        success: true,
      });
    } catch (error: any) {
      setSubmissionResult({
        message: "failed to create ticket",
        success: false,
      });
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  }
}

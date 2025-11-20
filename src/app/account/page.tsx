"use client";

import { Clipboard } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Account() {
  const [activeUser, setActiveUser] = useState<any>();
  const [phone, setPhone] = useState<string>();
  const [email, setEmail] = useState<string>();
  const [name, setName] = useState<string>();

  useEffect(() => {
    async function getUser() {
      try {
        const res = await fetch("/api/account/get", {
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("Unable to fetch user", res.status);
          return null;
        }

        const data = await res.json();
        setActiveUser(data);
      } catch (err) {
        console.error("Error fetching user:", err);
        setActiveUser(null);
      }
    }

    getUser();
  }, []);

  if (activeUser !== undefined || null) {
    console.log(activeUser);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 m-5">
      {/* Main Content */}
      <div className="col-span-1 md:border-r md:col-span-4 p-6 w-full min-h-full bg-white dark:bg-secondary-background rounded-l-sm space-y-10">
        {/* Header */}
        <h2 className="text-lg font-semibold mb-4">Account Settings</h2>

        {/* Profile Section */}
        <section
          id="profile"
          className="space-y-4 border-b border-primary/10 pb-6"
        >
          <div className="space-y-4">
            {/* Upload Avatar */}
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700" />
              <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded">
                Change Photo
              </button>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* <input type="text" placeholder="Display Name" className="input" /> */}
              <div className="flex gap-2 items-center">
                <span>Email: </span>
                <input
                  type="email"
                  placeholder={activeUser?.user.email || "your email"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input px-2 py-1 dark:bg-secondary-background text-primary/80 border rounded-sm border-primary/10"
                />
              </div>
              <div className="flex gap-2 items-center">
                <span>Name: </span>
                <input
                  type="text"
                  placeholder={
                    activeUser?.user.user_metadata.name || "your name..."
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input px-2 py-1 dark:bg-secondary-background text-primary/80 border rounded-sm border-primary/10"
                />
              </div>
              <div className="flex gap-2 items-center">
                <span>Phone: </span>
                <input
                  type="text"
                  placeholder={activeUser?.user.phone || "your contact no..."}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input px-2 py-1 dark:bg-secondary-background text-primary/80 border rounded-sm border-primary/10"
                />
              </div>
            </div>

            <button
              onClick={() => handleUserUpdate()}
              className="mt-7 hover:bg-blue-400 cursor-pointer btn-primary bg-blue-500 text-primary-foreground rounded-sm px-2 py-1"
            >
              Save Changes
            </button>
          </div>
        </section>

        {/* Security Section */}
        <section id="security" className="space-y-4 pt-8">
          <h2 className="text-xl font-medium">Security</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="password"
              placeholder="Current Password"
              className="input"
            />
            <input
              type="password"
              placeholder="New Password"
              className="input"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              className="input"
            />
          </div>
          <button className="btn-primary">Update Password</button>

          <div className="pt-4">
            <h3 className="font-medium">Two-Factor Authentication</h3>
            <button className="mt-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              Enable 2FA
            </button>
          </div>
        </section>

        {/* Activity Log */}
        <section id="activity" className="space-y-4 pt-8">
          <h2 className="text-xl font-medium">Activity Log</h2>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p>• Logged in from Chrome (Today)</p>
            <p>• Password updated (3 days ago)</p>
            <p>• Email verified (2 weeks ago)</p>
          </div>
        </section>

        {/* Danger Zone */}
        <section id="danger" className="pt-8">
          <h2 className="text-xl font-medium text-red-600">Danger Zone</h2>
          <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded">
            Delete Account
          </button>
        </section>
      </div>

      {/* Sidebar */}
      <div className="col-span-1 md:col-span-2 p-6 w-full min-h-full bg-white dark:bg-secondary-background rounded-r-sm">
        <h2 className="font-semibold mb-3">Account Details:</h2>
        <div className="text-[14px] font-mono">
          {activeUser === undefined ? (
            // SKELETON LOADING STATE
            <div className="space-y-3 animate-pulse">
              <div className="h-5 w-40 bg-primary/10 rounded"></div>
              <div className="h-5 w-32 bg-primary/10 rounded"></div>
              <div className="h-5 w-48 bg-primary/10 rounded"></div>
              <div className="h-5 w-28 bg-primary/10 rounded"></div>
              <div className="h-5 w-36 bg-primary/10 rounded"></div>
            </div>
          ) : (
            <>
              <div className="flex gap-2 items-center">
                <span className="font-semibold">Created at: </span>
                <span className="px-2 py-1 dark:bg-secondary-background text-primary/80">
                  {new Date(
                    activeUser.user.identities[0].created_at
                  ).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="flex gap-2 items-center">
                <span className="font-semibold">ID: </span>
                <span
                  onClick={() => handleIDclick(activeUser.user.id)}
                  className="px-2 py-1 flex gap-1 cursor-pointer items-center dark:bg-secondary-background text-primary/80"
                >
                  {activeUser.user.id.split("-")[0]}
                  <Clipboard
                    size={22}
                    className="hover:bg-primary/10 rounded-full p-1"
                  />
                </span>
              </div>

              <div className="flex gap-2 items-center">
                <span className="font-semibold">Email: </span>
                <span className="px-2 py-1 dark:bg-secondary-background text-primary/80">
                  {activeUser.user.email}
                </span>
              </div>

              <div className="flex gap-2 items-center">
                <span className="font-semibold">Name: </span>
                <span className="px-2 py-1 dark:bg-secondary-background text-primary/80">
                  {activeUser.user.user_metadata.name}
                </span>
              </div>

              <div className="flex gap-2 items-center">
                <span className="font-semibold">Phone: </span>
                <span className="px-2 py-1 dark:bg-secondary-background text-primary/80">
                  {activeUser.user.phone}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="p-4 mt-10 rounded bg-gray-50 dark:bg-gray-800">
          <p className="text-sm font-medium">Need help?</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Contact support if you’re having issues with your account.
          </p>
        </div>
      </div>
    </div>
  );

  function handleIDclick(id: string) {
    navigator.clipboard.writeText(id).then(() => {
      toast.success("id copied", {
        style: {
          backgroundColor: "green",
          color: "white",
        },
      });
    });
  }

  async function handleUserUpdate() {
    try {
      const res = await fetch("/api/account/update-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          email,
          name,
        }),
      });

      const data: any = await res.json();

      if (!res.ok) {
        console.error("Update failed:", data.error || data);
        toast.error("User update failed", {
          style: { backgroundColor: "red", color: "white" },
        });
        return;
      }

      toast.success("User updated", {
        style: { backgroundColor: "green", color: "white" },
      });
    } catch (err) {
      console.error("Network or server error:", err);
    }
  }
}

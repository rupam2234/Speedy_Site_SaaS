"use client";

import { cachedData, cleanExpiredCache } from "@/components/utils";
import { Clipboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function AccountRender() {
  const [activeUser, setActiveUser] = useState<any>();
  const [phone, setPhone] = useState<string>();
  const [email, setEmail] = useState<string>();
  const [name, setName] = useState<string>();
  const [password, setPassword] = useState<string>("");
  const [conf_pass, setConfPass] = useState<string>("");
  const [passMatch, setPassMatch] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const userRef = useRef<{ email: string; name: string; phone: string }>({
    email: "",
    name: "",
    phone: "",
  });

  useEffect(() => {
    const key = `user-account`;
    cleanExpiredCache({ prefix: key, session_Storage: true });

    const getCachedUser = async () => {
      const { response } = await cachedData({
        fn: async () => {
          const res = await fetch("/api/account/get", {
            cache: "no-store",
          });

          if (!res.ok) throw new Error(res.statusText);

          const data = await res.json();

          return data;
        },
        key: key,
        session_Storage: true,
        ttl: 5 * 60 * 1000,
      });

      if (response) {
        setActiveUser(response);
      } else {
        setActiveUser(null);
      }
    };

    getCachedUser();
  }, []);

  return (
    <div className="grid grid-cols-1 h-full md:grid-cols-6">
      {/* Main Content */}
      <div className="col-span-1 md:border-r md:col-span-4 p-6 w-full min-h-full  dark:bg-secondary-background rounded-l-sm space-y-10">
        {/* Header */}
        <h2 className="text-lg font-semibold mb-4">Account Settings</h2>

        {/* Profile Section */}
        <section
          id="profile"
          className="space-y-4 border-b border-primary/10 pb-6"
        >
          <div className="space-y-4">
            {/* Upload Avatar */}
            {/* <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700" />
              <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded">
                Change Photo
              </button>
            </div> */}

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* <input type="text" placeholder="Display Name" className="input" /> */}
              <div className="flex gap-2 items-center">
                <span>Email: </span>
                <input
                  type="email"
                  placeholder={activeUser?.user.email || "your email"}
                  // value={email || activeUser?.user.email || ""}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input px-2 py-1 dark:bg-secondary-background text-primary/80 text-sm border rounded-sm border-primary/10"
                />
              </div>
              <div className="flex gap-2 items-center">
                <span>Name: </span>
                <input
                  type="text"
                  placeholder={
                    activeUser?.user.user_metadata.name || "your name..."
                  }
                  // value={name || activeUser?.user.name || ""}
                  onChange={(e) => setName(e.target.value)}
                  className="input px-2 py-1 dark:bg-secondary-background text-sm text-primary/80 border rounded-sm border-primary/10"
                />
              </div>
              <div className="flex gap-2 items-center">
                <span>Phone: </span>
                <input
                  type="text"
                  placeholder={activeUser?.user.phone || "your contact no..."}
                  // value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input px-2 py-1 dark:bg-secondary-background text-sm text-primary/80 border rounded-sm border-primary/10"
                />
              </div>
            </div>

            <button
              onClick={() => handleUserUpdate()}
              className="mt-7 hover:bg-blue-400 cursor-pointer btn-primary bg-blue-500 dark:bg-blue-500/80 dark:text-primary text-primary-foreground rounded-sm px-2 py-1"
            >
              Save Changes
            </button>
          </div>
        </section>

        {/* Security Section */}
        <section id="security space-y-4" className="">
          <h2 className="text-lg font-semibold mb-6">Security</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-2 items-center">
              <input
                type="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input px-2 py-1 w-75 dark:bg-secondary-background text-sm text-primary/80 border rounded-sm border-primary/10"
              />
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="password"
                placeholder="Confirm New Password"
                value={conf_pass}
                onChange={(e) => setConfPass(e.target.value)}
                className="input px-2 py-1 w-75 dark:bg-secondary-background text-sm text-primary/80 border rounded-sm border-primary/10"
              />
            </div>
          </div>
          <div className="flex md:flex-row flex-col items-start md:items-center gap-5">
            <button
              onClick={() => handlePasswordUpdate()}
              className="mt-7 hover:bg-blue-400 cursor-pointer btn-primary bg-blue-500 dark:bg-blue-500/80 dark:text-primary text-primary-foreground rounded-sm px-2 py-1"
            >
              Update Password
            </button>
            {passMatch === false ? (
              <p className="md:mt-7 text-sm text-red-500">
                Password didn&apos;t match!
              </p>
            ) : errorMessage.length > 0 ? (
              <p className="md:mt-7 text-sm text-red-500">{errorMessage}</p>
            ) : (
              <></>
            )}
          </div>
        </section>
      </div>

      {/* Sidebar */}
      <div className="col-span-1 space-y-4 md:col-span-2 p-6 w-full min-h-full  dark:bg-secondary-background rounded-r-sm">
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
                    activeUser.user.identities[0].created_at,
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

        <div className="text-[14px] font-mono">
          {activeUser === undefined ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-5 w-40 bg-primary/10 rounded"></div>
            </div>
          ) : (
            <>
              <div className="flex gap-2 items-center">
                <span className="font-semibold">Last log-in:</span>
                <span className="text-primary/80">
                  {new Date(activeUser.user.last_sign_in_at).toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="p-4 mt-10 rounded bg-gray-50 dark:bg-gray-800">
          <p className="text-sm font-medium">Need help?</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Contact support if you&apos;re having issues with your account.
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
    if (!name && !phone && !email) return;
    if (
      userRef.current.email === activeUser?.user.email &&
      userRef.current.name === activeUser?.user.user_metadata.name &&
      userRef.current.phone === activeUser?.user.phone
    )
      return;

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

      userRef.current.email = activeUser?.user.email;
      userRef.current.name = activeUser?.user.user_metadata.name;
      userRef.current.phone = activeUser?.user.phone;

      // clear cache
      sessionStorage.removeItem("user-account");
    } catch (err) {
      console.error("Network or server error:", err);
    }
  }

  async function handlePasswordUpdate() {
    if (password !== conf_pass) {
      setPassMatch(false);

      setTimeout(() => {
        setPassMatch(true);
      }, 5000);

      return;
    } else if (password.length < 6) {
      setErrorMessage("Password must contain atleast 6 characters");

      setTimeout(() => {
        setErrorMessage("");
      }, 5000);
    } else {
      const res = await fetch("/api/account/password-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: conf_pass }),
      });

      const body: any = await res.json();

      if (!res.ok) {
        console.error("Password update failed", body.error);
        toast.error("Password update failed", {
          style: { backgroundColor: "red", color: "white" },
        });
        return;
      }

      toast.success("Password updated", {
        style: { backgroundColor: "green", color: "white" },
      });
    }
  }
}

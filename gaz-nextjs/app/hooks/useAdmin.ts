"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthUser } from "@/lib/types";
import { AdminUser } from "../components/AdminUsersPanel";
import { csrfHeaders } from "./useAuth";

export function useAdmin(user: AuthUser | null) {
  const [adminAuthPassword, setAdminAuthPassword] = useState("");
  const [adminSessionActive, setAdminSessionActive] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [currentAdminPassword, setCurrentAdminPassword] = useState("");
  const [nextAdminPassword, setNextAdminPassword] = useState("");
  const [userPasswordDrafts, setUserPasswordDrafts] = useState<Record<string, string>>({});
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  useEffect(() => {
    if (!user) {
      setAdminAuthPassword("");
      setAdminSessionActive(false);
      setAdminUsers([]);
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      setNewOwnerName("");
      setNewAddress("");
      setCurrentAdminPassword("");
      setNextAdminPassword("");
      setUserPasswordDrafts({});
      setAdminError("");
      setAdminSuccess("");
    }
  }, [user?.id]);

  const handleAdminLoad = useCallback(async () => {
    if (!user?.email) {
      setAdminError("Nu ai un email asociat contului.");
      return;
    }

    setAdminLoading(true);
    setAdminError("");
    setAdminSuccess("");
    try {
      if (!adminSessionActive) {
        if (!adminAuthPassword.trim()) {
          setAdminError("Introdu parola de admin.");
          return;
        }

        const authResponse = await fetch("/api/admin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ password: adminAuthPassword })
        });

        let authData: Record<string, unknown> | null = null;
        try {
          const authText = await authResponse.text();
          if (authText) authData = JSON.parse(authText);
        } catch {
          authData = null;
        }

        if (!authResponse.ok) {
          throw new Error(
            (authData?.error as string) || "Nu am putut valida sesiunea de admin."
          );
        }

        setAdminSessionActive(true);
        setAdminAuthPassword("");
      }

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { ...csrfHeaders() }
      });

      let data: Record<string, unknown>[] | null = null;
      try {
        const text = await response.text();
        if (text) data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          ((data as unknown as Record<string, string>)?.error) ||
            "Nu am putut încărca lista de conturi."
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("Răspuns invalid de la server.");
      }

      setAdminUsers(data as unknown as AdminUser[]);
      setUserPasswordDrafts({});
      setAdminSuccess(`Au fost încărcate ${data.length} conturi.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nu am putut încărca lista de conturi.";
      if (message.toLowerCase().includes("expirat")) setAdminSessionActive(false);
      setAdminError(message);
    } finally {
      setAdminLoading(false);
    }
  }, [adminAuthPassword, adminSessionActive, user?.email]);

  const handleAdminDelete = useCallback(
    async (userId: string) => {
      if (!adminSessionActive) {
        setAdminError("Sesiunea admin a expirat. Reîncarcă conturile ca să te autentifici din nou.");
        return;
      }

      if (!confirm("Sigur vrei să ștergi acest cont?")) return;

      setAdminLoading(true);
      setAdminError("");
      setAdminSuccess("");
      try {
        const response = await fetch("/api/admin/users", {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ userId })
        });

        let data: Record<string, unknown> | null = null;
        try {
          const text = await response.text();
          if (text) data = JSON.parse(text);
        } catch {
          data = null;
        }

        if (!response.ok) {
          throw new Error((data?.error as string) || "Nu am putut șterge contul.");
        }

        setAdminUsers((prev) => prev.filter((item) => item.id !== userId));
        setUserPasswordDrafts((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        setAdminSuccess("Contul a fost șters.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Nu am putut șterge contul.";
        if (message.toLowerCase().includes("expirat")) setAdminSessionActive(false);
        setAdminError(message);
      } finally {
        setAdminLoading(false);
      }
    },
    [adminSessionActive]
  );

  const handleAdminCreate = useCallback(async () => {
    if (!adminSessionActive) {
      setAdminError("Sesiunea admin a expirat. Reîncarcă conturile ca să te autentifici din nou.");
      return;
    }

    setAdminLoading(true);
    setAdminError("");
    setAdminSuccess("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          password: newPassword,
          ownerName: newOwnerName,
          address: newAddress
        })
      });

      let data: Record<string, unknown> | null = null;
      try {
        const text = await response.text();
        if (text) data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error((data?.error as string) || "Nu am putut crea contul.");
      }

      const createdUser = data as unknown as AdminUser;
      setAdminUsers((prev) => [createdUser, ...prev]);
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      setNewOwnerName("");
      setNewAddress("");
      setAdminSuccess("Contul a fost creat.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nu am putut crea contul.";
      if (message.toLowerCase().includes("expirat")) setAdminSessionActive(false);
      setAdminError(message);
    } finally {
      setAdminLoading(false);
    }
  }, [adminSessionActive, newAddress, newEmail, newOwnerName, newPassword, newUsername]);

  const handleAdminPasswordChange = useCallback(async () => {
    if (!adminSessionActive) {
      setAdminError("Sesiunea admin a expirat. Reîncarcă conturile ca să te autentifici din nou.");
      return;
    }

    setAdminLoading(true);
    setAdminError("");
    setAdminSuccess("");
    try {
      const response = await fetch("/api/admin/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          currentPassword: currentAdminPassword,
          newPassword: nextAdminPassword
        })
      });

      let data: Record<string, unknown> | null = null;
      try {
        const text = await response.text();
        if (text) data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error((data?.error as string) || "Nu am putut schimba parola de admin.");
      }

      setCurrentAdminPassword("");
      setNextAdminPassword("");
      setAdminAuthPassword("");
      setAdminSessionActive(false);
      setAdminSuccess(
        (data?.message as string) || "Parola de admin a fost schimbată."
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Nu am putut schimba parola de admin.";
      if (message.toLowerCase().includes("expirat")) setAdminSessionActive(false);
      setAdminError(message);
    } finally {
      setAdminLoading(false);
    }
  }, [adminSessionActive, currentAdminPassword, nextAdminPassword]);

  const handleUserPasswordDraftChange = useCallback((userId: string, value: string) => {
    setUserPasswordDrafts((prev) => ({ ...prev, [userId]: value }));
  }, []);

  const handleUserPasswordChange = useCallback(
    async (userId: string) => {
      if (!adminSessionActive) {
        setAdminError("Sesiunea admin a expirat. Reîncarcă conturile ca să te autentifici din nou.");
        return;
      }

      const password = (userPasswordDrafts[userId] ?? "").trim();

      setAdminLoading(true);
      setAdminError("");
      setAdminSuccess("");
      try {
        const response = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ userId, password })
        });

        let data: Record<string, unknown> | null = null;
        try {
          const text = await response.text();
          if (text) data = JSON.parse(text);
        } catch {
          data = null;
        }

        if (!response.ok) {
          throw new Error((data?.error as string) || "Nu am putut schimba parola contului.");
        }

        setUserPasswordDrafts((prev) => ({ ...prev, [userId]: "" }));
        setAdminSuccess("Parola contului a fost schimbată.");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Nu am putut schimba parola contului.";
        if (message.toLowerCase().includes("expirat")) setAdminSessionActive(false);
        setAdminError(message);
      } finally {
        setAdminLoading(false);
      }
    },
    [adminSessionActive, userPasswordDrafts]
  );

  return {
    adminAuthPassword,
    adminSessionActive,
    adminUsers,
    newUsername,
    newEmail,
    newPassword,
    newOwnerName,
    newAddress,
    currentAdminPassword,
    nextAdminPassword,
    userPasswordDrafts,
    adminLoading,
    adminError,
    adminSuccess,
    onAdminPasswordChange: setAdminAuthPassword,
    onNewUsernameChange: setNewUsername,
    onNewEmailChange: setNewEmail,
    onNewPasswordChange: setNewPassword,
    onNewOwnerNameChange: setNewOwnerName,
    onNewAddressChange: setNewAddress,
    onCurrentAdminPasswordChange: setCurrentAdminPassword,
    onNextAdminPasswordChange: setNextAdminPassword,
    onUserPasswordDraftChange: handleUserPasswordDraftChange,
    handleAdminLoad,
    handleAdminDelete,
    handleAdminCreate,
    handleAdminPasswordChange,
    handleUserPasswordChange
  };
}

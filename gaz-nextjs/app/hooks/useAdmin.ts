"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthUser } from "@/lib/types";
import { AdminUser } from "../components/AdminUsersPanel";
import { csrfHeaders } from "./useAuth";

export function useAdmin(user: AuthUser | null) {
  const [adminAuthPassword, setAdminAuthPassword] = useState("");
  const [adminSessionActive, setAdminSessionActive] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  useEffect(() => {
    if (!user) {
      setAdminAuthPassword("");
      setAdminSessionActive(false);
      setAdminUsers([]);
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

  return {
    adminAuthPassword,
    adminSessionActive,
    adminUsers,
    adminLoading,
    adminError,
    adminSuccess,
    onAdminPasswordChange: setAdminAuthPassword,
    handleAdminLoad,
    handleAdminDelete
  };
}

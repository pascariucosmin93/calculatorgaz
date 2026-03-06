"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AuthUser } from "@/lib/types";
import { csrfHeaders } from "./useAuth";

export function useProfile(
  user: AuthUser | null,
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>
) {
  const [profileOwnerName, setProfileOwnerName] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  useEffect(() => {
    if (!user) {
      setProfileOwnerName("");
      setProfileAddress("");
      setProfileError("");
      setProfileSuccess("");
      return;
    }
    setProfileOwnerName(user.ownerName ?? "");
    setProfileAddress(user.address ?? "");
    setProfileError("");
    setProfileSuccess("");
  }, [user?.id]);

  const handleProfileSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!user?.id) {
        setProfileError("Trebuie să fii autentificat pentru a salva datele.");
        return;
      }

      setProfileSaving(true);
      setProfileError("");
      setProfileSuccess("");

      try {
        const response = await fetch("/api/auth/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ ownerName: profileOwnerName, address: profileAddress })
        });

        let data: Record<string, unknown> | null = null;
        try {
          const text = await response.text();
          if (text) data = JSON.parse(text);
        } catch {
          data = null;
        }

        if (!response.ok) {
          throw new Error((data?.error as string) || "Nu am putut salva datele.");
        }
        if (!data) {
          throw new Error("Răspuns invalid de la server.");
        }

        setUser((prev) =>
          prev
            ? { ...prev, ownerName: (data!.ownerName as string) ?? null, address: (data!.address as string) ?? null }
            : prev
        );
        setProfileSuccess("Datele au fost salvate.");
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : "Nu am putut salva datele.");
      } finally {
        setProfileSaving(false);
      }
    },
    [profileAddress, profileOwnerName, user?.id, setUser]
  );

  return {
    profileOwnerName,
    profileAddress,
    profileSaving,
    profileError,
    profileSuccess,
    onOwnerNameChange: setProfileOwnerName,
    onAddressChange: setProfileAddress,
    handleProfileSubmit
  };
}

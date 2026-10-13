"use client";

import { useState } from "react";
import { SiteHeader } from "@/components/site-header";

export default function UnlockPage() {
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const token = String(new FormData(event.currentTarget).get("token") ?? "");
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (response.ok) {
      window.location.href = "/";
      return;
    }
    setError("That token does not match.");
  }

  return (
    <>
      <SiteHeader current="dashboard" />
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="font-serif text-4xl tracking-tight">Unlock the dashboard</h1>
        <p className="mt-3 text-muted">
          This server has a dashboard token set. Enter it to view aggregates and export CSV.
        </p>
        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm" htmlFor="token">
            Dashboard token
          </label>
          <input
            id="token"
            name="token"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-line bg-card px-3 py-2"
          />
          <button type="submit" className="rounded-full bg-deep px-4 py-2 text-sm text-paper">
            Continue
          </button>
          {error ? (
            <p className="text-sm text-clay" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </main>
    </>
  );
}

"use client";
import { useEffect } from "react";
import { registerWorker } from "@/lib/notify";

/** Registers the service worker on every load so the app is installable and push works once enabled. */
export default function RegisterSW() {
  useEffect(() => { void registerWorker(); }, []);
  return null;
}

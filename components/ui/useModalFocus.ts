"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "summary",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function useModalFocus<T extends HTMLElement>(isOpen: boolean): RefObject<T | null> {
  const dialogRef = useRef<T>(null);

  useLayoutEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((element) => !element.closest("[aria-hidden='true'], .visually-hidden") && element.getClientRects().length > 0);
    (focusable()[0] ?? dialog).focus();

    function trapTab(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    dialog.addEventListener("keydown", trapTab);
    return () => {
      dialog.removeEventListener("keydown", trapTab);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isOpen]);

  return dialogRef;
}

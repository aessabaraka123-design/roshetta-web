"use client";

import React from "react";

const CODE39: Record<string, string> = {
  "0": "bwbWBwBwb", "1": "BwbWbwbwB", "2": "bwBWbwbwB", "3": "BwBWbwbwb",
  "4": "bwbWBwbwB", "5": "BwbWBwbwb", "6": "bwBWBwbwb", "7": "bwbWbwBwB",
  "8": "BwbWbwBwb", "9": "bwBWbwBwb", "A": "BwbwbWbwB", "B": "bwBwbWbwB",
  "C": "BwBwbWbwb", "D": "bwbwBWbwB", "E": "BwbwBWbwb", "F": "bwBwBWbwb",
  "G": "bwbwbWBwB", "H": "BwbwbWBwb", "I": "bwBwbWBwb", "J": "bwbwBWBwb",
  "K": "BwbwbwbWB", "L": "bwBwbwbWB", "M": "BwBwbwbWb", "N": "bwbwBwbWB",
  "O": "BwbwBwbWb", "P": "bwBwBwbWb", "Q": "bwbwbwBWB", "R": "BwbwbwBWb",
  "S": "bwBwbwBWb", "T": "bwbwBwBWb", "U": "BWbwbwbwB", "V": "bWBwbwbwB",
  "W": "BWBwbwbwb", "X": "bWbwBwbwB", "Y": "BWbwBwbwb", "Z": "bWBwBwbwb",
  "-": "bWbwbwBwB", ".": "BWbwbwBwb", " ": "bWBwbwBwb", "*": "bWbwBwBwb",
};

export default function LocalBarcode({ value }: { value: string }) {
  const cleanVal = (value || "").toUpperCase().replace(/[^A-Z0-9-. ]/g, "");
  const text = "*" + cleanVal + "*";
  const bars: { isBlack: boolean; isWide: boolean; key: string }[] = [];

  // Calculate dynamic bar widths so barcode remains compact, centered, and never stretches across the ticket
  const maxBarcodeWidth = 190;
  const unitsPerChar = 13.6;
  const totalUnits = Math.max(1, text.length * unitsPerChar);
  const narrowWidth = Math.max(0.65, Math.min(1.2, maxBarcodeWidth / totalUnits));
  const wideWidth = Number((narrowWidth * 2.2).toFixed(2));
  const narrow = Number(narrowWidth.toFixed(2));

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const pattern = CODE39[char] || CODE39[" "];
    if (!pattern) continue;
    for (let j = 0; j < pattern.length; j++) {
      const p = pattern[j];
      const isBlack = p === "b" || p === "B";
      const isWide = p === "W" || p === "B";
      bars.push({
        isBlack,
        isWide,
        key: `${i}-${j}`,
      });
    }
    bars.push({ isBlack: false, isWide: false, key: `gap-${i}` });
  }

  return (
    <div className="flex flex-col items-center justify-center my-3 max-w-[220px] mx-auto">
      <div className="flex items-center h-[28px] overflow-hidden justify-center">
        {bars.map((bar) => (
          <div
            key={bar.key}
            style={{
              backgroundColor: bar.isBlack ? "#1E293B" : "transparent",
              width: `${bar.isWide ? wideWidth : narrow}px`,
              height: "100%",
            }}
          />
        ))}
      </div>
      <span className="font-mono text-[10px] text-ink-soft tracking-[2px] mt-1 text-center font-bold">
        {cleanVal}
      </span>
    </div>
  );
}

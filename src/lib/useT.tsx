import React, { createContext, useContext } from "react";
import { useCurrentFrame } from "remotion";
import { FPS } from "../theme";

// Absolute film time in seconds, independent of any <Sequence> offset.
const FilmTime = createContext<number>(0);

export const FilmTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return <FilmTime.Provider value={frame / FPS}>{children}</FilmTime.Provider>;
};

export const useT = () => useContext(FilmTime);

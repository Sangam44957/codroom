import { useState, useRef, useCallback } from "react";

export function useRoomLayout() {
  const [showProblem, setShowProblem] = useState(true);
  const [showScratchPad, setShowScratchPad] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [rightTab, setRightTab] = useState("chat");
  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [boardFullscreen, setBoardFullscreen] = useState(false);
  const [problemWidth, setProblemWidth] = useState(320);
  const containerRef = useRef(null);

  const handleProblemResize = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newWidth = Math.min(600, Math.max(220, clientX - rect.left));
    setProblemWidth(newWidth);
  }, []);

  const resetLayout = useCallback(() => {
    setShowProblem(true);
    setShowScratchPad(false);
    setShowOutput(true);
    setProblemWidth(320);
  }, []);

  return {
    showProblem,
    setShowProblem,
    showScratchPad,
    setShowScratchPad,
    showOutput,
    setShowOutput,
    rightTab,
    setRightTab,
    activeProblemIdx,
    setActiveProblemIdx,
    editorFullscreen,
    setEditorFullscreen,
    boardFullscreen,
    setBoardFullscreen,
    problemWidth,
    containerRef,
    handleProblemResize,
    resetLayout,
  };
}
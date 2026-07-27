import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useInterview(roomId, session, emitSetInterviewId) {
  const router = useRouter();
  const [interviewId, setInterviewId] = useState(null);
  const [interviewStatus, setInterviewStatus] = useState("waiting");

  const handleStartInterview = useCallback(async (language) => {
    if (!emitSetInterviewId) {
      toast.error("Connection not ready");
      return;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, language }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (res.ok) {
        setInterviewId(data.interview.id);
        setInterviewStatus("in_progress");
        emitSetInterviewId(data.interview.id);
        toast.success("Interview started!");
      } else toast.error(data.error || "Failed to start interview");
    } catch (err) { 
      if (err.name === "AbortError") {
        toast.error("Request timed out");
      } else {
        console.error(err); 
        toast.error("Failed to start interview"); 
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }, [roomId, emitSetInterviewId]);

  const handleEndInterview = useCallback(async (files, activeFile, language) => {
    if (!interviewId) {
      toast.error("No active interview");
      return;
    }
    if (!confirm("End this interview?")) return;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const res = await fetch(`/api/interviews/${interviewId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalCode: files[activeFile] ?? "", language }),
        signal: controller.signal,
      });
      if (res.ok) {
        setInterviewStatus("completed");
        toast.success("Interview ended — generating AI report…");
        // Fire report generation in background, don't await
        fetch(`/api/interviews/${interviewId}/report`, { method: "POST" }).catch(() => {});
        router.push(`/room/${roomId}/report`);
      } else { 
        const d = await res.json(); 
        toast.error(d.error || "Failed to end interview"); 
      }
    } catch (err) { 
      if (err.name === "AbortError") {
        toast.error("Request timed out");
      } else {
        console.error(err); 
        toast.error("Failed to end interview"); 
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }, [interviewId]);

  return {
    interviewId,
    interviewStatus,
    setInterviewId,
    setInterviewStatus,
    handleStartInterview,
    handleEndInterview,
  };
}
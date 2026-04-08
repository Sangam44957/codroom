"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

// Fetch ICE config from the server — TURN credentials never touch the client bundle.
async function fetchIceServers() {
  try {
    const res = await fetch("/api/turn");
    if (res.ok) {
      const data = await res.json();
      return data.iceServers;
    }
  } catch {}
  // Fallback: STUN only
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];
}

// Returns true when the current context can access camera/mic.
// Requires HTTPS (or localhost) — plain HTTP on a real IP will always fail.
function mediaDevicesAvailable() {
  return !!navigator.mediaDevices?.getUserMedia;
}

export default function VideoPanel({ sharePeerId, onPeerIdReceived, emitCameraToggle, onRemoteCameraToggle }) {
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [remoteCameraOff, setRemoteCameraOff] = useState(false);
  const [callStatus, setCallStatus] = useState("initializing");
  const [httpsRequired, setHttpsRequired] = useState(false);

  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const currentCallRef = useRef(null);
  const myStreamRef = useRef(null);
  const initRunIdRef = useRef(0);
  const pendingPeerIdRef = useRef(null); // Bug 5: queue peer ID if it arrives early

  // Mount = start, unmount = stop
  useEffect(() => {
    if (!mediaDevicesAvailable()) {
      // On non-localhost HTTP the API simply doesn't exist — show a clear message
      // instead of a cryptic "no camera" error.
      const isLocalhost =
        location.hostname === "localhost" || location.hostname === "127.0.0.1";
      if (!isLocalhost) {
        setHttpsRequired(true);
        setCallStatus("https-required");
        return;
      }
      setCallStatus("no-camera");
      return;
    }
    initializeVideo();
    return () => stopEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bug 4: Separate beforeunload effect so cleanup doesn't fire on every re-render
  useEffect(() => {
    window.addEventListener("beforeunload", stopEverything);
    return () => window.removeEventListener("beforeunload", stopEverything);
  }, []);

  // Attach remote stream when it arrives
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    onRemoteCameraToggle?.((isOff) => setRemoteCameraOff(isOff));
  }, [onRemoteCameraToggle]);

  useEffect(() => {
    onPeerIdReceived((peerId) => {
      if (currentCallRef.current) return;
      if (!myStreamRef.current) {
        pendingPeerIdRef.current = peerId;
        return;
      }
      callPeer(peerId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPeerIdReceived]);

  // Bug 3: Retry attaching local stream until the video ref is in the DOM
  function attachLocalStream(stream, attempt = 0) {
    if (myVideoRef.current) {
      myVideoRef.current.srcObject = stream;
      myVideoRef.current.play().catch(() => {});
    } else if (attempt < 10) {
      setTimeout(() => attachLocalStream(stream, attempt + 1), 50);
    }
  }

  function stopEverything() {
    // Invalidate any pending async initializeVideo flow.
    initRunIdRef.current += 1;

    if (myStreamRef.current) {
      myStreamRef.current.getTracks().forEach((t) => t.stop());
      myStreamRef.current = null;
    }
    if (myVideoRef.current) myVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    pendingPeerIdRef.current = null;
    setRemoteStream(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setCallStatus("idle");
  }

  async function initializeVideo() {
    const initRunId = ++initRunIdRef.current;

    try {
      setCallStatus("initializing");

      if (!navigator.mediaDevices?.getUserMedia) {
        setCallStatus("no-camera");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      // If a newer init started (or cleanup ran), stop this stale stream immediately.
      if (initRunId !== initRunIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Defensive: stop a previous stream before replacing it.
      if (myStreamRef.current && myStreamRef.current !== stream) {
        myStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      myStreamRef.current = stream;

      // Bug 3: Use retry loop instead of direct ref assignment
      attachLocalStream(stream);

      const { default: Peer } = await import("peerjs");

      // Component may have unmounted while peerjs was loading.
      if (initRunId !== initRunIdRef.current) {
        return;
      }

      const iceServers = await fetchIceServers();
      if (initRunId !== initRunIdRef.current) return;
      const peer = new Peer({ config: { iceServers } });
      peerRef.current = peer;

      peer.on("open", (id) => {
        console.log("🎥 My Peer ID:", id);
        setCallStatus("ready");
        sharePeerId(id);

        // Bug 5: If a peer ID arrived while we were initializing, call now
        if (pendingPeerIdRef.current) {
          callPeer(pendingPeerIdRef.current);
          pendingPeerIdRef.current = null;
        }
      });

      // Bug 2: On incoming call, reject if already in a call
      peer.on("call", (call) => {
        if (currentCallRef.current) {
          console.warn("Already in a call — rejecting incoming call");
          call.close();
          return;
        }
        console.log("📞 Answering incoming call");
        call.answer(stream);
        currentCallRef.current = call;
        bindCallEvents(call);
      });

      peer.on("error", (err) => {
        console.error("Peer error:", err);
        setCallStatus("error");
      });
    } catch (err) {
      console.error("Camera access failed:", err);
      setCallStatus("no-camera");
    }
  }

  function callPeer(remotePeerId) {
    if (!peerRef.current || !myStreamRef.current) {
      console.warn("Cannot call — peer or stream not ready");
      return;
    }
    console.log("📞 Calling peer:", remotePeerId);
    const call = peerRef.current.call(remotePeerId, myStreamRef.current);
    currentCallRef.current = call;
    bindCallEvents(call);
  }

  function bindCallEvents(call) {
    call.on("stream", (incomingStream) => {
      console.log("🎥 Got remote stream");
      setRemoteStream(incomingStream);
      setCallStatus("connected");

      // Re-attach stream whenever a track is added/replaced (e.g. camera toggle)
      const pc = call.peerConnection;
      if (pc) {
        pc.ontrack = () => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = incomingStream;
            remoteVideoRef.current.play().catch(() => {});
          }
        };
      }
    });
    call.on("close", () => {
      setRemoteStream(null);
      currentCallRef.current = null;
      setCallStatus("ready");
    });
    call.on("error", (err) => {
      console.error("Call error:", err);
      setCallStatus("error");
    });
  }

  function toggleMute() {
    const track = myStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }

  async function toggleCamera() {
    const stream = myStreamRef.current;
    if (!stream) return;

    if (!isCameraOff) {
      stream.getVideoTracks().forEach((t) => t.stop());
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = null;
        myVideoRef.current.load();
      }
      emitCameraToggle?.(true);
      setIsCameraOff(true);
    } else {
      // Re-request camera — hardware starts again, LED turns on
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = newStream.getVideoTracks()[0];

        // Remove old (stopped) video tracks and add the new one
        stream.getVideoTracks().forEach((t) => stream.removeTrack(t));
        stream.addTrack(newVideoTrack);

        // Replace the track in the active peer call so the remote side sees it
        if (currentCallRef.current?.peerConnection) {
          const sender = currentCallRef.current.peerConnection
            .getSenders()
            .find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(newVideoTrack);
        }

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
          myVideoRef.current.play().catch(() => {});
        }
        emitCameraToggle?.(false);
        setIsCameraOff(false);
      } catch (err) {
        console.error("Failed to restart camera:", err);
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Remote video */}
      <div className="relative bg-[#111118] rounded-xl overflow-hidden aspect-video">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${(!remoteStream || remoteCameraOff) ? "hidden" : ""}`}
        />

        {(!remoteStream || remoteCameraOff) && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#111118]">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-2">
                {remoteCameraOff ? <VideoOff size={18} className="text-slate-500" /> : <span className="text-xl">👤</span>}
              </div>
              <p className="text-slate-500 text-xs">
                {remoteCameraOff
                  ? "Camera is off"
                  : callStatus === "initializing" ? "Starting camera..."
                  : callStatus === "ready" ? "Waiting for participant..."
                  : callStatus === "connected" ? "Connecting..."
                  : callStatus === "error" ? "Connection failed"
                  : callStatus === "no-camera" ? "No camera access"
                  : callStatus === "idle" ? "Video off"
                  : "HTTPS required"}
              </p>
            </div>
          </div>
        )}

        {/* Local video PiP — always mounted so ref stays valid */}
        <div
          className="absolute bottom-2 right-2 w-20 rounded-lg overflow-hidden border border-white/10 bg-[#0d0d14] shadow-lg"
          style={{ height: "56px" }}
        >
          <video ref={myVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {/* Solid overlay covers the frozen frame instantly when camera is off */}
          {isCameraOff && (
            <div className="absolute inset-0 bg-[#0d0d14] flex items-center justify-center">
              <VideoOff size={14} className="text-slate-600" />
            </div>
          )}
        </div>

        {/* Live indicator */}
        {callStatus === "connected" && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/50 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[10px] font-medium">LIVE</span>
          </div>
        )}
      </div>

      {/* HTTPS warning banner */}
      {httpsRequired && (
        <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-amber-400 text-xs leading-relaxed">
            <span className="font-semibold">HTTPS required for video.</span>{" "}
            Camera access is blocked on plain HTTP outside localhost.
          </p>
        </div>
      )}

      {/* Controls — circular icon buttons like Google Meet */}
      <div className="flex items-center justify-center gap-3 py-1">
        <button
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isMuted
              ? "bg-rose-600 hover:bg-rose-500 text-white"
              : "bg-white/[0.08] hover:bg-white/[0.14] text-slate-300"
          }`}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <button
          onClick={toggleCamera}
          title={isCameraOff ? "Turn on camera" : "Turn off camera"}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isCameraOff
              ? "bg-rose-600 hover:bg-rose-500 text-white"
              : "bg-white/[0.08] hover:bg-white/[0.14] text-slate-300"
          }`}
        >
          {isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
        </button>


      </div>
    </div>
  );
}

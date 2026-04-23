"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

async function fetchIceServers() {
  try {
    const res = await fetch("/api/turn");
    if (res.ok) {
      const data = await res.json();
      return data.iceServers;
    }
  } catch {}
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];
}

function mediaDevicesAvailable() {
  return !!navigator.mediaDevices?.getUserMedia;
}

export default function VideoPanel({ sharePeerId, onPeerIdReceived, emitCameraToggle, onRemoteCameraToggle, emitMicToggle, onRemoteMicToggle }) {
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [remoteCameraOff, setRemoteCameraOff] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [callStatus, setCallStatus] = useState("initializing");
  const [httpsRequired, setHttpsRequired] = useState(false);

  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const currentCallRef = useRef(null);
  const myStreamRef = useRef(null);
  const initRunIdRef = useRef(0);
  const pendingPeerIdsRef = useRef([]);

  const stopEverything = useCallback(() => {
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
    pendingPeerIdsRef.current = [];
    setRemoteStream(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setCallStatus("idle");
  }, []);

  const attachLocalStream = useCallback((stream, attempt = 0) => {
    if (myVideoRef.current) {
      myVideoRef.current.srcObject = stream;
      myVideoRef.current.play().catch(() => {});
    } else if (attempt < 10) {
      setTimeout(() => attachLocalStream(stream, attempt + 1), 50);
    }
  }, []);

  const bindCallEvents = useCallback((call) => {
    call.on("stream", (incomingStream) => {
      setRemoteStream(incomingStream);
      setCallStatus("connected");
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
  }, []);

  const callPeer = useCallback((remotePeerId) => {
    if (!peerRef.current || !myStreamRef.current) return;
    const call = peerRef.current.call(remotePeerId, myStreamRef.current);
    currentCallRef.current = call;
    bindCallEvents(call);
  }, [bindCallEvents]);

  const initializeVideo = useCallback(async () => {
    const initRunId = ++initRunIdRef.current;
    try {
      setCallStatus("initializing");
      if (!navigator.mediaDevices?.getUserMedia) {
        setCallStatus("no-camera");
        return;
      }
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        console.warn("Could not get video+audio:", err);
        if (err.name === 'NotAllowedError') {
          setCallStatus("permission-denied");
          return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setIsCameraOff(true);
          emitCameraToggle?.(true);
        } catch (audioErr) {
          console.warn("Could not get audio only:", audioErr);
          if (audioErr.name === 'NotAllowedError') {
            setCallStatus("permission-denied");
            return;
          }
          setCallStatus("no-camera");
          return;
        }
      }

      if (initRunId !== initRunIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (myStreamRef.current && myStreamRef.current !== stream) {
        myStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      myStreamRef.current = stream;
      attachLocalStream(stream);

      const { default: Peer } = await import("peerjs");
      if (initRunId !== initRunIdRef.current) return;

      const iceServers = await fetchIceServers();
      if (initRunId !== initRunIdRef.current) return;

      const peer = new Peer({ config: { iceServers } });
      peerRef.current = peer;

      peer.on("open", (id) => {
        setCallStatus("ready");
        sharePeerId(id);
        for (const pid of pendingPeerIdsRef.current) callPeer(pid);
        pendingPeerIdsRef.current = [];
      });

      peer.on("call", (call) => {
        if (currentCallRef.current) { call.close(); return; }
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
      if (err.name === 'NotAllowedError') {
        setCallStatus("permission-denied");
      } else {
        setCallStatus("no-camera");
      }
    }
  }, [sharePeerId, attachLocalStream, callPeer, bindCallEvents, emitCameraToggle]);

  // Mount = start, unmount = stop
  useEffect(() => {
    if (!mediaDevicesAvailable()) {
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
  }, [initializeVideo, stopEverything]);

  // Bug 4: Separate beforeunload effect so cleanup doesn't fire on every re-render
  useEffect(() => {
    window.addEventListener("beforeunload", stopEverything);
    return () => window.removeEventListener("beforeunload", stopEverything);
  }, [stopEverything]);

  // Attach remote stream when it arrives
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    onRemoteCameraToggle((isOff) => setRemoteCameraOff(isOff));
  }, [onRemoteCameraToggle]);

  useEffect(() => {
    onRemoteMicToggle?.((isMuted) => setRemoteMuted(isMuted));
  }, [onRemoteMicToggle]);

  useEffect(() => {
    onPeerIdReceived((peerId) => {
      if (currentCallRef.current) return;
      if (!myStreamRef.current) {
        pendingPeerIdsRef.current.push(peerId);
        return;
      }
      callPeer(peerId);
    });
  }, [onPeerIdReceived, callPeer]);

  function toggleMute() {
    console.log('Toggle mute clicked, current stream:', myStreamRef.current);
    const track = myStreamRef.current?.getAudioTracks()[0];
    if (!track) {
      console.log('No audio track found');
      return;
    }
    track.enabled = !track.enabled;
    const newMutedState = !track.enabled;
    setIsMuted(newMutedState);
    emitMicToggle?.(newMutedState);
    console.log('Audio track enabled:', track.enabled, 'isMuted state:', newMutedState);
  }

  async function toggleCamera() {
    console.log('Toggle camera clicked, current stream:', myStreamRef.current, 'isCameraOff:', isCameraOff);
    const stream = myStreamRef.current;
    if (!stream) {
      console.log('No stream available');
      return;
    }
    
    if (!isCameraOff) {
      // Turn camera OFF
      console.log('Turning camera OFF');
      stream.getVideoTracks().forEach((t) => t.stop());
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = null;
        myVideoRef.current.load();
      }
      setIsCameraOff(true);
      emitCameraToggle?.(true);
      console.log('Camera turned OFF');
    } else {
      // Turn camera ON
      console.log('Turning camera ON');
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        // Remove old video tracks and add new one
        stream.getVideoTracks().forEach((t) => stream.removeTrack(t));
        stream.addTrack(newVideoTrack);
        
        // Update peer connection if active
        if (currentCallRef.current?.peerConnection) {
          const sender = currentCallRef.current.peerConnection
            .getSenders()
            .find((s) => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(newVideoTrack);
          }
        }
        
        // Update local video element
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
          myVideoRef.current.play().catch(() => {});
        }
        
        setIsCameraOff(false);
        emitCameraToggle?.(false);
        console.log('Camera turned ON');
      } catch (err) {
        console.error("Failed to restart camera:", err);
        // Keep camera off state if restart fails
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
                  : callStatus === "permission-denied" ? "Camera access denied"
                  : callStatus === "no-camera" ? "No camera access"
                  : callStatus === "idle" ? "Video off"
                  : "HTTPS required"}
              </p>
            </div>
          </div>
        )}

        {/* Local video PiP */}
        <div
          className="absolute bottom-2 right-2 w-20 rounded-lg overflow-hidden border border-white/10 bg-[#0d0d14] shadow-lg"
          style={{ height: "56px" }}
        >
          <video ref={myVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {isCameraOff && (
            <div className="absolute inset-0 bg-[#0d0d14] flex items-center justify-center">
              <VideoOff size={14} className="text-slate-600" />
            </div>
          )}
        </div>

        {callStatus === "connected" && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/50 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[10px] font-medium">LIVE</span>
          </div>
        )}
      </div>

      {(httpsRequired || callStatus === "permission-denied") && (
        <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-amber-400 text-xs leading-relaxed">
            {httpsRequired ? (
              <>
                <span className="font-semibold">HTTPS required for video.</span>{" "}
                Camera access is blocked on plain HTTP outside localhost.
              </>
            ) : (
              <>
                <span className="font-semibold">Camera permission denied.</span>{" "}
                Please allow camera access and refresh the page.
              </>
            )}
          </p>
        </div>
      )}

      <div className="flex items-center justify-center gap-3 py-1">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Mute button clicked');
            toggleMute();
          }}
          disabled={callStatus === "permission-denied" || !myStreamRef.current}
          title={isMuted ? "Unmute" : "Mute"}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            callStatus === "permission-denied" || !myStreamRef.current
              ? "bg-white/[0.03] text-slate-600 cursor-not-allowed"
              : isMuted
              ? "bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              : "bg-white/[0.08] hover:bg-white/[0.14] text-slate-300 cursor-pointer"
          }`}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Camera button clicked');
            toggleCamera();
          }}
          disabled={callStatus === "permission-denied"}
          title={isCameraOff ? "Turn on camera" : "Turn off camera"}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            callStatus === "permission-denied"
              ? "bg-white/[0.03] text-slate-600 cursor-not-allowed"
              : isCameraOff
              ? "bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              : "bg-white/[0.08] hover:bg-white/[0.14] text-slate-300 cursor-pointer"
          }`}
        >
          {isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
        </button>
      </div>
    </div>
  );
}

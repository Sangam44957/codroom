"use client";

import { useEffect, useRef, useState } from "react";

export default function VideoPanel({ isActive, sharePeerId, onPeerIdReceived }) {
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callStatus, setCallStatus] = useState("idle");

  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const currentCallRef = useRef(null);
  const myStreamRef = useRef(null);

  // ── Watch isActive — start/stop camera based on it ──
  useEffect(() => {
    if (isActive) {
      initializeVideo();
    } else {
      stopEverything();
    }
  }, [isActive]);

  // ── Stop camera on page close/tab close ──
  useEffect(() => {
    window.addEventListener("beforeunload", stopEverything);
    return () => {
      stopEverything();
      window.removeEventListener("beforeunload", stopEverything);
    };
  }, []);

  // ── Attach remote stream ──
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // ── Re-attach local stream when camera turned back on ──
  useEffect(() => {
    if (!isCameraOff && myVideoRef.current && myStreamRef.current) {
      myVideoRef.current.srcObject = myStreamRef.current;
      myVideoRef.current.play().catch(() => {});
    }
  }, [isCameraOff]);

  // ── Listen for other user's peer ID ──
  useEffect(() => {
    onPeerIdReceived((peerId) => {
      console.log("📞 Received peer ID, calling:", peerId);
      callPeer(peerId);
    });
  }, [onPeerIdReceived]);

  function stopEverything() {
    console.log("🛑 Stopping all camera/mic tracks");

    // Stop all media tracks — this turns off camera light
    if (myStreamRef.current) {
      myStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("🛑 Stopped track:", track.kind);
      });
      myStreamRef.current = null;
    }

    // Clear video elements
    if (myVideoRef.current) {
      myVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Close call
    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }

    // Destroy peer
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    setRemoteStream(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setCallStatus("idle");
  }

  async function initializeVideo() {
    try {
      setCallStatus("initializing");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCallStatus("no-camera");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      myStreamRef.current = stream;

      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }

      const { default: Peer } = await import("peerjs");
      const peer = new Peer();
      peerRef.current = peer;

      peer.on("open", (id) => {
        console.log("🎥 My Peer ID:", id);
        setCallStatus("ready");
        sharePeerId(id);
      });

      peer.on("call", (call) => {
        console.log("📞 Incoming call, answering...");
        call.answer(stream);
        currentCallRef.current = call;

        call.on("stream", (incomingStream) => {
          console.log("🎥 Got remote stream");
          setRemoteStream(incomingStream);
          setCallStatus("connected");
        });

        call.on("close", () => {
          setRemoteStream(null);
          setCallStatus("ready");
        });

        call.on("error", (err) => {
          console.error("Call error:", err);
          setCallStatus("error");
        });
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
    const stream = myStreamRef.current;
    if (!peerRef.current || !stream) {
      console.warn("Cannot call — peer or stream not ready");
      return;
    }

    const call = peerRef.current.call(remotePeerId, stream);
    currentCallRef.current = call;

    call.on("stream", (incomingStream) => {
      setRemoteStream(incomingStream);
      setCallStatus("connected");
    });

    call.on("close", () => {
      setRemoteStream(null);
      setCallStatus("ready");
    });

    call.on("error", (err) => {
      console.error("Call error:", err);
    });
  }

  function toggleMute() {
    const stream = myStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }

  function toggleCamera() {
    const stream = myStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  }

  // Don't render UI when not active
  if (!isActive) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Remote Video */}
      <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${!remoteStream ? "hidden" : ""}`}
        />

        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-2">👤</div>
              <p className="text-gray-500 text-xs">
                {callStatus === "initializing" && "Starting camera..."}
                {callStatus === "ready" && "Waiting for other user..."}
                {callStatus === "connected" && "Connecting stream..."}
                {callStatus === "error" && "Connection failed"}
                {callStatus === "no-camera" && "No camera access"}
                {callStatus === "idle" && "Video off"}
              </p>
            </div>
          </div>
        )}

        {/* My Video corner */}
        {!isCameraOff ? (
          <div
            className="absolute bottom-2 right-2 w-24 rounded-lg overflow-hidden border border-gray-700 bg-gray-900"
            style={{ height: "72px" }}
          >
            <video
              ref={myVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-gray-900/80 rounded-lg border border-gray-700">
            <span className="text-gray-500 text-xs">📷 Off</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={toggleMute}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            isMuted
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
          }`}
        >
          {isMuted ? "🔇 Unmute" : "🎤 Mute"}
        </button>

        <button
          onClick={toggleCamera}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            isCameraOff
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
          }`}
        >
          {isCameraOff ? "📷 Show Camera" : "🎥 Hide Camera"}
        </button>
      </div>
    </div>
  );
}
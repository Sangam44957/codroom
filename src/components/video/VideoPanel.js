"use client";

import { useEffect, useRef, useState } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    // Add TURN server here for guaranteed NAT traversal:
    // { urls: "turn:your-turn-server.com", username: "user", credential: "pass" },
  ],
};

export default function VideoPanel({ sharePeerId, onPeerIdReceived }) {
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callStatus, setCallStatus] = useState("initializing");

  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const currentCallRef = useRef(null);
  const myStreamRef = useRef(null);
  const pendingPeerIdRef = useRef(null); // Bug 5: queue peer ID if it arrives early

  // Bug 1 & 4: Mount = start, unmount = stop. No isActive needed.
  useEffect(() => {
    initializeVideo();
    return () => stopEverything();
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

  // Re-attach local stream when camera is turned back on
  useEffect(() => {
    if (!isCameraOff && myVideoRef.current && myStreamRef.current) {
      myVideoRef.current.srcObject = myStreamRef.current;
      myVideoRef.current.play().catch(() => {});
    }
  }, [isCameraOff]);

  // Bug 6: Depend on onPeerIdReceived so it re-registers when socket is ready
  useEffect(() => {
    onPeerIdReceived((peerId) => {
      console.log("📞 Received peer ID:", peerId);
      // Bug 2: Only call if we are not already in a call
      if (currentCallRef.current) {
        console.warn("Already in a call — ignoring incoming peer ID");
        return;
      }
      // Bug 5: If stream not ready yet, queue the peer ID
      if (!myStreamRef.current) {
        console.warn("Stream not ready — queuing peer ID");
        pendingPeerIdRef.current = peerId;
        return;
      }
      callPeer(peerId);
    });
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
    try {
      setCallStatus("initializing");

      if (!navigator.mediaDevices?.getUserMedia) {
        setCallStatus("no-camera");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      myStreamRef.current = stream;

      // Bug 3: Use retry loop instead of direct ref assignment
      attachLocalStream(stream);

      const { default: Peer } = await import("peerjs");
      // Bug 7: Pass multiple STUN servers
      const peer = new Peer({ config: ICE_SERVERS });
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

  function getSender(kind) {
    return currentCallRef.current?.peerConnection
      ?.getSenders()
      ?.find((s) => s.track?.kind === kind);
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
      // HIDE: stop the track so the OS releases the camera light
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        if (myVideoRef.current) myVideoRef.current.srcObject = null;
        const sender = getSender("video");
        if (sender) await sender.replaceTrack(null);
      }
      setIsCameraOff(true);
    } else {
      // SHOW: build a completely fresh stream — never reuse the stale one
      try {
        const newVideoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = newVideoStream.getVideoTracks()[0];

        // Grab still-live audio tracks from the old stream
        const audioTracks = stream.getAudioTracks();

        // Brand new MediaStream — browser treats it as fresh, no stale state
        const freshStream = new MediaStream([...audioTracks, newVideoTrack]);
        myStreamRef.current = freshStream;

        // Attach to local preview
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = freshStream;
          myVideoRef.current.play().catch(() => {});
        }

        // Tell the peer to use the new video track
        const sender = getSender("video");
        if (sender) await sender.replaceTrack(newVideoTrack);

        setIsCameraOff(false);
      } catch (err) {
        console.error("Failed to restart camera:", err);
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Remote video */}
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

        {/* Local video PiP */}
        {!isCameraOff ? (
          <div
            className="absolute bottom-2 right-2 w-24 rounded-lg overflow-hidden border border-gray-700 bg-gray-900"
            style={{ height: "72px" }}
          >
            <video ref={myVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
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
          {isCameraOff ? "📷 Show" : "🎥 Hide"}
        </button>
      </div>
    </div>
  );
}

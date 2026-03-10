"use client";

import { useEffect, useRef, useState } from "react";

export default function VideoPanel({
  roomId,
  userName,
  sharePeerId,
  onPeerIdReceived,
}) {
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callStatus, setCallStatus] = useState("initializing");

  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const currentCallRef = useRef(null);

  useEffect(() => {
    initializeVideo();

    return () => {
      cleanup();
    };
  }, []);

  // Listen for incoming peer IDs
  useEffect(() => {
    onPeerIdReceived((peerId) => {
      console.log("📞 Received peer ID, calling:", peerId);
      callPeer(peerId);
    });
  }, [onPeerIdReceived]);

  async function initializeVideo() {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("Camera/microphone not available");
        setCallStatus("no-camera");
        return;
      }

      // Get camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setMyStream(stream);

      // Show local video
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }

      // Dynamically import PeerJS (client-side only)
      const { default: Peer } = await import("peerjs");

      // Create peer
      const peer = new Peer();
      peerRef.current = peer;

      peer.on("open", (id) => {
        console.log("🎥 My Peer ID:", id);
        setCallStatus("ready");

        // Share peer ID with room via socket
        sharePeerId(id);
      });

      // Answer incoming calls
      peer.on("call", (call) => {
        console.log("📞 Incoming call, answering...");
        call.answer(stream);
        currentCallRef.current = call;

        call.on("stream", (incomingStream) => {
          console.log("🎥 Receiving remote stream");
          setRemoteStream(incomingStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = incomingStream;
          }
          setCallStatus("connected");
        });

        call.on("close", () => {
          setRemoteStream(null);
          setCallStatus("ready");
        });
      });

      peer.on("error", (err) => {
        console.error("Peer error:", err);
        setCallStatus("error");
      });
    } catch (err) {
      console.error("Failed to get media devices:", err);
      setCallStatus("no-camera");
    }
  }

  function callPeer(remotePeerId) {
    if (!peerRef.current || !myStream) return;

    console.log("📞 Calling peer:", remotePeerId);
    const call = peerRef.current.call(remotePeerId, myStream);
    currentCallRef.current = call;

    call.on("stream", (incomingStream) => {
      console.log("🎥 Receiving remote stream from call");
      setRemoteStream(incomingStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = incomingStream;
      }
      setCallStatus("connected");
    });

    call.on("close", () => {
      setRemoteStream(null);
      setCallStatus("ready");
    });
  }

  function toggleMute() {
    if (myStream) {
      const audioTrack = myStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }

  function toggleCamera() {
    if (myStream) {
      const videoTrack = myStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  }

  function cleanup() {
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
    }
    if (currentCallRef.current) {
      currentCallRef.current.close();
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Remote Video (big) */}
      <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-2">👤</div>
              <p className="text-gray-500 text-xs">
                {callStatus === "initializing" && "Starting camera..."}
                {callStatus === "ready" && "Waiting for other user..."}
                {callStatus === "connected" && "Connected"}
                {callStatus === "error" && "Connection failed"}
                {callStatus === "no-camera" && "No camera access"}
              </p>
            </div>
          </div>
        )}

        {/* My Video (small overlay) */}
        <div className="absolute bottom-2 right-2 w-24 h-18 bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
          {isCameraOff ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <span className="text-gray-500 text-xs">Camera Off</span>
            </div>
          ) : (
            <video
              ref={myVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
        </div>
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
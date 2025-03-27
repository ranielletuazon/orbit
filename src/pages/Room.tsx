import styles from "./css/Room.module.css";
import Header from '../components/Header';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loader from "../components/loader";
import { auth, db } from '../components/firebase/firebase';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { io } from "socket.io-client";

// Initialize socket connection
const socket = io("https://orbit-server.onrender.com:5000");

// WebRTC configuration
const configuration = { 
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export default function Room({ user }: { user: any }) {
    const [loading, setIsLoading] = useState(true);
    const { roomID } = useParams();
    const [roomData, setRoomData] = useState<any>(null);
    const navigate = useNavigate();
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const [cameraAllowed, setCameraAllowed] = useState<boolean | null>(null);
    const [roomError, setRoomError] = useState<string | null>(null);
    const [otherUser, setOtherUser] = useState<any | null>(null);
    
    // WebRTC state
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [otherParticipantId, setOtherParticipantId] = useState<string | null>(null);
    const [localVideoActive, setLocalVideoActive] = useState(false);

    // First, check if the room exists before requesting camera permissions
    useEffect(() => {
        const checkRoomExists = async () => {
            if (!roomID || !user?.uid) {
                setRoomError("Invalid room ID or user not logged in");
                setIsLoading(false);
                return;
            }

            try {
                const docRef = doc(db, "userRooms", roomID);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    console.error("Room does not exist");
                    setRoomError("Room not found");
                    setIsLoading(false);
                } else {
                    const data = docSnap.data();
                    if (!data.members.includes(user.uid)) {
                        setRoomError("You are not allowed to enter this room");
                        setIsLoading(false);
                    } else {
                        // Room exists and user is authorized
                        setRoomData(data);
                        const otherUser = data.members.find((userId: string) => userId !== user.uid);
                        setOtherParticipantId(otherUser);
                        
                        // Only request camera permissions if room exists and user is authorized
                        requestCameraPermissions();
                    }
                }
            } catch (error) {
                console.error("Error checking room:", error);
                setRoomError("Error checking room status");
                setIsLoading(false);
            }
        };

        checkRoomExists();
    }, [roomID, user]);

    // Improved camera permission request with better error handling
    const requestCameraPermissions = async () => {
        try {
            console.log("Requesting camera permissions...");
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            // Check if video tracks are available
            const videoTracks = stream.getVideoTracks();
            if (videoTracks.length === 0) {
                console.warn("No video tracks found in the stream");
                toast.warning("No camera detected. Please check your camera settings.");
            } else {
                console.log("Video track found:", videoTracks[0].label);
                // Ensure video track is enabled
                videoTracks[0].enabled = true;
            }
            
            setCameraAllowed(true);
            localStreamRef.current = stream;
            
            // Add a small delay to ensure the video element is mounted
            setTimeout(() => {
                if (localVideoRef.current) {
                    console.log("Setting local video source");
                    localVideoRef.current.srcObject = stream;
                    // Explicitly try to play the video
                    localVideoRef.current.play()
                        .then(() => {
                            console.log("Local video playing successfully");
                            setLocalVideoActive(true);
                        })
                        .catch(err => {
                            console.error("Error playing local video:", err);
                            toast.error("Error displaying your camera. Please refresh the page.");
                        });
                } else {
                    console.error("Local video ref is not available");
                }
            }, 200);
            
            setIsLoading(false);
        } catch (error) {
            console.error("Camera/Microphone access denied:", error);
            setCameraAllowed(false);
            toast.error("Camera and microphone access is required for this feature.");
            setIsLoading(false);
        }
    };

    // Ensure video element is connected to stream whenever the ref changes
    useEffect(() => {
        if (localVideoRef.current && localStreamRef.current && !localVideoActive) {
            console.log("Re-connecting local video source");
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.play()
                .then(() => {
                    console.log("Local video playing successfully");
                    setLocalVideoActive(true);
                })
                .catch(err => console.error("Error playing local video:", err));
        }
    }, [localVideoRef.current, localStreamRef.current, localVideoActive]);

    useEffect(() => {
        // Initialize socket connection for this room
        if (roomID && user?.uid && !roomError && cameraAllowed) {
            socket.emit("joinRoom", { roomId: roomID, userId: user.uid });
            
            // Clean up socket connection on component unmount
            return () => {
                socket.emit("leaveRoom", { roomId: roomID, userId: user.uid });
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => track.stop());
                }
                if (peerConnectionRef.current) {
                    peerConnectionRef.current.close();
                }
            };
        }
    }, [roomID, user, roomError, cameraAllowed]);

    useEffect(() => {
        if (!roomID || !user?.uid || roomError || !cameraAllowed) return;
        
        const docRef = doc(db, "userRooms", roomID);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Check if the current user is part of the room
                if (data.members.includes(user.uid)) {
                    setRoomData(data);
                    
                    // Find the other participant ID (the one that's not the current user)
                    const otherUser = data.members.find((userId: string) => userId !== user.uid);
                    setOtherParticipantId(otherUser);
                } else {
                    console.warn("User no longer in room members list");
                    toast.error("You have been removed from this room");
                    navigate("/");
                }
            } else {
                console.error("Room no longer exists");
                toast.error("The room has been deleted");
                navigate("/");
            }
        }, (error) => {
            console.error("Error listening to room updates:", error);
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, [roomID, user, navigate, roomError, cameraAllowed]);

    // Set up WebRTC connection and socket event handlers
    useEffect(() => {
        if (!roomID || !user?.uid || roomError || !cameraAllowed || !localStreamRef.current) return;

        // Initialize WebRTC peer connection
        const initializePeerConnection = () => {
            // Create new peer connection
            const peerConnection = new RTCPeerConnection(configuration);
            peerConnectionRef.current = peerConnection;

            // Add local tracks to peer connection
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStreamRef.current!);
                });
            }

            // Handle incoming remote stream
            peerConnection.ontrack = (event) => {
                console.log("Received remote track");
                if (remoteVideoRef.current && event.streams[0]) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                    remoteVideoRef.current.play()
                        .then(() => console.log("Remote video playing successfully"))
                        .catch(err => console.error("Error playing remote video:", err));
                    setIsConnected(true);
                }
            };

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    // Send the ICE candidate to the signaling server
                    socket.emit("iceCandidate", {
                        roomId: roomID,
                        candidate: event.candidate,
                        userId: user.uid
                    });
                }
            };

            // Connection state changes
            peerConnection.onconnectionstatechange = () => {
                console.log("Connection state:", peerConnection.connectionState);
                if (peerConnection.connectionState === 'connected') {
                    setIsConnected(true);
                } else if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
                    setIsConnected(false);
                }
            };

            return peerConnection;
        };

        // Socket event handlers for WebRTC signaling
        socket.on("userJoined", async ({ userId }) => {
            console.log(`User ${userId} joined the room`);
            
            if (userId !== user.uid) {
                console.log("Creating offer as initiator");
                
                // Initialize peer connection if it doesn't exist
                if (!peerConnectionRef.current) {
                    initializePeerConnection();
                }
                
                try {
                    // Create and send offer
                    const offer = await peerConnectionRef.current!.createOffer();
                    await peerConnectionRef.current!.setLocalDescription(offer);
                    
                    socket.emit("offer", {
                        roomId: roomID,
                        offer: offer,
                        userId: user.uid,
                        target: userId
                    });
                } catch (error) {
                    console.error("Error creating offer:", error);
                }
            }
        });

        socket.on("offer", async ({ offer, userId }) => {
            console.log(`Received offer from ${userId}`);
            
            if (userId !== user.uid) {
                // Initialize peer connection if it doesn't exist
                if (!peerConnectionRef.current) {
                    initializePeerConnection();
                }
                
                try {
                    await peerConnectionRef.current!.setRemoteDescription(new RTCSessionDescription(offer));
                    
                    // Create and send answer
                    const answer = await peerConnectionRef.current!.createAnswer();
                    await peerConnectionRef.current!.setLocalDescription(answer);
                    
                    socket.emit("answer", {
                        roomId: roomID,
                        answer: answer,
                        userId: user.uid,
                        target: userId
                    });
                } catch (error) {
                    console.error("Error handling offer:", error);
                }
            }
        });

        socket.on("answer", async ({ answer, userId }) => {
            console.log(`Received answer from ${userId}`);
            
            if (userId !== user.uid && peerConnectionRef.current) {
                try {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (error) {
                    console.error("Error handling answer:", error);
                }
            }
        });

        socket.on("iceCandidate", async ({ candidate, userId }) => {
            if (userId !== user.uid && peerConnectionRef.current) {
                try {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (error) {
                    console.error("Error adding ICE candidate:", error);
                }
            }
        });

        socket.on("userLeft", ({ userId }) => {
            console.log(`User ${userId} left the room`);
            if (userId !== user.uid) {
                toast.info("The other participant has left the room");
                // Reset remote video
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = null;
                }
                setIsConnected(false);
            }
        });

        // Clean up
        return () => {
            socket.off("userJoined");
            socket.off("offer");
            socket.off("answer");
            socket.off("iceCandidate");
            socket.off("userLeft");
        };
    }, [roomID, user, roomError, cameraAllowed]);

    // Media control functions
    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTracks = localStreamRef.current.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTracks = localStreamRef.current.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff(!isVideoOff);
        }
    };

    const endCall = () => {
        // Stop media tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        // Close peer connection
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }
        
        // Navigate away
        navigate("/rocket");
    };

    return (
        <>
            {loading ? (
                <Loader />
            ) : roomError ? (
                <div className={styles.errorContainer}>
                    <h2>Room Error</h2>
                    <p>{roomError}</p>
                    <button 
                        className={styles.button} 
                        onClick={() => navigate("/rocket")}
                    >
                        Return to Home
                    </button>
                </div>
            ) : cameraAllowed === false ? (
                <div className={styles.errorContainer}>
                    <h2>Permission Denied</h2>
                    <p>Camera and microphone access is required to join the room.</p>
                    <button 
                        className={styles.button} 
                        onClick={() => navigate("/rocket")}
                    >
                        Return to Home
                    </button>
                </div>
            ) : (
                <div className={styles.container}>
                    <div className={styles.page}>
                        <div className={styles.pageContainer}>
                            <Header user={null} />
                            <div className={styles.mainCall}>
                                <div className={styles.cameraSection}>
                                    {/* First Camera Box - User's webcam feed */}
                                    <div className={styles.boxCam}>
                                        <video 
                                            ref={localVideoRef} 
                                            autoPlay 
                                            playsInline 
                                            muted 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        <div className={styles.participantName}>You</div>
                                        {!localVideoActive && localStreamRef.current && (
                                            <div className={styles.videoStatus}>
                                                <p>Camera initializing...</p>
                                                <button 
                                                    className={styles.refreshButton}
                                                    onClick={() => {
                                                        if (localVideoRef.current && localStreamRef.current) {
                                                            localVideoRef.current.srcObject = localStreamRef.current;
                                                            localVideoRef.current.play()
                                                                .then(() => setLocalVideoActive(true))
                                                                .catch(err => console.error("Error playing local video:", err));
                                                        }
                                                    }}
                                                >
                                                    Refresh Video
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {/* Second Camera Box - Remote user's webcam feed */}
                                    <div className={styles.boxCam}>
                                        <video 
                                            ref={remoteVideoRef} 
                                            autoPlay 
                                            playsInline 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        {!isConnected && <div className={styles.waitingText}>Waiting for other participant...</div>}
                                        {isConnected && <div className={styles.participantName}>Stranger</div>}
                                    </div>
                                </div>
                                <div className={styles.menuSection}>
                                    <div className={styles.callControls}>
                                        <button 
                                            className={`${styles.controlButton} ${isMuted ? styles.controlButtonActive : ''}`} 
                                            onClick={toggleMute}
                                        >
                                            <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
                                        </button>
                                        <button 
                                            className={`${styles.controlButton} ${isVideoOff ? styles.controlButtonActive : ''}`} 
                                            onClick={toggleVideo}
                                        >
                                            <i className={`fa-solid ${isVideoOff ? 'fa-video-slash' : 'fa-video'}`}></i>
                                        </button>
                                        <button 
                                            className={`${styles.controlButton} ${styles.endCallButton}`} 
                                            onClick={endCall}
                                        >
                                            <i className="fa-solid fa-phone"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
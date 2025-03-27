import styles from "./css/Rocket.module.css";
import Header from '../components/Header';
import { Link, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from 'react';
import { auth, db } from '../components/firebase/firebase';
import { doc, getDoc, updateDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import Loader from "../components/loader";
import { io } from "socket.io-client";

// const socket = io("https://orbit-server.onrender.com:5000");
const socket = io("https://orbit-server.onrender.com", { 
    secure: true 
});

export default function Rocket({ user }: { user: any }) {

    const navigate = useNavigate();
    const [options, setOptions] = useState<any[]>([]);
    const [selectedGame, setSelectedGame] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [onQueue, setOnQueue] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");

    useEffect(() => {
        const fetchOptions = async () => {
            const gameRef = collection(db, 'onlineGames');
            const gameSnap = await getDocs(gameRef);
            const gameData = gameSnap.docs.map((doc) => ({
                id: doc.id, 
                ...(doc.data() as { gameTitle: string })
            }));
    
            const sortedGames = gameData.sort((a, b) => a.gameTitle.localeCompare(b.gameTitle));
    
            setOptions(sortedGames);
        };
    
        fetchOptions();
    }, []);

    const handleGameChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedValue = event.target.value;
        if (selectedValue) {
            setSelectedGame(selectedValue);
            console.log("Selected Game ID:", selectedValue);
        }
    };

    // Handle search for users
    const handleSearch = async () => {
        setLoading(true);
        setOnQueue(true);
        setStatusMessage("Connecting to the server...");
    
        if (!user || !selectedGame) {
            setStatusMessage("Please select a game before searching.");
            setLoading(false);
            setOnQueue(false);
            return;
        }
    
        setTimeout( async () => {
            try {
                const response = await fetch("https://orbit-server.onrender.com:5000/joinQueue", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user.uid, game: selectedGame }),
                });
        
                const data = await response.json();
        
                if (response.status === 400) {
                    setStatusMessage(data.error);
                } else {
                    setStatusMessage("Waiting for match...");
                }
        
                console.log("Server response:", data);
        
                // Inform backend about the user
                socket.emit("joinQueue", user.uid);
            } catch (error) {
                console.error("Error connecting to server:", error);
                setStatusMessage("Connection failed. Try again.");
            }
        }, 1000);
    };
    
    // Remove user from queue on tab close or manual leave
    const leaveQueue = () => {
        if (user) {
            socket.emit("leaveQueue", user.uid);
            setOnQueue(false);
            setLoading(false);
            setStatusMessage("You left the queue.");
        }
    };
    
    // Detect when user closes the tab
    useEffect(() => {
        const handleBeforeUnload = () => leaveQueue();
    
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [user]);

    useEffect(() => {
        if (user) {
            // Listen for match event from backend (only when the component mounts)
            socket.on("matchFound", ({ roomID, opponent }) => {
                console.log(`Matched! Redirecting to room: ${roomID} with opponent ${opponent}`);
                setStatusMessage(`Match found! Redirecting...`);

                // Redirect to the room after a short delay
                setTimeout(() => {
                    navigate(`/rocket/${roomID}`);
                }, 2000);
            });

            // Cleanup function to remove the event listener when component unmounts
            return () => {
                socket.off("matchFound");
            };
        }
    }, [user, navigate]);
    
    return (
        <>
            <div className={styles.container}>
                <div className={styles.page}>
                    <div className={styles.pageContainer}>
                        {/* <Header user={user} /> */}
                        <div className={styles.rocketSpace}>
                            <div className={styles.maincard}>
                                <div className={styles.contentSection}>
                                    <div className={styles.closeSection}>
                                        <button
                                            onClick={() => navigate("/space")}
                                            className={styles.back}
                                        >
                                            <i className="fa-solid fa-circle-xmark"></i>
                                        </button>
                                    </div>
                                    <div className={styles.introSection}>
                                        <div className={styles.title}>
                                            Start playing with someone
                                        </div>
                                        <div className={styles.body}>
                                            Fill in preferences and start playing
                                        </div>
                                    </div>
                                    <div className={styles.formSection}>
                                        <div className={styles.gameRow}>
                                            <label htmlFor="gameSelection">Game</label>
                                            <select 
                                                className={styles.select} 
                                                name="gameSelection" 
                                                id="gameSelection" 
                                                value={selectedGame} 
                                                onChange={handleGameChange}
                                            >
                                                <option value=""></option>
                                                {options.map((option) => (
                                                    <option key={option.gameTitle} value={option.id}>
                                                        {option.gameTitle}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className={styles.buttonSection}>
                                        <button className={styles.button} disabled={loading} onClick={handleSearch}>Search</button>
                                    </div>
                                    {onQueue && 
                                    <>
                                        <div className={styles.loadingSection}>
                                            <div className={styles.loadingCard}>
                                                {statusMessage && <p>{statusMessage}</p>}
                                                <Loader />
                                                {onQueue && <button className={styles.cancelButton} onClick={leaveQueue}>Cancel</button>}
                                            </div>
                                        </div>
                                    </>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
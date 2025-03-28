import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { collection, doc, getDocs, increment, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../components/firebase/firebase';
import Loader from "../components/loader";
import styles from "./css/Rocket.module.css";
import {toast} from 'sonner';

const socket = io("https://orbit-server.onrender.com", { 
    secure: true 
});

interface GameOption {
    id: string;
    gameTitle: string;
}

interface RocketProps {
    user: any;
}

export default function Rocket({ user }: RocketProps) {
    const navigate = useNavigate();
    const [options, setOptions] = useState<GameOption[]>([]);
    const [selectedGame, setSelectedGame] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [onQueue, setOnQueue] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");

    // Fetch game options on mount
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const gameRef = collection(db, 'onlineGames');
                const gameSnap = await getDocs(gameRef);
                const gameData = gameSnap.docs.map((doc) => ({
                    id: doc.id, 
                    gameTitle: doc.data().gameTitle
                }));
        
                const sortedGames = gameData.sort((a, b) => 
                    a.gameTitle.localeCompare(b.gameTitle)
                );
        
                setOptions(sortedGames);
            } catch (error) {
                console.error("Error fetching game options:", error);
            }
        };
    
        fetchOptions();
    }, []);

    const handleGameChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedGame(event.target.value);
    };

    const handleSearch = async () => {
        if (!user || !selectedGame) {
            setStatusMessage("Please select a game before searching.");
            return;
        }
    
        setLoading(true);
        setOnQueue(true);
        setStatusMessage("Connecting to the server...");
    
        setTimeout( async () => {
            try {
                const response = await fetch("https://orbit-server.onrender.com/joinQueue", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        userId: user.uid, 
                        game: selectedGame 
                    }),
                });
        
                const data = await response.json();
        
                if (response.status === 400) {
                    setStatusMessage(data.error);
                    setLoading(false);
                    setOnQueue(false);
                } else {
                    setStatusMessage("Waiting for a player...");
                    socket.emit("joinQueue", user.uid);
    
                    // Increment game popularity
                    const gameRef = doc(db, "onlineGames", selectedGame);
                    try {
                        await updateDoc(gameRef, {
                            gamePopularity: increment(1)
                        });
                    } catch (error) {
                        console.error("Error incrementing game popularity:", error);
                    }
                }
            } catch (error) {
                console.error("Error connecting to server:", error);
                setStatusMessage("Connection failed. Please try again.");
                setLoading(false);
                setOnQueue(false);
            }
        }, 1000);
    };
    
    const leaveQueue = () => {
        if (user) {
            socket.emit("leaveQueue", user.uid);
            setOnQueue(false);
            setLoading(false);
            setStatusMessage("Search cancelled");
        }
    };
    
    // Clean up queue on unmount
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (onQueue) {
                socket.emit("leaveQueue", user.uid);
            }
        };
    
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            if (onQueue) {
                socket.emit("leaveQueue", user.uid);
            }
        };
    }, [onQueue, user]);

    // Handle match found event
    useEffect(() => {
        if (!user) return;

        const handleMatchFound = async({ roomID }: { roomID: string }) => {
            setStatusMessage("Match found! Redirecting...");
            setTimeout(() => navigate(`/rocket/${roomID}`), 2000);
        };

        socket.on("matchFound", handleMatchFound);
        return () => {
            socket.off("matchFound", handleMatchFound);
        };
    }, [user, navigate]);
    
    return (
        <div className={styles.container}>
            <div className={`${styles.card} ${styles.fadeIn}`}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Let us find you a player</h1>
                    <button 
                        onClick={() => navigate("/space")} 
                        className={styles.closeBtn}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>
                
                <p className={styles.subtitle}>
                    Choose a game and we will find you a player to chat and play with.
                </p>
                
                <div className={styles.formGroup}>
                    <label htmlFor="gameSelection" className={styles.label}>
                        Game
                    </label>
                    <select
                        id="gameSelection"
                        className={styles.select}
                        value={selectedGame}
                        onChange={handleGameChange}
                        disabled={loading}
                    >
                        <option value="" style={{color: "hsl(0, 0%, 40%)"}}>"Have fun!"</option>
                        {options.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.gameTitle}
                            </option>
                        ))}
                    </select>
                </div>
                
                <button
                    className={styles.searchBtn}
                    onClick={handleSearch}
                    disabled={loading || !selectedGame}
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
                
                {onQueue && (
                    <div className={styles.loadingState}>
                        <p className={styles.loadingText}>{statusMessage}</p>
                        <Loader />
                        <button 
                            className={styles.cancelBtn} 
                            onClick={leaveQueue}
                            disabled={!loading}
                        >
                            Cancel Search
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
import styles from "./css/Rocket.module.css";
import Header from '../components/Header';
import { Link, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from 'react';
import { auth, db } from '../components/firebase/firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

export default function Rocket({ user }: { user: any }) {
    const navigate = useNavigate();
    const [options, setOptions] = useState<any[]>([]);
    const [selectedGame, setSelectedGame] = useState<string>("");

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
                                        <button className={styles.button}>Search</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

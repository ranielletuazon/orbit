import styles from "./css/Profile.module.css";
import Header from '../components/Header';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../components/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Loader from '../components/loader';

interface User {
    userID: string;  
    username: string;
    profileImage: string;
    gender: string;
    birthdate: number; 
    bio?: string; // No value yet, can be added later
}

interface AccountSetupProps {
    user: User | null;
    currentUser: User | null;
}

export default function Profile({user, currentUser}: AccountSetupProps) {
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('id');
    const navigate = useNavigate();
    
    const [profileData, setProfileData] = useState<any>(null);
    const [activeView, setActiveView] = useState<string>("profile");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const getSlidePosition = () => {
        switch(activeView) {
            case "profile": return "translateX(-100%)";
            case "games": return "translateX(0%)";
            case "achievements": return "translateX(100%)";
            default: return "translateX(-100%)";
        }
    };

    useEffect(() => {
        const validateProfile = async () => {
            // Reset states
            setIsLoading(true);
            setError(null);

            // Check if profileId exists
            if (!profileId) {
                setError("Invalid profile ID");
                navigate("/space");
                return;
            }

            try {
                const profileDocRef = doc(db, 'user', profileId);
                const profileDoc = await getDoc(profileDocRef);

                if (profileDoc.exists()) {
                    // Validate profile data
                    const data = profileDoc.data();
                    console.log(data);
                    if (!data.username) {
                        throw new Error("Incomplete profile data");
                    }
                    
                    setProfileData(data);
                } else {
                    throw new Error("Profile not found");
                }
            } catch (e) {
                console.error("Profile not found error:", e);
                setError("Profile not found");
                navigate("/space");
            } finally {
                setIsLoading(false);
            }
        };

        validateProfile();
    }, [profileId, navigate]);

    return(
        <div className={styles.container}>
            <div className={styles.page}>
                <div className={styles.pageContainer}>
                    <Header user={user} />
                    <div className={styles.profileCard}>
                        <div className={styles.profileBackgroundImage} style={{backgroundImage: `url(${profileData?.backgroundImage || `url('../../assets/galaxy.png')`})`}}>
                            {!isLoading ? (
                                <img 
                                    src={profileData?.profileImage || ""} 
                                    alt="Profile Image" 
                                    className={styles.profileImage}
                                />
                            ) : ( 
                                <>
                                    <div className={styles.customLoader}>
                                        <Loader/>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className={styles.profileViewCard}>
                            <div 
                                className={styles.slidingBackground} 
                                style={{ transform: getSlidePosition() }}
                            />
                            <button 
                                className={activeView === "profile" ? styles.activeView : styles.buttonView} 
                                onClick={() => setActiveView("profile")}
                            >
                                Profile
                            </button>
                            <button 
                                className={activeView === "games" ? styles.activeView : styles.buttonView} 
                                onClick={() => setActiveView("games")}
                            >
                                Games
                            </button>
                            <button 
                                className={activeView === "achievements" ? styles.activeView : styles.buttonView} 
                                onClick={() => setActiveView("achievements")}
                            >
                                Achievements
                            </button>
                        </div>
                        <div className={styles.profileInformation}>
                            {profileData &&activeView === "profile" ? (
                                <>
                                    <div className={styles.usernameDisplay}>
                                        <div className={styles.names}>
                                            <span style={{color: "hsl(0, 0%, 75%)", fontSize: "2rem"}}>{profileData.nickname || profileData.username}</span>
                                            <span style={{color: "hsl(0, 0%, 50%)", fontSize: "1rem"}}>@{profileData.username}</span>
                                        </div>
                                        <div className={styles.rightSide}>
                                            <button className={styles.heart}><i className="fa-regular fa-heart"></i></button>
                                            <button className={styles.buttons}><i className="fa-solid fa-user-plus"></i></button>
                                        </div>
                                    </div>
                                    <div className={styles.bioDisplay}>{profileData.bio ? `"${profileData.bio}"` : `"Just a chill gamer"`}</div>
                                    <div className={styles.otherDetails}>
                                        {`${profileData.gender.charAt(0).toUpperCase() + profileData.gender.slice(1)} | ${new Date().getFullYear() - new Date(profileData.birthdate).getFullYear()}`}
                                    </div>
                                </>
                            ) : activeView === "games" ? (
                                <>
                                    Games
                                </>
                            ) : activeView === "achievements" ? (
                                <>
                                    Achievements
                                </>
                            ): (
                                <>
                                    <div className={styles.customLoader}>
                                        <Loader/>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
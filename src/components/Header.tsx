import logo from '../assets/orbitlogo.png'
import newlogo from '../assets/orbit.png'
import styles from './css/Header.module.css'
import React, { SetStateAction, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { auth, db, storage } from '../components/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { getDatabase, set, onDisconnect, serverTimestamp, update, ref} from 'firebase/database';
import background from '../assets/background.png';
import ProfileSettings from './ProfileSettings'; // Import the ProfileSettings component

export default function Header({ user }: { user: any }){
    const navigate = useNavigate();

    const [loading, setIsLoading] = useState(false);
    const [profileImageIcon, setProfileImageIcon] = useState<string | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // State for modal visibility
      
    useEffect(()=>{
        const profileImage = async () => {
            if (user) {
                try {
                    const userDocRef = doc(db, "user", user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        if (userData.profileImage) {
                            const profileImageRef = storageRef(storage, userData.profileImage);
                            const profileUrl = await getDownloadURL(profileImageRef);
                            setProfileImageIcon(profileUrl);
                        } else {
                            setProfileImageIcon(null);
                        }
                    } else {
                        setProfileImageIcon(null);
                    }
                } catch (e){
                    console.log(e, "error");
                }
            }
        }

        profileImage();
    },[profileImageIcon])

    // Handle logout button
    const handleLogout = async () => {
        return toast.promise(
            (async () => {
                try {
                    const db = getDatabase();
                    const rdbUserRef = ref(db, `users/${user.uid}`);
                    
                    await update(rdbUserRef, {
                        status: "offline"
                    })
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    await auth.signOut();
                    return "Logged out successfully!";
                } catch (error) {
                    console.log(error);
                    throw error;
                }
            })(),
            {
                loading: "Logging out...",
                success: "Logged out!",
                error: "Failed to log out. Please try again."
            }
        );
    };

    // Function to open profile settings modal instead of navigating
    const handleProfileClick = () => {
        setIsProfileModalOpen(true);
    };

    return(
        <>
            <div className={styles.header}>
                <img src={newlogo} alt="Orbit Logo" className={styles.logo}/>
                <div className={styles.menubar}>
                    <div className={styles.menus}>
                        <button onClick={() => navigate('/space')} className={styles.menuButton}><i className="fa-solid fa-house" ></i></button>
                        <button onClick={() => navigate('/conversation')} className={styles.menuButton}><i className="fa-solid fa-gamepad" ></i></button>
                        <button onClick={() => navigate('/rocket')} className={styles.menuButton}><i className="fa-solid fa-rocket" ></i></button>
                    </div>
                    <div className={styles.menus}>
                        <button onClick={handleLogout} className={styles.menuButton} style={{ color: 'red', textShadow: '0 0 5px red' }}><i className="fa-solid fa-power-off"></i></button>
                        { profileImageIcon ? (
                            <>
                                <button onClick={handleProfileClick} className={styles.profileButton} >
                                    {profileImageIcon && <img src={profileImageIcon} alt="Profile" className={styles.profileImage}/>}
                                </button>
                            </>
                        ) : (
                            <button onClick={handleProfileClick} className={styles.profileButton} >
                                <div className={styles.profileLoad}></div>
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Profile Settings Modal */}
            <ProfileSettings 
                user={user} 
                isOpen={isProfileModalOpen} 
                onClose={() => setIsProfileModalOpen(false)} 
            />
        </>
    );
}
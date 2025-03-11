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

export default function Header({ user }: { user: any }){
    const navigate = useNavigate();

    const [loading, setIsLoading] = useState(false);
    const [profileImageIcon, setProfileImageIcon] = useState<string | null>(null);
      

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

    return(
        <>
            <div className={styles.header}>
                <img src={newlogo} alt="Orbit Logo" className={styles.logo}/>
                <div className={styles.menubar}>
                    <div className={styles.menus}>
                        <button onClick={() => navigate('/space')} className={styles.menuButton}><i className="fa-solid fa-house" ></i></button>
                        <button className={styles.menuButton}><i className="fa-solid fa-gamepad" ></i></button>
                        <button className={styles.menuButton}><i className="fa-solid fa-rocket" ></i></button>
                    </div>
                    <div className={styles.menus}>
                        <button onClick={() => navigate('/settings')} className={styles.menuButton}><i className="fa-solid fa-gear"></i></button>
                        { profileImageIcon ? (
                            <>
                                <button onClick={() => navigate('/settings/profile')} className={styles.profileButton} >
                                    {profileImageIcon && <img src={profileImageIcon} alt="Profile" className={styles.profileImage}/>}
                                </button>
                            </>
                        ) : (
                            <button onClick={() => navigate('/settings/profile')} className={styles.profileButton} >
                                <div className={styles.profileLoad}></div>
                            </button>
                        )}
                    </div>
                    
                </div>
            </div>
        </>
    );
}
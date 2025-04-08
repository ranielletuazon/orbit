import React, { useState, useEffect } from 'react';
import styles from './css/ProfileSettings.module.css';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { db } from '../components/firebase/firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import Loader from './loader';

interface ProfileSettingsProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettings({ user, isOpen, onClose }: ProfileSettingsProps) {
    let percentage = 35;
    const [setting, setSetting] = useState<string>('account');
    const [currentUser, setCurrentUser] = useState<any>(null);
    
    // Form state
    const [formData, setFormData] = useState({
        username: '',
        bio: '',
        nickname: ''
    });
    
    // Loading state for form submission
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Handle input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle form submission
    const handleSubmitChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user?.uid) {
            toast.error("User not authenticated");
            return;
        }
        
        // Show loading toast and disable submit button
        setIsSubmitting(true);
        
        try {
            const userRef = doc(db, 'user', user.uid);
            
            // Only update fields that have been changed
            const updateData: any = {};
            
            if (formData.username && formData.username !== currentUser?.username) {
                updateData.username = formData.username;
            }
            
            if (formData.bio !== currentUser?.bio) {
                updateData.bio = formData.bio || '';
            }
            
            if (formData.nickname !== currentUser?.nickname) {
                updateData.nickname = formData.nickname || '';
            }
            
            // Only update if there are changes
            if (Object.keys(updateData).length > 0) {
                await updateDoc(userRef, updateData);
                toast.success("Profile updated successfully!");
            } else {
                toast.info("No changes detected");
            }
            
            // Close the modal after successful update
            onClose();
            
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle modal click outside to close
    const handleModalClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Load user data
    useEffect(() => {
        if (!user?.uid) return;
    
        const userRef = doc(db, 'user', user.uid); 
    
        const unsubscribe = onSnapshot(
            userRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.data();
                    setCurrentUser(userData);
                    
                    // Initialize form data with current user data
                    setFormData({
                        username: userData.username || '',
                        bio: userData.bio || '',
                        nickname: userData.nickname || ''
                    });
                } else {
                    console.warn('User document does not exist');
                    setCurrentUser(null);
                }
            },
            (error) => {
                console.error("Error fetching user:", error);
            }
        );
    
        return () => unsubscribe();
    }, [user, isOpen]); // Added isOpen to refresh data when modal opens
    
    // Calculate profile completion percentage
    const calculateProfileCompletion = () => {
        if (!currentUser) return 0;
        
        const requiredFields = [
            'username', 
            'bio', 
            'nickname', 
            'profileImage', 
            'backgroundImage'
        ];
        
        let filledFields = 0;
        for (const field of requiredFields) {
            if (currentUser[field]) filledFields++;
        }
        
        return Math.round((filledFields / requiredFields.length) * 100);
    };
    
    // Calculate percentage dynamically
    const profilePercentage = calculateProfileCompletion();

    // If modal is not open, don't render anything
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={handleModalClick}>
            <div className={styles.container}>
                <div className={styles.profileCard}>
                    <div className={styles.leftSection}>
                        <div className={styles.profilePercentageCard}>
                            <div className={styles.percentageSection}>
                                <div className={styles.circlePercentage}>
                                    <CircularProgressbar
                                        value={profilePercentage}
                                        text={`${profilePercentage}%`}
                                        styles={{
                                            path: { stroke: 'white' },
                                            text: { fill: 'white', fontWeight: 'bold', fontSize: '20px' },
                                            trail: { stroke: 'skyblue' },
                                            root: { backgroundColor: '#2cc6ff' }
                                        }}
                                    />
                                </div>
                                <div className={styles.percentageHeader}>
                                    <div className={styles.headerText}>Profile Completion</div>
                                    <div className={styles.bodyText}>Verify your account to unlock more features</div>
                                </div>
                            </div>
                            <div className={styles.verifySection}>
                                <button className={styles.verifyButton}>
                                    Verify Account
                                </button>
                            </div>
                        </div>
                        <div className={styles.menuHolder}>
                            <button 
                                className={`${styles.menuButton} ${setting === 'account' ? styles.activeMenu : ''}`}
                                onClick={() => setSetting('account')}
                            >
                                <i className="fa-solid fa-user"></i>
                                <div className={styles.buttonHeader}>
                                    <div className={styles.headerText}>Account Information</div>
                                    <div className={styles.bodyText}>Change your account details</div>
                                </div>
                            </button>
                            <button 
                                className={`${styles.menuButton} ${setting === 'password' ? styles.activeMenu : ''}`}
                                onClick={() => setSetting('password')}
                            >
                                <i className="fa-solid fa-lock"></i>
                                <div className={styles.buttonHeader}>
                                    <div className={styles.headerText}>Password</div>
                                    <div className={styles.bodyText}>Change your password</div>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div className={styles.rightSection}>
                        <div className={styles.headerTitle}>{setting === 'account' ? 'Account Information' : 'Password'}</div>
                        {setting === 'account' ? (
                            <>
                                <div className={styles.backgroundDisplay}>
                                    <button>Upload Background Image</button>
                                </div>
                                <div className={styles.profileHandler}>
                                    <div className={styles.profilePictureDisplay} style={{backgroundImage: `url(${currentUser?.profileImage})`}}></div>
                                    <div className={styles.profileMenu}>
                                        <div className={styles.usernameDisplay}>{currentUser?.username || 'Loading...'}</div>
                                        <button className={styles.profileButton}>Upload Image</button>
                                    </div>
                                </div>
                                <form onSubmit={handleSubmitChanges} className={styles.editArea}>
                                    <input 
                                        type="text" 
                                        id="username" 
                                        name="username" 
                                        className={styles.formInput} 
                                        placeholder='Username'
                                        value={formData.username}
                                        onChange={handleInputChange}
                                    />
                                    <input 
                                        type="text" 
                                        id="bio" 
                                        name="bio" 
                                        className={styles.formInput} 
                                        placeholder='Bio'
                                        value={formData.bio}
                                        onChange={handleInputChange}
                                    />
                                    <input 
                                        type="text" 
                                        id="nickname" 
                                        name="nickname" 
                                        className={styles.formInput} 
                                        placeholder='Nickname'
                                        value={formData.nickname}
                                        onChange={handleInputChange}
                                    />
                                    <div className={styles.formButtons}>
                                        <button 
                                            type="button" 
                                            onClick={onClose} 
                                            style={{backgroundColor: 'hsl(0, 0%, 40%)'}}
                                        >
                                            Cancel
                                        </button>
                                        <button className={styles.lastButton}
                                            type='submit' 
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        ): (
                            <div className={styles.comingSoonContainer}>
                                Not Yet Available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
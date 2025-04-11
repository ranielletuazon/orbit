import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'
import styles from './css/ProfileSettings.module.css';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { db, storage } from '../components/firebase/firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
    const navigate = useNavigate();
    
    // Refs for file inputs
    const profileImageInputRef = useRef<HTMLInputElement>(null);
    const backgroundImageInputRef = useRef<HTMLInputElement>(null);
    
    // Loading state for image uploads
    const [uploadingProfile, setUploadingProfile] = useState(false);
    const [uploadingBackground, setUploadingBackground] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        username: '',
        bio: '',
        nickname: '',
        // Images
        profileImage: '',
        backgroundImage: ''
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

    // Trigger file input click
    const triggerProfileImageUpload = () => {
        profileImageInputRef.current?.click();
    };
    
    const triggerBackgroundImageUpload = () => {
        backgroundImageInputRef.current?.click();
    };
    
    // Handle image file uploads
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, imageType: 'profileImage' | 'backgroundImage') => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        
        // File size validation (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            return;
        }
        
        try {
            if (imageType === 'profileImage') {
                setUploadingProfile(true);
            } else {
                setUploadingBackground(true);
            }
            
            // Create a storage reference
            const storagePath = imageType === 'profileImage' 
                ? `profileImages/${user.uid}` 
                : `backgroundImages/${user.uid}`;
            const storageRef = ref(storage, storagePath);
            
            // Upload file
            await uploadBytes(storageRef, file);
            
            // Get download URL
            const downloadURL = await getDownloadURL(storageRef);
            
            // Update formData with new image URL
            setFormData(prev => ({
                ...prev,
                [imageType]: downloadURL
            }));
            
            // Update user document in Firestore directly
            const userRef = doc(db, 'user', user.uid);
            await updateDoc(userRef, {
                [imageType]: downloadURL
            });
            
            toast.success(`${imageType === 'profileImage' ? 'Profile' : 'Background'} image updated!`);
            
        } catch (error) {
            console.error(`Error uploading ${imageType}:`, error);
            toast.error(`Failed to upload ${imageType === 'profileImage' ? 'profile' : 'background'} image`);
        } finally {
            if (imageType === 'profileImage') {
                setUploadingProfile(false);
            } else {
                setUploadingBackground(false);
            }
            // Reset the file input
            e.target.value = '';
        }
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

            // We're handling image updates separately now, so we don't need to include them here
            
            // Only update if there are changes
            if (Object.keys(updateData).length > 0) {
                await updateDoc(userRef, updateData);
                toast.success("Profile updated successfully!");
            } else {
                toast.info("No changes detected");
            }
            
            // Close the modal after successful update
            // onClose();
            
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
                        nickname: userData.nickname || '',
                        profileImage: userData.profileImage || '',
                        backgroundImage: userData.backgroundImage || ''
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

    // Handle View Profile navigation
    const handleViewProfile = () => {
        if (!user?.uid) {
            toast.error("An error occured, reload the page and try again");
            return;
        }
        navigate(`/profile?id=${user.uid}`);
        onClose();
    }

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
                                    <div className={styles.headerText}>Profile Details</div>
                                    <div className={styles.bodyText}>Change your profile information</div>
                                </div>
                            </button>
                            <button 
                                className={`${styles.menuButton} ${setting === 'password' ? styles.activeMenu : ''}`}
                                onClick={() => setSetting('password')}
                            >
                                <i className="fa-solid fa-lock"></i>
                                <div className={styles.buttonHeader}>
                                    <div className={styles.headerText}>Security</div>
                                    <div className={styles.bodyText}>Change your password</div>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div className={styles.rightSection}>
                        <div className={styles.headerTitle}>{setting === 'account' ? 'Profile Details' : 'Security'}</div>
                        {setting === 'account' ? (
                            <>
                                {/* Hidden file inputs */}
                                <input 
                                    type="file" 
                                    ref={profileImageInputRef} 
                                    onChange={(e) => handleImageUpload(e, 'profileImage')} 
                                    accept="image/*" 
                                    style={{ display: 'none' }} 
                                />
                                <input 
                                    type="file" 
                                    ref={backgroundImageInputRef} 
                                    onChange={(e) => handleImageUpload(e, 'backgroundImage')} 
                                    accept="image/*" 
                                    style={{ display: 'none' }} 
                                />
                                
                                <div className={styles.backgroundDisplay} 
                                    style={{
                                        backgroundImage: formData.backgroundImage ? `url(${formData.backgroundImage})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}
                                >
                                    <button onClick={triggerBackgroundImageUpload} disabled={uploadingBackground}>
                                        <i className="fa-solid fa-plus"></i>
                                    </button>
                                </div>
                                <div className={styles.profileHandler}>
                                    <div 
                                        className={styles.profilePictureDisplay} 
                                        style={{backgroundImage: `url(${formData.profileImage})`}}
                                    >
                                        {uploadingProfile && (
                                            <div className={styles.uploadingOverlay}>
                                                <Loader/>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.profileMenu}>
                                        <div className={styles.usernameDisplay}>{currentUser?.username || 'Loading...'}</div>
                                        <div className={styles.buttonHolder}>
                                            <button 
                                                className={styles.profileButton} 
                                                onClick={triggerProfileImageUpload}
                                                disabled={uploadingProfile}
                                            >
                                                {uploadingProfile ? 'Uploading...' : 'Upload Image'}
                                            </button>
                                            <button 
                                                className={`${styles.profileButton} ${styles.viewProfile}`} 
                                                onClick={handleViewProfile}
                                            >
                                                View Profile
                                            </button>
                                        </div>
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
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val.includes(' ')) {
                                                handleInputChange(e);
                                            }
                                        }}
                                        maxLength={32}
                                    />
                                    <input 
                                        type="text" 
                                        id="bio" 
                                        name="bio" 
                                        className={`${styles.formInput} ${styles.formInputBio}`} 
                                        placeholder='Bio'
                                        value={formData.bio}
                                        onChange={handleInputChange}
                                        maxLength={150}
                                    />
                                    <input 
                                        type="text" 
                                        id="nickname" 
                                        name="nickname" 
                                        className={styles.formInput} 
                                        placeholder='Nickname'
                                        value={formData.nickname}
                                        onChange={handleInputChange}
                                        maxLength={32}
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
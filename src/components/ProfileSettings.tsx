import React, { useState, useEffect } from 'react';
import styles from './css/ProfileSettings.module.css';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

interface ProfileSettingsProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettings({ user, isOpen, onClose }: ProfileSettingsProps) {
  let percentage = 35;
  const [setting, setSetting] = useState<string>('account');

  const handleSubmitChanges = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting changes");
    // Process form data here
    onClose();
  }

  // Handle modal click outside to close
  const handleModalClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
                    value={percentage}
                    text={`${percentage}%`}
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
                        <div className={styles.profilePictureDisplay}></div>
                        <div className={styles.profileMenu}>
                            <div className={styles.usernameDisplay}>{user?.displayName || 'Username'}</div>
                            <button className={styles.profileButton}>Upload Image</button>
                        </div>
                    </div>
                    <form onSubmit={handleSubmitChanges} className={styles.editArea}>
                        <input type="text" id="username" name="username" className={styles.formInput} placeholder='Username'/>
                        <input type="text" id="bio" name="bio" className={styles.formInput} placeholder='Bio'/>
                        <input type="text" id="nickname" name="nickname" className={styles.formInput} placeholder='Nickname'/>
                        <div className={styles.formButtons}>
                            <button type="button" onClick={onClose} style={{backgroundColor: 'hsl(0, 0%, 40%)'}}>Cancel</button>
                            <button type='submit'>Save Changes</button>
                        </div>
                    </form>
                </>
            ): (
                <>
                </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import styles from "./css/Messages.module.css";
import Header from '../components/Header';

export default function Messages({user}: {user: any}) {

    const [userDisplay, setUserDisplay] = useState(false);
    const [enableChat, setEnableChat] = useState(false);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);

    const autoResize = (e: any) => {
        e.target.style.height = "auto"; 
        e.target.style.height = `${e.target.scrollHeight}px`; 

        if(e.target.value.length >= 1){
            setEnableChat(true);
        } else {
            setEnableChat(false);
        }
    };

    const handleKeyDown = (e: any) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault(); 
        }
    };

    // Effect to handle screen resizing
    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth <= 768);
            if (window.innerWidth > 768) {
                setUserDisplay(false); // Reset to show both sections on larger screens
            }
        };

        window.addEventListener("resize", handleResize);
        handleResize(); // Initial check

        return () => window.removeEventListener("resize", handleResize);
    }, []);
    
    

    return (
        <div className={styles.container}>
            <div className={styles.page}>
                <div className={styles.pageContainer}>
                    <Header user={user} />
                    <div className={styles.messages}>
                        {/* Show only userSection on mobile unless a chat is selected */}
                        {!userDisplay || !isMobileView ? (
                            <div className={styles.userSection}>
                                <div className={styles.searchBar}>
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                    <input className={styles.searchInput} type="search" placeholder="Search..." />
                                </div>
                                <button className={styles.userCard} onClick={() => setUserDisplay(true)}>
                                    <div className={styles.upSection}>
                                        <div className={styles.userIcon}>
                                            <div className={styles.userProfileImage}></div>
                                        </div>
                                        <div className={styles.userDiv}>
                                            <div className={styles.userName}>Example User</div>
                                            <div className={styles.userStatus}>Online</div>
                                        </div>
                                        <div className={styles.lastMessageTime}>2h ago</div>
                                    </div>
                                    <div className={styles.downSection}>
                                        <div className={styles.lastMessage}>Lorem ipsum dolor sit amet...</div>
                                        <div className={styles.unreadMessageCount}>2</div>
                                    </div>
                                </button>
                            </div>
                        ) : null}

                        {/* Show chatSection only when a user is selected on mobile */}
                        {userDisplay || !isMobileView ? (
                            <div className={styles.chatSection}>
                                <div className={styles.chatHeader}>
                                    {/* Back button visible only on mobile */}
                                    {isMobileView && (
                                        <button onClick={() => setUserDisplay(false)}>
                                            <i className="fa-solid fa-chevron-left"></i>
                                        </button>
                                    )}
                                    <div className={styles.userProfileImage}>
                                        <div className={styles.iconStatus}></div>
                                    </div>
                                    <div className={styles.userDiv}>
                                        <div className={styles.userName}>Example User</div>
                                    </div>
                                    <button><i className="fa-solid fa-phone"></i></button>
                                    <button onClick={() => setUserDisplay(false)}>
                                        <i className="fa-solid fa-ellipsis-vertical" style={{ padding:"0rem 1rem" }}></i>
                                    </button>
                                </div>
                                <div className={styles.chatBody}>
                                    <div className={styles.chatBubbleReceiver}>
                                        <div className={styles.message}>
                                            <div className={styles.text}>Hey, what's up?</div>
                                            <div className={styles.timeSent}>2h ago</div>
                                        </div>
                                    </div>
                                    <div className={styles.chatBubbleSender}>
                                        <div className={styles.message}>
                                            <div className={styles.text}>Not much, just working on a project. You?</div>
                                            <div className={styles.timeSent}>2h ago</div>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.chatFooter}>
                                    <button><i className="fa-solid fa-paperclip"></i></button>
                                    <div className={styles.chatArea}>
                                        <textarea maxLength={500} rows={1} placeholder='Type something...'></textarea>
                                        <button><i className="fa-solid fa-face-smile"></i></button>
                                    </div>
                                    <button className={styles.sendButton} disabled={!enableChat}><i className="fa-solid fa-paper-plane"></i></button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};
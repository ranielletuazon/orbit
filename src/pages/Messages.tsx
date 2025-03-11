import React, { useState, useEffect } from 'react';
import styles from "./css/Messages.module.css";
import Header from '../components/Header';

export default function Messages({user}: {user: any}) {

    const [userDisplay, setUserDisplay] = useState(false);
    const [enableChat, setEnableChat] = useState(false);

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
    

    return(
        <>
            <div className={styles.container}>
                <div className={styles.page}>
                    <div className={styles.pageContainer}>
                        <Header user={user} />
                        <div className={styles.messages}>
                            <div className={styles.userSection}>
                                <div className={styles.searchBar}>
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                    <input className={styles.searchInput} type="search" placeholder="Search..."/>
                                </div>
                                <button className={styles.userCard}>
                                    <div className={styles.upSection}>
                                        <div className={styles.userIcon}>
                                            <div className={styles.userProfileImage}></div>
                                        </div>
                                        <div className={styles.userDiv}>
                                            <div className={styles.userName}>Example User</div>
                                            <div className={styles.userStatus}>Online</div>
                                        </div>
                                        <div className={styles.lastMessageTime}>
                                            2h ago
                                        </div>
                                    </div>
                                    <div className={styles.downSection}>
                                        <div className={styles.lastMessage}>Lorem ipsum dolor sit amet. conseteurs...</div>
                                        <div className={styles.unreadMessageCount}>2</div>
                                    </div>
                                </button>
                            </div>
                            { true && (
                                <>
                                    <div className={styles.chatSection}>
                                        <div className={styles.chatHeader}>
                                            <div className={styles.userProfileImage}>
                                                <div className={styles.iconStatus}></div>
                                            </div>
                                            <div className={styles.userDiv}>
                                                <div className={styles.userName}>Example User</div>
                                            </div>
                                            <button><i className="fa-solid fa-phone"></i></button>
                                            <button onClick={() => setUserDisplay(true)}><i className="fa-solid fa-ellipsis-vertical"></i></button>
                                        </div>
                                        <div className={styles.chatBody}>
                                        </div>
                                        <div className={styles.chatFooter}>
                                            <button><i className="fa-solid fa-paperclip"></i></button>
                                            <div className={styles.chatArea}>
                                                <textarea 
                                                    name="" 
                                                    id="" 
                                                    maxLength={500} 
                                                    rows={1} 
                                                    onInput={(e) => autoResize(e)}
                                                    onKeyDown={(e) => handleKeyDown(e)}
                                                ></textarea>
                                                <button><i className="fa-solid fa-face-smile"></i></button>
                                            </div>
                                            <button className={styles.sendButton} disabled={!enableChat}><i className="fa-solid fa-paper-plane"></i></button>
                                        </div>
                                    </div>
                                </>
                            )}
                            {/* Thinking of using a modal instead of a div */}
                            {/* <div className={styles.displaySection} style={{display: userDisplay ? 'block' : 'none'}}>
                                <button className={styles.closeButton} onClick={() => setUserDisplay(false)}><i className="fa-solid fa-xmark"></i></button>
                            </div> */}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
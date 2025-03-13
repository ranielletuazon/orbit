import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns'; 
import styles from "./css/Messages.module.css";
import { auth, db, realtimeDb } from '../components/firebase/firebase';
import { doc, collection, getDocs, getDoc, setDoc, Timestamp, onSnapshot, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { onValue, update } from 'firebase/database';
import { ref } from 'firebase/database';
import Loader from '../components/loader';

import Header from '../components/Header';

export default function Messages({user}: {user: any}) {

    const [userDisplay, setUserDisplay] = useState(false);
    const [enableChat, setEnableChat] = useState(false);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
    const [fetchChatData, setFetchChatData] = useState<any[]>([]);
    const chatBodyRef = useRef<HTMLDivElement | null>(null);
    const [message, setMessage] = useState('');
    // Loading state
    const [isLoading, setIsLoading] = useState(true);
    // State doc ref for currentUser
    const [currentUser, setCurrentUser] = useState<any>(null);
    // State for conversationId
    const [conversationId, setConversationId] = useState<string>('');
    // State for friendId
    const [friendId, setFriendId] = useState<any>(null);
    // Current chat data, selecting a chat will display this messages.
    const [currentChat, setCurrentChat] = useState<any[]>([]);

    // Added event listeners for real-time updates
    useEffect(() => {
        if (!user) return;
        const userDocRef = doc(db, "user", user.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setCurrentUser(docSnap.data());
            }
        });
        return () => unsubscribe();
    }, []);
    useEffect(() => {
        if (!user) return;
        const chatRef = doc(db, "userChats", user.uid);
        const unsubscribe = onSnapshot(chatRef, (chatSnapshot) => {
            if (chatSnapshot.exists()) {
                const sortedChats = chatSnapshot.data()?.chatsData || [];
                sortedChats.sort((a: any, b: any) => {
                    return b.createdAt?.seconds - a.createdAt?.seconds;
                });
                setFetchChatData(sortedChats);
            }
        });
        return () => unsubscribe();
    }, [user]);
    useEffect(() => {
        if (fetchChatData.length === 0) return;
        // Create an array to store unsubscribe functions
        const statusListeners = fetchChatData.map((friend) => {
            const statusRef = ref(realtimeDb, `users/${friend.friendID}/status`);
    
            return onValue(statusRef, (snapshot) => {
                setFetchChatData((prevData) =>
                    prevData.map((f) =>
                        f.friendID === friend.friendID
                            ? { ...f, status: snapshot.exists() ? snapshot.val() : "offline" }
                            : f
                    )
                );
            });
        });
    
        // Cleanup function to unsubscribe from each listener when component unmounts
        return () => {
            statusListeners.forEach((unsubscribe) => unsubscribe());
        };
    }, [fetchChatData]);

    const handleKeyDown = (e: any) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault(); 
            handleSendMessage(e);
        }
    };

    // Relative Time function
    const getRelativeTime = (timestamp: any) => {
        const now = new Date();
        const messageDate = timestamp.toDate(); // This is to convert Firestore Timestamp to JS Date
        const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000);
    
        const timeFrames = [
            { limit: 3600, unit: "minute", divisor: 60 },
            { limit: 86400, unit: "hour", divisor: 3600 },
            { limit: 604800, unit: "day", divisor: 86400 },
            { limit: 2629800, unit: "week", divisor: 604800 },
            { limit: 31557600, unit: "month", divisor: 2629800 },
            { limit: Infinity, unit: "year", divisor: 31557600 },
        ];
    
        for (const { limit, unit, divisor } of timeFrames) {
            if (diffInSeconds < limit) {
                const value = Math.floor(diffInSeconds / divisor);
                return value <= 0
                    ? "Just now"
                    : `${value} ${unit}${value > 1 ? "s" : ""} ago`;
            }
        }
    
        return format(messageDate, "MM/dd/yyyy"); // If more than a year, show full date
    };

    // Function to generate a unique chat ID
    const generateChatID = (user1ID: string, user2ID: string) => {
        return user1ID < user2ID ? `${user1ID}_${user2ID}` : `${user2ID}_${user1ID}`;
    };

    // Effect to handle screen size changes and fetch chat data at mount
    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth <= 768);
            if (window.innerWidth > 768) {
                setUserDisplay(false); // Reset to show both sections on larger screens
            }
        };

        window.addEventListener("resize", handleResize);

        // Fetch the chat data on Firestore at mount, creates a chatData if it doesn't exist.
        const fetchChatDataFunction = async () => {
            try {
                const chatRef = doc(db, "userChats", user.uid);
                const chatSnapshot = await getDoc(chatRef);
                let existingChats = chatSnapshot.exists() ? chatSnapshot.data()?.chatsData || [] : [];
        
                // Fetch the friends list from Firestore
                const friendsRef = doc(db, "user", user.uid);
                const friendsDoc = await getDoc(friendsRef);
                const friendsData = friendsDoc.data();
                const friends = friendsData?.friends || [];
        
                // Identify new friends who are not yet in existing chats
                const newFriends = friends.filter(
                    (friendID: any) => !existingChats.some((chat: any) => chat.friendID === friendID)
                );
        
                if (newFriends.length > 0) {
                    // Fetch full details of the new friends
                    const newChatsData = await Promise.all(
                        newFriends.map(async (friendID: any) => {
                            const friendRef = doc(db, "user", friendID);
                            const friendSnap = await getDoc(friendRef);
        
                            if (friendSnap.exists()) {
                                const friendData = friendSnap.data();
                                return {
                                    friendID,
                                    senderId: null,
                                    chatID: generateChatID(user.uid, friendID),
                                    username: friendData.username || "Unknown",
                                    profileImage: friendData.profileImage || null,
                                    recentMessage: null,
                                    unreadMessages: 0,
                                    createdAt: Timestamp.now(),
                                };
                            } else {
                                return null;
                            }
                        })
                    );
        
                    // Remove any invalid (null) entries
                    const validNewChats = newChatsData.filter(Boolean);
        
                    // Merge new chats with existing ones
                    const updatedChats = [...existingChats, ...validNewChats];
        
                    // **Sort by most recent message**
                    updatedChats.sort((a, b) => {
                        if (!a.createdAt || !b.createdAt) return 0;
                        return b.createdAt.seconds - a.createdAt.seconds;
                    });
        
                    // Update state
                    setFetchChatData(updatedChats);
        
                    // Save to Firestore (Only if new data is added)
                    await updateDoc(chatRef, { chatsData: updatedChats });
                } else {
                    // **Sort by most recent message before setting state**
                    existingChats.sort((a: any, b: any) => {
                        if (!a.createdAt || !b.createdAt) return 0;
                        return b.createdAt.seconds - a.createdAt.seconds;
                    });
        
                    setFetchChatData(existingChats);
                }
            } catch (e) {
                console.error("Error fetching chat data:", e);
            } finally {
                setIsLoading(false);
            }
        };
         
        
        handleResize();
        fetchChatDataFunction();

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const autoResize = (e: any) => {
        e.target.style.height = "auto"; 
        e.target.style.height = `${e.target.scrollHeight}px`; 

        if(e.target.value.length >= 1){
            setEnableChat(true);
        } else {
            setEnableChat(false);
        }
    };

    const getCurrentChat = async (chatId: string, friendId: string) => {
        try {
            setConversationId(chatId);
            // Get friend doc reference instead just friendId
            const friendRef = doc(db, "user", friendId);
            const friendSnap = await getDoc(friendRef);

            if (friendSnap.exists()) {
                const friendData = friendSnap.data();
                setFriendId(friendData);
            } else {
                return new Error("Friend not found");
            }

            const fetchMessageDataRef = doc(db, 'userMessages', chatId);
            const fetchMessageSnapshot = await getDoc(fetchMessageDataRef); 
    
            if (fetchMessageSnapshot.exists()) { 
                // Initialize the doc 
                const messageData = fetchMessageSnapshot.data();
                setCurrentChat(messageData.messages || []);
                console.log("True")

                setUserDisplay(true);

            } else {
                // If not existing yet codeblock here
                await setDoc(fetchMessageDataRef, {
                    messages:[]
                });

                console.log("Message Data created")

                // Update the state to an empty chat, since its a new conversation
                setCurrentChat([]);

                setUserDisplay(true);
            }
            
            // Update the seen status too
            const chatRef = doc(db, "userChats", user.uid);
            const chatSnap = await getDoc(chatRef);
            if (chatSnap.exists()) {
                const updatedChats = chatSnap.data().chatsData.map((chat: any) =>
                    chat.chatID === chatId ? { ...chat, unreadMessages: 0, seen: true } : chat
                );
                await updateDoc(chatRef, { chatsData: updatedChats });
            }

        } catch (e) {
            console.error("Error fetching chat:", e);
        }
    };
    
    // If this runs, the user will send a message in the particular doc ref and update that.
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
    
        try {
            // Validate required data
            if (!currentChat || !conversationId || !message.trim()) {
                console.error("Error: Missing required data");
                return;
            }
    
            const messageRef = doc(db, "userMessages", conversationId);
            const messageSnap = await getDoc(messageRef);
    
            // Update the userMessages
            const newMessage = {
                text: message.trim(),
                senderId: user.uid,
                timeSent: Timestamp.now(),
            };
    
            if (messageSnap.exists()) {
                // If the conversation exists, update the messages array
                await updateDoc(messageRef, {
                    messages: arrayUnion(newMessage),
                });
            } else {
                // If the conversation does not exist, create it with the new message
                await setDoc(messageRef, {
                    messages: [newMessage],
                });
            }
    
            // Update the "userChats" data field for both users 
            const selfChatRef = doc(db, "userChats", user.uid);
            const friendChatRef = doc(db, "userChats", friendId.id); 
    
            const selfChatSnap = await getDoc(selfChatRef);
            const friendChatSnap = await getDoc(friendChatRef);
    
            if (selfChatSnap.exists()) {
                const selfChatData = selfChatSnap.data();
                const updatedChatsData = selfChatData.chatsData.map((chat: any) =>
                    chat.chatID === conversationId
                        ? { ...chat, recentMessage: message.trim(), senderId: user.uid, createdAt: Timestamp.now(), seen: true, }
                        : chat
                );
    
                await updateDoc(selfChatRef, {
                    chatsData: updatedChatsData,
                });
            }
    
            if (friendChatSnap.exists()) {
                const friendChatData = friendChatSnap.data();
                const updatedFriendChatsData = friendChatData.chatsData.map((chat: any) =>
                    chat.chatID === conversationId
                        ? {
                              ...chat,
                              recentMessage: message.trim(),
                              senderId: user.uid,
                              unreadMessages: (chat.unreadMessages || 0) + 1, // Increment unread messages
                              createdAt: Timestamp.now(),
                              seen: false,
                          }
                        : chat
                );
    
                await updateDoc(friendChatRef, {
                    chatsData: updatedFriendChatsData,
                });
            } else {
                const newFriendChatData = {
                    chatsData: [
                        {
                            chatID: conversationId,
                            friendID: user.uid,
                            profileImage: currentUser.profileImage || null,
                            username: currentUser.username || "Unknown",
                            recentMessage: message.trim(),
                            senderId: user.uid,
                            unreadMessages: 1, // Since this is a new chat, 1 unread message only
                            createdAt: Timestamp.now(),
                            seen: false,
                        },
                    ],
                };

                await setDoc(friendChatRef, newFriendChatData);
            }
    
            // Update state and clear input field
            setCurrentChat((prevChat) => [...prevChat, newMessage]);
            setMessage("");
    
        } catch (e) {
            console.error("Error sending message:", e);
        }
    };    

    // Always scroll to the latest
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [currentChat]);

    useEffect(() => {
        console.log(currentChat);
    }, [currentChat])

    useEffect(() => {
        if (friendId) {
            console.log("Friend doc: ",friendId);
        }
    }, [friendId])

    return (
        <div className={styles.container}>
            <div className={styles.page}>
                <div className={styles.pageContainer}>
                    <div className={styles.messages}>
                        {/* Show only userSection on mobile unless a chat is selected */}
                        {!userDisplay || !isMobileView ? (
                            <>
                                {fetchChatData && !isLoading ? (
                                    <div className={styles.userSection}>
                                        <div className={styles.searchBar}>
                                            <i className="fa-solid fa-magnifying-glass"></i>
                                            <input className={styles.searchInput} type="search" placeholder="Search..." />
                                        </div>
                                        {fetchChatData.map((user, key) => (
                                            <button className={styles.userCard} onClick={() => getCurrentChat(user.chatID, user.friendID)} key={key}> {/* setUserDisplay(true); setCurrentChat(user); */}
                                                <div className={styles.upSection}>
                                                    <div className={styles.userIcon}>
                                                        {/* <div className={styles.userProfileImage} src={user.profileImage?}></div> */}
                                                        <img src={user.profileImage} className={styles.userProfileImage} alt={`${user.username} profile image`} />
                                                    </div>
                                                    <div className={styles.userDiv}>
                                                        <div className={styles.userName}>{user.username}</div>
                                                        <div className={styles.userStatus} style={{ color: user.status === "offline" ? "hsl(0, 0%, 30%)" : "hsl(0, 0%, 100%)" }}>{user.status}</div>
                                                    </div>
                                                    <div className={styles.lastMessageTime}>{user.createdAt ? getRelativeTime(user.createdAt) : ""}</div>
                                                </div>
                                                <div className={styles.downSection} style={{ display: user.recentMessage ? "block" : "none" }}>
                                                    <div className={styles.lastMessage}>{user.senderId === currentUser.id ? `You: ${user.recentMessage}` : user.recentMessage}</div>
                                                    <div className={styles.unreadMessageCount} style={{ display: user.unreadMessages > 0 ? "block" : "none" }}>{user.unreadMessages}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : fetchChatData.length === 0 && !isLoading ? (
                                    <div className={styles.userSection}>
                                        <div className={styles.searchBar}>
                                            <i className="fa-solid fa-magnifying-glass"></i>
                                            <input className={styles.searchInput} type="search" placeholder="Search..." />
                                        </div>
                                        <div className={styles.noChatMessage}>Find friends to chat with!</div>
                                    </div>
                                ) : (
                                    <div className={styles.userSection} style={{ justifyContent: "center", width:"100%", alignItems:"center"}}>
                                        <Loader/>
                                    </div>
                                )}
                            </>
                        ) : null}

                        {/* Show chatSection only when a user is selected on mobile */}
                        {userDisplay || !isMobileView ? (
                            <>
                                {userDisplay && currentChat.length >= 0 && (
                                    <div className={styles.chatSection}>
                                        <div className={styles.chatHeader}>
                                            {/* Back button visible only on mobile */}
                                            {isMobileView && (
                                                <button onClick={() => setUserDisplay(false)}>
                                                    <i className="fa-solid fa-chevron-left"></i>
                                                </button>
                                            )}
                                            {friendId && 
                                                <>
                                                    <img src={friendId.profileImage} alt={`${friendId.username} profile image`} className={styles.userProfileImage}/>
                                                    <div className={styles.userDiv}>
                                                        <div className={styles.userName}>{friendId.username}</div>
                                                    </div>
                                                    <button><i className="fa-solid fa-phone"></i></button>
                                                    <button onClick={() => setUserDisplay(false)}>
                                                        <i className="fa-solid fa-ellipsis-vertical" style={{ padding:"0rem 1rem" }}></i>
                                                    </button>
                                                </>
                                            }
                                        </div>
                                        <div className={styles.chatBody} ref={chatBodyRef}>
                                            {currentChat.map((msg, index) => (
                                                <div
                                                    key={index}
                                                    className={msg.senderId === user.uid ? styles.chatBubbleReceiver : styles.chatBubbleSender}
                                                >
                                                    <div className={styles.message}>
                                                        <div className={styles.text}>{msg.text}</div>
                                                        <div className={styles.timeSent}>{getRelativeTime(msg.timeSent)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <form onSubmit={handleSendMessage} className={styles.chatFooter}>
                                            <button><i className="fa-solid fa-paperclip"></i></button>
                                            <div className={styles.chatArea}>
                                            <textarea 
                                                maxLength={500} 
                                                rows={1} 
                                                value={message}
                                                placeholder="Type something..." 
                                                onKeyDown={handleKeyDown} 
                                                onChange={(e) => {
                                                    setMessage(e.target.value); // Update message state
                                                    autoResize(e); // Adjust textarea height
                                                }}
                                            ></textarea>
                                                <button><i className="fa-solid fa-face-smile"></i></button>
                                            </div>
                                            <button className={styles.sendButton} disabled={!enableChat} value={message} type="submit"><i className="fa-solid fa-paper-plane"></i></button>
                                        </form>
                                    </div>
                                )}
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};
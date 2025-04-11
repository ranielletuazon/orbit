import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns'; 
import styles from "./css/Messages.module.css";
import { auth, db, realtimeDb } from '../components/firebase/firebase';
import { doc, collection, getDocs, getDoc, setDoc, Timestamp, onSnapshot, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { onValue, update } from 'firebase/database';
import { ref as dbRef } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import orbit from '../assets/orbit.png';
import emptyMessage from '../assets/message.png';
import { toast } from 'sonner';

import Loader from '../components/loader';
import Header from '../components/Header';

// Initialize Firebase Storage
const storage = getStorage();

export default function Messages({user}: {user: any}) {

    const navigate = useNavigate();
    const [userDisplay, setUserDisplay] = useState(false);
    const [enableChat, setEnableChat] = useState(false);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
    const [fetchChatData, setFetchChatData] = useState<any[]>([]);
    const chatBodyRef = useRef<HTMLDivElement | null>(null);
    const [message, setMessage] = useState('');
    // Loading state
    const [isLoading, setIsLoading] = useState(true);
    // Upload loading state
    const [isUploading, setIsUploading] = useState(false);
    // State doc ref for currentUser
    const [currentUser, setCurrentUser] = useState<any>(null);
    // State for conversationId
    const [conversationId, setConversationId] = useState<string>('');
    // State for friendId
    const [friendId, setFriendId] = useState<any>(null);
    // Current chat data, selecting a chat will display this messages.
    const [currentChat, setCurrentChat] = useState<any[]>([]);
    // State for images
    const [images, setImages] = useState<File[]>([]);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);


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

        // Update data in userChats from user
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
    
        const userChatRef = doc(db, "userChats", user.uid);
    
        const statusListeners = fetchChatData.map((friend) => {
            const statusRef = dbRef(realtimeDb, `users/${friend.friendID}/status`);
            const latestUserRef = doc(db, "user", friend.friendID);
    
            // Fetch the latest user data (profileImage & username)
            getDoc(latestUserRef).then((docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const { profileImage, username } = userData;
    
                    const needsUpdate =
                        profileImage !== friend.profileImage ||
                        username !== friend.username;
    
                    if (needsUpdate) {
                        // 1. Update local state
                        setFetchChatData((prevData) =>
                            prevData.map((f) =>
                                f.friendID === friend.friendID
                                    ? { ...f, profileImage, username }
                                    : f
                            )
                        );
    
                        // 2. Update Firestore userChats
                        getDoc(userChatRef).then((chatSnap) => {
                            if (chatSnap.exists()) {
                                const currentData = chatSnap.data();
                                const updatedChats = currentData.chatsData.map((chat: any) =>
                                    chat.friendID === friend.friendID
                                        ? { ...chat, profileImage, username }
                                        : chat
                                );
    
                                updateDoc(userChatRef, {
                                    chatsData: updatedChats,
                                });
                            }
                        });
                    }
                }
            });
    
            // Always keep status updated
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
    
        return () => {
            statusListeners.forEach((unsubscribe) => unsubscribe());
        };
    }, [fetchChatData, user.uid]);
    

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
                    // Sort by most recent message before setting state
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

        if((e.target.value.length >= 1 && message.length >= 1) || images.length > 0) {
            setEnableChat(true);
        } else {
            setEnableChat(false);
        }
    };

    const getCurrentChat = async (chatId: string, friendId: string) => {
        try {
            setConversationId(chatId);
            setImagePreview(null);
            setImages([]);
            setMessage("");
    
            // Get friend doc reference instead of just friendId
            const friendRef = doc(db, "user", friendId);
            const friendSnap = await getDoc(friendRef);
    
            if (friendSnap.exists()) {
                const friendData = friendSnap.data();
                setFriendId(friendData);
            } else {
                console.error("Friend not found");
                return;
            }
    
            // Reference to userMessages document
            const fetchMessageDataRef = doc(db, "userMessages", chatId);
    
            // Check if the document exists
            const fetchMessageSnapshot = await getDoc(fetchMessageDataRef);
    
            if (fetchMessageSnapshot.exists()) {
                const messageData = fetchMessageSnapshot.data();
                setCurrentChat(messageData.messages || []);
                console.log("Existing chat found");
            } else {
                // If document doesn't exist, create it
                await setDoc(fetchMessageDataRef, {
                    messages: [],
                });
    
                console.log("Message Data created");
    
                // Update state to an empty chat since it's a new conversation
                setCurrentChat([]);
            }
    
            setUserDisplay(true);
    
            // Reset unread messages count for the current user
            const userChatRef = doc(db, "userChats", user.uid);
            const userChatSnap = await getDoc(userChatRef);
    
            if (userChatSnap.exists()) {
                const updatedChats = userChatSnap.data().chatsData.map((chat: any) =>
                    chat.chatID === chatId ? { ...chat, unreadMessages: 0, seen: true } : chat
                );
    
                await updateDoc(userChatRef, { chatsData: updatedChats });
            }
    
            // Real-time listener for messages
            const unsubscribeMessages = onSnapshot(fetchMessageDataRef, (snapshot) => {
                if (snapshot.exists()) {
                    const messageData = snapshot.data();
                    setCurrentChat(messageData.messages || []);
                } else {
                    setCurrentChat([]);
                }
            });
    
            // Cleanup function to remove listener when component unmounts
            return () => unsubscribeMessages();
    
        } catch (e) {
            console.error("Error fetching chat:", e);
        }
    };    
    
    // Function to upload images to Firebase Storage
    const uploadImages = async (): Promise<string[]> => {
        if (images.length === 0) return [];
        
        try {
            setIsUploading(true);
            const uploadPromises = images.map(async (image, index) => {
                // Create a unique path for each image
                const imagePath = `chat_images/${user.uid}/${conversationId}/${Date.now()}_${index}_${image.name}`;
                const imageRef = storageRef(storage, imagePath);
                
                // Upload image to Firebase Storage
                await uploadBytes(imageRef, image);
                
                // Get download URL for the uploaded image
                const downloadURL = await getDownloadURL(imageRef);
                return downloadURL;
            });
            
            // Wait for all uploads to complete
            const imageUrls = await Promise.all(uploadPromises);
            return imageUrls;
        } catch (error) {
            console.error("Error uploading images:", error);
            return [];
        } finally {
            setIsUploading(false);
        }
    };

    // If this runs, the user will send a message in the particular doc ref and update that.
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
    
        try {
            // Validate conversation ID exists
            if (!conversationId) {
                console.error("Error: Missing conversation ID");
                return;
            }
            
            // Check if there's a message or images to send
            if (message.trim() === '' && images.length === 0) {
                console.error("Error: No message or images to send");
                return;
            }
            
            // Upload images if any
            let imageUrls: string[] = [];
            if (images.length > 0) {
                imageUrls = await uploadImages();
            }
    
            const messageRef = doc(db, "userMessages", conversationId);
            
            // Create new message object
            const newMessage = {
                text: message.trim(),
                senderId: user.uid,
                timeSent: Timestamp.now(),
                // Add images array to message if there are any
                ...(imageUrls.length > 0 && { images: imageUrls })
            };

            setMessage(""); //Clear input after sending
            setImages([]); //Clear images after sending
            setImagePreview(null);
            setEnableChat(false);
    
            // Check if the conversation already exists
            const messageSnap = await getDoc(messageRef);
            if (messageSnap.exists()) {
                await updateDoc(messageRef, {
                    messages: arrayUnion(newMessage),
                });
            } else {
                await setDoc(messageRef, {
                    messages: [newMessage],
                });
            }
    
            // Update the "userChats" data for both users
            const selfChatRef = doc(db, "userChats", user.uid);
            const friendChatRef = doc(db, "userChats", friendId.id);
    
            const selfChatSnap = await getDoc(selfChatRef);
            const friendChatSnap = await getDoc(friendChatRef);
            
            // Determine the recent message text to display
            let recentMessageText = message.trim();
            if (recentMessageText === '' && imageUrls.length > 0) {
                recentMessageText = "Sent an image";
                if (imageUrls.length > 1) {
                    recentMessageText = `Sent ${imageUrls.length} images`;
                }
            }
    
            // For self
            if (selfChatSnap.exists()) {
                const selfChatData = selfChatSnap.data();
                const updatedChatsData = selfChatData.chatsData.map((chat: any) =>
                    chat.chatID === conversationId
                        ? { 
                            ...chat, 
                            recentMessage: recentMessageText, 
                            senderId: user.uid, 
                            createdAt: Timestamp.now(), 
                            seen: true 
                        }
                        : chat
                );
    
                await updateDoc(selfChatRef, {
                    chatsData: updatedChatsData,
                });
            }
    
            // for the receiver
            if (friendChatSnap.exists()) {
                const friendChatData = friendChatSnap.data();
                const updatedFriendChatsData = friendChatData.chatsData.map((chat: any) =>
                    chat.chatID === conversationId
                        ? { 
                            ...chat, 
                            recentMessage: recentMessageText, 
                            senderId: user.uid, 
                            unreadMessages: (chat.unreadMessages || 0) + 1, 
                            createdAt: Timestamp.now(), 
                            seen: false 
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
                            recentMessage: recentMessageText,
                            senderId: user.uid,
                            unreadMessages: 1,
                            createdAt: Timestamp.now(),
                            seen: false,
                        },
                    ],
                };
    
                await setDoc(friendChatRef, newFriendChatData);
            }
            
    
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
        console.log("Mobile View: ", isMobileView, " User Display Status: ", userDisplay);
    }, [isMobileView, userDisplay]);

    // Update your handleImageChange function
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Limit the file size to 2MB
        const maxFileSize = 2 * 1024 * 1024;
        const validFiles = Array.from(files).filter(file => file.size <= maxFileSize);

        if (validFiles.length === 0) {
            toast.error("Image size is too large. Please select an image less than 2MB.");
            return;
        }

        // Process each file
        Array.from(files).forEach(file => {
            // Disregard files larger than 2MB (2 * 1024 * 1024 bytes)
            if (file.size > 2 * 1024 * 1024) return;

            // Check if the file is already in the images array
            const isDuplicate = images.some(existingFile =>
                existingFile.name === file.name &&
                existingFile.size === file.size &&
                existingFile.type === file.type
            );

            // Only process non-duplicate files
            if (!isDuplicate) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.result) {
                        setImages(prev => [...prev, file]);
                        setImagePreview(reader.result as string); // For showing preview
                    }
                };
                reader.readAsDataURL(file);
                
                // Enable chat button if there's at least one image
                setEnableChat(true);
            }
            // If duplicate, just silently ignore it
        });

        // Reset the file input to allow selecting the same file again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveImage = (index: number, e: any) => {
        e.stopPropagation();
        
        const newImages = images.filter((_, i) => i !== index);
        
        setImages(newImages);
        
        // If no images left and no message text, disable the send button
        if (newImages.length === 0 && message.trim() === '') {
            setEnableChat(false);
        }
        
        if (newImages.length === 0) {
          setImagePreview(null);
        }
    };

    useEffect(() => {console.log(message)},[message])
      

    return (
        <div className={styles.container}>
            <div className={styles.page}>
                <div className={styles.pageContainer}>
                    <div className={styles.messages}>
                        {/* Show only userSection on mobile unless a chat is selected */}
                        {!userDisplay || !isMobileView ? (
                            <>
                                {fetchChatData && !isLoading ? (
                                    <>
                                        <div className={styles.userSection}>
                                            <div className={styles.accessibility}>
                                                <button onClick={() => navigate("/space")}><img src={orbit} alt="Logo" className={styles.orbitLogo}/></button>
                                                <div className={styles.searchBar}>
                                                    <i className="fa-solid fa-magnifying-glass"></i>
                                                    <input className={styles.searchInput} type="search" placeholder="Search..." />
                                                </div>
                                            </div>
                                            {fetchChatData.length > 0 ? (
                                                fetchChatData.map((user, key) => (
                                                    <button className={styles.userCard} onClick={() => getCurrentChat(user.chatID, user.friendID)} key={key}>
                                                        <div className={styles.upSection}>
                                                            <div className={styles.userIcon}>
                                                                <div className={styles.userProfileImage} style={{ backgroundImage: `url(${user.profileImage})` }}>
                                                                    <div className={user.status === "online" ? styles.iconOnline : styles.iconOffline}></div>
                                                                </div>
                                                            </div>
                                                            <div className={styles.userDiv}>
                                                                <div className={styles.userName}>{user.username}</div>
                                                            </div>
                                                            <div className={styles.lastMessageTime}>{user.createdAt ? getRelativeTime(user.createdAt) : ""}</div>
                                                        </div>
                                                        {user.recentMessage && (
                                                            <div className={styles.downSection}>
                                                                <div className={styles.lastMessage}>
                                                                    {user.senderId === currentUser.id 
                                                                        ? `You: ${user.recentMessage.length > 20 ? `${user.recentMessage.slice(0, 20)}...` : user.recentMessage}` 
                                                                        : `${user.username}: ${user.recentMessage.length > 20 ? `${user.recentMessage.slice(0, 20)}...` : user.recentMessage}`
                                                                    }
                                                                </div>
                                                                {user.unreadMessages > 0 && (
                                                                    <div className={styles.unreadMessageCount}>{user.unreadMessages}</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className={styles.noFriends}>
                                                    <span>No friends found</span>
                                                    <button onClick={() => navigate("/conversation")}>Find friends Here</button>
                                                    <span>or check friend requests</span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Empty State */}
                                        {!userDisplay && !isMobileView && (
                                            <>
                                                <div className={styles.emptyView}>
                                                    <div className={styles.emptyMessageImage} style={{backgroundImage: `url(${emptyMessage})`}}></div>
                                                </div>
                                            </>
                                        )}
                                    </>
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
                                                    <div style={{ backgroundImage: `url(${friendId.profileImage})` }} className={styles.userProfileImage} onClick={() => navigate(`/profile?id=${friendId.id}`)}></div>
                                                    <div className={styles.userDiv} onClick={() => navigate(`/profile?id=${friendId.id}`)}>
                                                        <div className={styles.userName}>{friendId.username}</div>
                                                    </div>
                                                </>
                                            }
                                        </div>
                                        {currentChat.length > 0 ? (
                                            <>
                                                <div className={styles.chatBody} ref={chatBodyRef}>
                                                    {currentChat.map((msg, index) => (
                                                        <div
                                                            key={index}
                                                            className={msg.senderId === user.uid ? styles.chatBubbleReceiver : styles.chatBubbleSender}
                                                        >
                                                            <div className={styles.message}>
                                                                <div className={styles.text}>{msg.text}</div>
                                                                {/* Display images if present */}
                                                                {msg.images && msg.images.length > 0 && (
                                                                    <div className={styles.messageImages}>
                                                                        {msg.images.map((imgUrl: string, imgIndex: number) => (
                                                                            <img 
                                                                                key={imgIndex} 
                                                                                src={imgUrl} 
                                                                                alt={`Image ${imgIndex}`}
                                                                                className={styles.messageImage}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <div className={styles.timeSent}>{getRelativeTime(msg.timeSent)}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className={styles.emptyChatBody}>
                                                    <div className={styles.headerChat}>No messages yet</div>
                                                    <div className={styles.bodyChat}>Start a conversation</div>
                                                </div>
                                            </>
                                        )}
                                        <div className={styles.chatFooter}>
                                            {/* if message want to send photo */}
                                            {images.length > 0 && (
                                                <>
                                                    <div className={styles.previewImage}>
                                                    {images.map((img, index) => (
                                                        <div key={index} className={styles.imageSample}>
                                                        <button 
                                                            className={styles.removeImage} 
                                                            onClick={(e) => handleRemoveImage(index, e)}
                                                        >
                                                            <i className="fa-solid fa-xmark"></i>
                                                        </button>
                                                        <img
                                                            src={URL.createObjectURL(img)}
                                                            alt={`preview-${index}`}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                                                        />
                                                        </div>
                                                    ))}
                                                    </div>
                                                </>
                                            )}
                                            <div className={styles.chatDisplay}>
                                                <button onClick={() => fileInputRef.current?.click()}>
                                                    <i className="fa-solid fa-image"></i>
                                                </button>
                                                <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                style={{ display: 'none' }}
                                                onChange={handleImageChange}
                                                ref={fileInputRef}
                                                />
                                                <div className={styles.chatArea}>
                                                    <textarea 
                                                        maxLength={500} 
                                                        rows={1} 
                                                        value={message}
                                                        placeholder="Type something..." 
                                                        style={{ whiteSpace: 'pre-wrap' }}
                                                        onKeyDown={handleKeyDown} 
                                                        onChange={(e) => {
                                                            setMessage(e.target.value); // Update message state
                                                            autoResize(e); // Adjust textarea height
                                                        }}
                                                    ></textarea>
                                                    {/* disabled emoji */}
                                                    {/* <button><i className="fa-solid fa-face-smile"></i></button> */}
                                                </div>
                                                <button 
                                                    className={styles.sendButton} 
                                                    disabled={!enableChat || isUploading} 
                                                    onClick={handleSendMessage}
                                                >
                                                    {isUploading ? (
                                                        <i className="fa-solid fa-spinner fa-spin"></i>
                                                    ) : (
                                                        <i className="fa-solid fa-paper-plane"></i>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
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
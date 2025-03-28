import styles from "./css/Community.module.css";
import Header from '../components/Header';
import React, { useState, useEffect, CSSProperties } from "react";
import { auth, db, realtimeDb } from '../components/firebase/firebase';
import { getDoc, doc, collection, getDocs, setDoc, updateDoc, arrayRemove, arrayUnion, onSnapshot } from 'firebase/firestore';
import { ref, onValue, off, get, onChildChanged } from 'firebase/database';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Loader from '../components/loader'

export default function Community({user}: {user: any}) {

    // const [friendsRef, setFriendsRef] = useState<any | null>(null);
    const [friendRequestsRef, setFriendRequestsRef] = useState<any | null>(null);
    const [pendingRef, setPendingRef] = useState<any | null>(null);
    const navigate = useNavigate();
    const [fetchedUserData, setFetchedUserData] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<any | null>(null);
    const [totalLoad, setTotalLoad] = useState(true);
    const [friendsStatus, setFriendsStatus] = useState<any | null>(null);
    const [friendsData, setFriendsData] = useState<{ [key: string]: any }[]>([]);
    const [currentTarget, setCurrentTarget] = useState<string>("friends");

    useEffect(() => {
        // Fetching the user data to store this in our state
        const fetchUserData = async () => {
            try {
                const userDocRef = doc(db, "user", user.uid);
                const userDoc = await getDoc(userDocRef);
                const userData = userDoc.data();
    
                if (userDoc.exists()) {

                    setFetchedUserData(userData);
                } else {
                    console.log("No user document found!");
                }
            } catch (error) {
                console.error("Error fetching friend requests:", error);
                toast.error("Failed to load friend data");
            }
        };
        fetchUserData();
    }, [user]);

    // This listens for changes in the firestore database
    useEffect(() => {
            if (!user) return;
        
            const userDocRef = doc(db, "user", user.uid);
        
            // Listen for real-time changes
            const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    setCurrentUser(docSnap.data());
                }
            });
        
            // Cleanup listener when component unmounts
            return () => unsubscribe();
    }, []);

    // Live updates for online status
    useEffect(() => {
        if (friendsData.length === 0) return;

        const statusListeners = friendsData.map((friend) => {
            const statusRef = ref(realtimeDb, `users/${friend.uid}/status`);

            return onValue(statusRef, (snapshot) => {
                setFriendsData((prevData) =>
                    prevData.map((f) =>
                        f.uid === friend.uid ? { ...f, status: snapshot.exists() ? snapshot.val() : "offline" } : f
                    )
                );
            });

            return () => off(statusRef); // Fix: Properly remove the listener
        });

        // Cleanup listeners when component unmounts
        return () => {
            statusListeners.forEach((unsubscribe) => unsubscribe());
        };
    }, [friendsData]);

    useEffect(() => {
        if (fetchedUserData) {
            const fetchFriendRequests = async () => {
                try {
                    const friendRequests: string[] = fetchedUserData.friendRequests;

                    if (friendRequests && friendRequests.length > 0) {
                        // Fetch user documents in parallel
                        const friendRequestsData = await Promise.all(
                            friendRequests.map(async (uid) => {
                                const userDocRef = doc(db, "user", uid);
                                const userDocSnap = await getDoc(userDocRef);
                                
                                return userDocSnap.exists() ? { ...userDocSnap.data() } : null;
                            })
                        );
            
                        // Filter out any failed fetches (null values)
                        setFriendRequestsRef(friendRequestsData.filter(user => user !== null));
                    } else {
                        setFriendRequestsRef(null);
                    }
                } catch (error) {
                }
            }

            // outside function implement
            // Still not live
            const fetchFriends = async () => {
                try {
                    const friends: string[] = fetchedUserData?.friends || [];
                    if (friends.length > 0) {
                        // Fetch user documents in parallel
                        const friendsDataPromise = await Promise.all(
                            friends.map(async (uid) => {
                                const userDocRef = doc(db, "user", uid);
                                const userDocSnap = await getDoc(userDocRef);
        
                                const statusRef = ref(realtimeDb, `users/${uid}/status`);
                                const statusSnap = await get(statusRef);
        
                                return {
                                    ...userDocSnap.data(),
                                    uid,
                                    status: statusSnap.exists() ? statusSnap.val() : "offline", // Default to offline
                                };
                            })
                        );
        
                        setFriendsData(friendsDataPromise);
                    } else {
                        setFriendsData([]);
                    }
                } catch (error) {
                    console.error("Error fetching friends:", error);
                }
            };

            const fetchPending = async () => {
                try {
                    const pendingRequests: string[] = fetchedUserData.pendingRequests;

                    if (!pendingRequests) {
                        setPendingRef(null);
                        return;
                    } else {
                        const pendingRequestsData = await Promise.all(
                            pendingRequests.map(async (uid) => {
                                const userDocRef = doc(db, "user", uid);
                                const userDocSnap = await getDoc(userDocRef);
                                return userDocSnap.exists() ? { ...userDocSnap.data() } : null;
                            })
                        );

                        setPendingRef(pendingRequestsData.filter(user => user !== null));
                    }

                } catch (error) {
                    console.error(error);
                }
            }

            fetchFriendRequests();
            fetchFriends();
            fetchPending();
            setTimeout(() => {
                setTotalLoad(false);
            }, 500)
        }
    }, [fetchedUserData]);

    const handleAcceptRequest = async (uid: string) => {
        try {
            const userDocRef = doc(db, 'user', user.uid);
            const userDoc = await getDoc(userDocRef);

            const friendDocRef = doc(db, 'user', uid);
            const friendDoc = await getDoc(friendDocRef);

            if (userDoc.exists() && friendDoc.exists()) {
                await updateDoc(userDocRef, {
                    friendRequests: arrayRemove(uid),
                    friends: arrayUnion(uid),
                    pendingRequests: arrayRemove(user.uid)
                });

                await updateDoc(friendDocRef, {
                    friendRequests: arrayRemove(uid),
                    friends: arrayUnion(user.uid),
                    pendingRequests: arrayRemove(user.uid)
                });

                setFriendRequestsRef((prevRequests: any[]) => prevRequests.filter(friend => friend.id !== uid));
            }
        } catch (error) {

        }

        console.log(friendRequestsRef);
    }

    const handleRemoveRequest = async (uid: string) => {
        try {
            const userDocRef = doc(db, "user", user.uid);
            const userDoc = await getDoc(userDocRef);

            const requestDoc = await doc(db, "user", uid);

            if (userDoc.exists()) {
                // Remove the UID from the friendRequests array in Firestore
                await updateDoc(userDocRef, {
                    friendRequests: arrayRemove(uid),
                });

                await updateDoc(requestDoc, {
                    pendingRequests: arrayRemove(uid)
                });

                // Remove the object from the local state
                setFriendRequestsRef((prevRequests: any[]) => prevRequests.filter(friend => friend.id !== uid));

            } else {
                console.log("User document does not exist.");
            }
        } catch (error) {
            console.error("Error removing friend request:", error);
        }
    };

    const handleCancelRequest = async (uid: string) => {
        try {
            const userDocRef = doc(db, "user", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                await updateDoc(userDocRef, {
                    pendingRequests: arrayRemove(uid),
                });
                setPendingRef((prevRequests: any[]) => prevRequests.filter(friend => friend.id !== uid));
            }
        } catch (e) {

        }
    }

    const handleViewProfile = (uid: string) => {
        if (!uid) {
            return;
        }
        navigate(`/profile?id=${uid}`);
    }

    return(
        <>
            <div className={styles.container}>
                <div className={styles.page}>
                    <div className={styles.pageContainer}>
                        <Header user={user} />
                        {!totalLoad ? (
                            <>
                                <div className={styles.content}>
                                    <div className={styles.targetButtons}>
                                        <button className={currentTarget === "friends" ? styles.activeTarget : styles.targetButton} onClick={() => setCurrentTarget("friends")}>Friends</button>
                                        <button className={currentTarget === "friendRequests" ? styles.activeTarget : styles.targetButton} onClick={() => setCurrentTarget("friendRequests")}>Friend Requests {friendRequestsRef && friendRequestsRef.length > 0 ? <div className={styles.notif}></div> : ""}</button>
                                        <button className={currentTarget === "" ? styles.activeTarget : styles.targetButton} onClick={() => setCurrentTarget("")}>Pending Requests</button>
                                    </div>
                                    <div className={styles.displayContainer}>
                                        {currentTarget === "friends" ? (
                                            <>
                                                {friendsData?.length > 0 ? (
                                                    friendsData.map((user, index) => (
                                                        <div className={styles.cardUserDisplay} key={index}>
                                                            <div className={styles.profileSection}>
                                                                <div
                                                                    className={styles.profileDisplay}
                                                                    style={{ backgroundImage: `url(${user.profileImage})` }}
                                                                >
                                                                </div>
                                                                <div className={styles.profileInfo}>
                                                                    <div className={styles.profileName}>
                                                                        {user.username}
                                                                    </div>
                                                                    <div
                                                                        className={`${styles.status} ${
                                                                            user.status === "online"
                                                                                ? styles.online
                                                                                : styles.offline
                                                                        }`}
                                                                    >
                                                                        {user.status}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className={styles.buttons}>
                                                                <button
                                                                    className={styles.removeButton}
                                                                    onClick={() => handleViewProfile(user.uid)}
                                                                >
                                                                    View Profile
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className={styles.friendContent}>No Friends Yet</div>
                                                )}
                                            </>
                                        ) : currentTarget === "friendRequests" ? (
                                            <>
                                                {friendRequestsRef?.length > 0 ? (
                                                    friendRequestsRef.map((user: any, index: number) => (
                                                        <div className={styles.cardUserDisplay} key={index}>
                                                            <div className={styles.profileSection}>
                                                                <div
                                                                    className={styles.profileDisplay}
                                                                    style={{ backgroundImage: `url(${user.profileImage})` }}
                                                                >
                                                                </div>
                                                                <div className={styles.profileInfo}>
                                                                    <div className={styles.profileName}>
                                                                        {user.username}
                                                                    </div>
                                                                    <div
                                                                        className={`${styles.status} ${
                                                                            user.status === "online"
                                                                                ? styles.online
                                                                                : styles.offline
                                                                        }`}
                                                                    >
                                                                        {user.status}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className={styles.buttons}>
                                                                <button
                                                                    className={styles.removeButton}
                                                                    onClick={() => handleViewProfile(user.id)}
                                                                >
                                                                    View Profile
                                                                </button>
                                                                <button
                                                                    className={styles.acceptButton}
                                                                    onClick={() =>
                                                                        handleAcceptRequest(user.id)
                                                                    }
                                                                >
                                                                    Accept Friend Request
                                                                </button>
                                                                <button
                                                                    className={styles.removeButton}
                                                                    onClick={() =>
                                                                        handleRemoveRequest(user.id)
                                                                    }
                                                                >
                                                                    Remove Friend Request
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className={styles.friendContent}>No Requests Yet</div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {pendingRef?.length > 0 ? (
                                                    pendingRef.map((user: any, index: number) => (
                                                        <div className={styles.cardUserDisplay} key={index}>
                                                            <div className={styles.profileSection}>
                                                                <div
                                                                    className={styles.profileDisplay}
                                                                    style={{ backgroundImage: `url(${user.profileImage})` }}
                                                                >
                                                                </div>
                                                                <div className={styles.profileInfo}>
                                                                    <div className={styles.profileName}>
                                                                        {user.username}
                                                                    </div>
                                                                    <div
                                                                        className={`${styles.status} ${
                                                                            user.status === "online"
                                                                                ? styles.online
                                                                                : styles.offline
                                                                        }`}
                                                                    >
                                                                        {user.status}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className={styles.buttons}>
                                                                <button
                                                                    className={styles.removeButton}
                                                                    onClick={() => handleViewProfile(user.id)}
                                                                >
                                                                    View Profile
                                                                </button>
                                                                <button
                                                                    className={styles.removeButton}
                                                                    onClick={() =>
                                                                        handleCancelRequest(user.id)
                                                                    }
                                                                >
                                                                    Cancel Friend Request
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className={styles.friendContent}>Discover People at Space!</div>
                                                )}
                                            </>
                                        )}      
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={styles.container}>
                                    <Loader/>
                                </div>
                            </>
                        ) }        
                    </div>
                </div>
            </div>
        </>
    );
};
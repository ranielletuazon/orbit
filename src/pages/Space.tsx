import React, { useState, useEffect, CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db, realtimeDb } from "../components/firebase/firebase";
import { getDoc, doc, collection, getDocs, setDoc, query, orderBy, limit, updateDoc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";
import { ref, onValue, getDatabase, get } from "firebase/database";
import Loader from '../components/loader'
import { toast } from "sonner";
import styles from './css/Space.module.css';
import { set } from "firebase/database";
import Header from '../components/Header';

export default function Space({ user }: { user: any }) {

    interface UserData{
        username: string,
        id: string,
        email: string;
        emailConsent: boolean;
        friendRequests?: string[];
        friends?: string[];
        pendingRequests?: string[];
    }

    const [currentUser, setCurrentUser] = useState<UserData | null>(null);
    const [suggested, setSuggested] = useState<string[]>([]);
    const [playerData, setPlayerData] = useState<any[]>([]);
    const [topGames, setTopGames] = useState<any[]>([]);
    const [sidebar, setSidebar] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [userStatus, setUserStatus] = useState<boolean>(false);

    const navigate = useNavigate();

    // Check if this code still important?
    useEffect(() => {
        if (!auth.currentUser) return; // Ensure user is authenticated
    
        const userDocRef = doc(db, "user", auth.currentUser.uid);
    
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data() as UserData;
                setCurrentUser(userData);
    
                // Check if emailConsent exists
                if (userData.emailConsent === undefined || userData.emailConsent === false) {
                    navigate("/setup");
                }
            } else {
                console.log("No such document!");
            }
        });
    
        return () => unsubscribe(); // Cleanup listener on unmount
    }, [navigate]);

    // re render on firestore data change
    useEffect(() => {
        if (!auth.currentUser) return;
    
        const userDocRef = doc(db, "user", auth.currentUser.uid);
    
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setCurrentUser(docSnap.data() as UserData);
            }
        });
    
        // Cleanup listener when component unmounts
        return () => unsubscribe();
    }, []);

    // Get random 5
    useEffect(() => {
        const fetchData = async () => {
            try {
                const today = new Date().toLocaleDateString(); // Format as "MM/DD/YYYY"
    
                // Check Firestore cache first
                const userDocRef = doc(db, "userCache", user.uid); // Reference to cached user data
                const userCacheSnap = await getDoc(userDocRef);
    
                if (userCacheSnap.exists()) {
                    const userCacheData = userCacheSnap.data();
                    if (userCacheData.lastFetched === today) {
                        // Use cached data
                        if (userCacheData.playerData) {
                            setPlayerData(userCacheData.playerData);
                            return;
                        }
                    }
                }
    
                // Fetch data from Realtime Database #Uncomment this to use RTDB
                // const rtdb = getDatabase();
                // const usersRef = ref(rtdb, "users"); // Reference to the "users" node in Realtime Database
                // const snapshot = await get(usersRef);
    
                // if (!snapshot.exists()) {
                //     return;
                // }
    
                // const playersList = Object.keys(snapshot.val()).map((key) => ({
                //     id: key, // Use the key as the user ID
                //     ...snapshot.val()[key], // Spread user data
                // }));

                // Fetching the user documents from Firestore
                // Fail Safe Fetch Players
                // const playersSnap = await getDocs(collection(db, "user"));

                // Fixed - less than 10
                const q = query(collection(db, "user"), orderBy("username"), limit(10));
                const playersSnap = await getDocs(q);

                const playersList = playersSnap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                // Select 5 random players, excluding friends
                const randomFive: string[] = [];
                const friends: string[] = currentUser?.friends || [];

                while (
                    randomFive.length < 5 &&
                    playersList.length > randomFive.length
                ) {
                    const randomPlayer = playersList[Math.floor(Math.random() * playersList.length)];

                    // Ensure the player is not a friend
                    if (!friends.includes(randomPlayer.id) && randomPlayer.id !== user.uid && !randomFive.includes(randomPlayer.id)) {
                        randomFive.push(randomPlayer.id);
                    }
                }

                // Set the suggested players
                setSuggested(randomFive);

    
                // Fetching player data for the selected random player IDs
                const playersData = randomFive.map((id: any) => playersList.find((user) => user.id === id));
                const filteredPlayersData = playersData.filter((player: any) => player !== undefined);
    
                setPlayerData(filteredPlayersData);
    
                // Store the player data and the current date in Firestore cache
                await setDoc(userDocRef, {
                    lastFetched: today,
                    playerData: filteredPlayersData,
                });

            } catch (error) {
                console.error("Error fetching players:", error);
            }
        };

        const fetchTopGames = async () => {
            try {
                // Create a query to get top 3 games by popularity
                const gamesQuery = query(
                    collection(db, "onlineGames"),
                    orderBy("gamePopularity", "desc"), // Order by popularity in descending order
                    limit(3) // Limit to top 3
                );
        
                // Execute the query
                const querySnapshot = await getDocs(gamesQuery);
                
                // Map the results
                const topGames = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    title: doc.data().gameTitle,
                    gamePopularity: doc.data().gamePopularity,
                    gameTopImage: doc.data().gameTopImage,
                    gameImage: doc.data().gameImage
                }));
        
                setTopGames(topGames);
            } catch (error) {
                console.error("Error fetching top games:", error);
                throw error;
            } finally {
                setTimeout(() => {
                    setIsLoading(true);
                }, );
            }
        };
    
        fetchData();
        fetchTopGames();
    }, []);

    // Make this as a component, might be reusable soon
    const handleFriendRequest = async (requestId: any) => {
        try {
            if (!requestId) {
                return;
            }
            if (!user || !user.uid) {
                return;
            }

            const userDocRef = doc(db, "user", requestId.id);
            const userDoc = await getDoc(userDocRef);

            const currentUserDocRef = doc(db, "user", user.uid);

            const userData = userDoc.data();
            const friendsList = userData?.friends || []; 

            // Check if already friends
            if (friendsList.includes(user.uid)) {
                toast.info(`You are already friends with ${requestId.username}.`);
                return;
            }

            // Check if already in pending requests
            if (currentUser?.pendingRequests?.includes(requestId.id)) {
                toast.info(`You have already sent a friend request to ${requestId.username}.`);
                return;
            }

            await updateDoc(userDocRef, {
                friendRequests: arrayUnion(user.uid)
            });

            await updateDoc(currentUserDocRef, {
                pendingRequests: arrayUnion(requestId.id)
            });
        } catch (error) {
            toast.error("Error sending friend request:");
        }
    }

    // Handle accepting a friend request with an existing friend request in the random players
    const handleAcceptRequest = async (requestId: any) => {
        try {
            const otherUserDocRef = doc(db, 'user', requestId.id);

            if (currentUser?.pendingRequests?.includes(requestId.id)) {
                toast.info(`You have already sent a friend request to ${requestId.username}.`);
                return;
            }

            if (currentUser?.friends?.includes(requestId.id)) {
                toast.info(`You are already friends with ${requestId.username}.`);
                return;
            }

            // Update the friendRequests array in the friend's document
            await updateDoc(otherUserDocRef, {
                friends: arrayUnion(user.uid),
                pendingRequests: arrayRemove(user.uid),
                // To make sure remove the users from the friendRequests array too
                friendRequests: arrayRemove(user.uid)
            })

            const currentUserDocRef = doc(db, 'user', user.uid);

            // Update the friends/friendRequests array in the current user's document
            await updateDoc(currentUserDocRef, {
                friends: arrayUnion(requestId.id),
                friendRequests: arrayRemove(requestId.id),
                pendingRequests: arrayRemove(requestId.id)
            })

        } catch (e: any) {
            const errorCode: string = e.code;
            console.log(e, "Error");
            toast.error(errorCode);
        }
    }

    useEffect(() => {
        console.log(user.uid);
        console.log(playerData)
    }, [])

    return (
        <>
            <div className={styles.container}>
                <div className={styles.page}>
                    <div className={styles.pageContainer}>
                        <Header user={user} />
                        <div className={styles.main}>
                            <div className={styles.mainHeader}>
                                <div className={styles.intro}>
                                    Welcome back,{" "}
                                    <span style={{ color: "white" }}>
                                        {currentUser?.username?.toUpperCase()}
                                    </span>
                                </div>
                                <div className={styles.sideButtons}>
                                    <button
                                        className="fa-solid fa-bell"
                                    ></button>
                                    <button
                                        onClick={() => navigate('/messages')}
                                        className="fa-solid fa-comment-dots"
                                    ></button>
                                    <button
                                        onClick={() => navigate('/community')}
                                        className="fa-solid fa-user-group"
                                        style={{position: "relative"}}
                                    >
                                        <div className={styles.newNotif} style={{ display: currentUser?.friendRequests && currentUser.friendRequests.length > 0 ? "block" : "none" }}></div>
                                    </button>
                                </div>
                            </div>
                            {isLoading ? (
                                <>
                                    <div className={styles.gameSection}>
                                <div className={styles.popular}>
                                    <img
                                        src={topGames[0]?.gameTopImage}
                                        alt="Top 1 Game"
                                        className={styles.popularImage}
                                    />
                                    <div className={styles.popularSection}>
                                        <div className={styles.popularTag}>
                                            <i className="fa-solid fa-fire"></i>
                                            Popular
                                        </div>
                                    </div>
                                    <div className={styles.popularTitle}>
                                        <div className={styles.gameTitle}>
                                            {topGames[0]?.title}
                                        </div>
                                    </div>
                                    <div className={styles.descriptionSection}>
                                        {" "}
                                        {/* ADD DESCRIPTION */}
                                        <div className={styles.description}>
                                            Valorant is an online multiplayer
                                            computer game, produced by Riot
                                            Games. It is a first-person shooter
                                            game, consisting of two teams of
                                            five, where one team attacks and the
                                            other defends. Players control
                                            characters known as 'agents', who
                                            all have different abilities to use
                                            during gameplay.
                                        </div>
                                    </div>
                                    <div className={styles.playersSection}>
                                        <div className={styles.playerCircles}>
                                            <div
                                                className={styles.player}
                                            ></div>
                                            <div
                                                className={styles.player}
                                                style={{ marginLeft: "-2rem" }}
                                            ></div>
                                            <div
                                                className={styles.player}
                                                style={{ marginLeft: "-2rem" }}
                                            ></div>
                                        </div>
                                        <div className={styles.playersInfo}>
                                            {" "}
                                            +85 more looking for Valorant
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.box}>
                                    <div className={styles.gameBox}>
                                        <img
                                            src={topGames[1]?.gameImage}
                                            alt="Top 2 Game"
                                            className={styles.gameboximage}
                                        />
                                        <div className={styles.gameboxtitle}>
                                            {topGames[1]?.title}
                                        </div>
                                        <div
                                            className={
                                                styles.gameboxplayercount
                                            }
                                        >
                                            20 players
                                        </div>
                                        <div className={styles.view}>
                                            <i className="fa-solid fa-eye"></i>{" "}
                                            View
                                        </div>
                                    </div>
                                    <div className={styles.gameBox}>
                                        <img
                                            src={topGames[2]?.gameImage}
                                            alt="Top 3 Game"
                                            className={styles.gameboximage}
                                        />
                                        <div className={styles.gameboxtitle}>
                                            {topGames[2]?.title}
                                        </div>
                                        <div
                                            className={
                                                styles.gameboxplayercount
                                            }
                                        >
                                            15 players
                                        </div>
                                        <div className={styles.view}>
                                            <i className="fa-solid fa-eye"></i>{" "}
                                            View
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.userHeader}>
                                Players for You Today
                            </div>
                            <div className={styles.playerSection}>
                                {" "}
                                {/* Maximum of 5 */}
                                {playerData &&
                                    playerData.map((item, index) => (
                                        <div
                                            key={index}
                                            className={styles.playerDisplay}
                                            style={{
                                                backgroundImage: `url(${item.profileImage})`,
                                            }}
                                        >
                                            <div
                                                className={styles.statusDisplay}
                                                style={{
                                                    display:
                                                        item.status === "online"
                                                            ? "block"
                                                            : "none",
                                                }}
                                            ></div>
                                            <div
                                                className={
                                                    styles.playerDescription
                                                }
                                            >
                                                <div
                                                    className={
                                                        styles.playerUsername
                                                    }
                                                >
                                                    <b>
                                                        {item.username},{" "}
                                                        {item.birthdate &&
                                                            Math.floor(
                                                                (Date.now() -
                                                                    new Date(
                                                                        item.birthdate
                                                                    ).getTime()) /
                                                                    (1000 *
                                                                        60 *
                                                                        60 *
                                                                        24 *
                                                                        365.25)
                                                            )}{" "}
                                                        {item.gender &&
                                                        item.gender.toLowerCase() ===
                                                            "male" ? (
                                                            <i
                                                                className="fa-solid fa-mars"
                                                                style={{
                                                                    color: "#2cc6ff",
                                                                    marginLeft:
                                                                        "0.5rem",
                                                                }}
                                                            ></i>
                                                        ) : (
                                                            <i
                                                                className="fa-solid fa-venus"
                                                                style={{
                                                                    color: "hsl(0, 100%, 70%)",
                                                                    marginLeft:
                                                                        "0.5rem",
                                                                }}
                                                            ></i>
                                                        )}
                                                    </b>
                                                </div>
                                                    <button
                                                    className={
                                                        currentUser?.friendRequests?.includes(item.id)
                                                            ? styles.acceptRequest
                                                            : currentUser?.pendingRequests?.includes(item.id)
                                                            ? styles.pendingRequest
                                                            : currentUser?.friends?.includes(item.id)
                                                            ? styles.playerFriended
                                                            : styles.playerAdd
                                                    }
                                                    onClick={
                                                        currentUser?.friendRequests?.includes(item.id)
                                                            ? () => handleAcceptRequest(item)
                                                            : currentUser?.friends?.includes(item.id)
                                                            ? () => toast("friend")
                                                            : () => handleFriendRequest(item)
                                                    }
                                                >
                                                    {currentUser?.friendRequests?.includes(item.id) ? (
                                                        <i className="fa-solid fa-user-check"></i>
                                                    ) : currentUser?.pendingRequests?.includes(item.id) ? (
                                                        <i className="fa-solid fa-hourglass-half"></i> // Pending request icon
                                                    ) : currentUser?.friends?.includes(item.id) ? (
                                                        <i className="fa-solid fa-user"></i>
                                                    ) : (
                                                        <i className="fa-solid fa-user-plus"></i>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                                </>
                            ) : (
                                <>
                                    <div className={styles.container}>
                                        <Loader/>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

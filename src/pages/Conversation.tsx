import React, { useEffect, useState } from 'react';
import styles from './css/Conversation.module.css';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../components/firebase/firebase';
import { doc, getDoc, collection, getDocs, setDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';

import ufo from '../assets/ufo.png';
import Loader from '../components/loader';
import Header from '../components/Header';

export default function Conversation({user}: {user: any}) {
    const navigate = useNavigate();
    const url = new URL(window.location.href);
    const postId = url.searchParams.get('postId');

    const [discussionPosts, setDiscussionPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [createPost, setCreatePost] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'single'
    const [isConsidered, setIsConsidered] = useState(false);
    const [karmaState, setKarmaState] = useState(false);
    const [karmaLength, setKarmaLength] = useState(0);
    const [commentState, setCommentState] = useState<string>('');
    const [comments, setComments] = useState<any[]>([]);


    // Detects link changes
    useEffect(() => {
        setKarmaState(false);
        if (!postId) {
            setSelectedPost(null);
        }
        const fetchPost = async () => {
            try {
                if (!postId) return new Error("No post id");
                const postRef = doc(db, 'userConversation', postId);
                const postSnap = await getDoc(postRef);

                // Insert confirmCheckFriendOrNot
                confirmCheckFriendOrNot(postId);

                if (postSnap.exists()){
                    const postData = postSnap.data();
                    if (postData.karma && postData.karma.includes(user.uid)) {
                        setKarmaState(true);
                    }
                    setKarmaLength(postData.karma?.length || 0);
                    setSelectedPost(postData);
                    setComments(postData.comments || []);
                } else {
                    navigate('/404')
                }
            } catch (e) {
                console.log("Error", e)
            }
        }
        fetchPost();
    }, [postId]);

    useEffect(() => {
        let unsubscribe: any;
        
        const fetchPosts = async () => {
            if (user) {
                setLoading(true);
                const convoRef = collection(db, 'userConversation');
                
                // Use onSnapshot for real-time updates
                unsubscribe = onSnapshot(convoRef, (snapshot) => {
                    const posts = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setDiscussionPosts(posts);
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching posts:", error);
                    setLoading(false);
                });
            }
        };

        fetchPosts();
        
        // Cleanup the listener when component unmounts
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [user]);

    const handleGiveKarma = async (postId: string) => {
        if (!user) return;
        setKarmaState(true);
        if (!karmaState) {
            setKarmaLength((prev) => prev + 1);
        }
        
        try {
            const postRef = doc(db, 'userConversation', postId);
            const postDoc = await getDoc(postRef);
            
            if (postDoc.exists()) {
                const postData = postDoc.data();
                const karmaArray = postData.karma || [];
                
                if (karmaArray.includes(user.uid)) {
                    setKarmaState(false);
                    setKarmaLength((prev) => prev - 1);
                    // User already gave karma, remove it
                    await updateDoc(postRef, {
                        karma: arrayRemove(user.uid)
                    });
                } else {
                    // User hasn't given karma yet, add it
                    await updateDoc(postRef, {
                        karma: arrayUnion(user.uid)
                    });
                }
            }
        } catch (error) {
            console.error("Error updating karma:", error);
            setKarmaState(false);
            setKarmaLength((prev) => prev - 1);
        }
    };

    const getRelativeTime = (timestamp: any) => {
        if (!timestamp) return "";
        
        try {
            const now = new Date();
            const messageDate = timestamp instanceof Timestamp ? 
                timestamp.toDate() : 
                new Date(timestamp);
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
        
            // Use native date formatting instead of format function
            return messageDate.toLocaleDateString();
        } catch (error) {
            console.error("Error formatting timestamp:", error);
            return "";
        }
    };

    const handleSubmitPost = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        // Get form values
        const form = e.target as HTMLFormElement;
        const titleInput = form.querySelector('input[type="text"]') as HTMLInputElement;
        const messageInput = form.querySelector('textarea[name="postMessage"]') as HTMLTextAreaElement;
        
        if (!titleInput.value.trim() || !messageInput.value.trim()) {
            alert("Please fill in all fields");
            return;
        }
        
        try {
            // Generate a unique ID for the post
            const newPostRef = doc(collection(db, 'userConversation'));

            const userDocRef = doc(db, 'user', user.uid);
            const userSnap = await getDoc(userDocRef);
            
            if (!userSnap.exists()) {
                console.error("User document not found");
                return;
            }
            
            const userData = userSnap.data();
            
            // Create the post document
            await setDoc(newPostRef, {
                id: newPostRef.id,
                posterId: user.uid,
                postHeader: titleInput.value.trim(),
                postMessage: messageInput.value.trim(),
                posterUsername: userData.username || 'Anonymous',
                posterProfileImage: userData.profileImage || '',
                postTimestamp: Timestamp.now(),
                karma: [],
                comments: []
            });
            
            // Add the new post to our state
            // const newPost = {
            //     id: newPostRef.id,
            //     postHeader: titleInput.value.trim(),
            //     postMessage: messageInput.value.trim(),
            //     posterUsername: userData.username || 'Anonymous',
            //     posterProfileImage: userData.profileImage || '',
            //     postTimestamp: Timestamp.now(),
            //     karma: [],
            //     comments: []
            // };
            
            // setDiscussionPosts(prev => [newPost, ...prev]);
            
            // Close the create post modal
            setCreatePost(false);
            
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Failed to create post. Please try again.");
        }
    };

    // Formats number to k, m, b
    const formatNumber = (num: number) => {
        if (num < 1000) return num.toString();
        if (num < 1000000) return (num / 1000).toFixed(0) + 'k';
        if (num < 1000000000) return (num / 1000000).toFixed(0) + 'm';
        return (num / 1000000000).toFixed(0) + 'b';
    };

    // This does confirmCheckFriendOrNot then change the state buttons
    const confirmCheckFriendOrNot = async (postId: string) => {
        try {
            const postRef = doc(db, 'userConversation', postId);
            const postSnap = await getDoc(postRef);
            const postData = postSnap.data();

            const userDocRef = doc(db, 'user', postData?.posterId);
            const userSnap = await getDoc(userDocRef);

            if (userSnap.exists()) {

                const userData = userSnap.data();
                console.log(userData);

                let consider = [...(userData?.friends || []), ...(userData?.friendRequests || [])];

                if (consider.includes(user.uid) || postData?.posterId === user.uid) {
                    setIsConsidered(true);
                } else {
                    setIsConsidered(false);
                }
            }
        
        } catch (e) {

        }
    };

    // This handles the comments
    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
    
        if (!commentState.trim()) return;
    
        const commentToState = {
            comment: commentState,
            userId: user.uid,
            createdAt: new Date(),
            username: "",
            profileImage: "",
        };
    
        setCommentState("");
        console.log(commentState);
    
        try {
            const postRef = doc(db, 'userConversation', selectedPost?.id);
            const postSnap = await getDoc(postRef);
    
            const userRef = doc(db, 'user', user.uid);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();
    
            if (userData) {
                commentToState.username = userData.username;
                commentToState.profileImage = userData.profileImage;
            }
    
            if (postSnap.exists()) {
                await updateDoc(postRef, {
                    comments: arrayUnion(commentToState)
                });
    
                setComments(prev => [...prev, commentToState]);
                console.log(commentToState);
            }
        } catch (e) {
            console.error("Failed to add comment:", e);
            // Keep previous state on error
            setCommentState(prev => prev);
        }
    };    

    // This handles the friend request, assuming that the system can read if its already a friend.
    const handleFriendRequest = async (requestId: string) => {
        setIsConsidered(true);
        console.log(requestId);

        try {
            if (!requestId) {
                return;
            }
            if (!user || !user.uid) {
                return;
            }

            // Other user data
            const userDocRef = doc(db, "user", requestId);
            const userDoc = await getDoc(userDocRef);

            const currentUserDocRef = doc(db, "user", user.uid);
            const currentUser = await getDoc(currentUserDocRef);

            const userData = userDoc.data();
            const currentUserData = currentUser.data();
            const friendsList = userData?.friends || [];

            // Check if already friends
            if (friendsList.includes(user.uid)) {
                toast.info(
                    `You are already friends with ${userData?.username}.`
                );
                return;
            }

            // Check if already in pending requests
            if (currentUserData?.pendingRequests?.includes(userData?.id)) {
                toast.info(
                    `You have already sent a friend request to ${userData?.username}.`
                );
                return;
            }

            toast.success("Friend Request Sent to " + userData?.username);

            await updateDoc(userDocRef, {
                friendRequests: arrayUnion(user.uid),
            });

            await updateDoc(currentUserDocRef, {
                pendingRequests: arrayUnion(userData?.id),
            });
        } catch (error) {
            toast.error("Error sending friend request:");
            console.error("Error", error)
            setIsConsidered(false);
        }
    };

    return(
        <>
            <div className={styles.container}>
                <div className={styles.page}>
                    <div className={styles.pageContainer}>
                        <Header user={user}></Header>
                        {!selectedPost ? (
                            <>
                                <div className={styles.currentPostContainer}>
                                    <div className={styles.postHeader}>
                                        <div className={styles.headerContext}>Discussions</div>
                                        <button 
                                            className={styles.createButtonPost}
                                            onClick={() => setCreatePost(true)}
                                            >
                                                Create Post +
                                        </button>
                                    </div>
                                    <div className={styles.postSection} style={{height: !loading ? '' : '100%'}}>
                                        {loading ? (
                                            <div className={styles.loaderPlace}>
                                                <Loader />
                                            </div>
                                        ) : discussionPosts.length === 0 ? (
                                            <div className={styles.noPosts}>No discussions found. Start one by creating a post!</div>
                                        ) : (
                                            discussionPosts.map((post: any, index: number) => (
                                                <div key={post.id || index} className={styles.post} onClick={() => navigate(`/conversation?postId=${post.id}`)}>
                                                    <div className={styles.topContext}>
                                                        <div className={styles.posterDescription}>
                                                            <div className={styles.posterProfile} style={{backgroundImage: `url(${post.posterProfileImage})`}}></div>
                                                            <div className={styles.posterName}>{post.posterUsername}</div>   
                                                            <div className="" style={{fontWeight: 'bold'}}>·</div>
                                                            <div className={styles.posterTime}>{getRelativeTime(post.postTimestamp)}</div>
                                                        </div>
                                                        <div className={styles.posterButtons}>
                                                            <button className={styles.fireButton} style={{color: post.karma?.includes(user.uid) ? 'orangered' : ''}} onClick={(e) => {e.stopPropagation();handleGiveKarma(post.id);}}>
                                                                <i className="fa-solid fa-fire" style={{color: post.karma?.includes(user.uid) ? 'orangered' : ''}}></i>
                                                                {formatNumber(post.karma?.length || 0)}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className={styles.midContext}>
                                                        <div className={styles.left}>
                                                            <div className={styles.descriptionHeader}>{post.postHeader}</div>
                                                            <div className={styles.descriptionBody}>
                                                                {post.image && post.postMessage?.length > 100 
                                                                    ? post.postMessage.slice(0, 100) + '...' 
                                                                    : post.postMessage?.length > 170 
                                                                        ? post.postMessage.slice(0, 170) + '...' 
                                                                        : post.postMessage}
                                                            </div>
                                                            <div className={styles.descriptionFooter}>
                                                                <button className={styles.footerButton}>
                                                                    <i className="fa-regular fa-comment"></i> {post.comments?.length === 0 ? '' : post.comments?.length} {post.comments?.length === 1 ? 'Comment' : 'Comments'} 
                                                                </button>
                                                                <button className={styles.footerButton}>
                                                                    <i className="fa-solid fa-share-nodes"></i> Share
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => {e.stopPropagation();handleGiveKarma(post.id);}} 
                                                                    className={`${styles.footerButton} ${styles.anotherStyle}`}
                                                                >
                                                                    <i className={`fa-solid fa-fire ${post.karma?.includes(user?.uid) ? styles.active : ''}`}></i> 
                                                                    <p className={`${post.karma?.includes(user?.uid) ? styles.active : ''}`}>{post.karma?.includes(user?.uid) ? 'Karma Given' : 'Give Karma'}</p>
                                                                </button>
                                                            </div> 
                                                        </div>
                                                        <div className={styles.right}>
                                                            {post.image && <div className={styles.imagePreview} style={{backgroundImage: `url(${post.image})`}}></div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div> 
                            </>
                        ): (
                            <>
                                <div className={styles.currentPostContainer}>
                                    {selectedPost.imagePost ? 
                                        (
                                            <div className={styles.imageHeader}>
                                                
                                            </div>
                                        ) : (
                                            <div className={styles.noImage}>
                                                <img src={ufo} alt="UFO" />
                                                No image/s attached
                                            </div>
                                        )
                                    }
                                    <div className={styles.currentPost} style={selectedPost ? {} : {height: '100%'}} >
                                        { selectedPost ? (
                                            <>
                                                <div className={styles.leftSection}>
                                                    <div className={styles.headerPost}>
                                                        <div className={styles.headerText}>{selectedPost.postHeader}</div>
                                                        <div className={styles.headerKarmaDisplay}>
                                                            <i className="fa-solid fa-fire"></i>
                                                            {karmaLength}
                                                        </div>
                                                        
                                                    </div>
                                                    <div className={styles.bodyPost}>{selectedPost.postMessage}</div>
                                                    <div className={styles.commentSection}>
                                                        <div className={styles.commentHeader}>{comments.length || 0} {comments.length === 1 ? 'Comment' : 'Comments'}</div>
                                                        <form onSubmit={handleComment} className={styles.commentBox}>
                                                            <input type="text" name="comment" id="" placeholder='Write a comment...' value={commentState} onChange={(e) => setCommentState(e.target.value)}/>
                                                            <button type="submit">Comment</button>
                                                        </form>
                                                        <div className={styles.commentHolder}>
                                                            {comments.length > 0 && (
                                                                <>
                                                                    {comments.map((comment) => (
                                                                        <div key={comment.id} className={styles.commentCard}>
                                                                            <div className={styles.commentProfileDisplay} style={{backgroundImage: `url(${comment.profileImage})`}}></div>
                                                                            <div className={styles.commentDescription}>
                                                                                <div className={styles.commenterUsername}>{comment.username}</div>
                                                                                <div className={styles.commentDate}>
                                                                                {(comment.createdAt instanceof Date
                                                                                    ? comment.createdAt
                                                                                    : comment.createdAt.toDate()
                                                                                ).toLocaleDateString('en-US', {
                                                                                    year: 'numeric',
                                                                                    month: 'long',
                                                                                    day: 'numeric',
                                                                                })}
                                                                                </div>
                                                                                <div className={styles.commentDisplay}>{comment.comment}</div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={styles.rightSection}>
                                                    <div className={styles.profileDisplaySection}>
                                                        <div className={styles.profileImageDisplay} style={{backgroundImage: `url(${selectedPost.posterProfileImage})`}}></div>
                                                        <div className={styles.profileDescriptionDisplay}>
                                                            <div className={styles.profileUsernameDisplay}>@{selectedPost.posterUsername}</div>
                                                            <div className={styles.datePostedDisplay}>
                                                                {selectedPost.postTimestamp?.toDate().toLocaleDateString('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric',
                                                                })} at {selectedPost.postTimestamp?.toDate().toLocaleTimeString('en-US', {
                                                                    hour: 'numeric',
                                                                    minute: '2-digit',
                                                                    hour12: true,
                                                                })}
                                                            </div>
                                                            {/* if friend, self, or at least sent a request this should appear */}
                                                            {isConsidered ? (
                                                                <>
                                                                    <button className={styles.viewProfileButton} onClick={() => navigate(`/profile?id=${selectedPost.posterId}`)}>View Profile</button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button className={styles.addFriendButton} onClick={() => handleFriendRequest(selectedPost.posterId)}>Add Friend</button>
                                                                </>                                                            
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={styles.actionsSection}>
                                                        <button className={styles.actionButton} onClick={() => handleGiveKarma(selectedPost.id)}><i className="fa-solid fa-fire" style={karmaState ? {color: 'orangered'} : {}}></i></button>
                                                        <button className={styles.actionButton}><i className="fa-solid fa-share"></i></button>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* just reload the page, nothing special yet */}
                                                <div className={styles.displayMessageError} onClick={() => window.location.reload()}>
                                                    Error: Reload post <i className="fa-solid fa-rotate-right"></i>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                {createPost && 
                    <>
                        <div className={styles.createPost}>
                            <form onSubmit={handleSubmitPost} className={styles.createPostCard}>
                                <div className={styles.createPostHeader}>
                                    <button type="button" onClick={() => setCreatePost(false)} className={styles.goBackButton}><i className="fa-solid fa-arrow-left"></i></button>
                                    Create Post
                                </div>
                                <div className={styles.createPostBody}>
                                    <input type="text" placeholder='Title'/>
                                    <textarea name="postMessage" id="" placeholder='Write something...'></textarea>
                                </div>
                                <div className={styles.createPostFooter}>
                                    <button type="button" onClick={() => setCreatePost(false)} className={styles.footerButton} style={{background: "none", color: 'hsl(0, 0%, 5%)', fontWeight: 'bold'}}>Cancel</button>
                                    <button type="submit" className={styles.footerButton} style={{background: "#2cc6ff", color: 'hsl(0, 0%, 100%)'}}>Publish</button>
                                </div>
                            </form>
                        </div>
                    </>
                } 
            </div>
        </>
    );
}
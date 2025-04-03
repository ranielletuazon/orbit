import React, { useEffect, useState } from 'react';
import styles from './css/Conversation.module.css';
import { auth, db } from '../components/firebase/firebase';
import { doc, getDoc, collection, getDocs, setDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, Timestamp } from 'firebase/firestore';
import Loader from '../components/loader';

import Header from '../components/Header';

export default function Conversation({user}: {user: any}) {

    const [discussionPosts, setDiscussionPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [createPost, setCreatePost] = useState(false);

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
        
        try {
            const postRef = doc(db, 'userConversation', postId);
            const postDoc = await getDoc(postRef);
            
            if (postDoc.exists()) {
                const postData = postDoc.data();
                const karmaArray = postData.karma || [];
                
                if (karmaArray.includes(user.uid)) {
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
            const newPost = {
                id: newPostRef.id,
                postHeader: titleInput.value.trim(),
                postMessage: messageInput.value.trim(),
                posterUsername: userData.username || 'Anonymous',
                posterProfileImage: userData.profileImage || '',
                postTimestamp: Timestamp.now(),
                karma: [],
                comments: []
            };
            
            setDiscussionPosts(prev => [newPost, ...prev]);
            
            // Close the create post modal
            setCreatePost(false);
            
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Failed to create post. Please try again.");
        }
    }

    return(
        <>
            <div className={styles.container}>
                <div className={styles.page}>
                    <div className={styles.pageContainer}>
                        <Header user={user}></Header>
                        <button 
                            className={styles.createButtonPost}
                            onClick={() => setCreatePost(true)}
                            >
                                Create Post +
                        </button>
                        <div className={styles.postHolder}>
                            <div className={styles.postHeader}>
                                <div className={styles.headerContext}>Discussions</div>
                            </div>
                            <div className={styles.postSection}>
                                {loading ? (
                                    <div className={styles.loaderPlace}>
                                        <Loader />
                                    </div>
                                ) : discussionPosts.length === 0 ? (
                                    <div className={styles.noPosts}>No discussions found. Start one by creating a post!</div>
                                ) : (
                                    discussionPosts.map((post: any, index: number) => (
                                        <div key={post.id || index} className={styles.post}>
                                            <div className={styles.topContext}>
                                                <div className={styles.posterDescription}>
                                                    <div className={styles.posterProfile} style={{backgroundImage: `url(${post.posterProfileImage})`}}></div>
                                                    <div className={styles.posterName}>{post.posterUsername}</div>   
                                                    <div className={styles.posterTime}>{getRelativeTime(post.postTimestamp)}</div>
                                                </div>
                                                <div className={styles.posterButtons}>
                                                    <button className={styles.heartButton}>
                                                        <i className="fa-solid fa-fire"></i>
                                                        {post.karma?.length || 0}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className={styles.midContext}>
                                                <div className={styles.left}>
                                                    <div className={styles.descriptionHeader}>{post.postHeader}</div>
                                                    <div className={styles.descriptionBody}>
                                                        {post.image && post.postMessage?.length > 170 
                                                            ? post.postMessage.slice(0, 170) + '...' 
                                                            : post.postMessage}
                                                    </div>
                                                    <div className={styles.descriptionFooter}>
                                                        <button className={styles.footerButton}>
                                                            <i className="fa-regular fa-comment"></i> {post.comments?.length === 0 ? '' : post.comments?.length} Comments
                                                        </button>
                                                        <button className={styles.footerButton}>
                                                            <i className="fa-solid fa-share-nodes"></i> Share
                                                        </button>
                                                        <button 
                                                            onClick={() => handleGiveKarma(post.id)} 
                                                            className={styles.footerButton}
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
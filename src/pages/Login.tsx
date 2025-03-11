import styles from "./css/Login.module.css";
import logo from '../assets/orbitlogo.png';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner'; 
import { auth, db } from '../components/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login(){

    const navigate = useNavigate();

    // if (auth.currentUser) {
    //     navigate('/space');
    // }

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false); 

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
    
        setLoading((prev) => !prev);
        console.log('Button pressed');
    
        let loginMessage = 'Logging in...';
    
        toast.promise(
            (async () => {
                try {
                    // Attempt to sign in
                    const userCredential = await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );
                    const user = userCredential.user;
                    console.log("Hello", user);

                    // Check if user is banned
                    const avoidDocRef = doc(db, "users", user.uid);
                    const bannedSnap = await getDoc(avoidDocRef);
                    if (bannedSnap.exists()) {
                        await auth.signOut();
                        setLoading(false);
                        throw new Error(
                            "Your account is disabled. Contact the admin for more information."
                        );
                    }

                    // Fetch user data
                    const userDocRef = doc(db, "user", user.uid);
                    const docSnap = await getDoc(userDocRef);

                    if (!docSnap.exists()) {
                        setLoading(false);
                        throw new Error(
                            "User data not found! Account is probably deleted, contact support."
                        );
                    }

                    // Handle successful login
                    const userData = docSnap.data();
                    const loginMessage = "Logged in successfully!";

                    if (!userData?.emailConsent) {
                        setTimeout(() => navigate("/setup"), 1000);
                    } else {
                        setTimeout(() => navigate("/space"), 1000);
                    }

                    setTimeout(
                        () => toast(`Welcome, ${userData?.username}`),
                        3000
                    );
                    return loginMessage;
                } catch (error: any) {
                    setLoading(false);

                    // Make sure all error conditions throw errors for toast.promise to catch
                    const errorCode: string = error.code;
                    let errorMessage;

                    if (errorCode === "auth/too-many-requests") {
                        errorMessage =
                            "Too many login attempts. Please try again later.";
                    } else if (errorCode === "auth/invalid-credential") {
                        errorMessage =
                            "Invalid credentials. Incorrect email or password.";
                    } else if (
                        errorCode ===
                        "auth/the-service-is-currently-unavailable."
                    ) {
                        errorMessage =
                            "The service is currently unavailable. Please try again later.";
                    } else if (error.message) {
                        // Use the error message if it exists (from our custom errors)
                        errorMessage = error.message;
                    } else {
                        errorMessage = "An unexpected error occurred.";
                    }

                    throw new Error(errorMessage);
                }
            })(),
            {
                loading: "Logging in...",
                success: (message) => message,
                error: (error) => error.message || error,
            }
        );
    };

    return(
        <>
            <div className={styles.container}>
                <div className={styles.page}>
                    <div className={styles.header}>
                        <img src={logo} alt="Orbit Logo" className={styles.logo}/>
                    </div>
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.headerTitle}>WELCOME BACK!</div>
                            <div className={styles.message}>Best of luck to your games!</div>
                        </div>
                        <form onSubmit={handleSubmit} className={styles.cardInput}>
                            <label className={styles.emailInput}>Email</label>
                            <input type="email" className={styles.emailBox} value={email} required placeholder="Enter your email" onChange={(e) => setEmail(e.target.value)}/>

                            <label className={styles.passwordInput}>Password</label>
                            <input type="password" className={styles.passwordBox} value={password} required placeholder="Enter your password" onChange={(e) => setPassword(e.target.value)}/>

                            <button className={styles.submit} type="submit" disabled={loading}>Login</button>
                        </form>
                        <Link to="/register" className={styles.register}>
                            Need an account? <span style={{ color: '#2cc6ff' }}>REGISTER</span>
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
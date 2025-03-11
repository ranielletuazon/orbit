import styles from "./css/Register.module.css";
import logo from '../assets/orbitlogo.png';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth, db } from '../components/firebase/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getDatabase, ref, set } from "firebase/database";
import { toast } from "sonner";

export default function Register(){

    const navigate = useNavigate(); 

    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [userError, setUserError] = useState('');
    const [passError, setPassError] = useState('');

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
    
        // Reset errors
        setEmailError('');
        setUserError('');
        setPassError('');
    
        // Validation checks
        if (username.trim().length < 5) {
            setUserError('Username must be at least 5 characters.');
            setLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            setPassError('Passwords do not match.');
            setLoading(false);
            return;
        }
        if (password.length < 6) {
            setPassError('Password must be at least 6 characters.');
            setLoading(false);
            return;
        }
        if (!email.endsWith('.com')) {
            setEmailError('Email must be a valid .com email.');
            setLoading(false);
            return;
        }
    
        // Proceed with account creation
        toast.promise(
            new Promise<void>(async (resolve, reject) => {
                try {
                    const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
                    const user = userCredentials.user;
    
                    await setDoc(doc(db, 'user', user.uid), {
                        username,
                        id: user.uid,
                    });

                    // Realtime Database Setup
                    const realtimeDb = getDatabase();
                    const rdbUserRef = ref(realtimeDb, `users/${user.uid}`)

                    await set(rdbUserRef, {
                        id: user.uid,
                        username: username,
                        email: email,
                        status: "online",
                    });
                    
                    resolve();
                } catch (err) {
                    const error = err as { code?: string };
                    console.error(error.code);
    
                    // Handle specific error codes
                    switch (error.code) {
                        case "auth/email-already-in-use":
                            reject('Email already in use!');
                            break;
                        case "auth/weak-password":
                            reject('Password must be at least 6 characters!');
                            break;
                        case "auth/invalid-email":
                            reject('Invalid email, please enter a valid email!');
                            break;
                        default:
                            reject('An unexpected error occurred');
                    }
                }
            }).finally(() => {
                setUsername('');
                setPassword('');
                setConfirmPassword('');
                setEmail('');
            }),
            {
                loading: 'Creating account...',
                success: () => {
                    setLoading(false);
                    setTimeout(() => navigate('/setup'), 1000);
                    return 'Account created successfully';
                },
                error: (errorMessage) => {
                    setLoading(false);
                    return errorMessage;
                },
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
                            <div className={styles.headerTitle}>CREATE AN ACCOUNT</div>
                        </div>
                        <form onSubmit={handleSubmit} className={styles.cardInput}>
                            <label className={styles.emailInput} style={{ color: emailError ? '#e36f74' : 'inherit' }}>Email Address {emailError && ` - ${emailError}`}</label>
                            <input type="email" className={styles.emailBox} value={email} required placeholder="Enter your email" onChange={(e) => setEmail(e.target.value)}/>

                            <label className={styles.passwordInput} style={{ color: userError ? '#e36f74' : 'inherit' }}>Username {userError && ` - ${userError}`}</label>
                            <input type="text" className={styles.passwordBox} value={username} required placeholder="Enter your username" pattern="[a-zA-Z0-9]+" onChange={(e) => setUsername(e.target.value)}/>

                            <label className={styles.emailInput} style={{ color: passError ? '#e36f74' : 'inherit' }}>Password {passError && ` - ${passError}`}</label>
                            <input type="password" className={styles.emailBox} value={password} required placeholder="Enter your password" onChange={(e) => setPassword(e.target.value)}/>

                            <label className={styles.emailInput} style={{ color: passError ? '#e36f74' : 'inherit' }}>Confirm Password {passError && ` - ${passError}`}</label>
                            <input type="password" className={styles.emailBox} value={confirmPassword} required placeholder="Re-enter password" onChange={(e) => setConfirmPassword(e.target.value)}/>

                            <button className={styles.submit} disabled={loading}>Create Account</button>
                        </form>
                        <Link to="/login" className={styles.login}>
                            Already have an account? <span style={{ color: '#2cc6ff' }}>LOGIN</span>
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
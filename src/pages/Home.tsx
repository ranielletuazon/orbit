import styles from "./css/Home.module.css";
import logo from '../assets/orbitlogo.png';
import { Link, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { auth } from "../components/firebase/firebase";

export default function Home({user}: {user: any}) {

    const navigate = useNavigate();

    const handleLogin = () => {
        if (user) {
            navigate('/space');
        } else {
            navigate('/login');
        }
    }

    return(
        <>
            <div className={styles.container}>
                <div className={styles.page}>
                    <div className={styles.header}>
                        <img src={logo} alt="Orbit Logo" className={styles.logo}/>
                        <button onClick={handleLogin} className={styles.loginButton}>Login</button>
                    </div>
                    <div className={styles.content}>
                        <div className={styles.contentHead}>EXPLORE AND FIND YOUR IDEAL TEAM</div>
                        <div className={styles.contentBody}>Orbit will help you find your preferred team-mate, friend, and community to achieve your best expectation in your game. Comes with own space to chat, chill and hang-out.</div>
                    </div>
                </div>
            </div>
        </>
    );
}
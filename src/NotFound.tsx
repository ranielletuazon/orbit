import styles from "./pages/css/NotFound.module.css";
import Header from './components/Header';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import notFound from './assets/planet.png';

export default function NotFound({user}: {user: any}) {

    const navigate = useNavigate();
    const handleGoBack = () => {
        if (user) {
            navigate("/space");
        } else {
            navigate('/');
        }
    }

    return(
        <>
            <div className={styles.container}>
                <div className={styles.page}>
                    <div className={styles.pageContainer}>
                        {user && <Header user={user} />}
                        <div className={styles.notFound}>
                            {/* Fix style soon for image notFound */}
                            <img src={notFound} alt="" />
                            <div className={styles.body}>404 - PAGE NOT FOUND</div>
                            <div className={styles.footer}>The page your are looking for might have been removed, had its name changed or is temporarily unavailable.</div>
                            <button onClick={handleGoBack}>BACK TO HOMEPAGE</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
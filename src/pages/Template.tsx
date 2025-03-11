import styles from "./css/Template.module.css";
import Header from '../components/Header';

export default function Template({user}: {user: any}) {
    return(
        <>
            <div className={styles.container}>
                <div className={styles.page}>
                    <div className={styles.pageContainer}>
                        <Header user={null} />
                    </div>
                </div>
            </div>
        </>
    );
};
import React, { useEffect, useState } from "react";
import { auth, db, storage } from "../components/firebase/firebase";
import { doc, setDoc, getDocs, collection, updateDoc } from "firebase/firestore";
import { ref as storageRef, getDownloadURL, uploadBytes } from "firebase/storage";
import styles from "../pages/css/AccountSetup.module.css";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import eula from "../assets/eula.jpg";
import { useTheme } from "@mui/material/styles";
import MobileStepper from "@mui/material/MobileStepper";
import Button from "@mui/material/Button";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import plus from "../assets/plus.svg"
import { set, ref, getDatabase, onDisconnect, serverTimestamp, update} from "firebase/database";
import { Update } from "@mui/icons-material";

interface AccountSetupProps {
    user: any;
    currentUser: any;
}

interface Game {
    id: string;
    title: string;
    image: string;
}

interface GenreObject {
    genre: string;
    name: string;
    icon: string;
}

interface PlatformObject {
    platform: string;
    name: string;
    icon: string;
}

export default function AccountSetup({ user, currentUser }: AccountSetupProps) {

    // Check if user is already done with account setup and also load data on mount
    useEffect(() => {
        if (currentUser?.emailConsent) {
            navigate("/space");
        }
    });

    const genres: GenreObject[] = [
        {
            genre: "fps",
            name: "FPS",
            icon: "fa-person-rifle",
        },
        {
            genre: "survival",
            name: "Survival",
            icon: "fa-khanda",
        },
        {
            genre: "rpg",
            name: "RPG",
            icon: "fa-hat-wizard",
        },
        {
            genre: "casual",
            name: "Casual",
            icon: "fa-heart",
        },
        {
            genre: "strategy",
            name: "Strategy",
            icon: "fa-chess-knight",
        },
        {
            genre: "moba",
            name: "MOBA",
            icon: "fa-dragon",
        },
    ];

    const platforms: PlatformObject[] = [
        {
            platform: "pc",
            name: "Desktop",
            icon: "fa-desktop",
        },
        {
            platform: "playstation",
            name: "PlayStation",
            icon: "fa-playstation",
        },
        {
            platform: "xbox",
            name: "Xbox",
            icon: "fa-xbox",
        },
        {
            platform: "mobile",
            name: "Mobile",
            icon: "fa-mobile",
        },
        {
            platform: "nintendo",
            name: "Nintendo",
            icon: "fa-gamepad",
        },
    ];

    const navigate = useNavigate();
    const theme = useTheme();
    const [activeStep, setActiveStep] = useState(0);
    const [agree, setAgreed] = useState(false);
    const [access, setAccess] = useState(false);
    const [finish, setFinish] = useState(false);
    const [headerText, setHeaderText] = useState("");
    const [gameLoader, setGameLoader] = useState(true);
    const [allGames, setAllGames] = useState<Game[]>([]);
    const [selectedGames, setSelectedGames] = useState<string[]>([]);
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [image, setImage] = useState<string | null>(null);
    const [imageUpload, setImageUpload] = useState<string | null>(null);
    const [usernameEdit, setUsernameEdit] = useState(true);
    const [username, setUsername] = useState("");
    const [gender, setGender] = useState<string>("");
    const [birthdate, setBirthdate] = useState<string>("");

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0];

        if (!file) return;
    
        const fileSize = file.size / (1024 * 1024); 
        if (fileSize > 2.1) {
            toast.error("File size must be less than 2MB. Please try again.");
            return;
        }
    
        const reader = new FileReader();
        reader.onloadend = () => {
            setImage(reader.result as string); 
            console.log(image);
        };
        reader.readAsDataURL(file);
    
        const storageUrl = storageRef(storage, `profileImages/${user.uid}`); 
    
        try {    
            await uploadBytes(storageUrl, file);
            const downloadURL = await getDownloadURL(storageUrl);
            setImageUpload(downloadURL); 
    
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload image. Please try again.");
        } finally {
        }
    };

    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    useEffect(() => {
        const fetchGames = async (): Promise<void> => {
            try {
                const gameCollection = collection(db, "onlineGames");
                const gameSnapshot = await getDocs(gameCollection);
                const gameList: Game[] = gameSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    title: doc.data().gameTitle as string,
                    image: doc.data().gameImage as string,
                }));

                setAllGames(
                    gameList.sort((a, b) => a.title.localeCompare(b.title))
                );
            } catch (error) {
                toast.error("Failed to fetch games. Please try again.");
                console.error("Error fetching games:", error);
            } finally {
                setGameLoader(false);
            }
        };

        fetchGames();
    }, []);

    const handleGameSelect = (gameId: string) => {
        if (selectedGames.includes(gameId)) {
            setSelectedGames(selectedGames.filter((id) => id !== gameId));
        } else {
            setSelectedGames([...selectedGames, gameId]);
        }
    };

    const handleGenreSelect = (genreId: string) => {
        if (selectedGenres.includes(genreId)) {
            setSelectedGenres(selectedGenres.filter((id) => id !== genreId));
        } else {
            setSelectedGenres([...selectedGenres, genreId]);
        }
    };

    const handlePlatformSelect = (platformId: string) => {
        if (selectedPlatforms.includes(platformId)) {
            setSelectedPlatforms(
                selectedPlatforms.filter((id) => id !== platformId)
            );
        } else {
            setSelectedPlatforms([...selectedPlatforms, platformId]);
        }
    };

    useEffect(() => {
        console.log(birthdate);
    }, [birthdate]);

    useEffect(() => {
        // Survey Monitor
        switch (activeStep) {
            case 0:
                setAccess(agree)
                break;
            case 1:
                setAccess(selectedGames.length > 0);
                break;
            case 2:
                setAccess(selectedGenres.length > 0);
                break;
            case 3:
                setAccess(selectedPlatforms.length > 0);
                break;
        }
    });

    useEffect(() => {
        // Set Header Text whenever page changes
        switch (activeStep) {
            case 0:
                setHeaderText("EULA");
                break;
            case 1:
                setHeaderText("Games");
                break;
            case 2:
                setHeaderText("Genres");
                break;
            case 3:
                setHeaderText("Platform");
                break;
            case 4:
                setHeaderText("Additional Information");
                break;
            default:
                setHeaderText("");
                break;
        }
    }, [activeStep]);

    // Initialize the username on mount
    useEffect(() => {
        try {
            if (currentUser) {
                setUsername(currentUser.username);
            } 
        } catch (error: any){
            toast.error("Failed to fetch username. Please try again.");
        }
    }, [])

    const editUsername = async () => {
        if (username === currentUser?.username) {
            setUsernameEdit(true);
            return;
        }

        try {
            const validUsername = /^[a-zA-Z0-9]+$/

            if (username === "" || validUsername.test(username) === false) {
                toast.error("Invalid username. Please try again.");
            } else {
                const userDocRef = doc(db, "user", user.uid);
                await updateDoc(userDocRef, {
                    username: username,
                });
                setUsernameEdit(true);
            }
        } catch {
            toast.error("Failed to update username. Please try again.");
        }
    }

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsername(e.target.value);
    }

    const handleBirthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBirthdate(e.target.value);
    }

    const handleFinish = async () => {
        const userDocRef = doc(db, 'user', user.uid);
        const realtimeDb = getDatabase();
        const rdbUserRef = ref(realtimeDb, `users/${user.uid}`);
        setFinish(true);
    
        try {
            toast.promise(
                Promise.all([
                    setDoc(userDocRef, {
                        emailConsent: true,
                        birthdate,
                        gender,
                        selectedGames,
                        userPlatforms: selectedPlatforms,
                        userGenres: selectedGenres,
                        profileImage: imageUpload,
                    }, { merge: true }),
                    update(rdbUserRef, {
                        profileImage: imageUpload,
                    })
                ]),
                {
                    loading: 'Saving data...',
                    success: 'Account setup successfully!',
                    error: 'An error occurred. Please try again!',
                }
            );
    
            // Navigate after saving is successful
            await Promise.all([
                setDoc(userDocRef, { /* Firestore data */ }, { merge: true }),
                update(rdbUserRef, { /* Realtime DB data */ })
            ]);
    
            setTimeout(() => {
                navigate('/space');
                setFinish(false);
            }, 1000);
        } catch (error) {
            console.error('Error updating user data:', error);
            setFinish(false); // Reset finish state if there's an error
        }
    };
    
    
    

    return (
        <>
            <div className={styles.container}>
                <div className={styles.page}>
                    <div className={styles.card}>
                        <div className={styles.headerText}>{headerText}</div>
                        {activeStep == 0 ? (
                            <div className={styles.contentCard}>
                                <img
                                    src={eula}
                                    alt="EULA Image"
                                    className={styles.eula}
                                />
                                <div className={styles.contentCardArea}>
                                    <div className={styles.contentCardText}>
                                        Agree to the following terms to keep
                                        Orbit from running free! We are
                                        committed to protecting your privacy and
                                        ensuring that your inputted data is
                                        handled securely and responsibly.
                                    </div>
                                    <div className={styles.checkBox}>
                                        <input
                                            type="checkbox"
                                            id="agree"
                                            className={styles.checkbox}
                                            checked={agree}
                                            onChange={(e) =>
                                                setAgreed(e.target.checked)
                                            }
                                        />
                                        <label
                                            htmlFor="agree"
                                            className={styles.label}
                                        >
                                            I am 18+ of age and I agree to the
                                            terms
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ) : activeStep == 1 ? (
                            <div className={styles.contentGames}>
                                {gameLoader ? (
                                    <div className={styles.selectionBox}></div>
                                ) : (
                                    <>
                                        {allGames.map((game, index) => (
                                            <div
                                                className={`${
                                                    styles.selectionBox
                                                } ${
                                                    selectedGames.includes(
                                                        game.id
                                                    )
                                                        ? styles.selected
                                                        : ""
                                                }`}
                                                key={index}
                                                style={{
                                                    backgroundImage: `url(${game.image})`,
                                                }}
                                                onClick={() =>
                                                    handleGameSelect(game.id)
                                                }
                                            >
                                                <div
                                                    className={`${
                                                        styles.gameInfo
                                                    } ${
                                                        selectedGames.includes(
                                                            game.id
                                                        )
                                                            ? styles.selected
                                                            : ""
                                                    }`}
                                                >
                                                    {game.title}
                                                </div>
                                                <div
                                                    className={`${
                                                        styles.circle
                                                    } ${
                                                        selectedGames.includes(
                                                            game.id
                                                        )
                                                            ? styles.visible
                                                            : ""
                                                    }`}
                                                >
                                                    <div
                                                        className={
                                                            styles.iconCheck
                                                        }
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        ) : activeStep == 2 ? (
                            <>
                                <div className={styles.selectionGenre}>
                                    {genres.map((genre, index) => (
                                        <div
                                            className={`${styles.genreBox} ${
                                                selectedGenres.includes(
                                                    genre.genre
                                                )
                                                    ? styles.selected
                                                    : ""
                                            }`}
                                            key={index}
                                            onClick={() =>
                                                handleGenreSelect(genre.genre)
                                            }
                                        >
                                            <i
                                                className={`fa-solid ${genre.icon}`}
                                            ></i>
                                            <div className={styles.genreInfo}>
                                                {genre.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : activeStep == 3 ? (
                            <>
                                <div className={styles.selectionPlatform}>
                                    {platforms.map((platform, index) => (
                                        <div
                                            className={`${styles.platformBox} ${
                                                selectedPlatforms.includes(
                                                    platform.platform
                                                )
                                                    ? styles.selected
                                                    : ""
                                            }`}
                                            key={index}
                                            onClick={() =>
                                                handlePlatformSelect(
                                                    platform.platform
                                                )
                                            }
                                        >
                                            <i
                                                className={`fa-${
                                                    platform.icon ===
                                                        "fa-playstation" ||
                                                    platform.icon === "fa-xbox"
                                                        ? "brands"
                                                        : "solid"
                                                } ${platform.icon}`}
                                            ></i>
                                            <div
                                                className={styles.platformInfo}
                                            >
                                                {platform.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : activeStep == 4 ? (
                            <>
                                <div className={styles.additional}>
                                    <div className={styles.profileImageSection}>
                                        {image && <button className={styles.removeButton} onClick={() => setImage('')}>Remove</button>}
                                        <div
                                            className={styles.profileImageInput}
                                            style={{
                                                backgroundImage: image
                                                    ? `url(${image})`
                                                    : "none",
                                                backgroundPosition: "center",
                                                backgroundSize: "cover",
                                                boxShadow: image ? "0 0 10px rgba(255, 255, 255, 0.5)" : "none",
                                            }}
                                            onClick={() =>
                                                document
                                                    .getElementById("fileInput")
                                                    ?.click()
                                            }
                                        >
                                            { !image && <img src={plus} alt="Plus Icon" className="plus" width={"50px"} style={{ filter: "invert(50%)" }}/> }
                                            <i className="fa-solid fa-image"></i>
                                        </div>
                                        <input
                                            type="file"
                                            id="fileInput"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={handleImageUpload}
                                        />
                                    </div>
                                    <div className={styles.accountForm}>
                                            <label>Username</label>
                                            <div className={styles.inputForm}>
                                                <input className={styles.usernameInput} type="text" value={username} disabled={usernameEdit} onChange={handleUsernameChange} pattern="^[a-zA-Z0-9]+$" minLength={6} maxLength={24}/>
                                                { usernameEdit ? <button onClick={() => setUsernameEdit(false)}>Edit</button> : <button onClick={editUsername}>Save</button> }
                                            </div>
                                    </div>
                                    <div className={styles.birthForm}>
                                        <label>Birth Date</label>
                                        <div className={styles.birthInputForm}>
                                            <input type="date" id="birthdate" name="birthdate" value={birthdate} className={styles.birthInput} onChange={handleBirthChange}/>
                                        </div>
                                    </div>
                                    <div className={styles.genderTab}>
                                        <div className={`${styles.male} ${gender === "male" ? styles.selected : ""}`} onClick={() => setGender("male")}><i className="fa-solid fa-mars"></i></div>
                                        <div className={`${styles.female} ${gender === "female" ? styles.selected : ""}`} onClick={() => setGender("female")}><i className="fa-solid fa-venus"></i></div>
                                        <div className={`${styles.others} ${gender === "others" ? styles.selected : ""}`} onClick={() => setGender("others")}><i className="fa-solid fa-venus-mars"></i></div>
                                    </div>
                                    
                                    <div className={styles.lastSection}>
                                        <button className={styles.finish} disabled={!(image && username && birthdate && gender && !finish)} onClick={handleFinish}>Finish</button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>404</>
                        )}
                        <div className={styles.bottomSection}>
                            <MobileStepper
                                variant="progress"
                                steps={5}
                                position="static"
                                activeStep={activeStep}
                                sx={{
                                    maxWidth: "auto",
                                    flexGrow: 1,
                                    backgroundColor: "#4d4c4c",
                                    color: "white",
                                }}
                                nextButton={
                                    <Button
                                        size="small"
                                        onClick={handleNext}
                                        disabled={activeStep === 4 || !access}
                                        sx={{ color: "white" }}
                                    >
                                        Next
                                        {theme.direction === "rtl" ? (
                                            <KeyboardArrowLeft />
                                        ) : (
                                            <KeyboardArrowRight />
                                        )}
                                    </Button>
                                }
                                backButton={
                                    <Button
                                        size="small"
                                        onClick={handleBack}
                                        disabled={activeStep === 0}
                                        sx={{ color: "white" }}
                                    >
                                        {theme.direction === "rtl" ? (
                                            <KeyboardArrowRight />
                                        ) : (
                                            <KeyboardArrowLeft />
                                        )}
                                        Back
                                    </Button>
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

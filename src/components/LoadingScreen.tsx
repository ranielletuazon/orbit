import orbit from '../assets/orbit.png';
import './loading.css';

export default function LoadingScreen() {
    return(
        <div className="container">
            <img src={orbit} alt="Orbit" className="orbit"/>
        </div>
    );
}
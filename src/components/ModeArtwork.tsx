import sam from '../assets/crew/sam.webp';
import fox from '../assets/crew/fox.webp';
import bear from '../assets/crew/bear.webp';
import bunny from '../assets/crew/bunny.webp';
import '../styles/game-modes.css';
const portraits = [sam, fox, bear, bunny];
/** Approved decorative artwork only; mode availability belongs to the existing flow. */
export function ModeArtwork({ index }: { index: number }) {
  return (
    <div className={`mode-artwork mode-artwork-${index}`} aria-hidden="true">
      <span className="mode-orbit" />
      <span className="mode-star mode-star-one">✦</span>
      <span className="mode-star mode-star-two">✧</span>
      <img src={portraits[index]} alt="" width="360" height="400" draggable="false" />
      <span className="mode-system-icon">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {index === 0 ? <><path d="M11 21c0-4-5-5-5-11a10 10 0 0 1 20 0c0 6-5 7-5 11Z" /><path d="M12 26h8m-7 4h6M16 2v-2" /></>
            : index === 1 ? <><circle cx="16" cy="16" r="13" /><path d="m22 9-4 10-9 4 4-10Z" /></>
            : index === 2 ? <><path d="m19 2-13 17h10l-3 11 13-18H16Z" /></>
            : <><path d="M16 21v9m-6 0h12M7 21a13 13 0 0 1 0-19m18 0a13 13 0 0 1 0 19M11 17a7 7 0 0 1 0-11m10 0a7 7 0 0 1 0 11" /><circle cx="16" cy="12" r="3" /></>}
        </svg>
      </span>
    </div>
  );
}
export function ModeLock() {
  return <svg className="mode-lock" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="4" y="9" width="12" height="9" rx="2" /><path d="M6 9V6a4 4 0 0 1 8 0v3" /></svg>;
}

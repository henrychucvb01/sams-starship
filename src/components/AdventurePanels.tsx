import panelsArt from '../assets/game-modes/four-panels.webp';

// Trace only the approved panel silhouettes. The original illustration stays intact.
const shapes = [
 'M226 137 H550 Q590 137 578 177 L412 730 Q401 767 368 767 H31 Q-9 767 3 727 L173 181 Q186 137 226 137 Z',
 'M656 137 H958 Q995 137 985 175 L836 731 Q827 767 791 767 H463 Q421 767 432 727 L591 181 Q604 137 656 137 Z',
 'M1060 137 H1392 Q1432 137 1421 177 L1275 731 Q1265 767 1229 767 H878 Q834 767 847 727 L997 181 Q1009 137 1060 137 Z',
 'M1506 137 H1833 Q1876 137 1864 177 L1756 731 Q1749 767 1712 767 H1336 Q1293 767 1305 727 L1447 181 Q1460 137 1506 137 Z',
];
const bounds = ['0 130 590 645', '420 130 580 645', '850 130 590 645', '1295 130 575 645'];
export function AdventurePanels({ index }: { index?: number }) {
 const id = index === undefined ? 'all-adventure-panels' : `adventure-panel-${index}`;
 const indices = index === undefined ? [0, 1, 2, 3] : [index];
 return <svg className={index === undefined ? 'combined-panels' : 'individual-panel-art'} viewBox={index === undefined ? '0 0 1870 841' : bounds[index]} aria-hidden="true" focusable="false">
  <defs><linearGradient id={`${id}-cover`} gradientUnits="userSpaceOnUse" x1="0" y1="455" x2="0" y2="767">
   <stop offset="0" stopColor="#111636" stopOpacity="0"/><stop offset="0.3" stopColor="#111636" stopOpacity="0.83"/><stop offset="1" stopColor="#111636" stopOpacity="0.95"/>
  </linearGradient>{indices.map(i => <g key={i}><clipPath id={`${id}-${i}`}><path d={shapes[i]}/></clipPath><mask id={`${id}-inside-${i}`} maskUnits="userSpaceOnUse" x="0" y="0" width="1870" height="841"><path d={shapes[i]} fill="white" stroke="black" strokeWidth="32"/></mask></g>)}</defs>
  {indices.map(i => <g key={i} className={`panel-light mode-light-${i}`}>
   <image href={panelsArt} width="1870" height="841" clipPath={`url(#${id}-${i})`}/>
   <path d={shapes[i]} fill={`url(#${id}-cover)`} mask={`url(#${id}-inside-${i})`}/>
  </g>)}
 </svg>;
}

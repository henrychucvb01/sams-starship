import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { MissionView } from '../types/presentation';
import '../styles/gameplay-art.css';
import frame from '../assets/gameplay/portrait-frame.webp';
import shipArt from '../assets/title/approved-ship.webp';
import captainBadge from '../assets/gameplay/captain-badge.webp';
type Effect=NonNullable<MissionView['effects']>[number];
export const CrewReactionContext=createContext<{effect?:Effect|null;captain?:string;status?:string}>({});
const lines:Record<string,string[]>={success:['Woohoo! Nice connection!','We got it!','That was smooth!'],damage:['Oh no!','The ship can take it!'],critical:['Emergency! Stay together!'],power:['Twin Signal, coming through!'],scan:['Scanning the circuit…'],dual:['Two signals, one crew!'],shield:['Shield online!'],blocked:['Shield held!'],hint:['I found a clue!'],isolate:['Overload isolated!']};
export function CrewCommunication({portrait,id,name}: {portrait:ReactNode;id:string;name:string}) {
 const {effect,captain,status}=useContext(CrewReactionContext);
 const [message,setMessage]=useState('');
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{if(!effect||effect.participant&&effect.participant!==id)return;
  const choices=lines[effect.kind];if(!choices)return;setMessage(choices[(Math.abs(effect.id)+id.length+id.charCodeAt(0))%choices.length]);
  clearTimeout(timer.current);timer.current=setTimeout(()=>setMessage(''),3200);
 },[effect?.id,id]);
 useEffect(()=>{if(status==='won'||status==='lost')setMessage(status==='won'?'We saved the ship!':'We’ll bring her home next time.');},[status]);
 useEffect(()=>{if(captain===id){setMessage('Captain on deck!');const t=setTimeout(()=>setMessage(''),2800);return()=>clearTimeout(t);}},[captain,id]);
 return <div className={`crew-communication ${message?'speaking':''}`}>
  <div className="communication-portrait"><img className="portrait-frame-art" src={frame} alt=""/>{portrait}</div>
  <div className="crew-message-panel" aria-live="polite"><span>{message&&`${name}: ${message}`}</span></div>
 </div>;
}
export function CaptainArt(){return <img className="captain-art" src={captainBadge} alt=""/>;}

export function StatusShip({condition}: {condition: string}) { return <img className={`status-ship-art ${condition}`} src={shipArt} alt={`Spaceship condition: ${condition}`} />; }

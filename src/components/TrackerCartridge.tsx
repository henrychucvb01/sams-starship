import type { CSSProperties } from "react";
import blue from "../assets/gameplay/tracker-blue.webp";
import green from "../assets/gameplay/tracker-green.webp";
import yellow from "../assets/gameplay/tracker-yellow.webp";
import red from "../assets/gameplay/tracker-red.webp";
export const trackerArtwork = {blue,green,yellow,red};
const geometry = {
 blue:{ratio:320/359,center:51.2,top:88.4,bottom:98.1,slots:[[32.6,39.4],[41.8,48.7],[50.9,57.8],[60.2,67]]},
 green:{ratio:320/398,center:54.9,top:88.0,bottom:97.7,slots:[[32.3,39.7],[41.2,49],[50.3,58],[59.5,67.3]]},
 yellow:{ratio:320/346,center:51.6,top:88.4,bottom:98.2,slots:[[31.5,38.8],[40.8,48.1],[50.1,57.5],[59.5,66.9]]},
 red:{ratio:320/349,center:52.5,top:87.5,bottom:97,slots:[[31.6,38.9],[41,48.1],[50.2,57.7],[59.7,66.9]]},
};
/** One original illustrated lamp is revealed per authoritative restored copy. */
export function TrackerCartridge({number,resolved,total,complete}:{number:number;resolved:number;total:number;complete:boolean}) {
 const kind=complete?'green':'blue',art=trackerArtwork[kind],g=geometry[kind];
 return <div className={`tracker-cartridge tracker-${kind}`} style={{'--tracker-art':`url("${art}")`,'--tracker-ratio':g.ratio,'--number-y':`${g.center}%`} as CSSProperties}>
  <img className="tracker-body-art" src={art} alt="" draggable={false}/>
  <img className="tracker-unlit-bank" src={art} alt="" draggable={false}/>
  <strong>{number}<span className="tracker-complete-label">{complete?'✓':''}</span></strong>
  <div className="copy-pips" aria-hidden="true">
   {Array.from({length:total},(_,i)=>{
    const [left,right]=g.slots[i]??g.slots[3],width=right-left,height=g.bottom-g.top;
    return <i key={i} className={i<resolved?'pip-cleared':''} data-lamp={i+1} style={{left:`${left}%`,top:`${g.top}%`,width:`${width}%`,height:`${height}%`}}>
     <img src={art} alt="" draggable={false} style={{width:`${10000/width}%`,height:`${10000/height}%`,left:`${-left/width*100}%`,top:`${-g.top/height*100}%`}}/>
    </i>;
   })}
  </div>
 </div>;
}

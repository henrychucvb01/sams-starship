import { useEffect, useId, useRef, type ReactNode } from 'react';
/** Required setup is a native modal; only an accepted engine command removes it. */
export function SetupPopup({children}: {children: ReactNode}) {
 const ref=useRef<HTMLDialogElement>(null), id=useId();
 useEffect(()=>{
  const node=ref.current!, previous=document.activeElement as HTMLElement|null;
  node.showModal();node.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
  return ()=>{node.close();if(previous?.isConnected)previous.focus();};
 },[]);
 return <dialog ref={ref} className="setup-dialog" aria-labelledby={id} onCancel={e=>e.preventDefault()} onKeyDown={e=>{
   if(e.key!=="Tab")return;
   const buttons=Array.from(ref.current!.querySelectorAll<HTMLElement>('button:not(:disabled)'));
   const first=buttons[0],last=buttons.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }} onClick={e=>{if(e.target===ref.current)e.preventDefault();}}>
  <div className="setup-shell"><h2 id={id}>Choose your starting information</h2>
   <span className="setup-required" aria-hidden="true">REQUIRED</span>{children}
  </div>
 </dialog>;
}

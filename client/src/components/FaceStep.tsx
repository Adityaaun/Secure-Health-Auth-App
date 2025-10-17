import React, { useEffect, useRef, useState } from 'react';

export default function FaceStep({ onCapture, onCancel }: { onCapture: (dataUrl:string)=>void; onCancel: ()=>void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [err, setErr] = useState('');

  useEffect(()=>{
    (async ()=>{
      try{
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      }catch(e:any){ setErr('Camera access denied'); }
    })();
    return ()=>{
      const s = (videoRef.current?.srcObject as MediaStream);
      s?.getTracks().forEach(t=>t.stop());
    }
  },[]);

  function capture(){
    if (!videoRef.current) return;
    const v = videoRef.current;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL('image/png');
    onCapture(dataUrl);
  }

  return (
    <div style={{padding:12, border:'1px solid #ddd', borderRadius:8}}>
      <h3>Face Verification (demo)</h3>
      {err && <p style={{color:'crimson'}}>{err}</p>}
      <video ref={videoRef} style={{width:'100%', maxWidth:360, background:'#000'}} />
      <div style={{display:'flex', gap:8, marginTop:8}}>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={capture}>Capture</button>
      </div>
      <p style={{fontSize:12, color:'#555'}}>In production, compare this frame to an enrolled template (face-api.js or a cloud API) and gate login accordingly.</p>
    </div>
  );
}

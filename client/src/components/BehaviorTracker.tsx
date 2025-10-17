import React, { useEffect, useRef } from 'react';

export default function BehaviorTracker({ onUpdate }: { onUpdate: (m:any)=>void }) {
  const dataRef = useRef({ keypressLatencyAvg: 200, mouseSpeedAvg: 120, jitter: 0.3 });
  useEffect(()=>{
    let lastKeyTime = Date.now();
    const onKey = ()=>{
      const now = Date.now();
      const latency = now - lastKeyTime;
      lastKeyTime = now;
      dataRef.current.keypressLatencyAvg = (dataRef.current.keypressLatencyAvg*0.9 + latency*0.1);
      onUpdate({...dataRef.current});
    };
    const onMouse = (e:MouseEvent)=>{
      const speed = Math.hypot(e.movementX, e.movementY);
      dataRef.current.mouseSpeedAvg = (dataRef.current.mouseSpeedAvg*0.9 + speed*0.1);
      onUpdate({...dataRef.current});
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousemove', onMouse);
    return ()=>{
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousemove', onMouse);
    };
  }, [onUpdate]);
  return null;
}

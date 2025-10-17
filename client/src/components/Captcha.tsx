import React from 'react';

// Demo CAPTCHA: returns a dummy token. Replace with Google reCAPTCHA v2/3 if desired.
export default function Captcha({ onVerify }: { onVerify: (token:string)=>void }) {
  return (
    <button onClick={()=>onVerify('demo-ok')}>
      I'm not a robot (demo)
    </button>
  );
}

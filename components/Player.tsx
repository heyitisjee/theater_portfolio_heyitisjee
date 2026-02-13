
import React, { useRef, useMemo, useEffect, Suspense, useState, useCallback } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE_LIB from 'three';
import { Vector3, Raycaster, Vector2, Object3D, ShaderMaterial, Euler } from 'three';
import { useKeyboard } from '../hooks/useKeyboard';
import { useTexture, Html, useFBO } from '@react-three/drei';
import { Camera as CameraIcon, Image as ImageIcon, Trash2, X, Battery, Clock, Signal, Wifi, Download, ChevronLeft, ChevronRight, Info } from 'lucide-react';

const THREE = THREE_LIB;

class RoundedScreenMaterial extends ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTexture: { value: null },
        uRadius: { value: 0.12 },
        uAspect: { value: 600 / 390 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float uRadius;
        uniform float uAspect;

        float roundedBox(vec2 p, vec2 b, float r) {
          vec2 q = abs(p) - b + r;
          return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        }

        void main() {
          vec2 uv = vUv * 2.0 - 1.0;
          float dist = roundedBox(uv, vec2(1.0, 1.0), uRadius);
          if (dist > 0.0) discard;
          vec4 tex = texture2D(uTexture, vUv);
          gl_FragColor = tex;
        }
      `,
      transparent: true
    });
  }
}

extend({ RoundedScreenMaterial });

interface PlayerProps {
  onTargetChange: (targetName: string | null) => void;
  onChairTargetChange: (chairName: string | null) => void;
  onAuditoriumDoorDistanceChange: (isNear: boolean) => void;
  onLobbyDoorDistanceChange: (isNear: boolean) => void;
  onUsherHover: (isHovering: boolean) => void;
  onStageDoorApproach: (isNear: boolean) => void;
  onPerformerHover: (isHovering: boolean) => void;
  onAuditoriumEntry: () => void;
  onAuditoriumExit: () => void;
  onPositionUpdate: (pos: { x: number, y: number, z: number }) => void;
  auditoriumDoorOpen: boolean;
  lobbyDoorOpen: boolean;
  isSitting: boolean;
  sittingChairId: string | null;
  onSecurityViolation: () => void;
  isCameraActive: boolean;
  joystickInput?: { x: number, y: number };
  isTouchDevice?: boolean;
  equippedItem: string | null;
  hasProgram: boolean;
  phoneProps: {
    cameraMode: boolean;
    setCameraMode: (v: boolean) => void;
    galleryOpen: boolean;
    setGalleryOpen: (v: boolean) => void;
    inventory: string[];
    setInventory: React.Dispatch<React.SetStateAction<string[]>>;
    takePhoto: (dataUrl?: string) => void;
    flash: boolean;
    targetedPoster: string | null;
  };
}

const SKIN_TONE = "#f5d5b0";

const posterVideos = {
  'First Filter Poster': "https://raw.githubusercontent.com/heyitisjee/theater-assets/78c95b4a9970bb402c50c028b4bf9efee27e4245/impressions%20(1).mp4",
  'Theater Club Promotion Poster': "https://raw.githubusercontent.com/heyitisjee/theater-assets/fd801d1f9503a44d635ceba74fbc3cd3e2a46944/Add%20a%20subheading.mp4",
  'Korean Theater Poster 1': "https://raw.githubusercontent.com/heyitisjee/theater-assets/529235aea42345b51925a87d70e18a90c8d26ec0/version%202%20(created%20as%20a%20game%20with%203D%20assets).mp4",
  'Broadway Playbill Poster': "https://raw.githubusercontent.com/heyitisjee/theater-assets/3dff2c2eca882312203b736cff14016b30394163/design.mp4",
  'Korean Theater Poster 2': "https://raw.githubusercontent.com/heyitisjee/theater-assets/93ab249041af65477dc62c7d6219dd5bab2de3bb/version%202%20-%203D%20with%20occlusion%20test%20(1).mp4",
  'Theater & AR Portfolio poster': "https://raw.githubusercontent.com/heyitisjee/theater-assets/590888900c2f2fae62a12f6b9dad6ee7debdd113/Mulan%E2%80%99s%20friend%20%5BDalu%5D%20Branksome%20Hall%20Asia%2C%20student-made%20production%20of%20Mulan%20(3)%20(1)%20(1).mp4"
};

const TwinklingStars: React.FC = () => {
  const pointsRef = useRef<THREE_LIB.Points>(null);
  const count = 350;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 1] = Math.random() * 10 + 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 12;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0015;
      const time = state.clock.getElapsedTime();
      pointsRef.current.material.opacity = Math.sin(time * 4) * 0.4 + 0.6;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffd700" size={0.06} transparent opacity={0.8} />
    </points>
  );
};

const ViewModel: React.FC<{ equippedItem: string | null, isMoving: boolean, phoneProps: PlayerProps['phoneProps'] }> = ({ equippedItem, isMoving, phoneProps }) => {
  const groupRef = useRef<THREE_LIB.Group>(null);
  const armGroupRef = useRef<THREE_LIB.Group>(null);
  const tabletGroupRef = useRef<THREE_LIB.Group>(null);
  const { scene, camera, gl } = useThree();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const programTexture = useTexture("https://raw.githubusercontent.com/heyitisjee/theater-assets/b1960f5ef0a3ec18401b799b50491f642393eb17/1.png");
  const signedProgramTexture = useTexture("https://raw.githubusercontent.com/heyitisjee/theater-assets/4d5f2760862aafd7a1401227e94afb0f8e6562cb/Hyeji%20Kim%20portfolio%202026.png");
  const ticketTexture = useTexture("https://raw.githubusercontent.com/heyitisjee/theater-assets/b9a54a949ffb47aad1a5427d0684bdd2eb75c0d5/Screen%20Shot%202026-02-13%20at%205.08.04%20PM.png");

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const viewfinderTarget = useFBO(1920, 1080); 

  useFrame((state) => {
    if (!groupRef.current || !armGroupRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const bobAmount = isMoving ? 0.012 : 0.003;
    const bobSpeed = isMoving ? 10 : 2;
    const yOffset = Math.sin(time * bobSpeed) * bobAmount;
    const xOffset = Math.cos(time * bobSpeed * 0.5) * (bobAmount * 0.5);
    
    groupRef.current.position.y = -0.4 + yOffset;
    groupRef.current.position.x = xOffset;

    if (phoneProps.cameraMode) {
      if (armGroupRef.current) armGroupRef.current.visible = false;
      if (tabletGroupRef.current) tabletGroupRef.current.visible = false;
      
      state.gl.setRenderTarget(viewfinderTarget);
      state.gl.render(state.scene, state.camera);
      state.gl.setRenderTarget(null);
      
      if (armGroupRef.current) armGroupRef.current.visible = true;
      if (tabletGroupRef.current) tabletGroupRef.current.visible = true;
    }
  });

  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isInteractingWithPhone = phoneProps.cameraMode || phoneProps.galleryOpen;

  const handleCapture = useCallback(() => {
    if (armGroupRef.current) armGroupRef.current.visible = false;
    if (tabletGroupRef.current) tabletGroupRef.current.visible = false;

    gl.setRenderTarget(viewfinderTarget);
    gl.clear();
    gl.render(scene, camera);

    const width = viewfinderTarget.width;
    const height = viewfinderTarget.height;
    const buffer = new Uint8Array(width * height * 4);
    gl.readRenderTargetPixels(viewfinderTarget, 0, 0, width, height, buffer);
    
    gl.setRenderTarget(null);
    if (armGroupRef.current) armGroupRef.current.visible = true;
    if (tabletGroupRef.current) tabletGroupRef.current.visible = true;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const targetI = ((height - 1 - y) * width + x) * 4;
        imageData.data[i] = buffer[targetI];
        imageData.data[i+1] = buffer[targetI+1];
        imageData.data[i+2] = buffer[targetI+2];
        imageData.data[i+3] = buffer[targetI+3];
      }
    }
    ctx.putImageData(imageData, 0, 0);
    phoneProps.takePhoto(canvas.toDataURL('image/png'));
  }, [gl, scene, camera, viewfinderTarget, phoneProps]);

  const handleDownload = (dataUrl: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Theater_Memory_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <group ref={groupRef} position={[0, -0.4, -0.5]}>
        <group ref={armGroupRef}>
          <group position={[0.55, -0.15, 0]} rotation={[0.2, -0.3, 0]}>
            <mesh position={[0, 0, 0]}><boxGeometry args={[0.12, 0.45, 0.12]} /><meshStandardMaterial color={SKIN_TONE} roughness={0.6} /></mesh>
            <mesh position={[0, 0.25, 0]}><sphereGeometry args={[0.075, 16, 16]} /><meshStandardMaterial color={SKIN_TONE} roughness={0.6} /></mesh>
            <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.15, 0.1, 0.15]} /><meshStandardMaterial color={SKIN_TONE} roughness={0.6} /></mesh>
            
            {!isInteractingWithPhone && (
              <group position={[0, 0.38, -0.05]} rotation={[-0.45, 0, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[0.22, 0.42, 0.02]} />
                  <meshStandardMaterial color="#0a0a0a" metalness={0.9} roughness={0.1} />
                </mesh>
                <mesh position={[0, 0, 0.011]}>
                  <planeGeometry args={[0.2, 0.4]} />
                  <meshBasicMaterial color="#000" />
                </mesh>
                <Html transform position={[0, 0, 0.012]} scale={0.05} style={{width:'200px', height:'400px', pointerEvents:'none'}}>
                  <div className="w-full h-full flex flex-col p-4 bg-zinc-950 rounded-[2rem] border border-white/10 overflow-hidden font-sans">
                    <div className="flex justify-between items-center px-1 text-[10px] text-white/50 mb-8">
                       <Wifi size={10} />
                       <div className="flex gap-1 items-center">
                          <Battery size={10} className="rotate-90" />
                       </div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                       <h2 className="text-4xl font-black text-white mb-2">{formattedTime}</h2>
                       <div className="h-px w-8 bg-white/20 mb-4" />
                       <p className="text-[9px] uppercase tracking-[0.2em] font-black text-zinc-500 mb-1">Theater Lobby</p>
                    </div>
                  </div>
                </Html>
              </group>
            )}
          </group>

          <group position={[-0.55, -0.15, 0]} rotation={[0.2, 0.3, 0]}>
            <mesh position={[0, 0, 0]}><boxGeometry args={[0.12, 0.45, 0.12]} /><meshStandardMaterial color={SKIN_TONE} roughness={0.6} /></mesh>
            <mesh position={[0, 0.25, 0]}><sphereGeometry args={[0.075, 16, 16]} /><meshStandardMaterial color={SKIN_TONE} roughness={0.6} /></mesh>
            <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.15, 0.1, 0.15]} /><meshStandardMaterial color={SKIN_TONE} roughness={0.6} /></mesh>
            
            {equippedItem && (
              <group position={[0, 0.4, -0.1]} rotation={[0, Math.PI, 0]}>
                {(equippedItem === 'BOOK' || equippedItem === 'SIGNED_BOOK') && (
                  <group>
                    <mesh><boxGeometry args={[0.35, 0.45, 0.04]} /><meshStandardMaterial color={equippedItem === 'SIGNED_BOOK' ? '#ca8a04' : '#450a0a'} /></mesh>
                    <mesh position={[0, 0, -0.025]} rotation={[0, Math.PI, 0]}>
                      <planeGeometry args={[0.33, 0.43]} />
                      <meshStandardMaterial map={equippedItem === 'SIGNED_BOOK' ? signedProgramTexture : programTexture} />
                    </mesh>
                  </group>
                )}
                {equippedItem === 'TICKET' && (
                  <group position={[0, 0.05, 0]}>
                    <mesh position={[0, 0, 0]}><boxGeometry args={[0.42, 0.17, 0.015]} /><meshStandardMaterial color="#ffffff" /></mesh>
                    <mesh position={[0, 0, -0.01]} rotation={[0, Math.PI, 0]}>
                      <planeGeometry args={[0.4, 0.15]} />
                      <meshStandardMaterial map={ticketTexture} transparent side={THREE.DoubleSide} />
                    </mesh>
                  </group>
                )}
                {equippedItem === 'OPERA_GLASS' && (
                  <group>
                    <mesh position={[-0.08, 0, 0]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.2]} /><meshStandardMaterial color="#222" metalness={0.8} /></mesh>
                    <mesh position={[0.08, 0, 0]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.2]} /><meshStandardMaterial color="#222" metalness={0.8} /></mesh>
                    <mesh rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.02, 0.02, 0.16]} /><meshStandardMaterial color="#222" metalness={0.8} /></mesh>
                  </group>
                )}
              </group>
            )}
          </group>
        </group>

        {isInteractingWithPhone && (
          <group ref={tabletGroupRef} position={[0, 0.45, 0.1]} scale={[0.65, 0.65, 0.65]}>
            {phoneProps.cameraMode && (
              <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[0.96, 0.62]} />
                {/* @ts-ignore */}
                <roundedScreenMaterial uTexture={viewfinderTarget.texture} uRadius={0.12} />
              </mesh>
            )}
            <Html transform position={[0, 0, 0.001]} scale={0.06} pointerEvents="auto" style={{ width: '600px', height: '390px' }}>
              <div className="w-full h-full flex flex-col font-sans select-none relative bg-transparent overflow-hidden rounded-[40px]">
                <div className="absolute inset-0 border-[12px] border-[#080808] rounded-[40px] pointer-events-none z-[200] shadow-[inset_0_0_15px_rgba(0,0,0,0.8),0_0_60px_rgba(0,0,0,1)]" />
                <div className="w-full h-full flex flex-col bg-transparent relative">
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-24 h-6 bg-zinc-950 rounded-full z-[210] border border-white/5 flex items-center justify-center">
                    <div className="w-2 h-2 bg-indigo-950 rounded-full mr-2" />
                    <div className="w-8 h-1 bg-zinc-900 rounded-full" />
                  </div>
                  <div className="h-14 flex justify-between items-center px-12 pt-2 text-[11px] text-white font-black bg-transparent relative z-50">
                    <div className="flex gap-4 items-center"><Clock size={12} strokeWidth={3} /><span>{formattedTime}</span></div>
                    <div className="flex gap-5 items-center"><Signal size={12} strokeWidth={3} /><Wifi size={12} strokeWidth={3} /><Battery size={18} className="rotate-90" strokeWidth={3} /></div>
                  </div>
                  <div className="flex-1 relative flex flex-col">
                    {phoneProps.cameraMode && (
                      <div className="flex-1 flex flex-col relative z-10 px-12 pb-10">
                        {/* AR VIDEO OVERLAY */}
                        {phoneProps.targetedPoster && posterVideos[phoneProps.targetedPoster as keyof typeof posterVideos] && (
                          <div className="absolute inset-x-0 top-0 bottom-16 z-0 flex items-start justify-center pointer-events-none px-14">
                            <video 
                              src={posterVideos[phoneProps.targetedPoster as keyof typeof posterVideos]} 
                              autoPlay 
                              loop 
                              muted={false} 
                              className="w-[74%] h-[74%] object-contain rounded-2xl shadow-2xl opacity-98 mt-1" 
                            />
                          </div>
                        )}

                        <div className="flex-1 flex items-center justify-center pointer-events-none opacity-40"><div className="w-32 h-32 border-2 border-white/20 rounded-3xl" /></div>
                        <div className="h-24 flex items-center justify-between bg-black/40 backdrop-blur-2xl rounded-3xl px-12 border border-white/5 shadow-2xl">
                          <button onClick={() => { phoneProps.setGalleryOpen(true); phoneProps.setCameraMode(false); }} className="w-14 h-14 rounded-2xl border border-white/10 bg-black/60 flex items-center justify-center group overflow-hidden active:scale-95 transition-all shadow-lg">
                            {phoneProps.inventory.length > 0 ? (<img src={phoneProps.inventory[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />) : (<ImageIcon size={26} className="text-white/40" />)}
                          </button>
                          <button onClick={handleCapture} className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-all shadow-xl hover:bg-white/10"><div className="w-14 h-14 bg-white rounded-full" /></button>
                          <button onClick={() => phoneProps.setCameraMode(false)} className="w-14 h-14 bg-white/5 border border-white/5 rounded-full flex items-center justify-center text-white active:scale-90 hover:bg-white/10 transition-all shadow-lg"><X size={26}/></button>
                        </div>
                      </div>
                    )}
                    {phoneProps.galleryOpen && (
                      <div className="absolute inset-0 bg-zinc-950 flex flex-col p-8 z-[300] animate-in fade-in zoom-in-95 duration-200">
                        {selectedPhotoIndex !== null ? (
                          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-10 duration-500 overflow-hidden">
                            <div className="h-14 flex items-center justify-between mb-4 px-2">
                               <button onClick={() => setSelectedPhotoIndex(null)} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors font-bold text-sm"><ChevronLeft size={20}/> Back</button>
                               <div className="text-white/40 text-xs font-black uppercase tracking-widest">{selectedPhotoIndex + 1} / {phoneProps.inventory.length}</div>
                               <div className="flex gap-4">
                                 <button onClick={() => handleDownload(phoneProps.inventory[selectedPhotoIndex])} className="p-2.5 bg-white/5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-90"><Download size={20}/></button>
                                 <button onClick={() => { phoneProps.setInventory(prev => prev.filter((_, idx) => idx !== selectedPhotoIndex)); setSelectedPhotoIndex(null); }} className="p-2.5 bg-red-600/10 rounded-full text-red-500 hover:text-white hover:bg-red-600 transition-all active:scale-90"><Trash2 size={20}/></button>
                               </div>
                            </div>
                            <div className="flex-1 relative group bg-black/40 rounded-[28px] overflow-hidden flex items-center justify-center border border-white/5">
                              <img src={phoneProps.inventory[selectedPhotoIndex]} className="max-w-full max-h-full object-contain shadow-2xl" />
                              <button onClick={(e) => { e.stopPropagation(); setSelectedPhotoIndex(prev => (prev! - 1 + phoneProps.inventory.length) % phoneProps.inventory.length); }} className="absolute left-4 p-3 bg-black/60 backdrop-blur-xl text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity active:scale-75"><ChevronLeft size={24}/></button>
                              <button onClick={(e) => { e.stopPropagation(); setSelectedPhotoIndex(prev => (prev! + 1) % phoneProps.inventory.length); }} className="absolute right-4 p-3 bg-black/60 backdrop-blur-xl text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity active:scale-75"><ChevronRight size={24}/></button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="h-16 flex justify-between items-center px-8 bg-zinc-900/50 rounded-2xl border border-white/5 mb-8">
                              <h3 className="text-white text-base font-black uppercase tracking-widest">Gallery</h3>
                              <button onClick={() => phoneProps.setGalleryOpen(false)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X className="text-white" size={20}/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-4 gap-6 scrollbar-hide">
                              {phoneProps.inventory.map((img, i) => (
                                <div key={i} onClick={() => setSelectedPhotoIndex(i)} className="aspect-square bg-zinc-900 rounded-2xl overflow-hidden relative group border-2 border-white/5 cursor-pointer hover:border-white/30 hover:scale-[1.05] transition-all shadow-xl">
                                   <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                              ))}
                              {phoneProps.inventory.length === 0 && (
                                  <div className="col-span-full h-40 flex flex-col items-center justify-center text-white/10 border-2 border-dashed border-white/5 rounded-3xl">
                                      <ImageIcon size={48} strokeWidth={1} /><p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em]">No Photos</p>
                                  </div>
                              )}
                            </div>
                            <div className="h-16 flex items-center justify-center mt-6">
                               <button onClick={() => { phoneProps.setCameraMode(true); phoneProps.setGalleryOpen(false); }} className="px-8 py-3 bg-white rounded-full text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform shadow-lg">Back to Camera</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Html>
          </group>
        )}
      </group>
    </>
  );
};

const Player: React.FC<PlayerProps> = ({ 
  onTargetChange, onChairTargetChange, onAuditoriumDoorDistanceChange, onLobbyDoorDistanceChange, onUsherHover, onStageDoorApproach, onPerformerHover, onAuditoriumEntry, onAuditoriumExit, auditoriumDoorOpen, lobbyDoorOpen, isSitting, sittingChairId, equippedItem, hasProgram, phoneProps, isTouchDevice, joystickInput
}) => {
  const { camera, scene, gl } = useThree();
  const moveState = useKeyboard();
  const direction = useRef(new Vector3());
  const raycaster = useMemo(() => new Raycaster(), []);
  const centerScreen = useMemo(() => new Vector2(0, 0), []);
  const prevZ = useRef(0);
  const sitPosition = useRef(new Vector3());
  const [isMoving, setIsMoving] = useState(false);
  const PLAYER_HEIGHT = 2.1;
  const SPEED = 4.5;

  // Touch look rotation state
  const lookRotation = useRef(new Euler(0, 0, 0, 'YXZ'));
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (!isTouchDevice) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Only capture touch for looking on the right half of screen
      if (touch.clientX > window.innerWidth / 2) {
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartPos.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;
      
      const sensitivity = 0.005;
      lookRotation.current.y -= dx * sensitivity;
      lookRotation.current.x -= dy * sensitivity;
      lookRotation.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, lookRotation.current.x));
      
      camera.quaternion.setFromEuler(lookRotation.current);
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = () => {
      touchStartPos.current = null;
    };

    gl.domElement.addEventListener('touchstart', handleTouchStart);
    gl.domElement.addEventListener('touchmove', handleTouchMove);
    gl.domElement.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      gl.domElement.removeEventListener('touchstart', handleTouchStart);
      gl.domElement.removeEventListener('touchmove', handleTouchMove);
      gl.domElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isTouchDevice, camera, gl]);

  useFrame((state, delta) => {
    if (isSitting && sittingChairId) {
      const chair = scene.getObjectByName(sittingChairId);
      if (chair) {
         chair.getWorldPosition(sitPosition.current);
         sitPosition.current.y += 1.45; 
         camera.position.lerp(sitPosition.current, 0.1);
      }
      return;
    }

    direction.current.set(0, 0, 0);

    let mX = 0;
    let mZ = 0;

    if (isTouchDevice && joystickInput) {
      mX = joystickInput.x;
      mZ = -joystickInput.y; // Joystick Y is inverted for forward/backward
    } else {
      mX = Number(moveState.right) - Number(moveState.left);
      mZ = Number(moveState.forward) - Number(moveState.backward);
    }
    
    const currentlyMoving = mX !== 0 || mZ !== 0;
    if (currentlyMoving !== isMoving) setIsMoving(currentlyMoving);

    if (currentlyMoving) {
      if (isTouchDevice) {
        // Move relative to current yaw only
        const yaw = new Euler(0, lookRotation.current.y, 0);
        direction.current.set(mX, 0, mZ).multiplyScalar(SPEED).applyEuler(yaw);
      } else {
        direction.current.subVectors(new Vector3(mX,0,0), new Vector3(0,0,mZ)).normalize().multiplyScalar(SPEED).applyEuler(new Euler(0, camera.rotation.y, 0));
      }
    }
    
    const next = camera.position.clone().addScaledVector(direction.current, delta);
    
    let allow = true;
    if (!hasProgram && camera.position.z > 0.4 && next.z < 0.4) allow = false;
    if (next.z < -9.5 || next.z > 17.5) allow = false; 
    
    if (allow) { 
      camera.position.x = next.x; 
      camera.position.z = next.z; 
    }

    let currentHeight = PLAYER_HEIGHT;
    const worldZ = camera.position.z;
    if (worldZ < -2.0 && worldZ > -9.5) {
      if (worldZ < -2.5 && worldZ > -4.5) currentHeight += 1.35; 
      else if (worldZ <= -4.5 && worldZ > -6.5) currentHeight += 0.9; 
      else if (worldZ <= -6.5 && worldZ > -8.5) currentHeight += 0.45; 
    }
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, currentHeight, 0.1);

    if (prevZ.current > 0 && camera.position.z <= 0) onAuditoriumEntry();
    else if (prevZ.current <= 0 && camera.position.z > 0) onAuditoriumExit();
    prevZ.current = camera.position.z;
    
    onStageDoorApproach(camera.position.z > 14.0);

    let fU = false;
    let fP = false;
    const usherGroup = scene.getObjectByName("UsherGroup");
    const performerGroup = scene.getObjectByName("PerformerGroup");

    if (usherGroup && camera.position.distanceTo(usherGroup.position) < 5.0) fU = true; 
    if (performerGroup && camera.position.distanceTo(performerGroup.position) < 4.0) fP = true;

    raycaster.setFromCamera(centerScreen, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    let fT = null, fC = null;
    for (let i = 0; i < Math.min(intersects.length, 10); i++) {
      if (intersects[i].distance > 15) continue;
      let cur: Object3D | null = intersects[i].object;
      while (cur) {
        if (cur.userData.type === 'poster') { fT = cur.name; break; }
        if (cur.userData.type === 'chair') { fC = cur.name; break; }
        cur = cur.parent;
      }
      if (fT || fC) break;
    }
    
    onTargetChange(fT); 
    onChairTargetChange(fC); 
    onUsherHover(fU); 
    onPerformerHover(fP);
  });

  return (
    <primitive object={camera}>
      {isSitting && <TwinklingStars />}
      <Suspense fallback={null}>
        <ViewModel equippedItem={equippedItem} isMoving={isMoving} phoneProps={phoneProps}/>
      </Suspense>
    </primitive>
  );
};

export default Player;


import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import TheaterScene from './components/TheaterScene';
import { Camera, Image as ImageIcon, Scan, Maximize, Zap, X, BookOpen, Star, Loader2, Binoculars, MousePointer2 } from 'lucide-react';
import { Leva } from 'leva';

// Inventory Item Types
type ItemType = 'EMPTY' | 'OPERA_GLASS' | 'BOOK' | 'SIGNED_BOOK' | null;

const App: React.FC = () => {
  // Refs
  // Fix: Declare all refs at the top of the component to avoid "used before declaration" errors.
  const controlsRef = useRef<any>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isTabHeldRef = useRef(false);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Game State
  const [hasStarted, setHasStarted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isReading, setIsReading] = useState(false);
  
  // Hotbar State
  const [hotbar, setHotbar] = useState<ItemType[]>(['EMPTY', 'OPERA_GLASS', null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [hotbarOpacity, setHotbarOpacity] = useState(0);

  // Tools & Modes
  const [cameraMode, setCameraMode] = useState(false);
  const [inventory, setInventory] = useState<string[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const [isZooming, setIsZooming] = useState(false);

  // Performer Randomization
  const [stagePerformerIndex, setStagePerformerIndex] = useState(0);

  // AR Video State
  const [videoOpacity, setVideoOpacity] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  
  const posterVideos: Record<string, string> = {
    'Crimson Specter Poster': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'Emerald Voyage Poster': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'Azure Echo Poster': 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  };

  // Interaction State
  const [interactionText, setInteractionText] = useState<string | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<string | null>(null);
  const [targetedPoster, setTargetedPoster] = useState<string | null>(null);
  const [activePoster, setActivePoster] = useState<string | null>(null);
  
  const [isHoveringUsher, setIsHoveringUsher] = useState(false);
  const [isHoveringPerformer, setIsHoveringPerformer] = useState(false);
  
  const [auditoriumDoorOpen, setAuditoriumDoorOpen] = useState(false);
  const [lobbyDoorOpen, setLobbyDoorOpen] = useState(false);
  const [isSitting, setIsSitting] = useState(false);
  const [sittingChair, setSittingChair] = useState<string | null>(null);
  const [nearAuditoriumDoor, setNearAuditoriumDoor] = useState(false);
  const [nearLobbyDoor, setNearLobbyDoor] = useState(false);
  const [targetChair, setTargetChair] = useState<string | null>(null);

  const [nearStageDoor, setNearStageDoor] = useState(false);
  const [performerArrived, setPerformerArrived] = useState(false);
  const [crowdExcitement, setCrowdExcitement] = useState(false);

  // FOV Calculation
  const activeItem = hotbar[activeSlot];
  const isHoldingOperaGlass = activeItem === 'OPERA_GLASS';
  const isHoldingBook = activeItem === 'BOOK' || activeItem === 'SIGNED_BOOK';
  const currentTargetFov = (isHoldingOperaGlass && isZooming) ? 30 : 75;

  // Track activity during render to ensure hotbar stays active while interacting
  lastActivityRef.current = Date.now();

  // Setup Webcam Passthrough
  useEffect(() => {
    if (cameraMode) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (webcamRef.current) {
            webcamRef.current.srcObject = stream;
          }
        })
        .catch(console.error);
    } else {
      if (webcamRef.current && webcamRef.current.srcObject) {
        (webcamRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    }
  }, [cameraMode]);

  useEffect(() => {
    if (targetedPoster) {
      setActivePoster(targetedPoster);
    } else {
      const timer = setTimeout(() => setActivePoster(null), 300);
      return () => clearTimeout(timer);
    }
  }, [targetedPoster]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (cameraMode && activePoster && posterVideos[activePoster]) {
      const targetSrc = posterVideos[activePoster];
      if (video.src !== targetSrc) {
        setIsVideoLoading(true);
        setVideoOpacity(0);
        video.src = targetSrc;
        video.load();
        video.play().catch(() => setIsVideoLoading(false));
      } else {
        if (video.paused) video.play();
        setVideoOpacity(1);
      }
    } else {
      setVideoOpacity(0);
      setIsVideoLoading(false);
      if (video && !video.paused) {
        video.pause();
      }
    }
  }, [cameraMode, activePoster]);
  
  // Performer arrival logic
  useEffect(() => {
    if (nearStageDoor && !performerArrived) {
       const arrivalTimer = setTimeout(() => {
          setPerformerArrived(true);
          setCrowdExcitement(true);
          setTimeout(() => setCrowdExcitement(false), 5000);
       }, 2000);
       return () => clearTimeout(arrivalTimer);
    }
  }, [nearStageDoor, performerArrived]);

  const handleAuditoriumEntry = useCallback(() => {
    setStagePerformerIndex(Math.floor(Math.random() * 3));
  }, []);

  const triggerHotbar = useCallback(() => {
    setHotbarOpacity(1);
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity > 2000 && !isTabHeldRef.current && !cameraMode) {
        setHotbarOpacity(0);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [cameraMode]);

  const takePhoto = useCallback(async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    const dataUrl = canvas.toDataURL('image/png');
    setInventory(prev => [dataUrl, ...prev]);
  }, []);

  const showDialogue = useCallback((text: string, duration: number = 3500) => {
    setActiveDialogue(text);
    setTimeout(() => setActiveDialogue(null), duration);
  }, []);

  const receiveBook = useCallback(() => {
    setHotbar(prev => {
      const newHotbar = [...prev];
      newHotbar[2] = 'BOOK';
      return newHotbar;
    });
    setActiveSlot(2); 
    triggerHotbar();
    showDialogue("Usher: Here's your program. Don't be late!");
  }, [triggerHotbar, showDialogue]);

  const receiveAutograph = useCallback(() => {
     const bookIndex = hotbar.indexOf('BOOK');
     const signedBookIndex = hotbar.indexOf('SIGNED_BOOK');
     
     if (bookIndex !== -1) {
       setHotbar(prev => {
         const newHotbar = [...prev];
         newHotbar[bookIndex] = 'SIGNED_BOOK';
         return newHotbar;
       });
       setActiveSlot(bookIndex);
       triggerHotbar();
       showDialogue("Performer: For my #1 fan! Enjoy the show.");
     } else if (signedBookIndex !== -1) {
       showDialogue("Performer: I've already signed your program, dear.");
     } else {
       showDialogue("Performer: You should get the program book from the usher and catch the show first!");
     }
  }, [hotbar, triggerHotbar, showDialogue]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => { 
      if (e.button === 2) setIsZooming(true); 
      if (e.button === 0 && isHoldingBook && isLocked) {
        setIsReading(prev => !prev);
      }
    };
    const handleMouseUp = (e: MouseEvent) => { if (e.button === 2) setIsZooming(false); };
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLocked && hasStarted) return; 
      if (isReading && e.code === 'Escape') { setIsReading(false); return; }

      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        setActiveSlot(parseInt(e.key) - 1);
        triggerHotbar();
      }
      if (e.code === 'Tab') { e.preventDefault(); isTabHeldRef.current = true; triggerHotbar(); }
      switch(e.code) {
        case 'KeyZ': setIsZooming(true); break;
        case 'KeyC': if (!galleryOpen && !isReading) setCameraMode(prev => !prev); break;
        case 'KeyE':
          if (nearAuditoriumDoor) setAuditoriumDoorOpen(prev => !prev);
          else if (nearLobbyDoor) setLobbyDoorOpen(prev => !prev);
          break;
        case 'KeyR':
          if (isHoveringUsher && hotbar[2] === null) receiveBook();
          break;
        case 'KeyG': if (isHoveringPerformer && performerArrived) receiveAutograph(); break;
        case 'KeyF':
          if (isSitting) { setIsSitting(false); setSittingChair(null); }
          else if (targetChair) { setIsSitting(true); setSittingChair(targetChair); }
          break;
        case 'Space': case 'Enter': if (cameraMode) takePhoto(); break;
        case 'Escape': 
          if (cameraMode) setCameraMode(false); 
          if (galleryOpen) setGalleryOpen(false); 
          break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Tab') isTabHeldRef.current = false;
      if (e.code === 'KeyZ') setIsZooming(false);
    };
    const handleWheel = (e: WheelEvent) => {
      if (!isLocked || cameraMode || isReading) return;
      const direction = Math.sign(e.deltaY);
      setActiveSlot(prev => (prev + direction + 5) % 5);
      triggerHotbar();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isLocked, hasStarted, cameraMode, nearAuditoriumDoor, nearLobbyDoor, targetChair, isSitting, galleryOpen, takePhoto, activeSlot, hotbar, isHoveringUsher, isHoveringPerformer, performerArrived, receiveBook, receiveAutograph, triggerHotbar, isReading, isHoldingBook]);

  useEffect(() => {
    if (activeDialogue) setInteractionText(activeDialogue);
    else if (isReading) setInteractionText("Click Again or Press [ESC] to Stop Reading");
    else if (isHoldingBook) setInteractionText("Left Click to Read Program");
    else if (isSitting) setInteractionText("Press [F] to Stand");
    else if (targetChair) setInteractionText("Press [F] to Sit");
    else if (nearAuditoriumDoor) setInteractionText(`Press [E] to ${auditoriumDoorOpen ? 'Close' : 'Open'} Theater Doors`);
    else if (nearLobbyDoor) setInteractionText(`Press [E] to ${lobbyDoorOpen ? 'Close' : 'Open'} Exit Doors`);
    else if (isHoveringUsher) {
       if (hotbar[2] === null) setInteractionText("Press [R] to get Program");
       else setInteractionText("Usher: Enjoy the show.");
    } else if (isHoveringPerformer && performerArrived) {
       setInteractionText("Press [G] to speak with Performer");
    } else if (nearStageDoor && !performerArrived) setInteractionText("Fans: Is she coming out?");
    else setInteractionText(null);
  }, [nearAuditoriumDoor, nearLobbyDoor, auditoriumDoorOpen, lobbyDoorOpen, targetChair, isSitting, isHoveringUsher, isHoveringPerformer, performerArrived, nearStageDoor, hotbar, isReading, isHoldingBook, activeDialogue]);

  return (
    <div className="relative w-full h-full bg-black select-none overflow-hidden font-sans">
      <Leva hidden={!hasStarted} />

      <video ref={webcamRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover z-0 opacity-100" />

      <div className={`transition-opacity duration-700 w-full h-full z-10 relative`}>
        <Canvas shadows camera={{ fov: 75, position: [0, 2.5, 5] }} gl={{ preserveDrawingBuffer: true, alpha: true }}>
          <TheaterScene 
            onTargetChange={setTargetedPoster} 
            onChairTargetChange={setTargetChair}
            onAuditoriumDoorDistanceChange={setNearAuditoriumDoor}
            onLobbyDoorDistanceChange={setNearLobbyDoor}
            onUsherHover={setIsHoveringUsher}
            onStageDoorApproach={setNearStageDoor}
            onPerformerHover={setIsHoveringPerformer}
            onAuditoriumEntry={handleAuditoriumEntry}
            highlightedPoster={targetedPoster} 
            auditoriumDoorOpen={auditoriumDoorOpen}
            lobbyDoorOpen={lobbyDoorOpen}
            isSitting={isSitting}
            sittingChairId={sittingChair}
            isCameraActive={cameraMode}
            performerArrived={performerArrived}
            stagePerformerIndex={stagePerformerIndex}
            fov={currentTargetFov}
            isVisible={true}
          />
          <PointerLockControls ref={controlsRef} onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />
        </Canvas>
      </div>

      <div className={`absolute inset-0 bg-white pointer-events-none z-[100] transition-opacity duration-150 ${flash ? 'opacity-100' : 'opacity-0'}`} />

      <div className={`absolute inset-0 pointer-events-none z-40 bg-black/80 transition-opacity duration-500 ${isZooming && isHoldingOperaGlass ? 'opacity-100' : 'opacity-0'}`}
           style={{ maskImage: 'radial-gradient(circle at center, transparent 35%, black 65%)', WebkitMaskImage: 'radial-gradient(circle at center, transparent 35%, black 65%)' }} />

      {isReading && (
        <div className="absolute inset-0 z-[120] flex items-center justify-center animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsReading(false)} />
           <div className="relative w-[500px] h-[700px] bg-[#fdfaf1] border-[16px] border-[#3a2015] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden rounded-sm flex flex-col p-12 text-black font-serif transform rotate-1 scale-105 cursor-pointer" onClick={() => setIsReading(false)}>
              <div className="border-b-2 border-zinc-300 pb-4 mb-8 text-center pointer-events-none">
                 <h2 className="text-4xl font-black uppercase tracking-tighter">Ethereal Cinema</h2>
                 <p className="text-xs uppercase tracking-[0.3em] font-bold text-zinc-500 mt-2">Established 1924</p>
              </div>
              <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide pointer-events-none">
                 <h3 className="text-2xl font-bold mb-4">Tonight's Program</h3>
                 <div className="space-y-6">
                    <section>
                       <p className="text-xs uppercase font-black text-zinc-400 mb-1">Act I</p>
                       <h4 className="font-bold text-lg">The Crimson Specter</h4>
                       <p className="text-sm italic leading-relaxed text-zinc-700">A haunting journey through the red mists of the void. Starring Elara Vance.</p>
                    </section>
                    <section>
                       <p className="text-xs uppercase font-black text-zinc-400 mb-1">Act II</p>
                       <h4 className="font-bold text-lg">Emerald Voyage</h4>
                       <p className="text-sm italic leading-relaxed text-zinc-700">The deep seas of the forgotten emerald world reveal its secrets.</p>
                    </section>
                    <section>
                       <p className="text-xs uppercase font-black text-zinc-400 mb-1">Act III</p>
                       <h4 className="font-bold text-lg">Azure Echo</h4>
                       <p className="text-sm italic leading-relaxed text-zinc-700">Silence speaks louder in the blue corridors of the mind.</p>
                    </section>
                 </div>
                 {activeItem === 'SIGNED_BOOK' && (
                    <div className="mt-12 pt-8 border-t border-zinc-200">
                       <p className="text-zinc-400 text-[10px] uppercase font-bold mb-4">Special Inscription</p>
                       <div className="font-signature text-3xl text-blue-800 -rotate-3 pl-4">With love, Elara Vance</div>
                    </div>
                 )}
              </div>
              <div className="mt-auto text-center pt-6 opacity-40 text-[9px] uppercase tracking-widest font-bold pointer-events-none">
                 Cinema Lobby • All Rights Reserved
              </div>
           </div>
        </div>
      )}

      {!hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center z-[150] bg-zinc-950">
          <div className="text-center p-12 max-w-lg">
            <h1 className="text-7xl font-black mb-4 text-white tracking-tighter uppercase">THEATER</h1>
            <div className="w-24 h-1 bg-white mx-auto mb-8"></div>
            <p className="text-zinc-500 mb-10 text-[10px] uppercase tracking-[0.3em] leading-loose">White Lobby | Black Auditorium</p>
            <button className="px-12 py-5 bg-white text-black font-black hover:scale-105 transition-transform uppercase tracking-[0.2em] text-[10px] shadow-2xl" 
                    onClick={() => { setHasStarted(true); controlsRef.current?.lock(); }}>Enter Theater</button>
          </div>
        </div>
      )}

      {crowdExcitement && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-40 pointer-events-none text-center">
            <div className="text-yellow-400 text-2xl font-black uppercase tracking-tight animate-bounce drop-shadow-glow">CROWD: "SHE IS HERE!!!"</div>
          </div>
      )}

      {interactionText && !cameraMode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-12 z-[90] pointer-events-none">
          <div className="bg-white text-black px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl animate-in fade-in zoom-in duration-200">{interactionText}</div>
        </div>
      )}

      {!cameraMode && isLocked && !isSitting && !isZooming && !isReading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="w-1.5 h-1.5 bg-white mix-blend-difference rounded-full shadow-lg" />
        </div>
      )}

      {hasStarted && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-3 p-3 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 transition-opacity duration-500"
             style={{ opacity: hotbarOpacity }}>
          {hotbar.map((item, index) => (
            <div key={index} className={`w-14 h-14 bg-zinc-900/50 border-2 rounded-xl flex items-center justify-center ${activeSlot === index ? 'border-white scale-110 shadow-[0_0_20_rgba(255,255,255,0.2)]' : 'border-white/5'} transition-all duration-300 relative`}>
              {item === 'OPERA_GLASS' && <Binoculars size={24} className="text-white" />}
              {item === 'BOOK' && <BookOpen size={24} className="text-white" />}
              {item === 'SIGNED_BOOK' && <><BookOpen size={24} className="text-yellow-400" /><Star size={12} className="absolute top-2 right-2 text-yellow-400 fill-current" /></>}
              <div className="absolute bottom-1 right-2 text-[10px] text-zinc-600 font-black">{index + 1}</div>
            </div>
          ))}
        </div>
      )}

      {/* HAND MODELS */}
      {hasStarted && (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
          <div className={`absolute bottom-[-20px] left-[-30px] w-[240px] h-[360px] transition-all duration-700 ease-out origin-bottom-left rotate-[8deg] ${isZooming && isHoldingOperaGlass ? 'translate-y-40 scale-75 opacity-0' : ''} ${isReading ? 'translate-y-60 opacity-0' : ''}`}>
             {activeItem === 'OPERA_GLASS' ? (
                <div className="w-full h-full relative">
                   <div className="absolute inset-0 bg-zinc-800 rounded-t-[50px] border-t-4 border-r-4 border-zinc-700 shadow-2xl flex flex-col items-center justify-start pt-12">
                      <div className="relative flex flex-col items-center">
                        <div className="w-28 h-4 bg-zinc-900 rounded shadow-md border-b-2 border-zinc-700 mb-[-2px] z-10" />
                        <div className="flex gap-2">
                           <div className="w-14 h-32 bg-gradient-to-tr from-black via-zinc-900 to-zinc-800 rounded-[10px_10px_20px_20px] border-2 border-zinc-600 shadow-xl relative overflow-hidden">
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-blue-900/20 border border-white/10" />
                           </div>
                           <div className="w-14 h-32 bg-gradient-to-tr from-black via-zinc-900 to-zinc-800 rounded-[10px_10px_20px_20px] border-2 border-zinc-600 shadow-xl relative overflow-hidden">
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-blue-900/20 border border-white/10" />
                           </div>
                        </div>
                      </div>
                   </div>
                </div>
             ) : (activeItem === 'BOOK' || activeItem === 'SIGNED_BOOK') ? (
                <div className="w-full h-full bg-[#3a2015] rounded-t-[50px] border-t-4 border-r-4 border-[#5a3025] flex flex-col items-center justify-center text-[#e0c090]/30 shadow-2xl relative">
                   <BookOpen size={64} />
                   <div className="mt-4 flex flex-col items-center opacity-40">
                      <MousePointer2 size={12} className="mb-1" />
                      <span className="text-[8px] uppercase tracking-widest font-black">Read</span>
                   </div>
                   {activeItem === 'SIGNED_BOOK' && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-20deg] border-2 border-yellow-500 text-yellow-500 text-xs font-black px-3 py-1 bg-black/50 rounded uppercase tracking-widest">Signed</div>}
                </div>
             ) : (
                <div className="w-full h-full bg-zinc-900 rounded-t-[50px] border-t-4 border-r-4 border-zinc-800 shadow-2xl opacity-60 flex items-center justify-center">
                   <div className="w-12 h-1 bg-zinc-700 rounded-full opacity-20" />
                </div>
             )}
          </div>

          <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center ${cameraMode ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[850px] h-[65%] z-50' : 'bottom-[-40px] right-[-40px] w-[240px] h-[380px] rotate-[-10deg]'} ${isReading ? 'opacity-0 scale-50' : ''}`}>
            <div className={`relative border-4 border-zinc-900 shadow-2xl transition-all duration-700 overflow-hidden ${cameraMode ? 'w-full h-full rotate-0 rounded-[30px] border-[12px] border-zinc-900/90 bg-transparent' : 'w-full h-full rounded-[40px] bg-zinc-950'}`}>
              <div className="w-full h-full relative flex flex-col pointer-events-auto bg-transparent">
                {cameraMode ? (
                  <>
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="w-48 h-48 border border-white/20 rounded-full animate-pulse" />
                           {activePoster && <div className="absolute flex flex-col items-center"><Scan size={120} className="text-white drop-shadow-glow" /><span className="mt-4 bg-white text-black px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-full">{activePoster}</span></div>}
                        </div>
                        <div className="absolute inset-0 z-10 overflow-hidden">
                           {isVideoLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 className="animate-spin text-white" /></div>}
                           <video ref={videoRef} className="w-full h-full object-cover transition-opacity duration-500" style={{ opacity: videoOpacity }} loop muted playsInline onPlaying={() => { setIsVideoLoading(false); setVideoOpacity(1); }} />
                        </div>
                    </div>
                    <div className="mt-auto p-10 flex items-center justify-between w-full bg-gradient-to-t from-black to-transparent relative z-20">
                      <div className="flex flex-col text-white/50 text-[10px] font-mono"><span>4K</span><span>SCAN</span></div>
                      <button onClick={takePhoto} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"><div className="w-12 h-12 bg-white rounded-full shadow-lg" /></button>
                      <button onClick={() => setGalleryOpen(true)} className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden">
                        {inventory.length > 0 ? <img src={inventory[0]} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-white/20" />}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col p-10 bg-zinc-950">
                    <div className="flex justify-between items-center text-zinc-600 text-[10px] font-black mb-12"><span>12:45</span><Zap size={14} className="fill-current" /></div>
                    <div className="text-white text-6xl font-black tracking-tighter mb-2">12:45</div>
                    <div className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-16">Sunday, Oct 24</div>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setCameraMode(true)} className="aspect-square bg-zinc-900 rounded-[24px] flex items-center justify-center text-white hover:bg-zinc-800 transition-all hover:scale-105 shadow-2xl"><Camera size={32} /></button>
                      <button onClick={() => setGalleryOpen(true)} className="aspect-square bg-zinc-900 rounded-[24px] flex items-center justify-center text-white hover:bg-zinc-800 transition-all hover:scale-105 shadow-2xl"><ImageIcon size={32} /></button>
                    </div>
                  </div>
                )}
                {galleryOpen && (
                  <div className="absolute inset-0 bg-zinc-950 z-[60] flex flex-col animate-in slide-in-from-bottom duration-500">
                    <div className="p-8 flex justify-between items-center border-b border-white/5"><span className="text-white text-[10px] font-black uppercase tracking-widest">Gallery</span><button onClick={() => setGalleryOpen(false)} className="text-white/30 hover:text-white"><X size={24}/></button></div>
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 content-start">
                      {inventory.map((img, i) => (<div key={i} className="aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-white/5 shadow-lg"><img src={img} className="w-full h-full object-cover" /></div>))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
